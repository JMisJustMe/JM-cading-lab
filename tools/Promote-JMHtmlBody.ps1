[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
    [string]$Slug,

    [Parameter(Mandatory = $true)]
    [ValidateSet('apps', 'theory', 'games-beyond', 'coding-estate', 'recovery', 'custom')]
    [string]$Office,

    [string]$CustomOfficePath,

    [Parameter(Mandatory = $true)]
    [string]$BodyName,

    [string]$Version = 'v0.1',

    [string]$RepoRoot,

    [ValidateRange(1024, 536870912)]
    [long]$MaxBytes = 33554432,

    [switch]$AllowOverwrite,

    [switch]$AllowDuplicate
)

$ErrorActionPreference = 'Stop'

function Resolve-JMRepoRoot {
    param([string]$ExplicitRoot)

    if ($ExplicitRoot) {
        return (Resolve-Path -LiteralPath $ExplicitRoot).Path
    }

    $gitRoot = (& git rev-parse --show-toplevel 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not $gitRoot) {
        throw 'No Git repository root was found. Run this tool inside JM-cading-lab or pass -RepoRoot.'
    }

    return (Resolve-Path -LiteralPath $gitRoot.Trim()).Path
}

function Convert-ToRoutePath {
    param([string]$PathValue)
    return ($PathValue -replace '\\', '/').Trim('/')
}

function Resolve-JMChildPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Root,

        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $rootFull = [IO.Path]::GetFullPath($Root)
    $candidate = [IO.Path]::GetFullPath((Join-Path $rootFull $RelativePath))
    $trimChars = [char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $rootPrefix = $rootFull.TrimEnd($trimChars) + [IO.Path]::DirectorySeparatorChar

    if (-not $candidate.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The selected office resolves outside the repository. No files were written.'
    }

    return $candidate
}

$repo = Resolve-JMRepoRoot -ExplicitRoot $RepoRoot

if ($Source -match '^content://') {
    throw 'Android content:// links are device-local handles, not permanent web files. Download or share the HTML file to the laptop first, then pass that file path as -Source.'
}

$officePath = switch ($Office) {
    'apps'          { 'apps' }
    'theory'        { 'theory' }
    'games-beyond'  { 'games-beyond' }
    'coding-estate' { 'coding-estate' }
    'recovery'      { 'recovery' }
    'custom' {
        if (-not $CustomOfficePath) {
            throw '-CustomOfficePath is required when -Office custom is used.'
        }
        if ([IO.Path]::IsPathRooted($CustomOfficePath)) {
            throw 'Custom office paths must be repository-relative.'
        }

        $normalizedOffice = Convert-ToRoutePath $CustomOfficePath
        if ([string]::IsNullOrWhiteSpace($normalizedOffice) -or
            $normalizedOffice -match '(^|/)\.{1,2}($|/)' -or
            $normalizedOffice -match '[:*?"<>|]') {
            throw 'Custom office path contains an unsafe or unsupported segment.'
        }

        $normalizedOffice
    }
}

$routePath = Convert-ToRoutePath (Join-Path $officePath $Slug)
$targetDir = Resolve-JMChildPath -Root $repo -RelativePath $routePath
$targetHtml = Join-Path $targetDir 'index.html'
$tempSource = $null
$sourceKind = 'local_file'
$sourceReference = $null

