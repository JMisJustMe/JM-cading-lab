# JM Cloud Contact CP08 — Recipient-Key Custody (X25519 + CP06)

**Additive / DRAFT / no automatic merge or deployment.** CP08 inherits the immutable original Cloud Contact v0.5.1-hosted body, CP02 supervisor, CP04 cold backup, CP06 whole-file-state AES-256-GCM, and CP07 two-runner proof. All donor files remain byte-for-byte unchanged. No new server, market body, or front door.

## What CP08 actually adds

An independent intended recipient can generate an X25519 private/public key pair without giving the producing machine any private decryption key. Once the producer receives the *public* key and verifies its SHA-256 SPKI fingerprint against a separately trusted owner-retrieved value, it can seal a freshly generated **CP06** whole-file-state archive for that recipient.

The original CP06 256-bit master key is randomly generated for each backup. CP08 uses an ephemeral X25519 exchange, HKDF-SHA256, and AES-256-GCM to wrap that master key under the pinned recipient's public key. The original CP06 encrypted payload and its digest are bound into the authenticated wrapper. A recipient with the correct private key can recover the original CP06 key and invoke the unchanged CP06 restore mechanism, which independently validates all required source state, per-organ hashes, signing identity and restores into a **new** directory only.

Private keys and decrypted state are never included in the sealed transport carrier, GitHub repository, CI receipts or test logs. Tests use synthetic data and ephemeral, disposable private keys. The resulting **sealed file is portable** and can be stored in owner-selected remote custody, but an owner-managed off-site storage service has *not* yet been configured or contacted by CP08.

## Operation — only on trusted machines (example)

Generate the recipient key pair **on the future restore machine** (do not run this on the public source runner; guard the file and keep a separate recovery copy):

```bash
node agent-runtime/host-adapters/jm-operated-host/recipient-custody.mjs keygen \
  /private-owner-custody/cp08-recipient-private.pem \
  /separately-transferable/cp08-recipient-public.pem
```

Record the printed `recipientId` **via an independent trusted channel**. Never rely solely on a fingerprint accompanying an otherwise untrusted public key. Transfer *only* `cp08-recipient-public.pem` to the producer. After stopping all writers (not merely reporting readiness), and confirming that no PostgreSQL backend is configured:

```bash
node agent-runtime/host-adapters/jm-operated-host/recipient-custody.mjs seal \
  /owner-host/stopped-cloud-state \
  /owner-host/verified-recipient-public.pem \
  /external-staging/new-opaque-cp08.sealed.json \
  <64-character-trusted-recipient-id> \
  --stopped-service --file-only-no-postgres
```

Copy the opaque file using a separately authorised remote-storage transport. Inspect file structure and digest before and after transport (NOT a decryption/restore proof):

```bash
node agent-runtime/host-adapters/jm-operated-host/recipient-custody.mjs inspect /external-staging/new-opaque-cp08.sealed.json
```

On the restore machine with the **private key**, the matching opaque file and an absent target state directory:

```bash
node agent-runtime/host-adapters/jm-operated-host/recipient-custody.mjs restore \
  /offsite-copy/new-opaque-cp08.sealed.json \
  /private-owner-custody/cp08-recipient-private.pem \
  /owner-restored/new-state-dir
```

This is source-editable JS with Node built-ins only, and inherits original CP06 `whole-state-cold.mjs` from the stacked PR. It intentionally does **not** auto-start, migrate, expose, or deploy any live service. It does not let the producer unlock the envelope once the ephemeral backup key and private exchange object are discarded; the original live state is unaffected. Private key file permission check requires owner-only mode on POSIX (`0600`), but Windows and hardware keystore security must be evaluated separately. JavaScript memory cleanup and temporary file unlinking are **not** claims of forensic secure erasure.

## Proof scope and limits

- **Cryptographic local fixture gate:** CP08 tests: independent key generation, exact six required carriers, pinned public key, private-only restore, rejected substituted/wrong private key, tampering and metadata authentication, unsafe permissions, symlinks, file overlap, missing organs, and declared stopped/no-Postgres gates.
- **Donor regression gate:** original CP06 Node tests remain unchanged and rerun with CP08 on multiple Node/Linux runner versions.
- **Portable-source gate:** CP08 modules and workflow are authored as separate additive source files above draft CP07; original JM bodies remain separate.
- **Key-custody gate still open:** No real owner-controlled offline key placement, revocation/rotation, two-person recovery, recovery machine authorisation or independent private-key custody is proved by test keys. The recipient public key is not automatically authenticated; an independently trusted fingerprint is mandatory.
- **Off-site gate still open:** GitHub artifacts from CP07 are temporary and GitHub-operated. CP08 creates a portable encrypted file but does not yet upload it to a true owner-chosen persistent off-site system or verify return.
- **Database gate still open:** Any configured `DATABASE_URL` or `JM_MARKET_DATABASE_URL` and PostgreSQL-backed market state are explicit refusal gates. PostgreSQL logical export, independent restore and consistency checks are a distinct CP09 prerequisite.
- **Production and device gates still open:** no real owner data, live credentials, public HTTPS, hardware trust, owner-device contact, disaster failover, independent persistent second host, or `main` promotion proved.

**FLAZ wording:** CP08 code may earn *recipient-sealed file-backed recovery capability* after exact CI proof. This must never be described as full independent hosting, real master-key custody or complete off-site disaster recovery.
