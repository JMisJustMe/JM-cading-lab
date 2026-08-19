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
    return (Resolve-Path -LiteralPath $root.Trim()).Path
}

function Get-Sha256Lower {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$repo = Resolve-JMRepoRoot -ExplicitRoot $RepoRoot
$head = (& git -C $repo rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or -not $head) { throw 'Unable to resolve repository HEAD.' }
$short = (& git -C $repo rev-parse --short=12 HEAD).Trim()
$branch = (& git -C $repo branch --show-current).Trim()
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

Remove-Item -LiteralPath $snapshot,$bundle,$manifestPath -Force -ErrorAction SilentlyContinue

& git -C $repo archive --format=zip --output=$snapshot HEAD
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $snapshot)) {
    throw 'Git snapshot archive creation failed.'
}

& git -C $repo bundle create $bundle --all
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $bundle)) {
    throw 'Git history bundle creation failed.'
}

& git -C $repo bundle verify $bundle | Out-Null
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
        bytes = (Get-Item -LiteralPath $snapshot).Length
        sha256 = Get-Sha256Lower -Path $snapshot
        purpose = 'Current committed Estate source snapshot.'
    }
    history_bundle = [ordered]@{
        file = [IO.Path]::GetFileName($bundle)
        bytes = (Get-Item -LiteralPath $bundle).Length
        sha256 = Get-Sha256Lower -Path $bundle
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

$manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host 'JM Estate recovery export built.'
Write-Host ("Commit: {0}" -f $head)
Write-Host ("Tracked files: {0}" -f $tracked.Count)
Write-Host ("Snapshot: {0}" -f $snapshot)
Write-Host ("History bundle: {0}" -f $bundle)
Write-Host ("Manifest: {0}" -f $manifestPath)
Write-Host 'No owner secret value or private R2 object bytes were copied.'
