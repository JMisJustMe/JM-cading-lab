[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDirectory,

    [Parameter(Mandatory = $true)]
    [string]$ProjectName,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$')]
    [string]$PackageName,

    [string]$VersionName = '1.4',

    [int]$VersionCode = 14,

    [string]$OutputRoot,

    [ValidateSet('development','release')]
    [string]$SigningMode = 'development',

    [string]$SigningKeystorePath,

    [string]$ExpectedSignerSha256,

    [ValidateRange(0, 2147483646)]
    [int]$PreviousVersionCode = 0,

    [ValidateRange(1024, 536870912)]
    [long]$MaxBytes = 33554432
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-HighestAndroidDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Parent,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Prefix
    )

    if (-not (Test-Path -LiteralPath $Parent)) { return $null }

    return Get-ChildItem -LiteralPath $Parent -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "$Prefix*" } |
        Sort-Object {
            $raw = $_.Name.Substring($Prefix.Length) -replace '[^0-9.]', ''
            try { [version]$raw } catch { [version]'0.0' }
        } -Descending |
        Select-Object -First 1
}

function Assert-Tool {
    param([string]$Path, [string]$Name)
    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
        throw "Missing required local tool: $Name. Nothing was installed and no APK was claimed."
    }
    return (Resolve-Path -LiteralPath $Path).Path
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Step
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE."
    }
}

function Convert-ToSafeFileName {
    param([string]$Value)
    $safe = ($Value -replace '[^A-Za-z0-9._-]+', '-') -replace '^-|-$', ''
    if ([string]::IsNullOrWhiteSpace($safe)) { return 'jm-app' }
    return $safe.ToLowerInvariant()
}

$source = (Resolve-Path -LiteralPath $SourceDirectory).Path
if (-not (Get-Item -LiteralPath $source).PSIsContainer) {
    throw 'SourceDirectory must point to a project folder.'
}

$indexHtml = Join-Path $source 'index.html'
if (-not (Test-Path -LiteralPath $indexHtml)) {
    throw 'One-click APK build requires index.html at the project root.'
}

$sourceFiles = @(Get-ChildItem -LiteralPath $source -File -Recurse)
$sourceBytes = [long](($sourceFiles | Measure-Object -Property Length -Sum).Sum)
if ($sourceBytes -gt $MaxBytes) {
    throw ("Project is {0:N0} bytes, above the governed {1:N0}-byte build ceiling." -f $sourceBytes, $MaxBytes)
}

