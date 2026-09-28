param(
  [int]$ArmTimeoutSeconds = 600,
  [int]$ZeroTimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$HtmlName = 'JM_AGI_LAB_v1_4_3_PROCESS_RESTART_PROOF_CORRECTED.html'
$HtmlPath = Join-Path $Here $HtmlName
$ProfilePath = Join-Path $Here 'JM_AGI_EDGE_TEST_PROFILE'
$WitnessPath = Join-Path $Here 'JM_AGI_PROCESS_WITNESS_LAST.json'
$RunnerVersion = '1.0.3'

function Find-Edge {
  $roots = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA) | Where-Object { $_ }
  $candidates = @($roots | ForEach-Object { Join-Path $_ 'Microsoft\Edge\Application\msedge.exe' } | Where-Object { Test-Path $_ })
  if (-not $candidates -or $candidates.Count -eq 0) {
    $cmd = Get-Command msedge.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'Microsoft Edge was not found in the standard install locations.'
  }
  return $candidates[0]
}

function Get-EdgeCim {
  return @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue)
}

function Get-DedicatedSeeds([string]$profile) {
  $needle = [Regex]::Escape($profile)
  return @(Get-EdgeCim | Where-Object { $_.CommandLine -and ($_.CommandLine -match $needle) })
}

function Get-ProcessTreePids([int[]]$seedPids) {
  $all = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
  $set = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($id in $seedPids) { [void]$set.Add([int]$id) }
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($p in $all) {
      $parent = [int]$p.ParentProcessId
      $childPid = [int]$p.ProcessId
      if ($set.Contains($parent) -and -not $set.Contains($childPid)) {
        [void]$set.Add($childPid)
        $changed = $true
      }
    }
  }
  return @($set | Sort-Object)
}

function Test-PidAlive([int]$id) {
  return [bool](Get-Process -Id $id -ErrorAction SilentlyContinue)
}

function Get-DedicatedRootPids($seeds) {
  $seedList = @($seeds)
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($seed in $seedList) { [void]$ids.Add([int]$seed.ProcessId) }
  $roots = @()
  foreach ($seed in $seedList) {
    $parentId = [int]$seed.ParentProcessId
    if (-not $ids.Contains($parentId)) { $roots += [int]$seed.ProcessId }
  }
  if ($roots.Count -eq 0) { $roots = @($seedList | ForEach-Object { [int]$_.ProcessId }) }
  return @($roots | Sort-Object -Unique)
}

function Invoke-TaskKillNonFatal([int]$targetPid) {
  $taskkill = Join-Path $env:SystemRoot 'System32\\taskkill.exe'
  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = $taskkill
  $psi.Arguments = "/PID $targetPid /T /F"
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  $stdout = $proc.StandardOutput.ReadToEnd()
  $stderr = $proc.StandardError.ReadToEnd()
  $proc.WaitForExit()
  return [pscustomobject]@{
    targetPid = $targetPid
    exitCode = [int]$proc.ExitCode
    stdout = $stdout.Trim()
    stderr = $stderr.Trim()
  }
}

