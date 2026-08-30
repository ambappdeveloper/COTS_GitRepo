<#
    Copy the current mockup to a self-contained snapshot folder.

    WHY A SCRIPT
    ------------
    The session that wrote this runs in Anthropic's cloud. It can write single files back to the
    folders connected to it, but this is a copy of four folders and thousands of files — including an
    installed node_modules — to a folder that is not connected to it. That is a job for the machine
    the files are already on, so it is a script you run rather than something already done.

    Nothing here deletes anything unless you pass -Overwrite, and even then only inside the
    destination folders it is replacing. The source is never modified.

    WHAT IT COPIES, AND WHY IT IS LAID OUT THAT WAY
    -----------------------------------------------
    The integrated mockup does not stand alone: it compiles the Core, Shared and Export prototypes
    from their own folders, which it finds by walking up from its own location. Copying MergedMockup
    by itself would produce a folder that cannot build. So all four go, as siblings:

        <destination>\
          MergedMockup\                              the integrated mockup, v1.5
          COTS_CoreModules_Mockups_Walkthroughs\     the Core prototype
          COTS_SharedModules_Mockups_Walkthroughs\   the Shared prototype
          COTS_Export_Mockup_v2.4\                   the Export prototype

    That sibling layout is a search path the mockup already knows — it was added to vite.config.ts
    and tsconfig.json on 30 August 2026 for exactly this. Nothing needs re-pointing after the copy,
    and no file has to be edited at the destination.

    Note that this is FLATTER than the source, where the mockup sits three levels down at
    MergeModule_v1.2\MergeModule_v1.2\MergedMockup. That nesting carries no meaning and the snapshot
    drops it.

    ONE node_modules, NOT FOUR
    --------------------------
    MergedMockup's node_modules is copied, so `npm run dev` works at the destination with nothing to
    install. The three prototypes' node_modules are NOT copied, and that is deliberate rather than a
    saving: vite.config.ts aliases every bare import in all three prototypes — react, react-dom,
    react-router-dom, @mui/material, @mui/icons-material, @emotion/react, @emotion/styled — to
    MergedMockup's single dependency tree. That is what stops React being loaded twice. Their own
    node_modules folders are never read when the integrated mockup runs.

    This was checked rather than assumed: every bare import across the three prototypes' sources is
    in that alias list. The only ones outside it are @testing-library/react and vitest, which appear
    in test files that the application build does not include.

    USAGE
    -----
        powershell -ExecutionPolicy Bypass -File .\make-snapshot.ps1               see what it would do
        powershell -ExecutionPolicy Bypass -File .\make-snapshot.ps1 -Go           do it
        powershell -ExecutionPolicy Bypass -File .\make-snapshot.ps1 -Go -Overwrite  replace what is there

    Without -Go it only reports. Run it that way first.
#>

[CmdletBinding()]
param(
    [string]$Destination = 'D:\CIMEgypt\COTS_30Aug26\MockUp',
    [switch]$Go,
    [switch]$Overwrite,
    # Off by default because the prototypes' own node_modules are never read — see the note above.
    [switch]$IncludePrototypeModules
)

$ErrorActionPreference = 'Stop'

function Say  ($m) { Write-Host $m }
function Good ($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  note  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "  STOP  $m" -ForegroundColor Red; exit 1 }

# …\COTS_Claude\MergeModule_v1.2\MergeModule_v1.2\MergedMockup\make-snapshot.ps1
$mockup = $PSScriptRoot
$source = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path

Say ''
Say 'Snapshot of the COTS integrated mockup'
Say '======================================'
Say "  from  $source"
Say "  to    $Destination"
Say ''

# ---- what goes, and where it lands --------------------------------------------------------------

$plan = @(
    @{ From = $mockup
       To   = 'MergedMockup'
       What = 'the integrated mockup'
       KeepModules = $true },
    @{ From = Join-Path $source 'COTS_CoreModules_Mockups_Walkthroughs'
       To   = 'COTS_CoreModules_Mockups_Walkthroughs'
       What = 'the Core prototype'
       KeepModules = [bool]$IncludePrototypeModules },
    @{ From = Join-Path $source 'COTS_SharedModules_Mockups_Walkthroughs'
       To   = 'COTS_SharedModules_Mockups_Walkthroughs'
       What = 'the Shared prototype'
       KeepModules = [bool]$IncludePrototypeModules },
    @{ From = Join-Path $source 'COTS_Export_Mockup_v2.4'
       To   = 'COTS_Export_Mockup_v2.4'
       What = 'the Export prototype'
       KeepModules = [bool]$IncludePrototypeModules }
)

Say '1. Checking the source'

foreach ($p in $plan) {
    if (-not (Test-Path $p.From)) { Die "missing: $($p.From)" }
}
Good 'all four source folders present'

# The mockup should be v1.5. Copying the wrong version into a dated folder is hard to notice later.
$readme = Join-Path $mockup 'README.md'
if (Test-Path $readme) {
    $first = Get-Content $readme -First 1
    if ($first -match 'v1\.5') { Good ($first -replace '^#\s*','') }
    else { Warn "README says: $first  (expected v1.5)" }
}

# The v1.5 files, by name. If one is missing the source is not what this script was written for.
$v15 = @(
    'src\integration\countryConfig.ts',
    'src\integration\SharedCountryModels.ts',
    'src\shell\SharedScreenBoundary.tsx',
    'src\integration\CountrySync.tsx',
    'docs\v1.5-one-country-everywhere.md'
)
$absent = $v15 | Where-Object { -not (Test-Path (Join-Path $mockup $_)) }
if ($absent) { Warn "not found in the source: $($absent -join ', ')" } else { Good 'the v1.5 files are all present' }

# ---- sizes, so the copy is not a surprise --------------------------------------------------------

