<#
    Set the git identity for this repository, and optionally correct the commit already pushed.

    WHY THIS EXISTS
    ---------------
    The first commit went to the server as

        Nesreen EL_Hussain <nasreen.store@gmail.com>

    because that is what "git config --global" holds on this machine. The wanted identity is

        nasreen.sayed <nasreen.sayed@dalgroup.com>

    Setting the identity only changes FUTURE commits. The one already made keeps the old name until
    it is rewritten, which is what -RewriteHistory does.

    WHAT EACH MODE DOES
    -------------------
    By default this script only writes the identity into .git\config for THIS repository (not
    --global, so your other repositories are untouched) and then reports what the existing commits
    say. Nothing is rewritten and nothing is pushed.

    With -RewriteHistory it also rewrites the author and committer of every existing commit to the
    new identity and force-pushes the result.

    ABOUT THE FORCE-PUSH, BECAUSE IT DESERVES A SENTENCE
    ---------------------------------------------------
    Rewriting a commit gives it a new hash - a commit's identity is part of what it is - so the
    branch on the server has to be replaced rather than added to. That is a force-push, and it is
    normally a thing to avoid. It is safe HERE for a specific reason: this repository has exactly one
    commit, made minutes ago by you, and nobody else has cloned it. If someone HAS cloned it since,
    stop and tell them first: their clone will not fast-forward afterwards.

    The push uses --force-with-lease, not --force. The difference matters: --force-with-lease refuses
    if anything reached the server after your last fetch, so it cannot silently discard someone
    else's work. Plain --force would.

    Locally the rewrite is reversible. filter-branch keeps the previous branch tip at
    refs/original/refs/heads/main, and the section at the end of this script's output says how to get
    back to it.

    USAGE
    -----
        powershell -ExecutionPolicy Bypass -File .\set-git-identity.ps1
            set the identity for this repository and report. Nothing else.

        powershell -ExecutionPolicy Bypass -File .\set-git-identity.ps1 -RewriteHistory
            the same, then rewrite the existing commits and force-push with lease.

    Run it once without -RewriteHistory first and read what it says about the existing commits.
#>

[CmdletBinding()]
param(
    [string]$Name  = 'nasreen.sayed',
    [string]$Email = 'nasreen.sayed@dalgroup.com',
    [switch]$RewriteHistory,
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host $m }
function Good ($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  note  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  STOP  $m" -ForegroundColor Red; exit 1 }

# git.exe is resolved once as an Application, so the wrapper below cannot accidentally call itself,
# and it is run with the error preference relaxed because git reports normal answers on stderr.
# See push-to-gitea.ps1 for the longer version of both stories.
$script:GitExe = (Get-Command git.exe -CommandType Application -ErrorAction SilentlyContinue |
                  Select-Object -First 1 -ExpandProperty Source)
if (-not $script:GitExe) { Die 'git is not on the PATH.' }

function Invoke-Git {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $script:GitExe @args 2>&1 } finally { $ErrorActionPreference = $old }
}

$root = $PSScriptRoot

Say ''
Say 'git identity'
Say '============'
Say "  repository  $root"
Say "  name        $Name"
Say "  e-mail      $Email"
Say ''

