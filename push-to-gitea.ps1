<#
    Put everything in D:\CIMEgypt\COTS_30Aug26 into the Corporate_Systems/COTS repository on the
    local Gitea server.

    WHY THIS IS A SCRIPT RATHER THAN SOMETHING ALREADY DONE
    -------------------------------------------------------
    The Gitea server is at 192.168.24.147, a private address on your network. The session that wrote
    this runs in Anthropic's cloud and cannot reach it, and the Linux workspace that would let that
    session run commands on this machine did not start. So the push has to happen from here.

    Nothing here is destructive. It does not delete, move, rename or overwrite any of your files, it
    never force-pushes, and it stops rather than guessing when something is not as expected. The one
    file it writes is .gitignore at the repository root, and it will not replace an existing one
    without -Force.

    WHAT GOES IN
    ------------
    The repository root is this folder:

        COTS_30Aug26\
          COTS_Export_Merged_Mockup\    MergedMockup (self-contained, with vendor\) + the run scripts
          COTs_Export_Merged_Docs\      Ref\ and WorkFlows\

    Everything in it is committed except build output, dependencies and editor/Office noise - see the
    .gitignore below. In particular node_modules is never committed: it is 200 MB or so of files that
    "npm install" reproduces exactly, and Gitea should not be storing them.

    vendor\ IS committed, on purpose. It holds the Core, Shared and Export prototype sources that
    vendorize.ps1 copied in, and it is the reason MergedMockup builds on its own. Leaving it out
    would put a repository on the server that no one can run.

    USAGE
    -----
        powershell -ExecutionPolicy Bypass -File .\push-to-gitea.ps1           check and commit, no push
        powershell -ExecutionPolicy Bypass -File .\push-to-gitea.ps1 -Push     the same, then push

    Run it once without -Push, read the file counts and the size it reports, then run it again with
    -Push. If the repository on the server already has a commit of its own (Gitea makes one when
    "Initialize Repository" is ticked), add -Rebase to the -Push run and the two histories are joined
    rather than one overwriting the other.

    Safe to run more than once: it reuses the repository it made last time, and commits only what has
    changed since.
#>

[CmdletBinding()]
param(
    [switch]$Push,
    # Join an existing history on the server instead of stopping. Uses pull --rebase; never --force.
    [switch]$Rebase,
    [switch]$Force,
    [string]$Remote  = 'http://192.168.24.147:3000/Corporate_Systems/COTS.git',
    [string]$Branch  = 'main',
    [string]$Message = 'COTS - integrated mockup (self-contained) and the workshop reference documents'
)

$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host $m }
function Good ($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  note  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  STOP  $m" -ForegroundColor Red; exit 1 }

<#
    Finding git, and why the wrapper is not called "Git".

    $GitExe is resolved once, with -CommandType Application, so it is git.exe itself and cannot be a
    function, alias or anything else that happens to share the name. That matters: an earlier version
    of this script named the wrapper "Git" and called "& git" inside it. PowerShell matches command
    names without regard to case, so "git" found the wrapper, which called itself, until PowerShell
    stopped it with "The script failed due to call depth overflow". Hence both the Invoke- name and
    the resolved path.

    The wrapper exists because git writes ordinary, expected messages to stderr - "fatal: Needed a
    single revision" is simply how it answers "does this repository have any commits yet?" on a fresh
    repository. With $ErrorActionPreference = 'Stop', PowerShell turns stderr from a native command
    into a TERMINATING error the moment that output is redirected with 2>&1, so a correct answer from
    git killed the script. Here the preference is relaxed for the duration of the call and git
    reports the way it is designed to - through its exit code, which every caller checks with
    $LASTEXITCODE. The preference is restored afterwards, so a real PowerShell error anywhere else
    still stops the script.
#>
$script:GitExe = (Get-Command git.exe -CommandType Application -ErrorAction SilentlyContinue |
                  Select-Object -First 1 -ExpandProperty Source)
if (-not $script:GitExe) {
    Die 'git is not on the PATH. Install Git for Windows from https://git-scm.com/download/win, then close and reopen PowerShell and run this again.'
}

function Invoke-Git {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $script:GitExe @args 2>&1 } finally { $ErrorActionPreference = $old }
}

