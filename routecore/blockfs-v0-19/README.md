# JM RouteCore Native64 — BlockFS Phase-Aware Recovery Matrix Gate v0.19

Parent: **BlockFS v0.18 bounded crash / rollback recovery runtime contact**.

v0.19 keeps the proved multi-block filesystem and carrier route, then adds three recovery-pressure courts:

1. `DATA_READY` rollback intent → crash → exact old baseline restored.
2. durable `COMMITTING` intent → crash → forward completion to the staged 1200-byte replacement → following clean boot byte-identical.
3. damaged journal checksum → explicit rejection with no filesystem mutation and no Ring-3 entry.

The journal is checksummed and carries an explicit rollback/commit mode. Forward recovery accepts either the old metadata shape or an already-switched new metadata shape so bounded completion can resume rather than assuming a single one-shot recovery position.

Descendant carrier:

- raw patch SHA-256: `891ce1f57e56d22748b2de0962e7bad8dc462c7ad77fa89ff3049aae0a5b631e`
- normalized concatenated Base64 SHA-256: `5f7c6470742ec91590d49fc67eac2d378708851cf8f37d57bb9c32d00ca82b41`
- local deterministic reapplication: **265 / 265 PASS**
- local boot image SHA-256: `dd10c1669b441cb7ed4b0821946bcaeb7e61c9cce55011fb53ccee204a19befd`
- local kernel ELF SHA-256: `3c9130cebcfdc99368719b8f27d5a8864b87772069f01ea22b2f52f799b26e30`

Runtime claim remains **OPEN** until the GitHub Actions QEMU matrix returns.

**PREPARED IS NOT COMMITTED. COMMITTING IS NOT PREPARED. A DAMAGED RECORD MUST BE REJECTED, NOT GUESSED.**
