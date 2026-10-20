[CmdletBinding()]
param(
    [string]$Repository = 'JMisJustMe/JM-cading-lab',
    [string]$SigningDirectory,
    [string]$BackupDirectory,
    [switch]$CiTest
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$alias = 'jm-ailatheo-release'
$passphrase = $null
try {
    $keytool = Get-Command keytool -ErrorAction SilentlyContinue
    if (-not $keytool) { throw 'KEYTOOL_HOLD: JDK keytool was not found. No key was created.' }
    $gh = $null
    if (-not $CiTest) {
        $gh = Get-Command gh -ErrorAction SilentlyContinue
        if (-not $gh) { throw 'GITHUB_CLI_HOLD: install GitHub CLI, run gh auth login, then rerun.' }
        & $gh.Source auth status *> $null
        if ($LASTEXITCODE -ne 0) { throw 'GITHUB_AUTH_HOLD: run gh auth login on your laptop.' }
    }
    if (-not $SigningDirectory) {
        if ($CiTest) { throw 'TEST_CUSTODY_HOLD: supply an isolated test signing directory.' }
        if (-not $env:LOCALAPPDATA) { throw 'PROFILE_HOLD: Windows LOCALAPPDATA missing.' }
        $SigningDirectory = Join-Path $env:LOCALAPPDATA 'JM_ECOSTATE_PRIVATE\AndroidSigning\AILatheo'
    }
    if (-not $BackupDirectory) {
        if ($CiTest) { $BackupDirectory = Join-Path $SigningDirectory '_CI_BACKUP' }
        else {
            $suggest = Join-Path $env:USERPROFILE 'Documents\JM_PRIVATE_SIGNING_BACKUP'
            $answer = Read-Host "Owner backup folder (external drive preferred; Enter = $suggest)"
            $BackupDirectory = if ($answer.Trim()) { $answer.Trim().Trim('"') } else { $suggest }
        }
    }
    $keyDir = [IO.Path]::GetFullPath($SigningDirectory)
    $backupDir = [IO.Path]::GetFullPath($BackupDirectory)
    if ($keyDir.TrimEnd('\','/') -eq $backupDir.TrimEnd('\','/')) {
        throw 'BACKUP_HOLD: the backup must use another folder.'
    }
    if ($keyDir.StartsWith((Get-Location).Path.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar,
        [StringComparison]::OrdinalIgnoreCase)) {
        throw 'GIT_REPOSITORY_KEY_HOLD: never create the signing key inside a source checkout.'
    }
    if ($CiTest) {
        $passphrase = $env:JM_ANDROID_SIGNING_TEST_PASSPHRASE
        if (-not $passphrase -or $passphrase.Length -lt 16) {
            throw 'TEST_SECRET_HOLD: provide an ephemeral 16+ character CI passphrase.'
        }
    }
    else {
        $secure = Read-Host 'Enter a NEW AILatheo signing password (16+ characters; preserve privately)' -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try { $passphrase = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
        if (-not $passphrase -or $passphrase.Length -lt 16) {
            throw 'PASSWORD_HOLD: require a password of at least 16 characters.'
        }
    }

    # JDK keytool reads this temporary environment variable; password is not passed on the CLI.
    $env:JM_ANDROID_SIGNING_SETUP_PASSWORD = $passphrase
    New-Item -ItemType Directory -Path $keyDir,$backupDir -Force | Out-Null
    $keystore = Join-Path $keyDir 'AILatheo-release.p12'
    $backup = Join-Path $backupDir 'AILatheo-release.p12'
    $alreadyExists = Test-Path -LiteralPath $keystore
    if (-not $alreadyExists) {
        $argsForKeytool = @(
            '-genkeypair','-noprompt','-storetype','PKCS12','-keystore',$keystore,
            '-alias',$alias,'-storepass:env','JM_ANDROID_SIGNING_SETUP_PASSWORD',
            '-keypass:env','JM_ANDROID_SIGNING_SETUP_PASSWORD','-keyalg','RSA',
            '-keysize','3072','-validity','10000',
            '-dname','CN=AILatheo JM Release, OU=JM Android Forge, O=JMisJustMe, C=GB'
        )
        # Windows PowerShell 5.1 translates harmless Java stderr notices (e.g. "Generating
        # 3,072 bit RSA key pair") into ErrorRecord and throws under ErrorActionPreference=Stop.
        # Suppress only that native stderr handling, preserving actual exit-code validation.
        $formerPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            & $keytool.Source @argsForKeytool 2>$null
            $generationExit = $LASTEXITCODE
        }
        finally { $ErrorActionPreference = $formerPreference }
        if ($generationExit -ne 0 -or -not (Test-Path -LiteralPath $keystore)) {
            throw 'SIGNING_KEY_CREATION_HOLD: no usable certificate was produced.'
        }
    }
    $listArgs = @('-list','-v','-storetype','PKCS12','-keystore',$keystore,
        '-alias',$alias,'-storepass:env','JM_ANDROID_SIGNING_SETUP_PASSWORD')
    # The same Windows PowerShell 5.1 stderr adaptation also applies to keytool -list.
    $formerPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $publicLines = @(& $keytool.Source @listArgs 2>&1)
        $readbackExit = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $formerPreference }
    if ($readbackExit -ne 0) {
        throw 'SIGNING_KEY_READBACK_HOLD: key could not be verified; existing bytes unchanged.'
    }
    $publicText = ($publicLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
    $hit = [regex]::Match($publicText,'(?im)SHA256:\s*([0-9A-Fa-f:]{95})')
    if (-not $hit.Success) { throw 'SIGNER_FINGERPRINT_HOLD: public SHA-256 missing.' }
    $fingerprint = ($hit.Groups[1].Value -replace ':','').ToLowerInvariant()
    if ($fingerprint -notmatch '^[0-9a-f]{64}$') {
        throw 'SIGNER_FINGERPRINT_HOLD: public SHA-256 malformed.'
    }

    $metadata = Join-Path $keyDir 'AILatheo-signing-public-receipt.json'
    if (Test-Path -LiteralPath $metadata) {
        $old = Get-Content -LiteralPath $metadata -Raw | ConvertFrom-Json
        if ($old.certificate_sha256 -ne $fingerprint) {
            throw 'IDENTITY_CONFLICT_HOLD: saved public signer differs; no overwrite.'
        }
    }
    if (Test-Path -LiteralPath $backup) {
        $originalHash = (Get-FileHash -LiteralPath $keystore -Algorithm SHA256).Hash
        $backupHash = (Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash
        if ($originalHash -ne $backupHash) {
            throw 'BACKUP_CONFLICT_HOLD: another signing key already occupies the backup path.'
        }
    }
    else { Copy-Item -LiteralPath $keystore -Destination $backup -ErrorAction Stop }
    if ((Get-FileHash -LiteralPath $keystore -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash) {
        throw 'BACKUP_READBACK_HOLD: the backup does not match the identity.'
    }

    $receipt = [ordered]@{
        schema = 'JM.AILatheo.OwnerSigningCustody/1'
        scope = $(if ($CiTest) { 'DISPOSABLE_CI_TEST_ONLY' } else { 'OWNER_LOCAL_RELEASE_IDENTITY' })
        package = 'com.jmisjustme.ailatheocreation'
        alias = $alias
        certificate_sha256 = $fingerprint
        keystore_path = $keystore
        backup_path = $backup
        backup_exact_bytes_pass = $true
        previous_version_code = 300
        intended_next_version_code = 301
        existing_keystore_preserved = $alreadyExists
        no_private_key_committed = $true
        owner_device_update_claimed = $false
    }
    $receipt | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $metadata -Encoding UTF8

    if (-not $CiTest) {
        # stdin is encrypted by GitHub CLI and no secret value is printed or placed in arguments.
        $payload = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore))
        $privateSettings = @(
            @('JM_ANDROID_RELEASE_KEYSTORE_BASE64',$payload),
            @('JM_ANDROID_RELEASE_STOREPASS',$passphrase),
            @('JM_ANDROID_RELEASE_KEYPASS',$passphrase)
        )
        foreach ($entry in $privateSettings) {
            $entry[1] | & $gh.Source secret set $entry[0] --repo $Repository
            if ($LASTEXITCODE -ne 0) {
                throw "GITHUB_SECRET_HOLD: could not provision $($entry[0]); local key and backup remain safe."
            }
        }
        & $gh.Source variable set JM_ANDROID_RELEASE_KEY_ALIAS --repo $Repository --body $alias
        if ($LASTEXITCODE -ne 0) { throw 'GITHUB_VARIABLE_HOLD: alias not provisioned.' }
        & $gh.Source variable set JM_ANDROID_RELEASE_CERT_SHA256 --repo $Repository --body $fingerprint
        if ($LASTEXITCODE -ne 0) { throw 'GITHUB_VARIABLE_HOLD: public certificate fingerprint not provisioned.' }
        $names = @(& $gh.Source secret list --repo $Repository --json name --jq '.[].name')
        foreach ($required in @('JM_ANDROID_RELEASE_KEYSTORE_BASE64',
            'JM_ANDROID_RELEASE_STOREPASS','JM_ANDROID_RELEASE_KEYPASS')) {
            if ($names -notcontains $required) {
                throw "SECRET_NAME_READBACK_HOLD: $required is not listed."
            }
        }
        Write-Host 'AILATHEO_OWNER_SIGNING_CUSTODY_PASS · GitHub protected secrets + pinned public signer provisioned'
        Write-Host 'A new identity cannot update your old temporary-key APK without a one-time migration.'
    }
    else { Write-Host 'AILATHEO_TEST_SIGNING_CUSTODY_PASS · NO GITHUB SECRETS WRITTEN' }
    Write-Host ('PUBLIC_SIGNER_SHA256=' + $fingerprint)
    Write-Host ('OWNER_KEY_PATH=' + $keystore)
    Write-Host ('OWNER_BACKUP_PATH=' + $backup)
    Write-Host 'Next gate: signed v301 release and owner-device installation/recovery; no device Ding yet.'
}
finally {
    Remove-Item Env:\JM_ANDROID_SIGNING_SETUP_PASSWORD -ErrorAction SilentlyContinue
    $passphrase = $null
}
