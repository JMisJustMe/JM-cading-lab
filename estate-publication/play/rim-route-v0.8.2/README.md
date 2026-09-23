# JM Rim Route v0.8.2 — Google Play pre-console body

This branch is a **pre-purchase / pre-Console release descendant** of the exact stage-ready Rim Route v0.8.2 body.

## Straight run
Games&Beyond exact payload → recover `rim-route` → SHA-256 verify → API 36 Android carrier → lint/tests → debug APK → proof AAB → bundle validation → AAB-derived APK → owner-device contact → Play account gate.

## Authority
The game source is not rewritten into Android source. CI recovers the existing exact HTML body from `games-beyond/GAMES_BEYOND_PAYLOAD_v0_3.lzma.b64.txt`, verifies SHA-256 `86d30d56ce9a1e54d1d0eb981fb7a2cf4ee6d125fccaa77cbd8478d555246a63`, and mounts that body into a minimal local WebView carrier.

## Important boundaries
- `com.jmisjustme.rimroute` is the prepared package identity.
- API 36 is the prepared target/compile SDK.
- No Android Internet permission is requested.
- No ads, analytics, login or third-party SDK is added.
- The CI signing identity is disposable proof material only.
- No permanent Play upload key is stored in this public repository.
- No Play Console submission or production claim exists yet.
- Real screenshots must come from real device contact, not a fabricated mock.

Open `PRE_CONSOLE_HANDOFF.md` for the remaining owner/Google gates.
