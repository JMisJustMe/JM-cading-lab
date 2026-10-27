# JM File Grabber × Visualang — CP09 side-by-side native share intake

**Date:** 2026-10-27 · **Status:** forward TEST APK candidate; original protected; migration/opened-device HOLD.

## Why CP09 exists

The preserved v0.3 debug APK and independently compiled CP08 v0.4.1 debug APK have different signing certificates. Android disallows ordinary in-place updates between those identities, and uninstalling a source app may irreversibly delete its app-private vault. The old certificate private key is not recovered, so manufacturing a matching signature is neither possible nor claimed.

**Safe route:** install only a distinctly named, distinctly packaged test edition: `com.jmisjustme.filegrabbervisualang.cp09`. It coexists beside the original `com.jmisjustme.filegrabbervisualang`; different private-vault sandbox, different preferences and a visible "CP09 TEST" application label. This is a **new independent test app**, NOT a migration of old content and NOT a same-package update. Debug certificates may rotate between CI runs, even for this test edition. Do not use staging as a keeper vault.

## Real new functionality

1. Accept `ACTION_SEND` and `ACTION_SEND_MULTIPLE` through Android system share, including `EXTRA_STREAM` and `ClipData` files, while preserving existing SAF multi-file and folder pickers.
2. Only `content://` streams pass the platform-free URI security gate. `file://`, network, fragment and malformed streams are rejected. Duplicate incoming URIs coalesce, max 500.
3. Cold share intents are queued until the embedded Visualang app document finishes loading; `singleTop` also accepts later shares.
4. A visible owner confirmation presents **Import verified bytes** or **Cancel** before invoking the inherited native SHA-256 copy-into-vault implementation. Transient share grants are not falsely promoted to persistable SAF grants.
5. Existing SHA-256 vault/restart validation, HOLD ledger, Visualang HTML, X-Form, Android insets and receipt routing remain inherited from CP08.

## Scope of validation

- Native Share Gate: **19/19 JVM PASS**, with safe URI/adversarial tests.
- Inherited NativeVaultTruth: **34/34 JVM PASS**.
- CP09 manifest/source integrity: **24/24 local checks PASS**.
- Android build: **HOLD until new CP09 GitHub workflow has successfully compiled and uploaded an artifact**.
- Owner-device installation and actual Android share chooser: **HOLD**.

## Before owner physical contact

Do not uninstall the older File Grabber. Keep both app icons visibly distinct. Test the CP09 app with expendable source files first. Save and independently hash-check any originals to shared storage before discussing private-vault migration. The original v0.3 app has no proven full-vault outbound export API; a JSON receipt does **not** carry private bytes. A new test APK cannot read another package's private filesystem. Owner/device install and cross-restart proof are not inherited from JVM or CI.

## Explicit HOLDs

- **Legacy native vault data transfer is NOT implemented.** Requires owner-accessible byte export from older installed app or valid owner-authorised backup/recovery; no bypass or destructive uninstall.
- **Signing continuity for original app remains BLOCKED** without the exact signing key or a legally valid Android signing lineage.
- **Untrusted subframe/JavascriptInterface origin** needs separate WebView security review; navigation blocking alone does not distinguish JavaScript bridge callers in child frames.
- Android physical test, production signing, INTERTAP native integration, App Store release, canonical source-route guard and merge are open.

**Keeper:** source truth > fictional migration; side-by-side doesn't equal restoration; APK compile doesn't equal owner-device proof.
