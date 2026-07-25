# JM Estate Compass — clean Android host v1.2

This is a conventional Android Gradle project. It does not patch, mutate or reuse a donor APK.

## Privacy boundary

The public repository contains only the Android host. It does **not** contain the private JM Estate Compass HTML or mounted Estate bodies.

At first launch, the owner selects the Compass HTML from the device. The app copies it into private app storage, loads it under a stable local origin, and preserves WebView local storage / IndexedDB for owner edits.

## Build route

- Android Gradle Plugin 8.7.3
- Gradle 8.9
- compileSdk / targetSdk 35
- standard `assembleRelease`
- standard Android `zipalign`
- release APK remains unsigned in CI
- final signing is performed outside the public repository with the owner's existing key

Package identity: `com.jmestate.estatecompass`
Version: `1.2.0` (`versionCode 1200`)
