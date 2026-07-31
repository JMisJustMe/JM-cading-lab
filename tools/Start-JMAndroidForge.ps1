[CmdletBinding()]
param(
    [ValidateRange(1025, 65535)]
    [int]$Port = 3232,

    [string]$RepoRoot,

    [string]$OutputRoot,

    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
    param([string]$Explicit)
    if ($Explicit) { return (Resolve-Path -LiteralPath $Explicit).Path }
    $root = Split-Path -Parent $PSScriptRoot
    return (Resolve-Path -LiteralPath $root).Path
}

function Send-Json {
    param($Response, [int]$StatusCode, $Value)
    $json = $Value | ConvertTo-Json -Depth 12 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = 'application/json; charset=utf-8'
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Response.OutputStream.Close()
}

function Send-Bytes {
    param($Response, [int]$StatusCode, [byte[]]$Bytes, [string]$ContentType)
    $Response.StatusCode = $StatusCode
    $Response.ContentType = $ContentType
    $Response.ContentLength64 = $Bytes.Length
    $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
    $Response.OutputStream.Close()
}

function Get-ContentType {
    param([string]$Path)
    switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.html' { 'text/html; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.js'   { 'text/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.svg'  { 'image/svg+xml' }
        '.png'  { 'image/png' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.webp' { 'image/webp' }
        '.ico'  { 'image/x-icon' }
        default { 'application/octet-stream' }
    }
}