try {
    if ($Source -match '^https?://') {
        $sourceKind = 'http_url'
        $sourceReference = $Source
        $tempSource = Join-Path ([IO.Path]::GetTempPath()) ("jm-html-intake-{0}.html" -f ([guid]::NewGuid().ToString('N')))
        Invoke-WebRequest -Uri $Source -OutFile $tempSource -UseBasicParsing
        $resolvedSource = $tempSource
    }
    else {
        $resolvedSource = (Resolve-Path -LiteralPath $Source).Path
        $sourceReference = Split-Path -Leaf $resolvedSource
    }

    $sourceItem = Get-Item -LiteralPath $resolvedSource
    if ($sourceItem.PSIsContainer) {
        throw 'The supplied source must be one HTML file, not a folder.'
    }

    if ($sourceKind -eq 'local_file' -and $sourceItem.Extension -notin @('.html', '.htm')) {
        throw 'The supplied local source must be an .html or .htm file.'
    }

    $sourceBytes = [long]$sourceItem.Length
    if ($sourceBytes -gt $MaxBytes) {
        throw ("Source is {0:N0} bytes, above the {1:N0}-byte intake ceiling. Reduce the body or pass an explicit larger -MaxBytes value after review." -f $sourceBytes, $MaxBytes)
    }

    $sourceHash = (Get-FileHash -LiteralPath $resolvedSource -Algorithm SHA256).Hash

    if (-not $AllowDuplicate) {
        $existingMatch = Get-ChildItem -LiteralPath $repo -Filter 'index.html' -File -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' } |
            ForEach-Object {
                $candidateHash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
                if ($candidateHash -eq $sourceHash) { $_ }
            } |
            Select-Object -First 1

        if ($existingMatch) {
            $relative = Convert-ToRoutePath ($existingMatch.FullName.Substring($repo.Length).TrimStart('\', '/'))
            $existingRoute = if ($relative -eq 'index.html') { '' } else { $relative -replace '/index\.html$', '/' }
            $stableExistingRoute = if ($existingRoute) {
                "https://jmisjustme-estate.pages.dev/$existingRoute"
            }
            else {
                'https://jmisjustme-estate.pages.dev/'
            }

            Write-Host 'No copy created: an exact byte-identical permanent body already exists.'
            Write-Host ("Existing file: {0}" -f $relative)
            Write-Host ("Stable route: {0}" -f $stableExistingRoute)
            Write-Host ("SHA-256: {0}" -f $sourceHash)
            return
        }
    }

    if ((Test-Path -LiteralPath $targetDir) -and -not $AllowOverwrite) {
        throw "Target already exists: $targetDir. Nothing was overwritten. Choose another slug or inspect the existing body."
    }

    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Copy-Item -LiteralPath $resolvedSource -Destination $targetHtml -Force:$AllowOverwrite

    $writtenHash = (Get-FileHash -LiteralPath $targetHtml -Algorithm SHA256).Hash
    if ($writtenHash -ne $sourceHash) {
        throw 'Hash mismatch after copy. The target was not accepted as a faithful source body.'
    }

    $now = (Get-Date).ToUniversalTime().ToString('o')
    $stableRoute = "https://jmisjustme-estate.pages.dev/$routePath/"

    $manifest = [ordered]@{
        schema = 'JM.PermanentHtmlBody/1.0'
        body_name = $BodyName
        slug = $Slug
        version = $Version
        office = $officePath
        repository = 'JMisJustMe/JM-cading-lab'
        repository_path = "$routePath/index.html"
        stable_route = $stableRoute
        source_kind = $sourceKind
        source_reference = $sourceReference
        byte_count = $sourceBytes
        sha256 = $sourceHash
        intake_ceiling_bytes = $MaxBytes
        imported_at_utc = $now
        status = 'STAGED_NOT_PUBLISHED'
        laws = @(
            'Recall before rebuild',
            'Restore before rewrite',
            'Source before crown',
            'No Ding, no claim',
            'Connect does not mean merge'
        )
        claim_boundary = 'This manifest proves a byte-preserved repository body. A live public claim requires an approved commit and successful deployment verification.'
    }

    $manifestPath = Join-Path $targetDir 'body-manifest.json'
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    $receiptDir = Resolve-JMChildPath -Root $repo -RelativePath 'receipts/body-intake'
    New-Item -ItemType Directory -Path $receiptDir -Force | Out-Null
    $receiptName = '{0}-{1}.json' -f $Slug, (Get-Date -Format 'yyyyMMdd-HHmmss')
    $receiptPath = Join-Path $receiptDir $receiptName

    $receipt = [ordered]@{
        schema = 'JM.HtmlBodyPromotionReceipt/1.0'
        action = 'PROMOTE_TEMPORARY_HTML_TO_PERMANENT_REPOSITORY_BODY'
        outcome = 'STAGED'
        body_name = $BodyName
        version = $Version
        repository_path = "$routePath/index.html"
        stable_route_after_approved_deployment = $stableRoute
        byte_count = $sourceBytes
        sha256 = $sourceHash
        duplicate_html_created = $false
        packages_installed = @()
        remote_changes_made = $false
        created_at_utc = $now
        next_gate = 'Review git diff, approve commit, then verify the deployed route byte-for-byte.'
    }

    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding UTF8

    Write-Host ''
    Write-Host 'JM permanent-body staging completed.'
    Write-Host ("Body: {0} {1}" -f $BodyName, $Version)
    Write-Host ("HTML: {0}" -f "$routePath/index.html")
    Write-Host ("Manifest: {0}" -f "$routePath/body-manifest.json")
    Write-Host ("Receipt: {0}" -f (Convert-ToRoutePath ($receiptPath.Substring($repo.Length).TrimStart('\', '/'))))
    Write-Host ("Bytes: {0}" -f $sourceBytes)
    Write-Host ("SHA-256: {0}" -f $sourceHash)
    Write-Host ("Future stable route: {0}" -f $stableRoute)
    Write-Host 'No commit, push, deployment, package installation, archive duplication, or remote mutation was performed.'
}
finally {
    if ($tempSource -and (Test-Path -LiteralPath $tempSource)) {
        Remove-Item -LiteralPath $tempSource -Force
    }
}
