# Wave 2 — Game Engine Army v4.0 Transport Failure Receipt

Date: 2026-08-23
Branch: `wave2/game-engine-army-v4-public-source`
PR: #160

## Source authority
- Canonical HTML bytes: 355237
- Canonical SHA-256: `d0acf44fb71b38cc41f2201c883120c4d1d6ea5dae2e3aa6f163e38b0733baaa`
- Deterministic transport encoding: `gzip.compress(..., compresslevel=9, mtime=0)` then standard Base64, split into 20,000-character slices.
- Deterministic gzip SHA-256: `eb42b5f7dc942323f11d74aaccafddde1a3c15c7f11c6d1ef2cdeb2de6fb87cb`
- Base64 carrier length: 169888 characters.

## Failure detected before crown
Git-side blob verification showed six slices exact and three slices divergent.

Exact on first verification:
- part001: `c252960fae5473939473a031b9e83f2fd0263398`
- part002: `923e28e9c28b7bec9be9aa88fd82d736650c0e0d`
- part004: `77bd0a98d1665a5ee1fa1983b88860a98b44400f`
- part006: `c5b83dd9775e5706aaaf17c667eb89e2c43c7740`
- part008: `9ac7fd472669a84fe10332f9fdafe7310769bea5`
- part009: `d1f074e813f956a700bb32ac004cae8aa6b0e42f`

Divergent on first verification:
- part003 observed blob `8fa149269f059cfe6b63d19c31215d3619f50bd1`; expected `7d7c5a987933f9f442e2146c7a06d8f8d9da5f45`.
- part005 observed 20001 bytes / blob `ed9ed144e5be9e6b86cec92023985df8db23629a`; expected 20000 bytes / blob `93cafa6018e36e8bcf91b51f11a52824c49fed14`.
- part007 observed 19996 bytes / blob `a575829bedc9e2fae35089405daebac27a770505`; expected 20000 bytes / blob `c3e41e2fad6588eac16f7e7455501b218004f655`.

## Governance consequence
No publication-complete, merge, runtime, device, or native crown was claimed from the corrupt carrier. The failure is retained as evidence and repair proceeds forward from the frozen source authority; the bad uploads are not silently erased from lineage.
