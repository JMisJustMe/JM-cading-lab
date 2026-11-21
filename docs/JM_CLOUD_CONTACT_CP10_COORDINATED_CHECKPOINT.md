# JM CP10 — Coordinated file + PostgreSQL recovery checkpoint

**Status:** Review-only code; genuine CI proof must pass on exact GitHub commit before a bounded FLAZ. No production access, no live deployment, no source modification.

Donor: `JMisJustMe/jm-cloud-contact-server-first-cloud@0921217d95285bcb21cda7a995d02f7ec0725810`. Sovereign Cloud Contact, Game, Service Mesh, Market, Zezu, CP02, CP06, CP08, CP09 and their immutable ancestors are preserved. Stacks on draft CP09 PR #578.

## Why separate CP10 rather than weakening CP06

CP06 intentionally refuses `market-state.json` with `persistence.mode=postgres`: files alone do not recover live PostgreSQL state. CP09 separately encrypts and restores the actual three market tables. CP10 retains BOTH organs without pretending the PostgreSQL mode is file-only.

CP10's paired checkpoint reads every enumerated original Cloud Contact, Game, Mesh, Market, Zezu and receipt-signing file (with optional `.bak`/Zezu proof), then invokes the original CP09 `pg_dump` of Market snapshots, outcomes and durability witnesses, compares exact file SHA-256 manifests again, and places file bytes plus CP09's sealed PostgreSQL archive in a **single recipient-encrypted outer checkpoint**. X25519 ephemeral agreement, HKDF-SHA256 and AES-256-GCM protect the outer package; an independently trusted X25519 public-key SHA-256 fingerprint is mandatory. The inner PostgreSQL archive keeps CP09's separate authenticated recipient encryption. The outer archive's SHA-256 is independently pinned at restore. Neither file state nor PostgreSQL table identities are collapsed into the other.

Restore requires a fresh file directory and a *separately created empty PostgreSQL database*. It verifies the entire outer checkpoint before touching either destination, restores the PostgreSQL archive through CP09's guarded `pg_restore --single-transaction` and row-hash checks, then stages and byte-verifies the files and publishes the fresh directory. It returns an explicit scoped receipt and never activates/merges/deploys the server. **If the filesystem publication fails after the PostgreSQL restore, the recovery is a HOLD; do not start a server or treat it as a full committed transaction.**

The CI harness tests the actual frozen hosted v0.5.1 Node service against an isolated PostgreSQL 16 source and target, creating live Cloud Contact, Game and Mesh entities, verifying Zezu, stopping the original server, sealing, preflighting and restoring, and restarting the unchanged donor to verify its original signed receipt, game identity, mesh save and market Postgres prior-witness contact. Also tests wrong recipient, incorrect archive pin, tamper and occupied target. All secrets and data in CI are disposable fixtures.

## Hard limitations

- The original server's writer stop is enforced for the Node process under CI supervision, but **not** a distributed freeze of every independent database writer. CP09 `pg_dump` uses PostgreSQL MVCC and before/after row manifests; this is NOT an atomic cross-store transaction nor a real globally fenced production checkpoint.
- No owner-held private key or durable off-site store has been configured; no owner-controlled second host, live PostgreSQL or state has been accessed. Public CI fixture keys are not evidence of owner secret custody.
- Neither PostgreSQL system roles, other DB schemas, all cluster state nor backups of third-party services are covered. Only those three source-confirmed Market tables qualify.
- Existing server secrets and admin tokens must be delivered to a recovered owner host through **separate secure custody**. CP10 neither captures nor rotates secrets.
- No production merge, deployment, DNS, TLS, billing, live client cutover or owner-device proof. The inherited drafts remain safely unmerged pending the separate production-deploy control gate.

**Operational admission:** supply a trusted public recipient key, independent trusted fingerprint, a fully stopped writer set, original separated file state and an explicitly scoped source PostgreSQL connection; on restoration supply independently attested ciphertext digest and private recipient key on a different secure host, plus a brand-new file directory and isolated empty PostgreSQL database. Run full recipient API verification before any separately authorized promotion. Never treat review CI as public service availability.
