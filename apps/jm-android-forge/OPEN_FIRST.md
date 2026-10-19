# JM Android Forge v1.4 — Laptop Workshop

**Authority:** Theodore Benjamin Scott / JM / JMISJUSTME  
**Roles:** Konengineer · Co-developer · Kodifier

## Purpose

This body moves building responsibility onto the laptop. Android remains a tester, player, run device and companion carrier; it is not forced to remain the entire workshop.

## Windows first

From a local copy of `JM-cading-lab`, double-click:

```text
apps/jm-android-forge/OPEN_JM_ANDROID_FORGE.cmd
```

That starts a local-only PowerShell workshop at:

```text
http://127.0.0.1:3232/apps/jm-android-forge/
```

It does not install Node, Gradle, Java, Android SDK, packages or engines.

## Laptop workshop capabilities

- full-width three-pane project workshop;
- direct laptop-folder opening and writing where the browser supports the File System Access API;
- drag-and-drop and ordinary file-import fallback;
- HTML, CSS, JavaScript, JSON, Markdown, text and SVG editing;
- live preview with relative CSS and JavaScript inlined for the preview body;
- keyboard routes:
  - `Ctrl+S` — save;
  - `Ctrl+Enter` — run preview;
  - `Ctrl+Shift+B` — request APK build;
- portable `.jmforge.json` project export;
- direct-open single HTML export;
- source-state receipt export;
- local build console and tool-status panel;
- one-click local APK route when an existing JDK and Android SDK build-tools are detected.

## APK route

The local builder does not use Node or Gradle. It uses installed Android SDK and JDK tools directly:

```text
HTML PROJECT
→ JAVAC
→ D8
→ AAPT2
→ ZIPALIGN
→ APKSIGNER
→ APK
→ SHA-256 RECEIPT
```

Tool:

```text
tools/Build-JMAndroidForgeApk.ps1
```

The builder:

- requires a root `index.html`;
- applies a 32 MiB default project ceiling;
- stages temporary build files outside the repository;
- writes completed APKs and receipts to `JM_ESTATE_WORKBENCH/70_ANDROID_FORGE_BUILDS` when that workshop exists;
- otherwise uses `Documents/JM_ANDROID_FORGE_BUILDS`;
- defaults to a clearly labelled **development-only** key in the local output folder; this is **not** an update-ready release identity;
- for **release mode**, requires an existing, owner-controlled keystore and pinned public SHA-256 certificate fingerprint; never silently generates the release key;
- reads release key/store passwords from local environment variables (not command-line password literals);
- refuses certificate mismatch or a release version code that does not exceed its stated previous version code;
- verifies the APK signature;
- does not install the APK onto a device;
- does not publish or deploy it;
- does not claim a Ding from construction alone.

## Browser-only fallback

The public or direct-open HTML body remains useful without the local bridge:

- edit imported text project files;
- run the live preview;
- export one direct-open HTML;
- export a portable project bundle;
- export a source-state receipt.

It cannot overwrite arbitrary laptop files or invoke the APK builder from a hosted page. That is a browser security boundary, not missing JM intent.

## Linux and macOS companion launchers

`open-jm-android-forge.sh` calls the same PowerShell bridge through `pwsh` when PowerShell Core is already present. It does not install PowerShell or Android tools.

## Claim boundary

```text
WORKSHOP LOADED ≠ APK BUILT
APK BUILT ≠ APK INSTALLED
APK INSTALLED ≠ RUNTIME QA PASSED
DEPLOYED PAGE ≠ DING
```

The laptop becomes the workshop. Mobile twins remain companion carriers. Source identity and receipts remain separate from delivery claims.

## One-time dedicated AILatheo signing identity — owner's choice (19 October 2026)

The owner chose **a new AILatheo-only release signing key**, rather than recovering or adopting an older JM app's maintenance signer. This changes no historical JM Android Forge or Safe Twin identities.

**One-click on Windows laptop:** from a local `JM-cading-lab` checkout, double-click

```text
apps/jm-android-forge/OPEN_AILATHEO_SIGNING_SETUP.cmd
```