$root = $PSScriptRoot

Say ''
Say 'COTS -> Gitea'
Say '============='
Say "  repository root  $root"
Say "  remote           $Remote"
Say "  branch           $Branch"
Say ''

# ---- 1. prerequisites ----------------------------------------------------------------------------

Say '1. Checking prerequisites'

$gitVersion = Invoke-Git --version
if ($LASTEXITCODE -ne 0) {
    Die 'git is not on the PATH. Install Git for Windows from https://git-scm.com/download/win, then close and reopen PowerShell and run this again.'
}
Good $gitVersion

$who   = (Invoke-Git config user.name)  | Select-Object -First 1
$email = (Invoke-Git config user.email) | Select-Object -First 1
if (-not $who -or -not $email) {
    Die @"
git has no name or e-mail configured, so it cannot make a commit. Set them once:

    git config --global user.name  "Nasreen Sayed Siddig"
    git config --global user.email "nasreen.sayed@dalgroup.com"

then run this script again.
"@
}
Good "committing as $who <$email>"

# The mockup has to be the self-contained one, or a clone will not build. vendor\ is what makes it
# self-contained, so its absence is worth catching before anything is committed rather than after
# someone has cloned it.
$mockup = Join-Path $root 'COTS_Export_Merged_Mockup\MergedMockup'
if (-not (Test-Path -LiteralPath $mockup)) {
    Warn "MergedMockup is not at $mockup - continuing, but check the layout is what you meant"
} else {
    $vendorBits = @('vendor\core\theme.ts', 'vendor\shared\theme.ts', 'vendor\export\App.tsx')
    $absent = $vendorBits | Where-Object { -not (Test-Path -LiteralPath (Join-Path $mockup $_)) }
    if ($absent) {
        Die @"
the vendored prototype sources are incomplete: $($absent -join ', ') not found.

Without them the mockup in this repository cannot build after a clone. Run

    cd "$mockup"
    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go

and then run this script again.
"@
    }
    Good 'the mockup is self-contained (vendor\core, vendor\shared, vendor\export all present)'
}

# Reachability. Not fatal until the push itself.
$uri = [uri]$Remote
$reachable = $false
try {
    $probe = Test-NetConnection -ComputerName $uri.Host -Port $uri.Port -WarningAction SilentlyContinue
    $reachable = $probe.TcpTestSucceeded
} catch { $reachable = $false }
$server = "$($uri.Host):$($uri.Port)"
if ($reachable) { Good "$server is reachable" }
else            { Warn "cannot reach $server - check the server is up and you are on the network" }

# ---- 2. .gitignore -------------------------------------------------------------------------------

Say ''
Say '2. The .gitignore'

$gitignorePath = Join-Path $root '.gitignore'
$gitignore = @'
# COTS repository - what is not tracked.
#
# Everything in this folder is committed except the kinds of file below. If you add another folder
# to the repository root it is picked up automatically; nothing here has to be edited.

# Dependencies and build output. "npm install" reproduces node_modules exactly, so it does not
# belong on the server; dist/ and .vite/ are generated by "npm run build" and "npm run dev".
node_modules/
dist/
build/
.vite/
tsconfig.tsbuildinfo
*.tsbuildinfo

# NOTE: vendor/ is deliberately NOT ignored. It holds the Core, Shared and Export prototype sources
# that vendorize.ps1 copied into MergedMockup, and it is what lets the mockup build after a clone.

# Office lock and recovery files. These appear beside a document while Word or Visio has it open,
# are meaningless to anyone else, and change constantly.
~$*
~WRL*.tmp
*.~vsdx
*.tmp

