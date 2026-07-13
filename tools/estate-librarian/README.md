# JM Estate Librarian v0.4

**Storage Pressure & Safe Archive Pass**

A checkpoint-compatible continuation of **JM Estate Librarian v0.3.0**. The v0.3 source body remains the frozen lineage anchor; v0.4 adds a read-only pressure, selection and archive-planning layer without claiming destructive file operations.

## What v0.4 adds

- Permissioned file and folder intake.
- SHA-256 exact-duplicate proof.
- Import adapter for v0.3-style checkpoint JSON (`items`, `records`, `register` or `files`).
- Selected-storage and configurable-capacity pressure model.
- Exact reclaimable-byte calculation.
- Family/version inference, current-best candidate ranking and non-binding suggestions.
- Human-controlled decisions: `keep-active`, `archive-external`, `review`, `never-delete`; suggestions never overwrite them.
- External archive destination gate.
- Archive manifest and removal-readiness receipt exports.
- No delete, move, rename, merge or overwrite controls.

## Open routes

- `OPEN_FIRST_JM_ESTATE_LIBRARIAN_v0_4.html` — direct-open standalone body.
- `web/index.html` — served/PWA route.
- `android/` — Android Studio / Gradle carrier with native folder-tree hashing, multi-file selection and Android save-export bridge.
- `.github/workflows/build-apk.yml` — GitHub Actions APK builder.

## Build Android locally

Install Android SDK 35, Build Tools 35.0.0, Java 17 and Gradle 8.9, then:

```bash
cd android
gradle assembleDebug
```

The APK will appear at:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Proof boundary

The standalone web body is locally QA-tested in Chromium. This package contains an Android project and a GitHub Actions build route. A compiled APK and physical Android device Ding require an Android SDK build runner and device installation; do not claim those until the artifact and device proof exist.

## Keeper

> Keep the strongest current production bodies mounted here. Archive the wider lineage externally only when recovery is proven.
