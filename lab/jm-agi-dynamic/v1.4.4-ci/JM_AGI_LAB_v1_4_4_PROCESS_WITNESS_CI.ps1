param(
  [int]$ArmTimeoutSeconds = 600,
  [int]$ZeroTimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$HtmlName = 'JM_AGI_V144_WINDOWS_CONTRACT.html'
$HtmlPath = Join-Path $Here $HtmlName
$ProfilePath = Join-Path $Here 'JM_AGI_EDGE_TEST_PROFILE'
$WitnessPath = Join-Path $Here 'JM_AGI_PROCESS_WITNESS_LAST.json'
$RunnerVersion = '1.0.4-CI'

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

function Get-FreeTcpPort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  try { return [int]$listener.LocalEndpoint.Port } finally { $listener.Stop() }
}

function Get-CdpPages([int]$port) {
  try {
    $rows = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json" -TimeoutSec 2 -ErrorAction Stop
    return @($rows)
  } catch {
    return @()
  }
}

function Start-DedicatedEdge([string]$edge, [string]$profile, [string]$url, [int]$debugPort) {
  $edgeArgs = @(
    "--user-data-dir=`"$profile`"",
    "--remote-debugging-port=$debugPort",
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
Write-Host 'JM AGI Lab v1.4.4 — Windows runner R4 preflight' -ForegroundColor Cyan
try {
  # Exercise the process-tree traversal before opening Edge. This catches PowerShell runtime/name collisions early.
  [void](Get-ProcessTreePids @())
  [void](Get-DedicatedRootPids @())
  $Edge = Find-Edge
  $DebugPort = Get-FreeTcpPort
  $PreflightSha = (Get-FileHash -Algorithm SHA256 -Path $HtmlPath).Hash.ToLowerInvariant()
  Write-Host "Preflight PASS • process enumeration • Edge found • CDP port $DebugPort • body SHA-256 $PreflightSha" -ForegroundColor Green
} catch {
  throw "Runner preflight failed before browser launch: $($_.Exception.Message)"
}
New-Item -ItemType Directory -Force -Path $ProfilePath | Out-Null
$RunId = ([Guid]::NewGuid().ToString('N'))
$FileUri = ([Uri]$HtmlPath).AbsoluteUri
$LaunchUrl = "$FileUri#jm-process-run=$RunId&jm-autoarm=1"

Write-Host ''
Write-Host 'JM AGI Lab v1.4.4 — Process Restart Witness' -ForegroundColor Cyan
Write-Host 'This uses an isolated Edge test profile and does not intentionally terminate your normal Edge profile.' -ForegroundColor DarkGray
Write-Host "Run ID: $RunId"
Write-Host 'Launching the exact body and waiting for it to arm…'

Start-DedicatedEdge $Edge $ProfilePath $LaunchUrl $DebugPort

$deadline = (Get-Date).AddSeconds($ArmTimeoutSeconds)
$Token = $null
while ((Get-Date) -lt $deadline -and -not $Token) {
  Start-Sleep -Milliseconds 300
  $pages = @(Get-CdpPages $DebugPort)
  foreach ($page in $pages) {
    $title = [string]$page.title
    if ($title -match "JMAGI_ARMED__${RunId}__([A-Z0-9-]+)") {
      $Token = $Matches[1]
      break
    }
  }
}
if (-not $Token) {
  throw 'Timed out waiting for the browser harness to arm through the dedicated Edge CDP route.'
}

Write-Host "Harness armed with token: $Token" -ForegroundColor Green
Write-Host !AA