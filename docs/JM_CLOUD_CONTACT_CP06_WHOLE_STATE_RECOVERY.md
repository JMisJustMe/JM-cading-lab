# JM ECOSTATE — CP06 genuine hosted Cloud Contact whole file-state recovery

**Development / PR test only. No production deploy, owner credentials, branch promotion or Render cutover.**

## Authority

Preserve all source identities from CP01–CP05. CP06 extends the existing owner-operated host adapter family, not a new server. Uses the hosted v0.5.1 donor `JMisJustMe/jm-cloud-contact-server-first-cloud` pinned to `0921217d95285bcb21cda7a995d02f7ec0725810`. Current production state is not read or altered. The hosted donor itself is not modified.

## Five distinct file-backed recipients

- Cloud Contact core: `state.json`; optional `state.json.bak` is preserved if present.
- Receipt signer: `receipt-signing-key.pem` (required for stable signed receipts).
- Game profile: `game-state.json` (players, inventories, matches and clans).
- Service Mesh: `mesh-state.json` (Authusers, workspaces, packet pipelines).
- Market Lab: `market-state.json` (file-fallback snapshots and proof outcomes only).
- Zezu history: `zezu-state.json` (admitted history and return receipts).
- Zezu runtime evidence sidecar: `JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json` when present and passing.

These are distinct sovereign organs, not one merged state. The snapshot is an encrypted transport carrier containing their separate exact original file bytes.

**Important limitation:** Market Lab also supports PostgreSQL through `JM_MARKET_DATABASE_URL` or `DATABASE_URL`. This CP06 bundle does NOT export PostgreSQL. It refuses to claim file-only completion if the market API reports a configured database or if the market state reports durable PostgreSQL mode. A future separate Postgres dump/restore and consistency point is necessary before claiming any real database-backed hosted deployment is fully recoverable.

## Cryptographic and filesystem controls

`whole-state-cold.mjs` requires the original server and writers fully stopped; operator must explicitly pass `quiesced:true`. It rejects missing organs, unexpected/uninventoried files, unsafe links, malformed JSON/state schemas, bad signing keys, unexpected or existing restore destinations, archive overlap, wrong AES keys, ciphertext and authenticated-header tampering and external-database flag. Uses an independently owned 256-bit master key, HKDF-SHA256 and AES-256-GCM; filenames, individual SHA-256 digests and original bytes are authenticated within the encrypted payload. Exclusive atomic restore to a new directory with fsync and strict readback; no overwrite of existing state or source. No write-in-place restore or opportunistic reset.

**Quiesced operator declaration is not a kernel lock:** the process must actually be stopped and no independent writers may be changing the files. Snapshot double-read only catches ordinary concurrent changes, not hostile TOCTOU. File system paths must remain under trusted owner permissions; this is not a multi-user sandbox or production database transaction. Keep the key and full server secret in independent secure custody outside the encrypted carrier. Never commit either.

## Genuine runner / CI

`hosted-whole-recovery-v051.mjs` starts the real pinned server through JM's CP02 supervisor with new disposable credentials and the five isolated private state paths; checks root, actual game registration, actual mesh Authuser and workspace save, file-only market status and Zezu canonical history return. Stops the server, confirms all required state files exist, encrypts/verifies the entire file set, rejects corrupt/wrong-key backups, deletes only the disposable runtime state, restores all original bytes to a different directory, starts the *same original server code* against it, and compares API views and cryptographically verified root signing identity. The GitHub job also tests the bundler on synthetic fixtures and uploads only a bounded public-safe receipt.

Run only in trusted Node 22+ test infrastructure, with the exact pinned donor checked out and installed dependencies:

```bash
node --test agent-runtime/host-adapters/jm-operated-host/whole-state-cold.test.mjs
node agent-runtime/host-adapters/jm-operated-host/hosted-whole-recovery-v051.mjs /path/to/pinned-hosted-donor /private/new-proof.json
```

## Still open

File-backed local recovery != live platform independence. External Postgres backup/restoration; stable secret and key custody/rotation; independently durable off-machine encryption and retention; corruption fail-closed in the unmodified original server; stateful recovery while requests are arriving; actual owner-operated remote machine; public HTTPS, route migration and owner-device contact remain separate evidence gates. Market snapshots may be empty in this intentionally network-isolated test; API continuity is not proof of externally sourced market observations. No user data, trading, live payments, production server changes or real devices involved.

All CP01–CP05 parents remain intact. No merge or production deployment authorised by this PR.
