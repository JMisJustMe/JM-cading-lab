# JM Signal Engine Android — v2.4.0

Android APK packaging body for **JM Signal Engine v2.4.0 Counterpart Perfection**.

## Governing route

```text
FROZEN WEB ONEBODY
→ ANDROID NATIVE SHELL
→ AUDIO / MIC / FILE / HAPTIC CONTACT
→ EXPORT BRIDGE
→ SOURCE VAULT
→ SIGNED APK
→ RECEIPT
```

## Accessible parts

The repository keeps the native shell, complete OneBody source, docs, build workflow and receipts as separate source bodies. The frozen OneBody is stored losslessly as gzip/base64 source and restored during the build. GitHub Actions creates `JM_Signal_Engine_v2.4.0_SOURCE_VAULT.zip` and embeds it in the APK. Tap **APK VAULT** inside the app to export that source vault to the Android Downloads folder.

## Build

The GitHub Actions workflow installs API 36 / Build Tools 36.0.0, builds a release APK, creates a dedicated owner signing key, verifies the signature and uploads all deliverables as one workflow artifact.

The owner key is never committed to the public repository. Preserve the generated `.jks` and its private receipt for future upgrade-compatible APKs.
