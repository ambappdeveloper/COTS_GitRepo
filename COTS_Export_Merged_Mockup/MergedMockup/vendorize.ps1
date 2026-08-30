<#
    Bring the Core, Shared and Export prototype sources INTO this project, so the folder runs on
    its own.

    THE PROBLEM THIS SOLVES
    -----------------------
    This mockup does not contain the three module prototypes it shows. It compiles them from their
    own folders, which vite.config.ts finds by walking up from this one. Copy MergedMockup by
    itself and `npm run dev` stops at

        [cots] Could not find the Shared module sources ...

    because the siblings it walked up to are not there. That is exactly what happened to the copy
    at D:\CIMEgypt\COTS_30Aug26\MockUpV1\MergedMockup.

    WHAT THIS SCRIPT DOES
    ---------------------
    It copies the three source trees, and the Export portable build, into this project:

        vendor\core             <- COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src
        vendor\shared           <- COTS_SharedModules_Mockups_Walkthroughs\react\src
        vendor\export           <- COTS_Export_Mockup_v2.4\export-process-mockup\src
        vendor\export-portable  <- COTS_Export_Mockup_v2.4\portable\COTS Export Mock-up.html

    vite.config.ts and tsconfig.json already look in vendor\ FIRST, so after one run this folder is
    self-contained: zip it, copy it to another drive or another machine, and `npm run dev` works
    with nothing beside it. The originals are never modified.

    node_modules IS NOT COPIED FROM THE PROTOTYPES, AND THAT IS DELIBERATE
    ---------------------------------------------------------------------
    vite.config.ts aliases every bare import in all three prototypes - react, react-dom,
    react-router-dom, @mui/material, @mui/icons-material, @emotion/react, @emotion/styled - to this
    project's single node_modules. That is what stops React being loaded twice. The prototypes'
    own node_modules are never read, so only THIS project's node_modules has to travel with it.

    KEEPING IT UP TO DATE
    ---------------------
    vendor\ is a copy taken at a moment in time. If someone changes a prototype afterwards, this
    project will not see it until you run the script again with -Refresh. If you would rather track
    a prototype live while it is being worked on, delete vendor\ - the config falls back to the
    sibling folders exactly as before.

    USAGE
    -----
        powershell -ExecutionPolicy Bypass -File .\vendorize.ps1                 see what it would do
        powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go             do it
        powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh    re-copy over an existing vendor\

    Without -Go it only reports. Run it that way first.
#>

[CmdletBinding()]
param(
    [switch]$Go,
    # Mirror over an existing vendor\ subfolder, so a file deleted in the prototype since the last
    # copy does not survive here.
    [switch]$Refresh
)