# Editor and OS noise
.vscode/
.idea/
Thumbs.db
Desktop.ini
.DS_Store
*.log
npm-debug.log*
'@

if ((Test-Path -LiteralPath $gitignorePath) -and -not $Force) {
    Warn '.gitignore already exists at the root - leaving it alone (use -Force to replace it)'
} else {
    Set-Content -LiteralPath $gitignorePath -Value $gitignore -Encoding UTF8
    Good "wrote $gitignorePath"
}

# ---- 3. the repository ---------------------------------------------------------------------------

Say ''
Say '3. The repository'

Push-Location $root
try {
    if (Test-Path -LiteralPath (Join-Path $root '.git')) {
        Good 'a git repository already exists here - using it'
    } else {
        Invoke-Git init | Out-Null
        if ($LASTEXITCODE -ne 0) { Die 'git init failed - the output above says why.' }
        Good 'git init'
    }

    # Is there a commit yet? On a repository that has just been created there is not, and git says so
    # on stderr. That is expected, not a failure - see the note on the Git function above.
    Invoke-Git rev-parse --verify HEAD 2>&1 | Out-Null
    $hasCommit = ($LASTEXITCODE -eq 0)

    # "git init" names the first branch master or main depending on the git version and the user's
    # config, so it is set explicitly rather than assumed. Only before the first commit: renaming a
    # branch that already has history is a different operation and not this script's business.
    if (-not $hasCommit) {
        Invoke-Git symbolic-ref HEAD "refs/heads/$Branch" | Out-Null
        Good "branch $Branch (new repository, no commits yet)"
    } else {
        $current = (Invoke-Git rev-parse --abbrev-ref HEAD) | Select-Object -First 1
        if ($current -ne $Branch) {
            Warn "this repository is on branch '$current', not '$Branch' - committing to '$current'"
            $Branch = $current
        } else {
            Good "branch $Branch"
        }
    }

    $remotes = @(Invoke-Git remote)
    if ($remotes -contains 'origin') {
        $currentUrl = (Invoke-Git remote get-url origin) | Select-Object -First 1
        if ($currentUrl -ne $Remote) {
            Invoke-Git remote set-url origin $Remote | Out-Null
            Good "origin re-pointed from $currentUrl to $Remote"
        } else { Good "origin is already $Remote" }
    } else {
        Invoke-Git remote add origin $Remote | Out-Null
        Good 'origin added'
    }

    # ---- 4. staging ------------------------------------------------------------------------------

    Say ''
    Say '4. Staging'
    Say '   (this reads every file in the folder, so it can take a minute)'
    Invoke-Git add -A | Out-Null
    if ($LASTEXITCODE -ne 0) { Die 'git add failed - the output above says why. Nothing has been committed.' }

    # core.quotepath=false keeps names with spaces or non-ASCII characters readable, which matters
    # here: the reference folders have both. Without it git escapes them and the size check below
    # cannot find the files on disk.
    $files = @(Invoke-Git -c core.quotepath=false diff --cached --name-only)
    Good "$($files.Count) file(s) staged"

    # node_modules is ~200 MB of reproducible files and must never reach the server. If it is staged
    # the .gitignore is not being applied, and it is far easier to stop now than to strip it out of a
    # pushed history later.
    $leaked = $files | Where-Object { $_ -match '(^|/)node_modules/' }
    if ($leaked) {
        Die "node_modules is staged ($($leaked.Count) files) - the .gitignore is not being applied. Nothing has been committed. Check $gitignorePath, or run this script with -Force to rewrite it."
    }
    Good 'no node_modules staged'

    if ($files.Count -gt 0) {
        Say ''
        Say '   what is in this commit, by top-level folder:'
        $files |
            ForEach-Object { ($_ -split '/')[0] } |
            Group-Object | Sort-Object Count -Descending |
            ForEach-Object { Say ("     {0,6}  {1}" -f $_.Count, $_.Name) }

        # Size, and anything individually large. Gitea will take a big file, but a 100 MB document in
        # a repository is usually an accident and is painful to remove once pushed.
        $bytes = 0
        $big = @()
        foreach ($f in $files) {
            $full = Join-Path $root ($f -replace '/', '\')
            if (Test-Path -LiteralPath $full) {
                $len = (Get-Item -LiteralPath $full).Length
                $bytes += $len
                if ($len -gt 25MB) { $big += [pscustomobject]@{ MB = [math]::Round($len / 1MB, 1); Path = $f } }
            }
        }
        Say ''
        Say ("   total {0:N1} MB" -f ($bytes / 1MB))
        if ($big) {
            Say ''
            Warn 'these single files are larger than 25 MB - check they belong in a repository:'
            $big | Sort-Object MB -Descending | ForEach-Object { Say ("     {0,7:N1} MB  {1}" -f $_.MB, $_.Path) }
            Say '     (to leave one out, add its path to .gitignore, then run this script again)'
        }
    }

    # ---- 5. commit -------------------------------------------------------------------------------

    if ($files.Count -eq 0) {
        Say ''
        Warn 'nothing to commit - the working tree matches the last commit'
    } else {
        Say ''
        Say '5. Commit'
        Invoke-Git commit -m $Message | Out-Null
        if ($LASTEXITCODE -ne 0) { Die 'the commit failed - the output above says why. Nothing has been pushed.' }
        Good ((Invoke-Git log -1 --pretty='%h  %s') | Select-Object -First 1)
    }

    # ---- 6. push ---------------------------------------------------------------------------------

    if (-not $Push) {
        Say ''
        Say 'Committed locally. Nothing has been sent to the server yet.'
        Say 'When the counts and the size above look right, run:'
        Say ''
        Say '    powershell -ExecutionPolicy Bypass -File .\push-to-gitea.ps1 -Push'
        Say ''
        exit 0
    }

    Say ''
    Say '6. Push'
    if (-not $reachable) { Die "the server was not reachable at step 1 - not attempting the push." }
    Say '   If Gitea asks for credentials, use your Gitea username and password, or an access token.'
    Say ''

    Invoke-Git push -u origin $Branch
    if ($LASTEXITCODE -eq 0) {
        Say ''
        Good "pushed to $Remote ($Branch)"
        Say ''
        Say "    http://$server/Corporate_Systems/COTS"
        Say ''
        exit 0
    }

    # The usual reason: the repository on the server is not empty, because Gitea made a commit of its
    # own when it was created with "Initialize Repository" ticked.
    if (-not $Rebase) {
        Say ''
        Warn @"
The push was refused. The usual reason is that the repository on the server already has a commit of
its own - Gitea creates one if "Initialize Repository" was ticked.

To join the two histories, run this again with -Rebase:

    powershell -ExecutionPolicy Bypass -File .\push-to-gitea.ps1 -Push -Rebase

Do not use --force: it would discard whatever is already on the server.
"@
        exit 1
    }

    Say ''
    Say '   the server refused the push - pulling its history and rebasing onto it'
    Invoke-Git pull --rebase origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Say ''
        Die @"
the rebase did not finish cleanly. Nothing has been pushed and your files are untouched, but the
repository is mid-rebase. To put it back exactly as it was:

    git rebase --abort

Then look at what the server already has (open the repository in a browser) before trying again.
"@
    }
    Invoke-Git push -u origin $Branch
    if ($LASTEXITCODE -ne 0) { Die 'the push still failed - the output above says why. Nothing on the server has been changed.' }

    Say ''
    Good "pushed to $Remote ($Branch)"
    Say ''
    Say "    http://$server/Corporate_Systems/COTS"
    Say ''
}
finally { Pop-Location }