The launcher calls **existing Forge extension** `tools/Initialize-JMAILatheoReleaseSigning.ps1`. Before first run, have a JDK (`keytool`) and [GitHub CLI](https://cli.github.com/) installed and authorised to your own repository using `gh auth login`. The script deliberately installs no software itself.

It prompts only for an independent backup folder and **one new private password (16+ characters)**, which you must save securely. It generates exactly one RSA-3072 PKCS#12 key locally under `%LOCALAPPDATA%\JM_ECOSTATE_PRIVATE\AndroidSigning\AILatheo` (or verifies and reuses that same key on a rerun). It copies the encrypted keystore into the chosen backup folder, compares exact bytes, records the *public* certificate fingerprint and uploads three protected secrets and two public variables to the existing repository using GitHub CLI. The key and password are never pasted into ChatGPT or committed to Git; GitHub CLI encrypts secret values on upload. A second separate-device/offsite encrypted backup is strongly recommended.

**Re-running the launcher reuses and verifies the existing signer.** A mismatched password, keystore, backup or fingerprint produces HOLD, never an automatic new identity. The next release `versionCode 301` can be built on the existing protected GitHub Actions rail once that custody is established. Subsequent releases must increment the code while keeping the same certificate.

**Migration once:** the APK already installed on the Fold was signed with a different temporary certificate. A new key does not update it in place. The owner has authorised uninstalling the older app, but should first preserve any desired local progress. Future AILatheo versions can update the new dedicated-signer installation without uninstalling, once independently device-tested. **A green CI test or a securely configured key is not itself owner-device runtime proof.**

---

## JM maintenance signer — recovered continuity rule (July and August 2026)

The older JM Android Forge v1.2.2 had already demonstrated maintaining the same certificate across descendants. Android Contact v0.3.1 likewise corrected an update through **certificate continuity plus versionCode 301 > 300**. The October AILatheo GitHub workflow regressed that safeguard by building each APK with a new temporary CI key.

**Production signing must never come from a per-run temporary key.** A debug build is development-only, even when it is a valid, signed APK.

### One-time release identity custody (owner-controlled, not committed)

First check whether the existing JM Self-Host/Forge maintenance-keystore custody contains a suitable AILatheo signing key. Do not borrow another app's signing identity without explicit authority. If AILatheo has no established durable signer, create exactly **one** new release keystore on the owner's trusted local laptop using `keytool -genkeypair`, with a private password and alias. Keep encrypted, independent offline custody. Never place a private keystore, password, or unmasked Base64 value in Git or a chat message.

For the existing GitHub Actions release rail, provision in **repository Settings → Secrets and variables → Actions**:

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `JM_ANDROID_RELEASE_KEYSTORE_BASE64` | Base64 of the original owner-held binary keystore; same bytes for every release |
| Secret | `JM_ANDROID_RELEASE_STOREPASS` | Existing keystore password |
| Secret | `JM_ANDROID_RELEASE_KEYPASS` | Existing key password |
| Variable | `JM_ANDROID_RELEASE_KEY_ALIAS` | Owner's alias inside the keystore |
| Variable | `JM_ANDROID_RELEASE_CERT_SHA256` | Public SHA-256 certificate fingerprint (from `keytool -list -v`) |

For example, owner-controlled PowerShell can convert local binary keystore bytes to the repository secret **without printing the encoded value**:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\\private\\AILatheo-release.jks")) | gh secret set JM_ANDROID_RELEASE_KEYSTORE_BASE64 -R JMisJustMe/JM-cading-lab
```

Use the normal GitHub Settings UI or authenticated `gh secret set` for the passwords. Never send these values through chat. Pin the public certificate digest as the repository variable and preserve the original keystore offsite in secure owner custody.

The mainline AILatheo APK workflow **fails closed** when any release-custody input is absent or when its signed APK has the wrong certificate. No public replacement APK is published. PR builds instead generate a disposable **test-only** signer and verify that two successive version codes use the **same certificate**. Those CI test APKs are not owner release candidates.

The next AILatheo intended version is `3.0.1-alpha / versionCode 301`. The APK already installed from the former temporary signing key **cannot update in place** from the new owner identity; preserve data before the one-time uninstall and migration. Once the owner release identity is established, preserve it for **all future AILatheo updates**. Android certificate validation is required alongside a version-code increase; neither alone establishes device-runtime PASS.

**Release gate:** original source → specialist execution → native/receiver tests → same signer → version progression → signed APK asset-byte readback → owner Android first-open/interaction/recovery test → release. Device/runtime claims remain scope-specific.
