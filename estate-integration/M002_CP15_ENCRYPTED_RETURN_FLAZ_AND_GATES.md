# JM ECOSTATE · Mission 002 CP15 — Trusted Return, Encrypted Recipient Transfer

**23 October 2026 · Source-qualified candidate, unmerged, not deployed.**

## Why this is whole-infrastructure work

CP15 does **not** add a feature to FIVE//FLIP or any one game. It transports bounded, typed JM Estate operator results and original CP13/CP14 cross-medium envelopes across independent browser/Node clients using the **existing** JM Cloud Contact Server v0.5 RouteVault workspace contract. Existing creative, coding, language, OS, AI and infrastructure mechanisms retain separate identities. Return storage never promotes data to execution authority.

## Original source inheritance, not replacement

- **Parent**: CP14 PR #423 head `c74fa117f3e44e889468420198555627c041908a`, which inherits verified CP13 (ten native targets) and exact original Python Knowledge v0.2 source replay, plus Build Mesh v0.8.5 candidate reconciliation.
- **Cloud donor (unchanged)**: `unified-browser/jm-cloud-workspace-client.mjs` — actual JM RouteVault client: scoped credentials, workspace create/save, signed cloud receipt via P-256 signature verification, target-hash readback, intermediate response-loss recovery, and signer-key continuity.
- **Cloud relay (unchanged)**: `functions/api/estate-contact.js`, existing narrow allowlisted same-origin public Estate host relay to JM Cloud Contact Server; no bearer leak, arbitrary host route, owner Library ingestion, or admin authority.
- **Existing operator and local checkpoint (inherited, not replaced)**: `navigator/estate-integration/{index.html,native-operator.mjs,return-checkpoint.mjs}`. Save/Recover still uses original browser-local SHA-256 verification. CP15 extends this same page and its actual return control rather than making a second front door.

## Real new infrastructure

- `unified-browser/jm-estate-return-cloud.mjs`: opt-in AES-256-GCM WebCrypto encrypted recipient. Uses separate PBKDF2-SHA256-derived client key (210,000 rounds), fresh salt/IV per transfer and authenticated additional data. Original source plaintext stays in memory and **never enters the existing RouteVault payload**. A ciphertext-only local pending journal supports restart/re-entry.
- Breaks the encrypted return into bounded smaller parts using existing `createCloudWorkspaceClient(...).saveIntent` calls, each independently committed and signed. **Final manifest written last**; it enumerates exact part hashes plus signed provider checkpoints. Part and whole-cipher digests, nested CP13/CP14 envelope validation, authenticated decryption and exact reassembly are required on independent recovery.
- Explicit manual actions: create scoped connection, stage local/native return, approve signed cloud write, export sensitive recovery bundle, import recovery bundle, read/decrypt on a separate browser/device, download full original body. **A different local state is NEVER silently replaced**; overwrite requires separate explicit checkbox and original `saveLocalReturn` verified readback. No automatic result execution or source-corroboration claim.
- Credential remains only in a password field (browser client) or in an explicitly downloaded **sensitive** private recovery JSON. Encryption passphrase is **not** included in that file and must be remembered separately. Credentials and passphrases are not written by CP15 into the ordinary pending local journal.

## Exact test evidence

CI [CP15 run 39998966323](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/39998966323) tests:
- **25/25** direct transport assertions; 15 actually encrypted/sharded workspaces, 3 independent clients, real HTTP, real ECDSA P-256 crypto, client-side AES-GCM and PBKDF2, separate-process HTTP provider restart with the original disk workspace and signer, content corruption, wrong password/credential, no duplicated writes, response-lost recovered through the ORIGINAL JM cloud client dashboard/receipts.
- **23/23** inherited CP13 existing operator multi-family source regression checks (four original native execution families); original native operator regression command also PASS.
- **27/27** source-scoped operator integration assertions: existing form/UI controls, real cloud module imported, private credential not written to ordinary local journal, manual apply, source-preserving return, original local checkpoint readback. This **does not** establish a fully tested physical browser UI; test is Node/static source scoped.
- All source syntax gates PASS. 75 specifically counted CP13/CP15 assertions plus original operator regression.

**Important experimental boundary:** This CP15 test uses a separate isolated disk-backed HTTP **protocol fixture**, not the actual deployed production RouteVault provider. The original *client* and cryptographic signing algorithms are real and unchanged. No production service write, live RoundTrip provider claim or physical phone/laptop acceptance follows from the fixture. Previous AILatheo separate local/cloud acceptance remains separate evidence and is not automatically transferred to CP15.

## Failure and conflict handling

- Malformed or unsupported JM return schemas HOLD.
- Incorrect or modified source envelope SHA-256 HOLD; ciphertext is additionally authenticated by AES-GCM.
- Tampered part/manifest, changed signed provider state, changed recovery ID, incorrect passphrase or wrong cloud signer HOLD.
- Interrupted write creates recoverable pending journal; a restart recovers existing target receipt without automatic duplicate save.
- Commit-last manifest prevents claiming a complete return if any shard is not yet verified.
- Return is immutable snapshot transfer, **not** bidirectional live editing or merge. Two concurrent modifications or source-authority conflicts remain HOLD until a source-aware reconcile path is implemented.
- Maximum original returned JSON is 125 kB and sharding is bounded to 26 parts. This is **not** a general 6 GB Estate storage solution; no broad attachment transport claim.

## Remaining Mission 002 CP15 gates

1. Execute the source-integrated Cloud panel in a real HTTPS/mobile browser, verify touch controls, browser quota, file chooser and import/export. Then separately perform real Samsung Fold ↔ laptop return. Owner-device proof requires actual owner action/receipt.
2. Decide the governed promotion/deployment route for CP13→CP14→CP15 independently of the hosted Build Mesh public authority drift; no auto-merge into main, no credential leaks on GitHub.
3. Verify CP15 against the ACTUAL scoped production Cloud Contact/RouteVault server with synthetic nonprivate data and signed receipts, then assess durable database-backed survival through provider replacement and disaster recovery. No production writes occurred here.
4. Define a trusted authenticated backend which can execute original CP14 Python and CP13 native runtimes where authorised. A static browser cannot run those original source bodies directly, and a saved snapshot is **not** an executed capability.
5. Extend portable checkpoint receiver sizes/long-lived custody and source-aware optimistic conflicts; don't silently substitute fragmented micro-files for existing broad Estate storage reduction priorities.
6. Continue workstream-wide propagation without letting any one game, medium, AI model or cloud provider become the exclusive JM infrastructure.

**DING scope**: Node CI proved source-integrated encrypted and signed protocol transfer, a restarted loopback host, distinct client readback and explicit operator mounting. **HOLD** on physical devices, deployed cloud writes, permanent remote durability, AI execution and whole Estate completion.

**Keeper:** Recover before rebuild · Integration ≠ Replacement · Contact before crown · No Ding, no claim · Do for self off own merits.
