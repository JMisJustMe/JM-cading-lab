# Transport Failure Receipt — PR #157

Date: 2026-08-23  
State: PRESERVED FAILURE / REPAIRED FORWARD

The first connected-text carriage silently truncated before Git storage:

- GameForge `source.html.gz.b64`: **25,024 bytes** reached Git; gzip reconstruction ended with unexpected EOF.
- GlyphForge `source.html.gz.b64`: **10,000 bytes** reached Git; carrier was incomplete.

This was a **transport failure**, not a source-authority failure. The exact source bodies were independently recovered again from Estate custody and re-hashed:

- GameForge v3.16: 114,474 bytes — SHA-256 `a2d814c947a80cd00d9bfae7086e004179c8d3b6c9876a922a4b3e8b3b2d2adb`
- GlyphForge v68.2: 108,992 bytes — SHA-256 `93e03de9c71e46907681e3c30eec11bf63c1c5f89b10fb9ae2a8343aa8b964d3`

Repair-forward route:

1. Recover the exact bodies from the RouteOS Game Estate carrier.
2. Reconfirm raw source bytes and SHA-256.
3. Use the carrier's deterministic gzip representation (`level=9`, `mtime=0`).
4. Split Base64 into small ordered chunks.
5. Pin every chunk by byte count, SHA-256, and Git blob SHA-1.
6. Reconstruct in repository-native CI and reject any mismatch before JavaScript/safety checks.
7. Remove the truncated live-head carriers while retaining this receipt and Git ancestry.

No source hash was changed to accommodate the failed carrier.
