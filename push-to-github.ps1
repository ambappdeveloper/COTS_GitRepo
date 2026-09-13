<#
    Push this repository to a private repository on GitHub.

    WHY THIS EXISTS
    ---------------
    The Gitea server is at 192.168.24.147, a private address on your network, and it is not
    reachable at the moment. This script puts the same history on GitHub so the work is not
    stranded. It is a companion to push-to-gitea.ps1, not a replacement for it.

    IT DOES NOT TOUCH "origin"
    --------------------------
    Gitea stays as origin. GitHub is added as a SECOND remote called "github", so when the server
    comes back your normal push still goes where it always did, and nothing has to be undone. This
    is the single most important thing the script does differently from what you might type by
    hand: re-pointing origin at GitHub would quietly change where every future push lands.

    IT WILL NOT PUSH TO A PUBLIC REPOSITORY
    ---------------------------------------
    Checked against the GitHub API before the first push, and the push is refused if the repository
    is public. That is not ceremony. This repository carries Dalgroup material that has only ever
    lived inside your network:

        Ref\Osama\FW  Sudan Export Payment Plan.msg          internal mail
        Ref\Osama\FW  Africa QM- System Documentation .msg   internal mail
        Ref\...\Funding - CIM Weekly Purchase Report.xlsx    agent balances, supplier payments
        Ref\Hiba\Ex-Form_Sample_SYG-26-1322.pdf              a real ministry form, real reference
        Ref\Osama\Exports costing.xlsx                       costing
        Ref\MMS\COTS - Workshop Notes - Version 1.docx       named staff, buyers, contract numbers

    A repository made public by accident cannot be made private again in any meaningful sense —
    it has been cloned, cached and indexed by then. So the check runs every time, not just the
    first time.

    NOTHING IS DESTRUCTIVE
    ----------------------
    No file is deleted, moved, renamed or overwritten. It never force-pushes. It stops rather than
    guessing when something is not as expected. It writes no files at all.

    BEFORE YOU RUN IT
    -----------------
    Create an EMPTY private repository on GitHub:

        https://github.com/new
          Owner        you, or your organisation
          Name         COTS            (or pass -Repo <name>)
          Visibility   Private         <- required
          Initialize   leave every box UNTICKED - no README, no .gitignore, no licence

    Leaving those boxes unticked matters: an initialised repository has a commit of its own, which
    is a second history this one knows nothing about. If you tick them anyway, add -Rebase and the
    two are joined rather than one overwriting the other.

    Alternatively pass -CreateRepo and the script creates it for you, always private, using a token
    with the "repo" scope. It will never create a public one.

    SIGNING IN
    ----------
    You do not need a token for the ordinary case. Git for Windows ships with Git Credential
    Manager: the first push opens a browser, you approve, and Windows remembers it. Pass -Token
    only if you are running this unattended or GCM is not installed.

    USAGE
    -----
        powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1 -Owner <you>
            check everything and report. Nothing is pushed.

        powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1 -Owner <you> -Push
            the same, then push main to github.

        ... -Push -CreateRepo        create the private repository first (needs -Token, repo scope)
        ... -Push -Rebase            join an existing history instead of stopping
        ... -Push -Token ghp_xxx     sign in with a token instead of the browser

    Run it once without -Push and read what it reports. Then run it again with -Push.

    Safe to run more than once.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Owner,

    [string]$Repo    = 'COTS',
    [string]$Branch  = 'main',
    [string]$RemoteName = 'github',

    [switch]$Push,
    # Join an existing history on GitHub instead of stopping. Uses pull --rebase; never --force.
    [switch]$Rebase,
    # Create the repository first. Always private. Needs -Token with the "repo" scope.
    [switch]$CreateRepo,
    # Only needed for -CreateRepo, or if you are not using Git Credential Manager.
    [string]$Token
)