$sdk = $env:ANDROID_SDK_ROOT
if (-not $sdk) { $sdk = $env:ANDROID_HOME }
if (-not $sdk) {
    $possible = @(
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
        (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk')
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    $sdk = $possible
}
if (-not $sdk -or -not (Test-Path -LiteralPath $sdk)) {
    throw 'Android SDK was not found. The builder does not install it automatically.'
}
$sdk = (Resolve-Path -LiteralPath $sdk).Path

$platformDir = Get-HighestAndroidDirectory -Parent (Join-Path $sdk 'platforms') -Prefix 'android-'
$buildToolsDir = Get-HighestAndroidDirectory -Parent (Join-Path $sdk 'build-tools') -Prefix ''
if (-not $platformDir) { throw 'No Android SDK platform is installed.' }
if (-not $buildToolsDir) { throw 'No Android SDK build-tools directory is installed.' }

$targetSdk = [int](($platformDir.Name -replace '^android-', '') -replace '[^0-9].*$', '')
$androidJar = Assert-Tool -Path (Join-Path $platformDir.FullName 'android.jar') -Name 'android.jar'
$aapt2 = Assert-Tool -Path (Join-Path $buildToolsDir.FullName 'aapt2.exe') -Name 'aapt2'
$zipalign = Assert-Tool -Path (Join-Path $buildToolsDir.FullName 'zipalign.exe') -Name 'zipalign'
$apksigner = Assert-Tool -Path (Join-Path $buildToolsDir.FullName 'apksigner.bat') -Name 'apksigner'
$d8 = Join-Path $buildToolsDir.FullName 'd8.bat'
if (-not (Test-Path -LiteralPath $d8)) { $d8 = Join-Path $buildToolsDir.FullName 'd8.exe' }
$d8 = Assert-Tool -Path $d8 -Name 'd8'

$javacCommand = Get-Command javac.exe -ErrorAction SilentlyContinue
$keytoolCommand = Get-Command keytool.exe -ErrorAction SilentlyContinue
if (-not $javacCommand) { throw 'javac was not found. A local JDK is required; nothing was installed.' }
if (-not $keytoolCommand) { throw 'keytool was not found. A local JDK is required; nothing was installed.' }
$javac = $javacCommand.Source
$keytool = $keytoolCommand.Source

if (-not $OutputRoot) {
    $workbenchCandidates = @(
        (Join-Path $env:USERPROFILE 'OneDrive\Documents\JM_ESTATE_WORKBENCH\70_ANDROID_FORGE_BUILDS'),
        (Join-Path $env:USERPROFILE 'Documents\JM_ESTATE_WORKBENCH\70_ANDROID_FORGE_BUILDS')
    )
    $OutputRoot = $workbenchCandidates | Where-Object { Test-Path -LiteralPath (Split-Path -Parent $_) } | Select-Object -First 1
    if (-not $OutputRoot) { $OutputRoot = Join-Path $env:USERPROFILE 'Documents\JM_ANDROID_FORGE_BUILDS' }
}
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
$OutputRoot = (Resolve-Path -LiteralPath $OutputRoot).Path

$slug = Convert-ToSafeFileName $ProjectName
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runRoot = Join-Path ([IO.Path]::GetTempPath()) ("jm-android-forge-{0}" -f [guid]::NewGuid().ToString('N'))
$assets = Join-Path $runRoot 'assets'
$javaRoot = Join-Path $runRoot 'java'
$classes = Join-Path $runRoot 'classes'
$dexOut = Join-Path $runRoot 'dex'
New-Item -ItemType Directory -Path $assets,$javaRoot,$classes,$dexOut -Force | Out-Null

try {
    Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $assets -Recurse -Force
    }

    $packagePath = $PackageName -replace '\.', [IO.Path]::DirectorySeparatorChar
    $javaPackageDir = Join-Path $javaRoot $packagePath
    New-Item -ItemType Directory -Path $javaPackageDir -Force | Out-Null

    $escapedProject = $ProjectName.Replace('&','&amp;').Replace('"','&quot;').Replace('<','&lt;').Replace('>','&gt;')
    $manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="$PackageName">
  <uses-permission android:name="android.permission.INTERNET" />
  <application android:allowBackup="true" android:label="$escapedProject" android:usesCleartextTraffic="true" android:theme="@android:style/Theme.Material.Light.NoActionBar">
    <activity android:name=".MainActivity" android:configChanges="keyboardHidden|orientation|screenSize" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
"@
    $manifestPath = Join-Path $runRoot 'AndroidManifest.xml'
    [IO.File]::WriteAllText($manifestPath, $manifest, [Text.UTF8Encoding]::new($false))

    $java = @"
package $PackageName;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
"@
    $javaFile = Join-Path $javaPackageDir 'MainActivity.java'
    [IO.File]::WriteAllText($javaFile, $java, [Text.UTF8Encoding]::new($false))

    Invoke-Checked -FilePath $javac -Step 'Java compilation' -Arguments @(
        '-source','8','-target','8','-encoding','UTF-8','-classpath',$androidJar,'-d',$classes,$javaFile
    )

    $classFiles = @(Get-ChildItem -LiteralPath $classes -File -Filter '*.class' -Recurse | ForEach-Object { $_.FullName })
    if (-not $classFiles.Count) { throw 'Java compilation produced no class files.' }
    Invoke-Checked -FilePath $d8 -Step 'DEX compilation' -Arguments (@('--lib',$androidJar,'--min-api','24','--output',$dexOut) + $classFiles)

    $unsigned = Join-Path $runRoot "$slug-unsigned.apk"
    Invoke-Checked -FilePath $aapt2 -Step 'APK resource link' -Arguments @(
        'link','-o',$unsigned,'-I',$androidJar,'--manifest',$manifestPath,'--min-sdk-version','24','--target-sdk-version',[string]$targetSdk,'--version-code',[string]$VersionCode,'--version-name',$VersionName,'-A',$assets
    )

    $dexFile = Join-Path $dexOut 'classes.dex'
    if (-not (Test-Path -LiteralPath $dexFile)) { throw 'DEX output was not created.' }
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::Open($unsigned, [IO.Compression.ZipArchiveMode]::Update)
    try {
        $old = $zip.GetEntry('classes.dex')
        if ($old) { $old.Delete() }
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $dexFile, 'classes.dex', [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    finally { $zip.Dispose() }

    $aligned = Join-Path $runRoot "$slug-aligned.apk"
    Invoke-Checked -FilePath $zipalign -Step 'APK alignment' -Arguments @('-f','4',$unsigned,$aligned)

    if ($SigningMode -eq 'release') {
        if ($VersionCode -le $PreviousVersionCode) {
            throw 'VERSION_CODE_HOLD: new release must advance the previous release version code.'
        }
        if (-not $SigningKeystorePath) { throw 'RELEASE_SIGNER_HOLD: owner keystore path required.' }
        $keystore = Assert-Tool -Path $SigningKeystorePath -Name 'owner release keystore'
        if (-not $env:JM_ANDROID_RELEASE_KEY_ALIAS) { throw 'RELEASE_SIGNER_HOLD: owner alias missing.' }
        if (-not $env:JM_ANDROID_RELEASE_STOREPASS -or -not $env:JM_ANDROID_RELEASE_KEYPASS) {
            throw 'RELEASE_SIGNER_HOLD: owner signing passwords missing.'
        }
        if (($ExpectedSignerSha256 -replace ':','') -notmatch '^[0-9a-fA-F]{64}$') {
            throw 'RELEASE_SIGNER_HOLD: pinned public owner certificate SHA-256 required.'
        }
        $signArgs = @('sign','--ks',$keystore,'--ks-key-alias',$env:JM_ANDROID_RELEASE_KEY_ALIAS,
                      '--ks-pass','env:JM_ANDROID_RELEASE_STOREPASS',
                      '--key-pass','env:JM_ANDROID_RELEASE_KEYPASS')
    }
    else {
        # Debug signer is ephemeral and NEVER update/release authority.
        $keyDir = Join-Path $OutputRoot '.keys'
        New-Item -ItemType Directory -Path $keyDir -Force | Out-Null
        $keystore = Join-Path $keyDir 'jm-forge-debug.keystore'
        if (-not (Test-Path -LiteralPath $keystore)) {
            Invoke-Checked -FilePath $keytool -Step 'Development-only key creation' -Arguments @(
                '-genkeypair','-v','-keystore',$keystore,'-storepass','android','-alias','jmforge',
                '-keypass','android','-keyalg','RSA','-keysize','2048','-validity','10000',
                '-dname','CN=JM Android Forge Development, OU=JM, O=JMisJustMe, C=GB'
            )
        }
        $signArgs = @('sign','--ks',$keystore,'--ks-key-alias','jmforge',
                      '--ks-pass','pass:android','--key-pass','pass:android')
    }
    $apk = Join-Path $OutputRoot ("{0}-{1}-{2}.apk" -f $slug,$VersionName,$stamp)
    Copy-Item -LiteralPath $aligned -Destination $apk -Force
    Invoke-Checked -FilePath $apksigner -Step 'APK signing' -Arguments ($signArgs + @($apk))
    $certLines = @(& $apksigner 'verify' '--verbose' '--print-certs' $apk 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    $certResult = [regex]::Match(($certLines | Out-String),'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F:]+)')
    if (-not $certResult.Success) { throw 'SIGNING_IDENTITY_HOLD: no APK certificate fingerprint.' }
    $signerSha256 = ($certResult.Groups[1].Value -replace ':','').ToLowerInvariant()
    if ($signerSha256 -notmatch '^[0-9a-f]{64}$') { throw 'SIGNING_IDENTITY_HOLD: malformed APK certificate SHA-256.' }
    if ($SigningMode -eq 'release' -and $signerSha256 -ne ($ExpectedSignerSha256 -replace ':','').ToLowerInvariant()) {
        throw 'SIGNING_IDENTITY_HOLD: APK signer mismatch against pinned owner public identity.'
    }

    $hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
    $apkBytes = (Get-Item -LiteralPath $apk).Length
    $receipt = [ordered]@{
        schema = 'JM.AndroidForgeApkBuildReceipt/1.5'
        outcome = 'PASS'
        project = $ProjectName
        package_name = $PackageName
        version_name = $VersionName
        version_code = $VersionCode
        previous_version_code = $PreviousVersionCode
        source_file_count = $sourceFiles.Count
        source_bytes = $sourceBytes
        apk_path = $apk
        apk_bytes = $apkBytes
        apk_sha256 = $hash
        signing_mode = $SigningMode
        signer_cert_sha256 = $signerSha256
        signing_identity_pinned = ($SigningMode -eq 'release')
        update_ready = ($SigningMode -eq 'release')
        signer_boundary = $(if ($SigningMode -eq 'release') { 'PINNED_OWNER_RELEASE_SIGNER_VERIFIED; install and device runtime are separate' } else { 'DEVELOPMENT_SIGNER_UNSTABLE; NOT RELEASE/UPDATE-READY' })
        android_sdk = $sdk
        platform = $platformDir.Name
        build_tools = $buildToolsDir.Name
        build_route = 'HTML_PROJECT -> JAVAC -> D8 -> AAPT2 -> ZIPALIGN -> APKSIGNER -> APK'
        installed_packages = @()
        automatic_install_to_device = $false
        created_at_utc = (Get-Date).ToUniversalTime().ToString('o')
        claim_boundary = 'This receipt proves local APK construction and signature verification. Device installation, runtime QA, publishing and Ding require separate evidence.'
    }
    $receiptPath = [IO.Path]::ChangeExtension($apk, '.receipt.json')
    $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding UTF8

    [ordered]@{
        success = $true
        apk = $apk
        receipt = $receiptPath
        sha256 = $hash
        bytes = $apkBytes
        signing_mode = $SigningMode
        signer_cert_sha256 = $signerSha256
        update_ready = ($SigningMode -eq 'release')
    } | ConvertTo-Json -Compress
}
finally {
    if (Test-Path -LiteralPath $runRoot) { Remove-Item -LiteralPath $runRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
