<#
    Put the COTS work into the Corporate_ICT/COTS repository on the local Gitea server.

    WHY THIS IS A SCRIPT RATHER THAN SOMETHING ALREADY DONE
    -------------------------------------------------------
    The Gitea server is at 192.168.24.147, a private address on your network. The session that wrote
    this runs in Anthropic's cloud and cannot reach it, and the Linux workspace that would let that
    session run commands on this machine failed to start. So the push has to happen from here.

    Nothing in this script is destructive. It does not delete, move, rename or overwrite any working
    file, it never force-pushes, and it stops rather than guessing if something is not as expected.
    The one file it writes is .gitignore at the repository root, and it will not overwrite an
    existing one without -Force.

    WHAT IT MAKES A REPOSITORY OF, AND WHY THERE
    --------------------------------------------
    The root is D:\CIMEgypt\COTS_Claude — the folder that already holds all four current pieces:

        COTS_Claude\
          MergeModule_v1.2\MergeModule_v1.2\MergedMockup\   the integrated mockup, v1.5
          COTS_CoreModules_Mockups_Walkthroughs\            the Core prototype
          COTS_SharedModules_Mockups_Walkthroughs\          the Shared prototype
          COTS_Export_Mockup_v2.4\                          the Export prototype

    Initialising in place, rather than copying the four folders into a tidier layout somewhere else,
    is deliberate: the integrated mockup finds the three prototypes by walking up from its own
    location, so a clone reproduces a tree that builds without anything being re-pointed. It also
    means your working copy and the repository are the same files — no second copy to drift.

    That folder also holds superseded material — COTS_Export_Mockup_v2.0, v2.0_1, exportUpdate2,
    ExportUpdateV1, integrateedUpd, MergeModule_v1.1, "New folder", src. None of it is committed. The
    .gitignore written below ignores everything at the root and then re-admits only the four folders
    above, so the repository holds the current work and nothing else. To add one of the others later,
    add a matching "!/<name>/" line — that is the only edit needed.

    USAGE
    -----
        powershell -ExecutionPolicy Bypass -File .\git-setup.ps1            check and stage, no push
        powershell -ExecutionPolicy Bypass -File .\git-setup.ps1 -Push      the same, then push

    Run it once without -Push, read what it says it will commit, then run it again with -Push.
#>

[CmdletBinding()]
param(
    [switch]$Push,
    [switch]$Force,
    [string]$Remote  = 'http://192.168.24.147:3000/Corporate_ICT/COTS.git',
    [string]$Branch  = 'main',
    [string]$Message = 'COTS integrated mockup v1.5 — Core, Shared and Export prototypes with the integration layer'
)

