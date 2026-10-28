[CmdletBinding()]
param(
    [string]$RepoRoot,
    [string]$OutputDirectory,
    [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'

function Resolve-JMRepoRoot {
    param([string]$ExplicitRoot)
    if ($ExplicitRoot) { return (Resolve-Path -LiteralPath $ExplicitRoot).Path }
    $root = (& git rev-parse --show-toplevel 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not $root) {
        throw 'No Git repository root found. Run inside JM-cading-lab or pass -RepoRoot.'
    }
    return (Resolve-Path -LiteralPath ([string]$root).Trim()).Path
}

function Get-Sha256Lower {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$repo = Resolve-JMRepoRoot -ExplicitRoot $RepoRoot
$head = ([string](& git -C $repo rev-parse HEAD)).Trim()
if ($LASTEXITCODE -ne 0 -or -not $head) { throw 'Unable to resolve repository HEAD.' }
$short = ([string](& git -C $repo rev-parse --short=12 HEAD)).Trim()
$branchOutput = @(& git -C $repo branch --show-current)
$branch = if ($branchOutput.Count) { ([string]$branchOutput[0]).Trim() } else { '' }
$dirty = [bool]((& git -C $repo status --porcelain) -join '')
if ($dirty -and -not $AllowDirty) {
    throw 'Working tree is dirty. Commit/stash changes first, or pass -AllowDirty knowing the export still represents committed HEAD only.'
}

if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path ([IO.Path]::GetTempPath()) 'JM-Estate-Recovery-Export'
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$out = (Resolve-Path -LiteralPath $OutputDirectory).Path

$base = "JM_ESTATE_RECOVERY_$short"
$snapshot = Join-Path $out "$base-source.zip"
$bundle = Join-Path $out "$base-history.bundle"
$manifestPath = Join-Path $out "$base-manifest.json"

# M001: never discard an existing committed-HEAD recovery door just to rebuild
# indistinguishable ZIP/bundle bytes and a fresh timestamped manifest.
$existingPaths = @($snapshot, $bundle, $manifestPath)
$existingCount = 0
foreach ($candidatePath in $existingPaths) {
    if (Test-Path -LiteralPath $candidatePath) { $existingCount++ }
}
if ($existingCount -ne 0) {
    if ($existingCount -ne 3) {
        throw 'M001_HOLD_PARTIAL_RECOVERY_EXPORT: original outputs preserved; inspect custody before repair.'
    }
    try {
        $prior = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -ErrorAction Stop
        if ($prior.schema -ne 'JM.EstateRecoveryExport/1.0' -or
            $prior.source_commit -ne $head -or
            $prior.snapshot.file -ne [IO.Path]::GetFileName($snapshot) -or
            $prior.history_bundle.file -ne [IO.Path]::GetFileName($bundle)) {
            throw 'MANIFEST_IDENTITY_NOT_MATCHING_CURRENT_HEAD'
        }
        if ((Get-Item -LiteralPath $snapshot).Length -ne [long]$prior.snapshot.bytes -or
            (Get-Item -LiteralPath $bundle).Length -ne [long]$prior.history_bundle.bytes -or
            (Get-Sha256Lower -Path $snapshot) -ne $prior.snapshot.sha256 -or
            (Get-Sha256Lower -Path $bundle) -ne $prior.history_bundle.sha256) {
            throw 'ARCHIVE_BYTES_OR_SHA_MISMATCH'
        }
        & git -C $repo bundle verify $bundle | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'BUNDLE_VERIFICATION_FAILED' }
    }
    catch {
        throw ('M001_HOLD_UNVERIFIED_EXISTING_EXPORT: ' + $_.Exception.Message)
    }
    Write-Host 'M001_REUSE_EXACT_COMMITTED_HEAD: verified existing ZIP, bundle and manifest; no new carriage.'
    Write-Host ("Commit: {0}" -f $head)
    Write-Host ("Snapshot: {0}" -f $snapshot)
    Write-Host ("History bundle: {0}" -f $bundle)
    Write-Host ("Manifest: {0}" -f $manifestPath)
    return
}

# Construct in scratch first; never overwrite or delete a protected keeper.
$stage = Join-Path $out ('.jm-recovery-pending-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage -ErrorAction Stop | Out-Null
$snapshotBuild = Join-Path $stage ([IO.Path]::GetFileName($snapshot))
$bundleBuild = Join-Path $stage ([IO.Path]::GetFileName($bundle))
$manifestBuild = Join-Path $stage ([IO.Path]::GetFileName($manifestPath))
try {
& git -C $repo archive --format=zip --output=$snapshotBuild HEAD
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $snapshotBuild)) {
    throw 'Git snapshot archive creation failed.'
}

& git -C $repo bundle create $bundleBuild --all
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $bundleBuild)) {
    throw 'Git history bundle creation failed.'
}

