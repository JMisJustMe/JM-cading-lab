# JM ECOSTATE — CP04 encrypted COLD recovery adapter

Date: 28 October 2026. **Additive source candidate; local synthetic-state proof only.** Recipient of existing JM Cloud Contact Profile Mounts v0.5 and JM operated-host adapter. Original v0.5 server, CP03 contact harness, Money Menu, and hosted services are not modified.

## What is actually built

`agent-runtime/host-adapters/jm-operated-host/cold-backup.mjs` provides an **owner-run local cold backup/restore adapter** for the CP03 private Cloud Contact state pair `state.json` and `receipt-signing-key.pem`, preserving bytes and public signing identity across a recovered directory. It uses Node's built-in AES-256-GCM and HKDF-SHA256 with a **random 32-byte owner-managed secret** supplied outside repository/source. Random per-backup salt and nonce, authenticated headers, encrypted state+signer, exclusive backup output, bounded files, mode 0600 source restoration, restore-only-into-new-dir refusal, symlink ancestor checks, and post-write decrypt/readback. It does not export raw signer/state into receipts.

This is a **COLD** route. STOP all Cloud Contact writers and validate quiescence *before* backing up. The adapter double-reads files but cannot enforce server shutdown or a filesystem-wide atomic snapshot; backing up a running server may produce an inconsistent pair even if individually unchanged. Do not back up a real server without independent stop + readiness/lock gate. No automatic backup scheduling, rotation, off-device transport, multiple backup replicas, KMS integration, multi-machine transaction coordination or production server use exists yet.

## Operational syntax (authorised owner machine, stopped test-state only)

1. Provision a strong 256-bit key using an approved local secret manager. Provide it to the process as `JM_CP04_BACKUP_KEY_B64` (base64, 32 bytes decoded); retain a separate, recoverable copy securely. **Loss of the key means loss of the encrypted backup.** Do not store it in GitHub, screenshots, public logs or the backup file.
2. Backup: `node agent-runtime/host-adapters/jm-operated-host/cold-backup.mjs backup /private/stopped/cloud-contact-state /private/offline/cold-001.json`
3. Verify: `node agent-runtime/host-adapters/jm-operated-host/cold-backup.mjs verify /private/offline/cold-001.json`
4. Restore to a **new empty target path**: `node agent-runtime/host-adapters/jm-operated-host/cold-backup.mjs restore /private/offline/cold-001.json /private/recovery/cloud-contact-state`
5. Inspect the state and signer fingerprint in the returned bounded receipt, and test the *actual* Cloud Contact server with a restored directory under CP03's separate integration gate. Do not overwrite the live state directory.

## Evidence and boundaries

- `node --test agent-runtime/host-adapters/jm-operated-host/cold-backup.test.mjs`: 5 synthetic-state test groups (encrypt/decrypt, exact state + private-key bytes, public signer fingerprint, wrong key/header tamper, malformed source, symlink rejection, key and restore preconditions) on local Node 22.
- Existing CP03 recovered *genuine* v0.5.0 local server contact remains independently proven by its earlier receipt; this change has **not** yet run the CP04 encrypted restore against that real recovered package. The CP04 synthetic test carries no automatic real-server proof.
- AES-GCM protects confidentiality/integrity of the sealed payload **when the external key stays secret**; it does not prove freshness or prevent replay of an older valid sealed backup. Keep an independently anchored backup-head digest and rotation history to detect rollback.
- The key is not derived from a weak user password. Key management, disaster recovery and cross-host restore remain external dependencies until independently proved.
- Never put a real sealed archive into public GitHub. Even encrypted secrets need controlled retention. Restrict access to the archive, key, directory and local host.
- An uninterrupted, same-machine cold restore is not an independent disaster-recovery capability. No real off-host copy, public HTTPS, production service failover, hosted v0.5.1 parity, owner-device contact or Stripe network payment evidence is claimed.

## Next gates

A. Add an automated stopped-server contact test that reopens the **genuine** recovered Cloud Contact package from an encrypted bundle and checks state, signature identity and receipt. B. Test encrypted bundle from one authorized machine onto another with independently stored key; log offsite copy and restoration receipt. C. Introduce key rotation/custody and anti-rollback anchors. D. Only then attach safe scheduled backups or operational runbooks to independent hosting. E. Separately reconcile latest hosted v0.5.1 source and obtain owner security approval before production promotion.

Release: DRAFT. Parent PR #564 (`f32e14f`) stacks on unmerged PR #560 (`dd8abf5`). Do not merge this branch into main, trigger deployments, bypass declined sign-in or change live credentials.
