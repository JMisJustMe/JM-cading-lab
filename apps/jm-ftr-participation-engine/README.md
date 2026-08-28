# JM FTR Participation Engine v9.0

Stable route after merge: `https://jmisjustme-estate.pages.dev/apps/jm-ftr-participation-engine/`

This mount preserves the exact v9 runtime through one deterministic gzip stream carried as ordered raw connector-safe segments. The canonical runtime is **245,236 bytes** with SHA-256 `0F5B389757D5BDBA2F7B0248673F19B02430528E255E8784D82A292ACE7739EF`; deterministic gzip is **63,324 bytes** with SHA-256 `91746AA0141E207144CB540A96C17EF8FACE8C4C0B8D520ECFE63F8D7F5DDC43`. The loader concatenates the raw segments, verifies the gzip hash, decompresses, verifies the runtime hash, then mounts the unchanged body. CI independently reconstructs the same bytes.

The earlier five-fragment base64 transport is not inherited because its concatenation failed gzip reconstruction. No runtime authority changed.

The physical GEO / AMA-Pro Ding remains pending until real hardware and operator field evidence exist.