function Resolve-SafeChild {
    param([string]$Root, [string]$Relative)
    $rootFull = [IO.Path]::GetFullPath($Root)
    $candidate = [IO.Path]::GetFullPath((Join-Path $rootFull $Relative))
    $trim = [char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $prefix = $rootFull.TrimEnd($trim) + [IO.Path]::DirectorySeparatorChar
    if ($candidate -ne $rootFull -and -not $candidate.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Path escaped the governed root.'
    }
    return $candidate
}

function Get-ForgeStatus {
    param([string]$ResolvedOutputRoot)

    $sdk = $env:ANDROID_SDK_ROOT
    if (-not $sdk) { $sdk = $env:ANDROID_HOME }
    if (-not $sdk) {
        $sdk = @(
            (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
            (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk')
        ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    }

    $java = [bool](Get-Command javac.exe -ErrorAction SilentlyContinue)
    $sdkPresent = [bool]($sdk -and (Test-Path -LiteralPath $sdk))
    $buildTools = $false
    $platform = $false
    if ($sdkPresent) {
        $buildTools = [bool](Get-ChildItem -LiteralPath (Join-Path $sdk 'build-tools') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1)
        $platform = [bool](Get-ChildItem -LiteralPath (Join-Path $sdk 'platforms') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1)
    }

    [ordered]@{
        available = [bool]($java -and $sdkPresent -and $buildTools -and $platform)
        bridge = $true
        java = $java
        android_sdk = $sdkPresent
        sdk_path = if ($sdkPresent) { (Resolve-Path -LiteralPath $sdk).Path } else { $null }
        build_tools = $buildTools
        platform = $platform
        output_root = $ResolvedOutputRoot
        install_performed = $false
        boundary = 'The bridge builds only when existing local tools are present. It does not install Java, Android SDK, Node, Gradle or packages.'
    }
}

$repo = Resolve-RepoRoot -Explicit $RepoRoot
$appRoot = Join-Path $repo 'apps\jm-android-forge'
$index = Join-Path $appRoot 'index.html'
$builder = Join-Path $repo 'tools\Build-JMAndroidForgeApk.ps1'
if (-not (Test-Path -LiteralPath $index)) { throw "Forge app missing: $index" }
if (-not (Test-Path -LiteralPath $builder)) { throw "Forge builder missing: $builder" }

if (-not $OutputRoot) {
    $candidates = @(
        (Join-Path $env:USERPROFILE 'OneDrive\Documents\JM_ESTATE_WORKBENCH\70_ANDROID_FORGE_BUILDS'),
        (Join-Path $env:USERPROFILE 'Documents\JM_ESTATE_WORKBENCH\70_ANDROID_FORGE_BUILDS')
    )
    $OutputRoot = $candidates | Where-Object { Test-Path -LiteralPath (Split-Path -Parent $_) } | Select-Object -First 1
    if (-not $OutputRoot) { $OutputRoot = Join-Path $env:USERPROFILE 'Documents\JM_ANDROID_FORGE_BUILDS' }
}
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$OutputRoot = (Resolve-Path -LiteralPath $OutputRoot).Path

$listener = [Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
}
catch {
    throw "Could not open the local Forge bridge at $prefix $($_.Exception.Message)"
}

$url = "$prefix`apps/jm-android-forge/"
Write-Host ''
Write-Host 'JM Android Forge v1.4 — Laptop Workshop'
Write-Host "Workshop: $url"
Write-Host "Output:   $OutputRoot"
Write-Host 'Local-only bridge. Press Ctrl+C to stop.'
Write-Host ''

if (-not $NoBrowser) { Start-Process $url }

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $response.Headers['Cache-Control'] = 'no-store'
        $path = [Uri]::UnescapeDataString($request.Url.AbsolutePath)

        try {
            if ($request.HttpMethod -eq 'GET' -and $path -eq '/api/status') {
                Send-Json -Response $response -StatusCode 200 -Value (Get-ForgeStatus -ResolvedOutputRoot $OutputRoot)
                continue
            }

            if ($request.HttpMethod -eq 'POST' -and $path -eq '/api/build') {
                $reader = [IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
                try { $body = $reader.ReadToEnd() } finally { $reader.Dispose() }
                if ([Text.Encoding]::UTF8.GetByteCount($body) -gt 36000000) { throw 'Build request exceeds the 36 MB transport ceiling.' }
                $data = $body | ConvertFrom-Json

                if (-not $data.name -or -not $data.package_name -or -not $data.files) { throw 'Build request is missing project identity or files.' }
                if ($data.package_name -notmatch '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$') { throw 'Android package name is invalid.' }

                $slug = ([string]$data.slug -replace '[^a-z0-9-]', '').Trim('-')
                if (-not $slug) { $slug = 'jm-app' }
                $requestRoot = Join-Path ([IO.Path]::GetTempPath()) ("jm-forge-request-{0}" -f [guid]::NewGuid().ToString('N'))
                New-Item -ItemType Directory -Path $requestRoot -Force | Out-Null

                try {
                    [long]$total = 0
                    foreach ($file in $data.files) {
                        $relative = ([string]$file.path -replace '\\', '/').TrimStart('/')
                        if ([IO.Path]::IsPathRooted($relative) -or $relative -match '(^|/)\.{1,2}($|/)') { throw 'A project file path was unsafe.' }
                        if ($relative -notmatch '\.(html?|css|js|json|txt|md|svg)$') { continue }
                        $content = [string]$file.content
                        $fileBytes = [Text.Encoding]::UTF8.GetByteCount($content)
                        $total += $fileBytes
                        if ($fileBytes -gt 4194304 -or $total -gt 33554432) { throw 'Project crossed the governed file or total size boundary.' }
                        $target = Resolve-SafeChild -Root $requestRoot -Relative $relative
                        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
                        [IO.File]::WriteAllText($target, $content, [Text.UTF8Encoding]::new($false))
                    }

                    if (-not (Test-Path -LiteralPath (Join-Path $requestRoot 'index.html'))) {
                        throw 'One-click APK build requires index.html at the project root.'
                    }

                    $status = Get-ForgeStatus -ResolvedOutputRoot $OutputRoot
                    if (-not $status.available) {
                        Send-Json -Response $response -StatusCode 409 -Value ([ordered]@{success=$false;error='Local Java and Android SDK build tools are not all present. Nothing was installed and no APK was claimed.';status=$status})
                        continue
                    }

                    $resultLines = @(& $builder -SourceDirectory $requestRoot -ProjectName ([string]$data.name) -PackageName ([string]$data.package_name) -VersionName ([string]$data.version_name) -OutputRoot $OutputRoot 2>&1)
                    if ($LASTEXITCODE -ne 0) { throw ($resultLines -join [Environment]::NewLine) }
                    $jsonLine = $resultLines | Where-Object { $_ -is [string] -and $_.TrimStart().StartsWith('{') } | Select-Object -Last 1
                    if (-not $jsonLine) { throw 'Builder completed without a machine-readable receipt.' }
                    $result = $jsonLine | ConvertFrom-Json
                    Send-Json -Response $response -StatusCode 200 -Value $result
                }
                finally {
                    if (Test-Path -LiteralPath $requestRoot) { Remove-Item -LiteralPath $requestRoot -Recurse -Force -ErrorAction SilentlyContinue }
                }
                continue
            }

            if ($request.HttpMethod -ne 'GET') {
                Send-Json -Response $response -StatusCode 405 -Value ([ordered]@{error='Method not allowed'})
                continue
            }

            $relativePath = $path.TrimStart('/')
            if (-not $relativePath) { $relativePath = 'apps/jm-android-forge/index.html' }
            if ($relativePath.EndsWith('/')) { $relativePath += 'index.html' }
            $filePath = Resolve-SafeChild -Root $repo -Relative $relativePath
            if (-not (Test-Path -LiteralPath $filePath) -or (Get-Item -LiteralPath $filePath).PSIsContainer) {
                Send-Json -Response $response -StatusCode 404 -Value ([ordered]@{error='Not found'})
                continue
            }
            $bytes = [IO.File]::ReadAllBytes($filePath)
            Send-Bytes -Response $response -StatusCode 200 -Bytes $bytes -ContentType (Get-ContentType -Path $filePath)
        }
        catch {
            if ($response.OutputStream.CanWrite) {
                Send-Json -Response $response -StatusCode 500 -Value ([ordered]@{success=$false;error=$_.Exception.Message})
            }
        }
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}
