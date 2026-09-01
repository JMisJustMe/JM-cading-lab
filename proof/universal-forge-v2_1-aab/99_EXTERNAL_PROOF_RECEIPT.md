# JM Universal Forge v2.1.0 — Official AAB External Proof Receipt

**Status:** OFFICIAL AAB BINARY PASS · API 36 NATIVE SOURCE PASS · OWNER-DEVICE / PLAY CONTACT OPEN

## Passing chain

- Branch: `jm-universal-forge-v2-1-native-store-proof`
- Draft PR: `#71`
- Passing source commit: `bfaa0e568951ce506978c3a83df089778087143f`
- Workflow run: `30678723068`
- Workflow artifact ID: `8811447405`
- Workflow artifact digest: `sha256:1bb263b7320379109ae3b2a6131bf1b20f23eec5660dae7a61ad2e0880d4d481`

## First rejection and correction

The first official build reached Android release-signing validation and failed because the app module resolved `proof-upload.jks` relative to `app/`, while CI created the key at the project root.

The source was corrected to resolve the key through `rootProject.file(...)`. The second run then passed every build, validation and artifact stage.

## Official binary proof

| Artifact | SHA-256 |
|---|---|
| Release AAB | `dee3d25828b98cfd92e851aad71ce82dc9ea07b0fb80fa0e7b9a69d0b24fec3b` |
| Release APK | `bb38ff7eefcc64a5e2bce1ae14a07badaea0f04a1b8f5cab37eb471b879cdd95` |
| Universal APK derived from AAB | `e4af59547312c9da31f056294a0532d26a6d6e3d890d189f3c3dfe0253b2e6af` |

The passing route established:

- compileSdk and targetSdk 36;
- Android Gradle Plugin 8.13.2 and Gradle 8.13;
- release AAB creation;
- release APK creation;
- `bundletool validate` PASS;
- universal APK derivation from the AAB;
- independent APK signature verification;
- explicit native permission source for camera, microphone, location and notifications;
- ephemeral 4096-bit CI proof identity with no owner private key committed.

## Returned keeper

`JM_UNIVERSAL_FORGE_v2_1_0_NATIVE_STORE_PROOF_ZIONFOLDER.zip`

SHA-256: `90eea83282652243f4baf3aeaa6f353874b2f08094625b354eaf83070a21ac96`

Fresh extraction returned:

- internal keeper hashes: `28/28 PASS`;
- CI binary identities: `3/3 PASS`;
- AAB archive integrity: `PASS`;
- AAB-derived universal APK archive integrity: `PASS`.

## Claim boundary

This closes the source-only AAB boundary from v2.0. It does not claim the user's permanent production signing identity, physical permission grants on the owner's phone, Google Play submission or acceptance, or completion of the full v2.1 workshop integration.