$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host $m }
function Good ($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  note  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  STOP  $m" -ForegroundColor Red; exit 1 }

<#
    Finding git. Resolved once with -CommandType Application so it is git.exe itself and cannot be
    a function or alias that happens to share the name — the same trap push-to-gitea.ps1 documents.

    The wrapper exists because git writes ordinary, expected messages to stderr. "fatal: Needed a
    single revision" is simply how it answers "does this repository have any commits yet?". With
    $ErrorActionPreference = 'Stop', PowerShell turns stderr from a native command into a
    terminating error the moment it is redirected, so a correct answer from git would kill the
    script. Here the preference is relaxed for the duration of the call; callers check
    $LASTEXITCODE, which is how git is designed to report.
#>
$script:GitExe = (Get-Command git -CommandType Application -ErrorAction SilentlyContinue |
                  Select-Object -First 1).Source
if (-not $script:GitExe) {
    Die 'git is not on the PATH. Install Git for Windows from https://git-scm.com/download/win, then close and reopen PowerShell and run this again.'
}

function Invoke-Git {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $script:GitExe @args 2>&1 } finally { $ErrorActionPreference = $old }
}

function Invoke-GitHubApi ($Method, $Path, $Body) {
    if (-not $Token) { return $null }
    $headers = @{
        Authorization          = "Bearer $Token"
        Accept                 = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
        'User-Agent'           = 'cots-push-to-github'
    }
    # Not $args — that is an automatic variable in PowerShell and assigning to it inside a
    # function is a good way to lose an afternoon.
    $req = @{ Method = $Method; Uri = "https://api.github.com$Path"; Headers = $headers }
    if ($Body) { $req.Body = ($Body | ConvertTo-Json -Depth 5); $req.ContentType = 'application/json' }
    Invoke-RestMethod @req
}

$root      = $PSScriptRoot
$remoteUrl = "https://github.com/$Owner/$Repo.git"

Say ''
Say 'COTS -> GitHub'
Say '=============='
Say "  repository root  $root"
Say "  github remote    $remoteUrl   (as '$RemoteName')"
Say "  branch           $Branch"
Say "  gitea origin     left exactly as it is"
Say ''

# ---- 1. prerequisites ------------------------------------------------------------------------

Say '1. Checking prerequisites'

Good "git found at $script:GitExe"

if (-not (Test-Path -LiteralPath (Join-Path $root '.git'))) {
    Die "there is no git repository at $root. This script pushes an existing repository; it does not create one. Run push-to-gitea.ps1 first, or run it from the folder that holds .git."
}
Good 'a git repository exists here'

Push-Location $root
try {

    Invoke-Git rev-parse --verify HEAD 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Die 'this repository has no commits yet. Commit your work first — push-to-gitea.ps1 does the staging and committing; this script only pushes.'
    }
    $head = (Invoke-Git rev-parse --short HEAD) | Select-Object -First 1
    Good "HEAD is $head"

    $current = (Invoke-Git rev-parse --abbrev-ref HEAD) | Select-Object -First 1
    if ($current -ne $Branch) {
        Warn "this repository is on branch '$current', not '$Branch' — pushing '$current'"
        $Branch = $current
    } else {
        Good "branch $Branch"
    }

    # Uncommitted work is not an error, but pushing without it is a surprise worth naming.
    $dirty = @(Invoke-Git status --porcelain) | Where-Object { $_ -ne '' }
    if ($dirty.Count -gt 0) {
        Warn "$($dirty.Count) uncommitted change(s) in the working tree — these will NOT be pushed"
        Warn 'commit them first if you want them on GitHub (push-to-gitea.ps1 stages and commits)'
    } else {
        Good 'working tree is clean'
    }

