# JM RouteCore Native64 — BlockFS Phase-Aware Recovery Matrix Gate v0.19

Parent: **BlockFS v0.18 bounded crash / rollback recovery runtime contact**.

v0.19 keeps the proved multi-block filesystem and carrier route, then adds three recovery-pressure courts:

1. `DATA_READY` rollback intent → crash → exact old baseline restored.
2. durable `COMMITTING` intent → crash → forward completion to the staged 1200-byte replacement → following clean boot byte-identical.
3. damaged journal checksum → explicit rejection with no filesystem mutation and no Ring-3 entry.

The journal is checksummed and carries an explicit rollback/commit mode. Forward recovery accepts either the old metadata shape or an already-switched new metadata shape so bounded completion can resume rather than assuming a single one-shot recovery position.

Descendant carrier:

- raw patch SHA-256: `3b25549e744d8c6a2a3f100d0924bdbaa167f504695d22dbab5c50d2bf81ddeb`
- normalized concatenated Base64 SHA-256: `77b26c5c9d0f567ef73d023ae748fae773769e46baf7c2bfaeaeff1ad9bab197`
- local deterministic reapplication: **265 / 265 PASS**
- local boot image SHA-256: `8827d7ff4c2fb32e0aca6d4719c4fc5c18e4a8cc1bacc7376db26ac1fdb23250`
- local kernel ELF SHA-256: `2ae7eaf12f039dcc0c83d677602d0f62f215e27a93334eeaae95512313743494`

Runtime claim remains **OPEN** until the GitHub Actions QEMU matrix returns.

**PREPARED IS NOT COMMITTED. COMMITTING IS NOT PREPARED. A DAMAGED RECORD MUST BE REJECTED, NOT GUESSED.**