& git -C $repo bundle verify $bundleBuild | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Git bundle verification failed.' }

$tracked = @(& git -C $repo ls-tree -r --name-only HEAD)
$required = @(
    'index.html',
    'estate-app.js',
    'functions/api/owner/vault.js',
    'recovery/index.html',
    'tools/Promote-JMHtmlBody.ps1',
    'docs/JM_PERMANENT_BODY_PIPELINE_v0_1.md',
    'registry/estate-physical-current-best-census-v0.3.json',
    '.github/workflows/deploy-cloudflare-authoritative-public-source.yml'
)
$missing = @($required | Where-Object { $_ -notin $tracked })
if ($missing.Count) {
    throw ('Recovery export is missing required committed paths: ' + ($missing -join ', '))
}

$manifest = [ordered]@{
    schema = 'JM.EstateRecoveryExport/1.0'
    created_at_utc = (Get-Date).ToUniversalTime().ToString('o')
    repository = 'JMisJustMe/JM-cading-lab'
    source_commit = $head
    source_branch = if ($branch) { $branch } else { 'detached' }
    working_tree_dirty = $dirty
    export_represents = 'COMMITTED_HEAD_ONLY'
    tracked_file_count = $tracked.Count
    snapshot = [ordered]@{
        file = [IO.Path]::GetFileName($snapshot)
        bytes = (Get-Item -LiteralPath $snapshotBuild).Length
        sha256 = Get-Sha256Lower -Path $snapshotBuild
        purpose = 'Current committed Estate source snapshot.'
    }
    history_bundle = [ordered]@{
        file = [IO.Path]::GetFileName($bundle)
        bytes = (Get-Item -LiteralPath $bundleBuild).Length
        sha256 = Get-Sha256Lower -Path $bundleBuild
        verified = $true
        purpose = 'Portable Git history and refs; cloneable without the original working device.'
    }
    required_paths = $required
    private_owner_recovery = [ordered]@{
        provider = 'Cloudflare R2'
        bucket = 'jm-estate-owner-vault'
        binding = 'JM_OWNER_VAULT'
        owner_secret_variable = 'JM_OWNER_VAULT_KEY'
        secret_value_in_export = $false
        restore_path = 'Deploy current Estate source if needed, preserve/rebind the named private bucket and owner secret, then Owner → Unlock this session → Restore owner state.'
        proof_receipts = @(
            'registry/owner-vault-live-readiness-receipt-v0.1.json',
            'registry/owner-vault-owner-roundtrip-receipt-v0.1.json'
        )
    }
    publication_recovery = [ordered]@{
        host = 'https://jmisjustme-estate.pages.dev'
        deployment_workflow = '.github/workflows/deploy-cloudflare-authoritative-public-source.yml'
        note = 'Public deployment is reconstructible from governed source; private R2 data is not embedded in the source archive.'
    }
    boundary = 'This export proves a portable current-source snapshot plus portable Git history. It deliberately contains no Cloudflare secret values and no private R2 object bytes. Private owner recovery remains the separately proven authenticated R2 lane.'
    ding = $false
}

$manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestBuild -Encoding UTF8

foreach ($candidatePath in $existingPaths) {
    if (Test-Path -LiteralPath $candidatePath) {
        throw 'M001_HOLD_CONCURRENT_EXPORT_CONFLICT: existing exact outputs preserved.'
    }
}
# Exact source, history and manifest are all in scratch; publish without -Force.
Move-Item -LiteralPath $snapshotBuild -Destination $snapshot -ErrorAction Stop
Move-Item -LiteralPath $bundleBuild -Destination $bundle -ErrorAction Stop
Move-Item -LiteralPath $manifestBuild -Destination $manifestPath -ErrorAction Stop

Write-Host 'JM Estate recovery export built.'
Write-Host ("Commit: {0}" -f $head)
Write-Host ("Tracked files: {0}" -f $tracked.Count)
Write-Host ("Snapshot: {0}" -f $snapshot)
Write-Host ("History bundle: {0}" -f $bundle)
Write-Host ("Manifest: {0}" -f $manifestPath)
Write-Host 'No owner secret value or private R2 object bytes were copied.'
} finally {
    if (Test-Path -LiteralPath $stage) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
}