$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host $m }
function Good ($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  note  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  STOP  $m" -ForegroundColor Red; exit 1 }

# The repository root is three levels above this script:
#   …\COTS_Claude\MergeModule_v1.2\MergeModule_v1.2\MergedMockup\git-setup.ps1
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path

Say ''
Say 'COTS -> Gitea'
Say '============='
Say "  repository root  $root"
Say "  remote           $Remote"
Say "  branch           $Branch"
Say ''

# ---- 1. the things that have to be true before anything is created -------------------------------

Say '1. Checking prerequisites'

try   { $gitVersion = (& git --version) 2>&1 }
catch { Die 'git is not on the PATH. Install Git for Windows from https://git-scm.com/download/win and run this again.' }
Good $gitVersion

if (-not (Test-Path $root)) { Die "the repository root does not exist: $root" }

# The four folders that make up the repository. All four must be present, or the commit is partial
# and a clone will not build — better to stop than to publish a tree that cannot be run.
$tracked = @(
    'MergeModule_v1.2',
    'COTS_CoreModules_Mockups_Walkthroughs',
    'COTS_SharedModules_Mockups_Walkthroughs',
    'COTS_Export_Mockup_v2.4'
)
$missing = $tracked | Where-Object { -not (Test-Path (Join-Path $root $_)) }
if ($missing) { Die "these folders are not in $root and the repository would be incomplete: $($missing -join ', ')" }
Good "all four folders present"

# The integrated mockup should be the v1.5 one. A wrong version here is worth catching now.
$readme = Join-Path $root 'MergeModule_v1.2\MergeModule_v1.2\MergedMockup\README.md'
if (Test-Path $readme) {
    $first = (Get-Content $readme -First 1)
    if ($first -match 'v1\.5') { Good "MergedMockup is $($first -replace '^#\s*','')" }
    else { Warn "MergedMockup README says: $first  (expected v1.5 — continuing anyway)" }
}

# Reachability. A failure here is not fatal until we actually push.
$reachable = $false
try {
    $uri = [uri]$Remote
    $probe = Test-NetConnection -ComputerName $uri.Host -Port $uri.Port -WarningAction SilentlyContinue
    $reachable = $probe.TcpTestSucceeded
} catch { $reachable = $false }
if ($reachable) { Good "$($([uri]$Remote).Host):$($([uri]$Remote).Port) is reachable" }
else            { Warn "cannot reach $($([uri]$Remote).Host):$($([uri]$Remote).Port) — check the server is up and you are on the network" }

# ---- 2. .gitignore ------------------------------------------------------------------------------

Say ''
Say '2. The .gitignore'

$gitignorePath = Join-Path $root '.gitignore'
$gitignore = @'
# COTS repository — what is tracked, and what is not.
#
# The root of this repository also holds superseded work (earlier Export mock-ups, earlier merge
# modules, scratch folders). Rather than list every folder to exclude and have the list go stale,
# everything at the root is ignored and the four current folders are re-admitted by name.
#
# To start tracking another root folder, add a line: !/<folder-name>/

/*
!/.gitignore
!/.gitattributes
!/README.md

!/MergeModule_v1.2/
!/COTS_CoreModules_Mockups_Walkthroughs/
!/COTS_SharedModules_Mockups_Walkthroughs/
!/COTS_Export_Mockup_v2.4/

# Build output and dependencies, at any depth inside the folders above.
# These rules come after the re-admissions on purpose: a later rule wins.
node_modules/
dist/
build/
.vite/
tsconfig.tsbuildinfo
*.tsbuildinfo

# Editor and OS noise
.vscode/
.idea/
Thumbs.db
Desktop.ini
.DS_Store
*.log
npm-debug.log*
'@

if ((Test-Path $gitignorePath) -and -not $Force) {
    Warn ".gitignore already exists at the root — leaving it alone (use -Force to replace it)"
} else {
    Set-Content -Path $gitignorePath -Value $gitignore -Encoding UTF8
    Good "wrote $gitignorePath"
}

# ---- 3. the repository --------------------------------------------------------------------------

Say ''
Say '3. The repository'

Push-Location $root
try {
    if (Test-Path (Join-Path $root '.git')) {
        Good 'a git repository already exists here — using it'
    } else {
        & git init | Out-Null
        Good 'git init'
    }

    # `git init` names the first branch differently depending on the Git version and config, so it is
    # set explicitly rather than assumed.
    & git symbolic-ref HEAD "refs/heads/$Branch" 2>&1 | Out-Null
    Good "branch $Branch"

    # An identity has to exist or the commit fails with a message people find confusing.
    $who   = (& git config user.name)  2>&1
    $email = (& git config user.email) 2>&1
    if (-not $who -or -not $email) {
        Die @"
git has no name or e-mail configured, so it cannot make a commit. Set them once:

    git config --global user.name  "Your Name"
    git config --global user.email "you@dalgroup.com"

then run this script again.
"@
    }
    Good "committing as $who <$email>"

    $existing = (& git remote) 2>&1
    if ($existing -contains 'origin') {
        $currentUrl = (& git remote get-url origin) 2>&1
        if ($currentUrl -ne $Remote) {
            & git remote set-url origin $Remote
            Good "origin re-pointed from $currentUrl to $Remote"
        } else { Good "origin is already $Remote" }
    } else {
        & git remote add origin $Remote
        Good "origin added"
    }

    Say ''
    Say '4. Staging'
    & git add -A
    $staged = (& git diff --cached --name-only) | Measure-Object -Line
    Good "$($staged.Lines) file(s) staged"

    # A sanity check worth having: node_modules is large and must never reach the server.
    $leaked = (& git diff --cached --name-only) | Where-Object { $_ -match '(^|/)node_modules/' }
    if ($leaked) { Die "node_modules is staged ($($leaked.Count) files) — the .gitignore is not being applied. Nothing has been committed." }
    Good 'no node_modules staged'

    Say ''
    Say '   top-level folders in this commit:'
    (& git diff --cached --name-only) |
        ForEach-Object { ($_ -split '/')[0] } |
        Group-Object | Sort-Object Count -Descending |
        ForEach-Object { Say ("     {0,6}  {1}" -f $_.Count, $_.Name) }

    if ($staged.Lines -eq 0) {
        Warn 'nothing to commit — the working tree matches the last commit'
    } else {
        Say ''
        Say '5. Commit'
        & git commit -m $Message | Out-Null
        Good (& git log -1 --pretty='%h  %s')
    }

    if ($Push) {
        Say ''
        Say '6. Push'
        if (-not $reachable) { Die 'the server was not reachable at step 1 — not attempting the push.' }
        Say '   If Gitea asks for credentials, use your Gitea username and password or an access token.'
        & git push -u origin $Branch
        if ($LASTEXITCODE -ne 0) {
            Say ''
            Warn @"
The push was refused. The usual reason is that the repository on the server is not empty —
Gitea creates a README if you ticked "Initialize Repository". If so, join the two histories:

    git pull --rebase origin $Branch
    git push -u origin $Branch

Do not use --force: it would discard whatever is already on the server.
"@
            exit 1
        }
        Good "pushed to $Remote ($Branch)"
    } else {
        Say ''
        Say 'Committed locally. Nothing has been sent to the server yet.'
        Say 'When you are happy with the file counts above, run:'
        Say ''
        Say '    powershell -ExecutionPolicy Bypass -File .\git-setup.ps1 -Push'
        Say ''
    }
}
finally { Pop-Location }