# ---- 2. what is about to leave your network ---------------------------------------------------

    Say ''
    Say '2. What is about to leave your network'

    $tracked = @(Invoke-Git ls-files) | Where-Object { $_ -ne '' }
    Good "$($tracked.Count) tracked files"

    # GitHub rejects any blob over 100 MB and warns above 50 MB. Cheap to check, and a rejected
    # push halfway through a 30 MB upload is a bad way to find out.
    $big = @()
    foreach ($f in $tracked) {
        $p = Join-Path $root $f
        if (Test-Path -LiteralPath $p) {
            $mb = (Get-Item -LiteralPath $p).Length / 1MB
            if ($mb -ge 50) { $big += [pscustomobject]@{ File = $f; MB = [math]::Round($mb, 1) } }
        }
    }
    if ($big.Count -gt 0) {
        foreach ($b in $big) {
            if ($b.MB -ge 100) { Die "$($b.File) is $($b.MB) MB. GitHub refuses any file of 100 MB or more. Remove it from history or use Git LFS." }
            Warn "$($b.File) is $($b.MB) MB — over GitHub's 50 MB warning threshold"
        }
    } else {
        Good 'no tracked file is near GitHub''s size limits'
    }

    # Named individually rather than described in general, because "confidential material" is easy
    # to nod past and a list of real filenames is not.
    # @() so that "no matches" is an empty array with a .Count of 0, not $null.
    $sensitive = @($tracked | Where-Object {
        $_ -match '\.msg$' -or
        $_ -match 'Purchase Report' -or
        $_ -match 'Ex-Form_Sample' -or
        $_ -match 'costing' -or
        $_ -match 'Workshop Notes'
    })
    if ($sensitive.Count -gt 0) {
        Say ''
        Warn "$($sensitive.Count) file(s) here are Dalgroup-confidential and have only ever lived on your network:"
        foreach ($s in $sensitive | Select-Object -First 12) { Say "          $s" }
        if ($sensitive.Count -gt 12) { Say "          ... and $($sensitive.Count - 12) more" }
        Say ''
        Warn 'the repository must be private. That is enforced in step 4, not assumed.'
    }

# ---- 3. the remote ----------------------------------------------------------------------------

    Say ''
    Say '3. The remote'

    $remotes = @(Invoke-Git remote) | Where-Object { $_ -ne '' }

    if ($remotes -contains 'origin') {
        $originUrl = (Invoke-Git remote get-url origin) | Select-Object -First 1
        Good "origin is $originUrl  (untouched)"
    }

    if ($remotes -contains $RemoteName) {
        $existing = (Invoke-Git remote get-url $RemoteName) | Select-Object -First 1
        if ($existing -ne $remoteUrl) {
            Invoke-Git remote set-url $RemoteName $remoteUrl | Out-Null
            Good "$RemoteName re-pointed from $existing to $remoteUrl"
        } else {
            Good "$RemoteName is already $remoteUrl"
        }
    } else {
        Invoke-Git remote add $RemoteName $remoteUrl | Out-Null
        Good "$RemoteName added"
    }

# ---- 4. the repository on GitHub, and that it is private --------------------------------------

    Say ''
    Say '4. The repository on GitHub'

    if ($CreateRepo) {
        if (-not $Token) { Die '-CreateRepo needs -Token, with the "repo" scope. Or create the repository at https://github.com/new and run again without -CreateRepo.' }

        # Is the owner you, or an organisation you belong to? The two take different endpoints.
        $me = $null
        try { $me = Invoke-GitHubApi GET '/user' } catch { Die "that token was refused by GitHub: $($_.Exception.Message)" }
        Good "token belongs to $($me.login)"

        $body = @{ name = $Repo; private = $true; auto_init = $false;
                   description = 'COTS - Export module workflow documents and the integrated mock-up' }
        try {
            if ($me.login -eq $Owner) { Invoke-GitHubApi POST '/user/repos' $body | Out-Null }
            else                      { Invoke-GitHubApi POST "/orgs/$Owner/repos" $body | Out-Null }
            Good "created $Owner/$Repo as PRIVATE"
        } catch {
            if ("$($_.Exception.Message)" -match '422') { Warn "$Owner/$Repo already exists — using it" }
            else { Die "could not create the repository: $($_.Exception.Message)" }
        }
    }

    # The visibility check. Runs whether or not we created it, and whether or not -CreateRepo was
    # passed, because the repository may have been made public since the last run.
    if ($Token) {
        try {
            $info = Invoke-GitHubApi GET "/repos/$Owner/$Repo"
            if ($info.private) {
                Good "$Owner/$Repo is PRIVATE"
            } else {
                Die "$Owner/$Repo is PUBLIC. This repository carries customer names, payment figures and internal mail. Set it to Private in Settings and run this again. Nothing has been pushed."
            }
        } catch {
            if ("$($_.Exception.Message)" -match '404') {
                Die "$Owner/$Repo does not exist, or that token cannot see it. Create it at https://github.com/new (Private, nothing initialised), or pass -CreateRepo."
            }
            Die "could not read the repository from GitHub: $($_.Exception.Message)"
        }
    } else {
        # One interpolated string, not three arguments joined with "+". `Warn 'a' + 'b'` passes
        # them as separate positional arguments and prints only the first.
        Warn 'no -Token given, so visibility cannot be verified from here'
        Warn "CONFIRM YOURSELF that https://github.com/$Owner/$Repo is Private before continuing"
    }

