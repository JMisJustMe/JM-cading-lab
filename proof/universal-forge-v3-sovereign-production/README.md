# JM Universal Forge v3.0.0 — Sovereign Production official build room

This branch exports an official Android API 36 / Build Tools 36.0.0 / Gradle 8.13 / AGP 8.13.2 build room for the exact owner-held Universal Forge v3 source body.

## Route

`owner-held v3 source → exported official build room → offline release APK + genuine AAB → bundletool validation → AAB-derived APK → receipts`

## Boundaries

- No owner private signing key is committed or exported.
- The build-room artifact contains toolchain/dependency material, not the private owner factory.
- The exact v3 source body remains in its private/public-safe Zionfolders and is hashed before official compilation.
- Device installation, permission contact and Play Console acceptance remain external lived gates.

## Correction trace

An initial attempt began transporting the full source archive as chat-sized fragments. That route was stopped before proof was claimed because it weakened readability and maintainability. The official build-room route preserves the exact local source bytes and exports only the external carrier machinery needed to compile them.