$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host $m }
function Good ($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  note  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  STOP  $m" -ForegroundColor Red; exit 1 }

$here   = $PSScriptRoot
$vendor = Join-Path $here 'vendor'

Say ''
Say 'Vendoring the COTS prototypes into the integrated mockup'
Say '======================================================='
Say "  project  $here"
Say "  vendor   $vendor"
Say ''

# --- finding the sources --------------------------------------------------------------------------
#
# The same candidate lists vite.config.ts uses, MINUS the vendor\ entry. Leaving vendor out matters:
# if it were in the list, a second run would find the copy it made last time and copy vendor onto
# itself. An environment variable still wins, the same way it does in the config.

function Find-Source ($label, $envVar, $candidates) {
    $override = [Environment]::GetEnvironmentVariable($envVar)
    if ($override) {
        if (-not (Test-Path -LiteralPath $override)) { Die "$envVar is set to `"$override`", which does not exist." }
        return (Resolve-Path -LiteralPath $override).Path
    }
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { return (Resolve-Path -LiteralPath $c).Path }
    }
    Say ''
    Die @"
could not find $label.

Looked in:
$($candidates | ForEach-Object { "  . $_" } | Out-String)
Set $envVar to the right folder and run again, e.g.

    `$env:$envVar = 'D:\CIMEgypt\COTS_Claude\...'
    .\vendorize.ps1 -Go
"@
}

$P = { param($rel) [System.IO.Path]::GetFullPath((Join-Path $here $rel)) }

$core = Find-Source 'the Core module sources (the folder holding theme.ts, store.tsx, layouts/, pages/)' 'COTS_CORE_SRC' @(
    (& $P '..\COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src'),
    (& $P '..\..\COTS_CoreModules_Consolidated\mockups\CoreModules\react\src'),
    (& $P '..\..\..\COTS_CoreModules_Consolidated\mockups\CoreModules\react\src'),
    (& $P '..\..\..\COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src'),
    (& $P '..\..\COTS_CoreModules_Mockups_Walkthroughs\CoreModules\react\src')
)

$shared = Find-Source 'the Shared module sources (the folder holding theme.ts, state/, layouts/, pages/)' 'COTS_SHARED_SRC' @(
    (& $P '..\COTS_SharedModules_Mockups_Walkthroughs\react\src'),
    (& $P '..\..\COTS_SharedModules_mockup_src_4\src'),
    (& $P '..\..\..\COTS_SharedModules_mockup_src_4\src'),
    (& $P '..\..\..\COTS_SharedModules_Mockups_Walkthroughs\react\src'),
    (& $P '..\..\COTS_SharedModules_Mockups_Walkthroughs\react\src')
)

$exportSrc = Find-Source 'the Export module sources (the folder holding App.tsx, pages/, domain/, services/)' 'COTS_EXPORT_SRC' @(
    (& $P '..\COTS_Export_Mockup_v2.4\export-process-mockup\src'),
    (& $P '..\..\..\COTS_Export_Mockup_v2.4\export-process-mockup\src'),
    (& $P '..\..\COTS_Export_Mockup_v2.4\export-process-mockup\src'),
    (& $P '..\..\..\..\ExportProcessMockup\COTS_Export_Mockup_v2.4\export-process-mockup\src'),
    (& $P '..\..\..\COTS_Export_Mockup_v2.0\export-process-mockup\src')
)

# The portable build is the one thing that is NOT fatal if missing: without it every screen still
# runs and only the Export bridge shows its not-found state. So this one is looked up and reported
# rather than stopped on.
$portableCandidates = @(
    (& $P '..\COTS_Export_Mockup_v2.4\portable\COTS Export Mock-up.html'),
    (& $P '..\..\..\COTS_Export_Mockup_v2.4\portable\COTS Export Mock-up.html'),
    (& $P '..\..\COTS_Export_Mockup_v2.4\portable\COTS Export Mock-up.html'),
    (& $P '..\..\..\..\ExportProcessMockup\COTS_Export_Mockup_v2.4\portable\COTS Export Mock-up.html'),
    (& $P '..\..\..\COTS_Export_Mockup_v2.0\portable\COTS Export Mock-up.html'),
    (& $P '..\..\COTS_Export_Mockup_v2.0\portable\COTS Export Mock-up.html')
)
if ($env:COTS_EXPORT_PORTABLE) { $portableCandidates = @($env:COTS_EXPORT_PORTABLE) + $portableCandidates }
$portable = $portableCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

Say '1. Sources found'
Say ("   core     {0}" -f $core)
Say ("   shared   {0}" -f $shared)
Say ("   export   {0}" -f $exportSrc)
if ($portable) { Say ("   portable {0}" -f $portable) }
else { Warn 'the Export portable build was not found - the Export bridge screens will show their not-found state' }

# --- the plan -------------------------------------------------------------------------------------

$plan = @(
    @{ From = $core;      To = 'core';   What = 'Core sources' },
    @{ From = $shared;    To = 'shared'; What = 'Shared sources' },
    @{ From = $exportSrc; To = 'export'; What = 'Export sources' }
)

# A guard worth having: if a "source" is already inside vendor\, something is pointed at the copy
# rather than the original and robocopy would be asked to mirror a folder onto itself.
foreach ($p in $plan) {
    if ($p.From.ToLower().StartsWith($vendor.ToLower())) {
        Die "$($p.What) resolved to $($p.From), which is inside vendor\. That is the copy, not the original. Set the matching COTS_*_SRC variable to the real prototype folder."
    }
}

Say ''
Say '2. What will be copied'

$exclude = @('node_modules', 'dist', '.vite')
$totalBytes = 0
foreach ($p in $plan) {
    $files = Get-ChildItem -LiteralPath $p.From -Recurse -File -Force -ErrorAction SilentlyContinue |
             Where-Object { $rel = $_.FullName.Substring($p.From.Length); -not ($exclude | Where-Object { $rel -like "*\$_\*" }) }
    $bytes = ($files | Measure-Object Length -Sum).Sum
    if (-not $bytes) { $bytes = 0 }
    $totalBytes += $bytes
    Say ("   vendor\{0,-16} {1,6:N0} files  {2,7:N1} MB" -f $p.To, $files.Count, ($bytes / 1MB))
}
if ($portable) {
    $pb = (Get-Item -LiteralPath $portable).Length
    $totalBytes += $pb
    Say ("   vendor\{0,-16} {1,6:N0} files  {2,7:N1} MB" -f 'export-portable', 1, ($pb / 1MB))
}
Say ''
Say ("   total {0:N1} MB   (node_modules, dist and .vite are not copied)" -f ($totalBytes / 1MB))

# --- the destination ------------------------------------------------------------------------------

Say ''
Say '3. The destination'

$occupied = @()
if (Test-Path -LiteralPath $vendor) {
    foreach ($p in $plan) {
        $t = Join-Path $vendor $p.To
        if (Test-Path -LiteralPath $t) {
            $n = (Get-ChildItem -LiteralPath $t -Recurse -File -Force -ErrorAction SilentlyContinue).Count
            if ($n -gt 0) { $occupied += "vendor\$($p.To) ($n files)" }
        }
    }
}
if ($occupied) {
    if ($Refresh) { Warn "these will be REPLACED exactly: $($occupied -join ', ')" }
    else {
        Say ''
        Die @"
vendor\ already holds: $($occupied -join ', ')

Copying over it would merge an old copy with a new one, and a file deleted from a prototype since
the last run would survive here. Nothing has been changed. Run again with -Refresh to replace it:

    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh
"@
    }
} else {
    Good 'vendor\ is empty or does not exist yet'
}

if (-not $Go) {
    Say ''
    Say 'This was a dry run - nothing has been copied.'
    Say 'To do it:'
    Say ''
    Say ("    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go{0}" -f $(if ($occupied) { ' -Refresh' } else { '' }))
    Say ''
    exit 0
}

# --- the copy -------------------------------------------------------------------------------------

Say ''
Say '4. Copying'

New-Item -ItemType Directory -Path $vendor -Force | Out-Null

foreach ($p in $plan) {
    $target = Join-Path $vendor $p.To

    # /E   subdirectories, including empty ones
    # /MIR only when replacing, so the result is exactly the source and no stale file survives
    # /XD  excluded directories   /NFL /NDL quieter   /R:2 /W:2 do not hang on a locked file
    $mode = if ($Refresh -and (Test-Path -LiteralPath $target)) { '/MIR' } else { '/E' }
    $roboArgs = @($p.From, $target, $mode, '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:2', '/W:2')
    foreach ($d in $exclude) { $roboArgs += @('/XD', (Join-Path $p.From $d)) }
    $roboArgs += @('/XF', 'tsconfig.tsbuildinfo')

    Say ("   vendor\{0}" -f $p.To)
    & robocopy @roboArgs | Out-Null
    # Robocopy's exit code is a bit-field: 0-7 is success, 8 and above is a real failure.
    if ($LASTEXITCODE -ge 8) { Die "robocopy failed on vendor\$($p.To) with code $LASTEXITCODE" }
    Good "vendor\$($p.To) copied"
}

if ($portable) {
    $pdir = Join-Path $vendor 'export-portable'
    New-Item -ItemType Directory -Path $pdir -Force | Out-Null
    Copy-Item -LiteralPath $portable -Destination (Join-Path $pdir 'COTS Export Mock-up.html') -Force
    Good 'vendor\export-portable copied'
}

# --- a note beside the copy, so the next person knows what it is -----------------------------------

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
@"
# vendor\ - the prototype sources, copied in

Written by ``vendorize.ps1`` on $stamp. Do not edit anything in here: it is a copy, and the next
``vendorize.ps1 -Go -Refresh`` overwrites it.

    core             <- $core
    shared           <- $shared
    export           <- $exportSrc
    export-portable  <- $(if ($portable) { $portable } else { '(not found at the time of the copy)' })

``vite.config.ts`` and ``tsconfig.json`` look here first, which is what lets this project be copied
anywhere on its own. Delete this folder and they fall back to the sibling prototype folders.

To change one of the prototypes, change it in its own folder above and re-run

    powershell -ExecutionPolicy Bypass -File .\vendorize.ps1 -Go -Refresh
"@ | Set-Content -LiteralPath (Join-Path $vendor 'README.md') -Encoding UTF8

# --- did it arrive --------------------------------------------------------------------------------

Say ''
Say '5. Checking the copy'

$problems = @()
$expect = @(
    'core\theme.ts',
    'shared\theme.ts',
    'export\App.tsx',
    'export\auth\AuthContext.tsx',
    'shared\mockData\s05.ts',
    'shared\layouts\AppShell.tsx'
)
foreach ($f in $expect) {
    $full = Join-Path $vendor $f
    if (Test-Path -LiteralPath $full) { Good $f }
    else { $problems += "not found after the copy: vendor\$f" }
}

foreach ($p in $plan) {
    $n = (Get-ChildItem -LiteralPath (Join-Path $vendor $p.To) -Recurse -File -Force -ErrorAction SilentlyContinue).Count
    Say ("   vendor\{0,-16} {1,6:N0} files" -f $p.To, $n)
}

Say ''
if ($problems) {
    foreach ($x in $problems) { Warn $x }
    Say ''
    Warn 'The copy finished but the checks above did not all pass. The three files it looks for are the'
    Warn 'ones vite.config.ts substitutes or aliases; if one is missing the prototype layout is not what'
    Warn 'this script expects. Look at that before running the mockup.'
    exit 1
}

Say 'Done. Now:'
Say ''
Say '    npm run dev'
Say ''
Say 'Vite should print  (vendored)  after all four paths, and'
Say '"All four are inside this folder - it can be copied anywhere and still run."'
Say ''
Say 'From then on you can copy this MergedMockup folder anywhere by itself. Take node_modules with it,'
Say 'or run npm install at the destination.'
Say ''
