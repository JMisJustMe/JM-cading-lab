# JM Estate Live Registry Android v0.3

**State:** ACTIVE / EXACT-PARENT REPAIR SEATED / EMULATOR CONTACT PENDING / PHYSICAL CONTACT OPEN

Android surface descended from the frozen **JM Estate Live Registry App v0.2 — Native Circulation**.

## Frozen parent

- Keeper SHA-256: `0ec929d0c4f0c281878af091263c45b8db4b5b71edb40e911364c43d15336f38`
- Exact frozen v0.2 package SHA-256: `15282c9707401df3cff7da48caad1818d5cd2ff9c07ecc716c45da14c0834093`
- Parent state: FROZEN / LOCKED / ANCHORED / MOUNTED
- Parent is not modified by this Android descendant.

The earlier v0.3 build used the current split-source descendant of v0.2. That was functionally close but not sufficient for an exact frozen-parent provenance claim. This branch repairs forward: the exact frozen v0.2 package is carried as reconstruction data, SHA-256 checked during the Gradle build, and its original files are materialized byte-for-byte into the APK. `assets/registry/index.html` must itself hash to the frozen keeper SHA-256 above.

## Donor route

- JM Sovereign Ten remains the coding/runtime authority inside the Registry body.
- JMISJUSTME Living Estate carrier lineage contributes the stable local HTTPS WebView/persistence pattern.
- JM Universal Forge v2.1 contributes the API 36 / AGP 8.13.2 / Gradle 8.13 / APK+AAB / bundletool proof rail.
- Android v0.3 contributes only host/contact adaptation around the exact frozen body: stable local origin, DOM storage, document import and save routes, and Android packaging.

## Android identity

- package: `com.jmisjustme.estateregistry`
- version: `0.3` / versionCode 300
- minSdk 23 / targetSdk 36 / compileSdk 36
- local origin: `https://registry.jm.local/`
- Android INTERNET permission: deliberately absent

## Assistant-side proof target

Before operator burden, CI must prove on an Android API 36 emulator:

1. exact embedded keeper SHA-256;
2. boot at the stable JM local origin;
3. native audit PASS with the frozen 20-body seed;
4. state persistence through Activity recreation;
5. Android JSON export writes a readable round-trip document;
6. native receipt export writes a valid JM receipt;
7. Android JSON import returns a valid record set;
8. seed recovery returns to 20 bodies / zero audit issues;
9. APK/AAB identity, signature and no-INTERNET boundary remain intact.

## Boundary

Emulator contact is still not physical-device Ding. Temporary proof signing is not the owner production/update identity. Freeze v0.3 only after a real install/open/contact on the intended device earns the physical claim.