function ConvertTo-Base64Url([string]$text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  return ([Convert]::ToBase64String($bytes)).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Start-DedicatedEdge([string]$edge, [string]$profile, [string]$url) {
  $edgeArgs = @(
    "--user-data-dir=`"$profile`"",
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode',
    '--disable-features=msEdgeStartupBoost',
    '--new-window',
    "`"$url`""
  )
  Start-Process -FilePath $edge -ArgumentList $edgeArgs | Out-Null
}

if (-not (Test-Path $HtmlPath)) {
  throw "Missing $HtmlName beside this runner. Extract the whole package before running it."
}

Write-Host ''
Write-Host 'JM AGI Lab v1.4.3 — Windows runner R3 preflight' -ForegroundColor Cyan
try {
  # Exercise the process-tree traversal before opening Edge. This catches PowerShell runtime/name collisions early.
  [void](Get-ProcessTreePids @())
  [void](Get-DedicatedRootPids @())
  $Edge = Find-Edge
  $PreflightSha = (Get-FileHash -Algorithm SHA256 -Path $HtmlPath).Hash.ToLowerInvariant()
  Write-Host "Preflight PASS • process enumeration • Edge found • body SHA-256 $PreflightSha" -ForegroundColor Green
} catch {
  throw "Runner preflight failed before browser launch: $($_.Exception.Message)"
}
New-Item -ItemType Directory -Force -Path $ProfilePath | Out-Null
$RunId = ([Guid]::NewGuid().ToString('N'))
$FileUri = ([Uri]$HtmlPath).AbsoluteUri
$LaunchUrl = "$FileUri#jm-process-run=$RunId&jm-autoarm=1"

Write-Host ''
Write-Host 'JM AGI Lab v1.4.3 — Process Restart Witness' -ForegroundColor Cyan
Write-Host 'This uses an isolated Edge test profile and does not intentionally terminate your normal Edge profile.' -ForegroundColor DarkGray
Write-Host "Run ID: $RunId"
Write-Host 'Launching the exact body and waiting for it to arm…'

Start-DedicatedEdge $Edge $ProfilePath $LaunchUrl

$deadline = (Get-Date).AddSeconds($ArmTimeoutSeconds)
$Token = $null
while ((Get-Date) -lt $deadline -and -not $Token) {
  Start-Sleep -Milliseconds 300
  $windows = @(Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*JMAGI_ARMED__${RunId}__*" })
  foreach ($p in $windows) {
    if ($p.MainWindowTitle -match "JMAGI_ARMED__${RunId}__([A-Z0-9-]+)") {
      $Token = $Matches[1]
      break
    }
  }
}
if (-not $Token) {
  throw 'Timed out waiting for the browser harness to arm. Keep the launched test window open and retry.'
}

Write-Host "Harness armed with token: $Token" -ForegroundColor Green
Start-Sleep -Milliseconds 600

$Seeds = @(Get-DedicatedSeeds $ProfilePath)
if ($Seeds.Count -lt 1) {
  throw 'Could not identify the isolated Edge process by its dedicated user-data-dir. No process was terminated.'
}
$SeedPids = @($Seeds | ForEach-Object { [int]$_.ProcessId } | Sort-Object -Unique)
$PrePids = @(Get-ProcessTreePids $SeedPids)
if ($PrePids.Count -lt 1) {
  throw 'Dedicated Edge process tree was empty. No restart claim can be made.'
}

$RootPids = @(Get-DedicatedRootPids $Seeds)
if ($RootPids.Count -lt 1) {
  throw 'Could not identify a dedicated Edge root process. No termination was attempted.'
}

Write-Host ("Dedicated Edge process tree before stop: " + ($PrePids -join ', '))
Write-Host ("Dedicated root PID(s): " + ($RootPids -join ', '))
Write-Host 'Terminating only that dedicated test tree…'
$TerminationAttempts = @()
foreach ($rootPid in $RootPids) {
  if (Test-PidAlive $rootPid) {
    $attempt = Invoke-TaskKillNonFatal $rootPid
    $TerminationAttempts += $attempt
    if ($attempt.exitCode -eq 0) {
      Write-Host "taskkill accepted for root PID $rootPid." -ForegroundColor DarkGray
    } else {
      Write-Host "taskkill returned exit $($attempt.exitCode) for root PID $rootPid; zero-observation will decide the result." -ForegroundColor Yellow
    }
  } else {
    $TerminationAttempts += [pscustomobject]@{targetPid=$rootPid;exitCode=128;stdout='';stderr='PID already absent before termination call.'}
    Write-Host "Root PID $rootPid was already absent; zero-observation will decide the result." -ForegroundColor DarkGray
  }
}

$zeroDeadline = (Get-Date).AddSeconds($ZeroTimeoutSeconds)
$ZeroObserved = $false
while ((Get-Date) -lt $zeroDeadline) {
  Start-Sleep -Milliseconds 250
  $alivePre = @($PrePids | Where-Object { Test-PidAlive $_ })
  $remainingDedicated = @(Get-DedicatedSeeds $ProfilePath)
  if ($alivePre.Count -eq 0 -and $remainingDedicated.Count -eq 0) {
    $ZeroObserved = $true
    break
  }
}
if (-not $ZeroObserved) {
  throw 'The dedicated Edge process tree did not reach zero within the timeout. Relaunch was withheld.'
}

$ZeroAt = (Get-Date).ToUniversalTime().ToString('o')
$BodySha = (Get-FileHash -Algorithm SHA256 -Path $HtmlPath).Hash.ToLowerInvariant()
$Witness = [ordered]@{
  schema = 'JM_AGI_EDGE_PROCESS_WITNESS_v1'
  runnerVersion = $RunnerVersion
  runId = $RunId
  token = $Token
  platform = 'Windows'
  browser = 'Microsoft Edge'
  dedicatedProfile = $true
  zeroObserved = $true
  zeroAt = $ZeroAt
  prePids = @($PrePids)
  rootPids = @($RootPids)
  terminationAttempts = @($TerminationAttempts)
  bodyFileName = $HtmlName
  bodySha256 = $BodySha
}
$WitnessJson = $Witness | ConvertTo-Json -Depth 5 -Compress
$Witness | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -Path $WitnessPath
$Encoded = ConvertTo-Base64Url $WitnessJson
$ReturnUrl = "$FileUri#jm-restart-witness=$Encoded"

Write-Host 'Dedicated Edge process tree reached ZERO.' -ForegroundColor Green
Write-Host 'Relaunching the same body with the same isolated profile…'
Start-Sleep -Milliseconds 700
Start-DedicatedEdge $Edge $ProfilePath $ReturnUrl

Write-Host ''
Write-Host 'OS witness complete. The reopened page performs the durable read-back, fresh-session check, restore, and final scope decision.' -ForegroundColor Cyan
Write-Host "Witness receipt: $WitnessPath"