Push-Location $root
try {
    if (-not (Test-Path -LiteralPath (Join-Path $root '.git'))) { Die "there is no git repository at $root" }

    # ---- 1. the identity, for this repository only ----------------------------------------------

    Say '1. Setting the identity for this repository'

    Invoke-Git config user.name  $Name  | Out-Null
    Invoke-Git config user.email $Email | Out-Null
    $who   = (Invoke-Git config user.name)  | Select-Object -First 1
    $email = (Invoke-Git config user.email) | Select-Object -First 1
    Good "future commits will be by $who <$email>"
    Say  '        (this repository only - your global identity is untouched)'

    # ---- 2. what is already committed ------------------------------------------------------------

    Say ''
    Say '2. The commits already made'

    Invoke-Git rev-parse --verify HEAD 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Good 'there are no commits yet - nothing to correct'
        Say ''
        Say 'Done.'
        exit 0
    }

    $count = [int]((Invoke-Git rev-list --count HEAD) | Select-Object -First 1)
    Say ''
    Invoke-Git log --pretty='     %h  %an <%ae>  %s' | ForEach-Object { Say $_ }
    Say ''

    $wrong = @(Invoke-Git log --pretty='%ae' | Where-Object { $_ -ne $Email })
    if ($wrong.Count -eq 0) {
        Good 'every commit already carries the new e-mail - nothing to rewrite'
        Say ''
        Say 'Done.'
        exit 0
    }
    Warn "$($wrong.Count) of $count commit(s) carry a different e-mail"

    if (-not $RewriteHistory) {
        Say ''
        Say 'The identity is set, so anything you commit from now on is correct.'
        Say 'To also correct the commit(s) above and replace them on the server, run:'
        Say ''
        Say '    powershell -ExecutionPolicy Bypass -File .\set-git-identity.ps1 -RewriteHistory'
        Say ''
        Say 'Read the note about the force-push at the top of this file first. In short: it is safe'
        Say 'because nobody else has cloned this repository yet. If someone has, tell them before you'
        Say 'run it.'
        Say ''
        exit 0
    }

    # ---- 3. the rewrite --------------------------------------------------------------------------

    Say ''
    Say '3. Rewriting the existing commits'

    # A clean tree matters: both routes below commit, and an unrelated staged change would be swept
    # into the rewritten commit without anyone noticing.
    $dirty = @(Invoke-Git status --porcelain)
    if ($dirty.Count -gt 0) {
        Die @"
there are uncommitted changes in this folder, and rewriting on top of them would fold them into the
corrected commit. Commit or set them aside first:

    git status

Nothing has been changed.
"@
    }
    Good 'the working tree is clean'

    if ($count -eq 1) {
        # One commit, and it is HEAD: amending is exact and leaves nothing behind to clean up.
        # --reset-author makes the author match the committer, which is the identity just set.
        Invoke-Git commit --amend --reset-author --no-edit | Out-Null
        if ($LASTEXITCODE -ne 0) { Die 'the amend failed - the output above says why. Nothing has been pushed.' }
        Good 'the single commit was amended'
    } else {
        # More than one: rewrite them all. filter-branch is used rather than filter-repo because it
        # ships with Git for Windows and needs nothing installed.
        $env:FILTER_BRANCH_SQUELCH_WARNING = '1'
        $filter = "export GIT_AUTHOR_NAME='$Name'; export GIT_AUTHOR_EMAIL='$Email'; export GIT_COMMITTER_NAME='$Name'; export GIT_COMMITTER_EMAIL='$Email'"
        Invoke-Git filter-branch -f --env-filter $filter --tag-name-filter cat -- --branches --tags
        if ($LASTEXITCODE -ne 0) { Die 'filter-branch failed - the output above says why. Nothing has been pushed.' }
        Good "$count commit(s) rewritten"
        Say  "        (the previous tip is kept at refs/original/refs/heads/$Branch)"
    }

    Say ''
    Say '   the history now reads:'
    Invoke-Git log --pretty='     %h  %an <%ae>  %s' | ForEach-Object { Say $_ }

    # ---- 4. replacing the branch on the server ---------------------------------------------------

    Say ''
    Say '4. Replacing the branch on the server'
    Say '   --force-with-lease, so this refuses rather than overwrites if anything reached the'
    Say '   server after your last fetch.'
    Say ''

    Invoke-Git push --force-with-lease origin $Branch
    if ($LASTEXITCODE -ne 0) {
        Say ''
        Die @"
the push was refused. If the message mentions "stale info", something reached the server after your
last fetch - fetch and look at it before doing anything else:

    git fetch origin
    git log --oneline origin/$Branch

Your local history is already corrected; nothing on the server has been changed.
"@
    }

    Say ''
    Good "the corrected history is on the server as $Name <$Email>"
    Say ''
    Say 'If you need to undo the local rewrite, the previous tip is still here:'
    Say ''
    Say "    git reflog                    # find the commit from before the rewrite"
    Say "    git reset --hard <that hash>  # go back to it"
    Say ''
}
finally { Pop-Location }
