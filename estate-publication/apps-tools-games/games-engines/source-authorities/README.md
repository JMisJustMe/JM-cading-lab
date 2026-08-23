# Wave 2 — GameForge + GlyphForge Source Authorities

Status: PUBLIC-SOURCE CANDIDATE / EXACT-RECONSTRUCTION GATED

This body publishes the frozen source authorities established by **JM Games & PLAYFORM Authority Reconciliation v1.0** without collapsing source authority, mature output, or physical/native proof.

- **GameForge v3.16 — One-Player Separation Alpha**
  - raw source: 114,474 bytes
  - SHA-256: `a2d814c947a80cd00d9bfae7086e004179c8d3b6c9876a922a4b3e8b3b2d2adb`
  - mature output remains separate: Forgefall Full Campaign v3.0
- **GlyphForge v68.2 — Matrix-Angle Screen-Fit Correction**
  - raw source: 108,992 bytes
  - SHA-256: `93e03de9c71e46907681e3c30eec11bf63c1c5f89b10fb9ae2a8343aa8b964d3`
  - mature output remains separate: Prism Production Studio v3.0

## Lossless transport

The authoritative HTML is carried reversibly as deterministic gzip → Base64 → small ordered chunks. Each chunk is pinned by byte count, SHA-256, and Git blob SHA-1 in its per-body `transport/MANIFEST.json`.

CI must verify every chunk before concatenation, then verify Base64, gzip, decompressed byte count, and the frozen raw SHA-256. **Compression is transport, not identity.**

The earlier truncated text carriers are not used by the live reconstruction. Their failure is preserved in `TRANSPORT_FAILURE_RECEIPT.md` and Git ancestry.

## Claim boundary

`source authority != mature output != owner-device/native/final product crown`

This publication does **not** claim APK/AAB delivery, private signing, owner-device Ding, native-delivery proof, or final-product crown. GlyphPlay remains a separate authority/publication rail.
