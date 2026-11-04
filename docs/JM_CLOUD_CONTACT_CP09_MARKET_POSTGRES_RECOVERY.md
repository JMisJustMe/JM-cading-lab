# JM ECOSTATE — CP09 · Market PostgreSQL recipient recovery

**Source donor**: `JMisJustMe/jm-cloud-contact-server-first-cloud@0921217d95285bcb21cda7a995d02f7ec0725810` — the genuine hosted v0.5.1 server; the PostgreSQL market implementation lives in `market/JM_MARKET_LAB_PROFILE_CURRENT.mjs`. No donor source is modified. This additive branch stacks on the CP08 recipient-key adapter and reuses CP08 key creation rather than substituting a generic second server.

## Precisely recovered, bounded database identity

These three independently persistent tables are created by JM Market's `initDurable` when its PostgreSQL profile successfully contacts the database:

1. `public.jm_market_pulse_snapshots`: `id BIGSERIAL`, `fetched_at TIMESTAMPTZ`, `symbol TEXT`, `payload JSONB`.
2. `public.jm_quick_flip_proof_outcomes`: `id BIGSERIAL`, `created_at TIMESTAMPTZ`, `symbol TEXT`, unique `receipt_hash TEXT`, `payload JSONB`.
3. `public.jm_quick_flip_durability_witnesses`: `id UUID`, `created_at TIMESTAMPTZ`, `previous_id UUID`, `payload JSONB`.

The CP09 adapter checks exact column definitions and stores cryptographic digests of each table's canonical ordered COPY representation, including all rows (not just the last 20,000 snapshots / 500 outcomes loaded by the hosted runtime). Owned sequences and table constraints are included in a PostgreSQL custom-format logical dump. It does **not** represent a general PostgreSQL cluster backup, or automatically capture any other application's database tables.

## Bounded functionality

- Source writes must first be stopped by the operator. The adapter refuses an unacknowledged backup; it checks full table digests before and after `pg_dump` but does not itself acquire an exclusive write fence. A matching before/after digest narrows but does not eliminate a concurrency race.
- The recipient's **X25519 public key** and exact SHA-256 fingerprint are supplied to the producer. The recipient's **private key stays off the producer**, and the full binary pg_dump plus hashes are placed inside an authenticated X25519/HKDF-SHA256/AES-256-GCM envelope. A fresh ephemeral key is used for each archive.
- Database connection strings are read from `JM_CP09_SOURCE_URL` or `JM_CP09_TARGET_URL` **environment variables, never command-line arguments**; libpq credentials are passed only in child process environments. No shell execution, no SQL built from untrusted table identifiers, no password-bearing stdout or stderr logs.
- Recipient restore requires the private key, an **independently obtained exact full-ciphertext SHA-256**, and a separately created, **empty** target database. Before restoring, the archive is decrypted/authenticated, the internal manifest and archive hashes are checked, and a `pg_restore --list` allowlist is applied. Restore uses `--single-transaction`, `--exit-on-error`, `--no-owner`, `--no-privileges`; there are no `--clean`, `--create`, overwrite, or production-dispatch options. The restored data and witness chain are verified against exact source digests.
- PostgreSQL table data, user credentials, keys and ciphertext are never committed as source or uploaded as CI evidence.

CLI (operator controls database credentials, write quiescence and target selection):

```bash
# The recipient creates X25519 keys using CP08 on a separate trusted machine.
# The producing machine receives ONLY recipient.public.pem and its trusted 64-char fingerprint.
export JM_CP09_SOURCE_URL='postgresql://USER:PASSWORD@HOST:5432/DATABASE'
node agent-runtime/host-adapters/jm-operated-host/market-postgres-cold.mjs backup \
  recipient.public.pem TRUSTED_RECIPIENT_SHA256 new-market-pg.sealed.json --writes-stopped

# An independently controlled restore machine (private key never on backup producer):
export JM_CP09_TARGET_URL='postgresql://USER:PASSWORD@HOST:5432/EMPTY_NEW_DATABASE'
node agent-runtime/host-adapters/jm-operated-host/market-postgres-cold.mjs restore \
  new-market-pg.sealed.json recipient.private.pem VERIFIED_SEALED_FILE_SHA256 --empty-target
```

**Important**: the `JM_CP09_SOURCE_URL` and `JM_CP09_TARGET_URL` environment variables may be visible to processes on the same host. Keep execution on a trusted owner-controlled machine; use a dedicated minimum-privilege PostgreSQL role, secure environment management, TLS (`verify-full` on non-loopback connections), and appropriate file permissions. Do not enter production credentials into chat or GitHub source.

## Independent CI evidence target

The new PR job launches actual `postgres:16`, creates *only disposable test databases*, seeds data following the recovered exact table schema, uses real `pg_dump`, encrypts for an ephemeral recipient, rejects bad pins/keys/tampering/nonempty destinations, restores to a distinct database, and verifies all rows, Quick Flip proof outcome and the linked durability witnesses. It checks that the restored sequence can accept a new insert and that a second restore is refused.

CI is an **integration proof in disposable local databases**, not a test of the real hosted Render PostgreSQL, operator-controlled off-site storage, or a second independent production host.

## Holds: do not overclaim

CP06/CP07/CP08 file-backed recovery remains separately valid. CP09 is a distinct database carrier; **no consistent single transaction simultaneously seals the five file organs plus PostgreSQL**. CP09's operator-declared stopped-writes flag is not proof of a real external write fence. There is no production database migration, off-site retention, key ceremony, physical owner-device proof, owner-run Linux host, DNS/HTTPS activation, or provider-failover proof. The production deploy/workflow restriction for preceding PRs remains in force; the stacked CP09 pull request must stay draft and unmerged.

**Current status**: SOURCE BUILT; local guard tests passed. The real PostgreSQL result must come from the new GitHub CI job. No CI PASS claimed before actual runner log readback.