Say ''
Say '2. What will be copied'

$totalBytes = 0
foreach ($p in $plan) {
    $exclude = @()
    if (-not $p.KeepModules) { $exclude += 'node_modules' }
    $exclude += @('dist','.vite')

    $files = Get-ChildItem -LiteralPath $p.From -Recurse -File -Force -ErrorAction SilentlyContinue |
             Where-Object { $rel = $_.FullName.Substring($p.From.Length); -not ($exclude | Where-Object { $rel -like "*\$_\*" }) }
    $bytes = ($files | Measure-Object Length -Sum).Sum
    if (-not $bytes) { $bytes = 0 }
    $totalBytes += $bytes
    $p.Files = $files.Count
    $p.Bytes = $bytes

    $mods = if ($p.KeepModules) { 'with node_modules' } else { 'no node_modules' }
    Say ("   {0,-42} {1,7:N0} files  {2,8:N1} MB   {3}" -f $p.To, $files.Count, ($bytes/1MB), $mods)
}
Say ''
Say ("   total {0:N1} MB" -f ($totalBytes/1MB))

# ---- the destination ----------------------------------------------------------------------------

Say ''
Say '3. The destination'

if (-not (Test-Path $Destination)) {
    Say "   $Destination does not exist — it will be created"
} else {
    Good "$Destination exists"
    $inTheWay = @()
    foreach ($p in $plan) {
        $target = Join-Path $Destination $p.To
        if (Test-Path $target) {
            $n = (Get-ChildItem -LiteralPath $target -Recurse -File -Force -ErrorAction SilentlyContinue).Count
            if ($n -gt 0) { $inTheWay += "$($p.To) ($n files)" }
        }
    }
    if ($inTheWay) {
        if ($Overwrite) {
            Warn "these will be REPLACED: $($inTheWay -join ', ')"
        } else {
            Say ''
            Die @"
the destination already holds: $($inTheWay -join ', ')

Copying over it would merge old and new files, and a file deleted since that copy would survive
in the result. Nothing has been changed. Either

  · run again with -Overwrite to replace those folders exactly, or
  · pass -Destination with a folder that is empty, e.g.
      -Destination 'D:\CIMEgypt\COTS_30Aug26\MockUp_v1.5'
"@
        }
    } else {
        Good 'nothing of ours is in the way'
    }
}

if (-not $Go) {
    Say ''
    Say 'This was a dry run — nothing has been copied.'
    Say 'To do it:'
    Say ''
    Say "    powershell -ExecutionPolicy Bypass -File .\make-snapshot.ps1 -Go$(if ($inTheWay) { ' -Overwrite' })"
    Say ''
    exit 0
}

# ---- the copy ------------------------------------------------------------------------------------

Say ''
Say '4. Copying'

if (-not (Test-Path $Destination)) { New-Item -ItemType Directory -Path $Destination -Force | Out-Null }

foreach ($p in $plan) {
    $target = Join-Path $Destination $p.To

    # /E   subdirectories, including empty ones
    # /MIR only when replacing, so the result is exactly the source and no stale file survives.
    #      Directories named in /XD are left out of the mirror, so an existing node_modules at the
    #      destination is not deleted by a copy that excludes it.
    # /XD  excluded directories   /NFL /NDL quieter output   /R:2 /W:2 do not hang on a locked file
    $mode = if ($Overwrite -and (Test-Path $target)) { '/MIR' } else { '/E' }
    $xd = @()
    if (-not $p.KeepModules) { $xd += 'node_modules' }
    $xd += @('dist', '.vite')

    # Named $roboArgs, not $args: $args is an automatic variable in PowerShell and assigning to it
    # is asking for trouble.
    $roboArgs = @($p.From, $target, $mode, '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:2', '/W:2')
    foreach ($d in $xd) { $roboArgs += @('/XD', (Join-Path $p.From $d)) }
    $roboArgs += @('/XF', 'tsconfig.tsbuildinfo')

    Say ("   {0,-42} {1}" -f $p.To, $(if ($p.KeepModules) { 'with node_modules — this one takes a while' } else { '' }))
    & robocopy @roboArgs | Out-Null

    # Robocopy's exit codes are a bit-field: 0-7 are success, 8 and above are real failures.
    if ($LASTEXITCODE -ge 8) { Die "robocopy failed on $($p.To) with code $LASTEXITCODE" }
    Good "$($p.To) copied"
}

# ---- did it actually arrive ----------------------------------------------------------------------

Say ''
Say '5. Checking the copy'

$problems = @()
foreach ($p in $plan) {
    $target = Join-Path $Destination $p.To
    if (-not (Test-Path $target)) { $problems += "$($p.To) is not there"; continue }
    $n = (Get-ChildItem -LiteralPath $target -Recurse -File -Force -ErrorAction SilentlyContinue).Count
    Say ("   {0,-42} {1,7:N0} files" -f $p.To, $n)
}

$copiedMockup = Join-Path $Destination 'MergedMockup'
foreach ($f in $v15) {
    if (-not (Test-Path (Join-Path $copiedMockup $f))) { $problems += "missing at the destination: $f" }
}
if (-not (Test-Path (Join-Path $copiedMockup 'node_modules\vite'))) {
    $problems += 'node_modules\vite is not at the destination — the copy will not run without npm install'
}

Say ''
if ($problems) {
    foreach ($x in $problems) { Warn $x }
    Say ''
    Warn 'The copy finished but the checks above did not all pass. Look at those before using it.'
    exit 1
}

Good 'the v1.5 files and the dependencies are all at the destination'

Say ''
Say 'Done. To run the snapshot:'
Say ''
Say "    cd `"$copiedMockup`""
Say '    npm run dev'
Say ''
Say 'It is independent of the original — editing one does not affect the other.'
Say ''