# ---- 5. the push ------------------------------------------------------------------------------

    Say ''
    Say '5. The push'

    if (-not $Push) {
        Say ''
        Good 'checks passed. Nothing was pushed.'
        Say ''
        Say '  Run it again with -Push when you are satisfied:'
        Say "      powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1 -Owner $Owner -Push"
        Say ''
        exit 0
    }

    <#
        A token, if given, has to reach git somehow. It goes into the remote's URL for the
        duration of the push and is taken out again in the finally below, so it is never left
        sitting in .git/config in plain text for anyone with a copy of the folder.

        It cannot simply be passed as a URL on the command line: "git push -u <url>" is refused
        with "fatal: --set-upstream requires a named remote", because an upstream is recorded
        against a remote name and a bare URL has none. So the named remote is what gets pushed,
        and its URL is what changes.
    #>
    $usingToken = [bool]$Token
    if ($usingToken) {
        Invoke-Git remote set-url $RemoteName "https://$($Token)@github.com/$Owner/$Repo.git" | Out-Null
    }

    <#
        The failure is recorded and reported AFTER the URL has been put back, rather than by
        calling Die here. Die ends the script with `exit`, and relying on a finally block to run
        through an exit is exactly the kind of subtlety that leaves a token sitting in
        .git/config on the one run where it mattered. So: no early exit inside this section.
    #>
    $failure = $null

    if ($Rebase) {
        Say '  joining the existing history on GitHub (pull --rebase)'
        Invoke-Git pull --rebase $RemoteName $Branch
        if ($LASTEXITCODE -ne 0) {
            $failure = 'the rebase did not finish. Resolve the conflicts, then run this again with -Push (no -Rebase).'
        } else {
            Good 'histories joined'
        }
    }

    if (-not $failure) {
        Say "  pushing $Branch to $RemoteName ..."
        Invoke-Git push -u $RemoteName "$($Branch):$($Branch)"
        if ($LASTEXITCODE -ne 0) {
            $failure = @"
the push was refused. The output above says why. The usual causes:

  * the repository on GitHub already has commits of its own
      -> run again with -Rebase to join the two histories. Never use --force here.

  * authentication failed
      -> Git Credential Manager should open a browser. If it did not, install Git for Windows,
         or pass -Token with a personal access token that has the "repo" scope.

  * push protection blocked a secret
      -> GitHub found something that looks like a credential in the history. Read the URL it
         printed; do not bypass it without looking.
"@
        }
    }

    # The token comes out of the remote URL here, on every path, before anything can exit.
    if ($usingToken) { Invoke-Git remote set-url $RemoteName $remoteUrl | Out-Null }

    if ($failure) { Say ''; Die $failure }

    Good "pushed $Branch to $Owner/$Repo"
    Say ''
    Say "  https://github.com/$Owner/$Repo"
    Say ''
    Say '  origin still points at Gitea. When the server is back:'
    Say '      git push origin main'
    Say ''

} finally {
    Pop-Location
}
