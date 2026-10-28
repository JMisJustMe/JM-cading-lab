# JM CP12 — Owner-recoverable host admission and loopback runtime

**Draft source-only candidate. Not an actual owner-machine deployment.** This is the new operation boundary after separately proven CP06–CP11. Preserve authentic hosted Cloud Contact v0.5.1 and all original identities; no rival server. Pinned donor `JMisJustMe/jm-cloud-contact-server-first-cloud@0921217d95285bcb21cda7a995d02f7ec0725810` must be checked out at that exact commit with its original assets and dependencies.

CP12 is a **Node entrypoint** which accepts only an explicitly supplied existing restored state directory containing all five sovereign state files and original ECDSA signer key. It requires an admin credential and a separate server-secret file, stored outside source and recovered state with private file ownership and permissions, plus a separately held PostgreSQL connection file if the Market file is in PostgreSQL mode. Market file mode and external DB custody must agree. The runtime does not invent credentials, a new signing identity or a database.

Preflight: pin the actual `git rev-parse HEAD` to the known hosted donor, guard symlinks/unknown state files, reject world-readable secret files and short secrets, demand a valid HTTPS origin and a nonprivileged fixed loopback port, inspect PostgreSQL state vs separately provided connection. The CLI returns a safe admission receipt without printing or storing credential contents. The supervised unchanged original donor listens on `127.0.0.1` only. It does not open a public firewall or proxy port. `preflight`, `smoke`, and `run` CLI modes are supported with an owner-written JSON configuration containing only **paths** to privately stored secrets (never secret values):

```json
{
  "donorRoot": "/owner/checkedout/jm-cloud-contact-server-first-cloud",
  "stateDir": "/owner/restored/checkpoint-CP10-state",
  "adminTokenFile": "/owner/private/host-admin.token",
  "serverSecretFile": "/owner/private/server-secret.txt",
  "marketDatabaseUrlFile": "/owner/private/market-postgres-url.txt",
  "port": 8791,
  "allowedHttpsOrigin": "https://cloud.example.com"
}
```

For a **file-only** Market recovery, omit `marketDatabaseUrlFile` and ensure that the original Market state records file-fallback mode. For an exact CP10 PostgreSQL checkpoint, provide the private connection-file path to an **already restored, isolated database**. The config does not contain any credentials, and no generated production tokens are supplied in the repository.

```
node agent-runtime/host-adapters/jm-operated-host/independent-host-admission.mjs preflight /owner/private/host-config.json
node agent-runtime/host-adapters/jm-operated-host/independent-host-admission.mjs smoke /owner/private/host-config.json
node agent-runtime/host-adapters/jm-operated-host/independent-host-admission.mjs run /owner/private/host-config.json
```

The CI smoke route uses the pinned genuine original server, disposable fixture state and newly created private source-independent credentials, and contacts `/ready`, Cloud API, real ECDSA-signed receipt, Game, Mesh, Market file fallback and Zezu via loopback. A positive CI proves the *software can start independently with separately supplied secret files*; it does not verify persistent owner device, external HTTPS or production Market PostgreSQL (CP10 covers the latter at isolated integration scope).

**Live-public-HTTPS gate is open.** The next actual owner-host step requires an online and authorized owner-controlled device or specifically approved hosted machine, a persistent disk, configured PostgreSQL, a real separately held recipient private key, and an operator-managed TLS reverse proxy with DNS, account/secret control, monitoring, restorable offsite state, rollback and actual owner-device/browser contact. None can be asserted from ChatGPT CI and no infrastructure is ordered, modified or deployed by this PR. Do not merge earlier draft PRs as doing so may trigger existing production workflows.

Operating laws: SOURCE → SIGNAL → CONTACT FIELD → ROUTE PRESSURE → STATE CHANGE → DING → TRACE → RECOVERY → OUTPUT. `MESH ≠ MERGE`; `SAME-NAME ≠ SAME-STATE`; `CONTACT ≠ COLLAPSE`. No DING No Claim; published service is distinct from local readiness. No source regression is permitted.

---

# JM ECOSTATE — Cloud Contact Recovery FLAZ Ledger
28 October 2026 | Software-bounded recovery, no live cutover

## CP09 Market PostgreSQL
- Draft PR #578 at `5716c22cd2510eff1eeefda0ef8e119824d47b76`; GitHub 11/11 PASS; true isolated PostgreSQL 16 restore 10/10, refusal tests 5/5; exact readback 5/5.
- FLAZ BOUNDED: three existing hosted Market tables, encrypted `pg_dump`/guarded restore. No real production DB, whole PG cluster or offsite custody.

## CP10 Coordinated recovery
- Draft PR #579 at `dd28e08f0ac7d194cadbc98e23f0eb4173bdb7d8`; genuine original Cloud Contact v0.5.1 + PostgreSQL 16 recovery 11/11, guards 6/6, GitHub 11/11 PASS.
- FLAZ BOUNDED: one recipient-authenticated checkpoint binding all original five file-state organs, signer and PG tables. Source writer stop and DB pre/post checks performed in CI; no global distributed writer fence, cross-store ACID guarantee or live cutover.

## CP11 Distinct filesystem custody
- Draft PR #580 at `6f938298fe55067baa5a191fa0e39c6164c22c9b`; GitHub 11/11, guards 6/6 PASS.
- Separate filesystem IDs `/tmp` (2049) and `/dev/shm` (27) confirmed in CI. Exclusive write, fsync, exact hash and new-process readback passed.
- FLAZ BOUNDED: different test filesystem, NOT actual owner external drive, offsite backup, persistent retention or owner-key custody.

## CP12 Original server independent-host admission
- Draft PR #582 at `5a89733ff3bc585954b5a6f9847f01e8ac517e26`; genuine v0.5.1 loopback host proof 8/8, guard tests 5/5, GitHub 11/11 PASS.
- FLAZ BOUNDED: approved-source pin, private local secret files, separately restored state, optional Market PG secret-file gate and original supervised loopback HTTP operation. Not an owner-device or public-HTTPS service proof.

## Source/custody invariants
- Original hosted donor: `JMisJustMe/jm-cloud-contact-server-first-cloud@0921217d95285bcb21cda7a995d02f7ec0725810`, unchanged.
- Draft ancestor chain in `JMisJustMe/JM-cading-lab`: #560, #564, #567, #569, #573, #575, #576, #578, #579, #580, #582; do not merge without production workflow approval (Money Menu main changes may trigger deployment).
- MESH ≠ MERGE; SAME NAME ≠ SAME STATE; NO DING NO CLAIM. No production change is inferred from code review CI.

## Actual unpassed external gates
1. Real authorized GroundZeroJM owner machine. It was **offline** in connected Desktop Commander read-only status on 28 Oct 2026; no physical writing/testing performed.
2. Independently retained owner private decryption key, source server/admin credentials, actual key rotation and recovery custody; CI credentials are disposable fixtures.
3. Owner-selected persistent/off-site backup medium and confirmed readback after disconnect/remount/reboot; no storage provider or new host provisioned.
4. Actual owner-authorized restored file state and PostgreSQL in a separate persistent host, with globally enforced write quiescence, restored identities and verified actual client consequences.
5. Public DNS, authenticated TLS proxy, firewall, monitoring, rollback, and owner phone/laptop external-contact proof.
6. Separate approval to lift blocked merge/deployment controls; no production merge, credential replacement, billing or DNS action was taken.

This ledger is editable Markdown, and the software source is independently owner-editable through GitHub's draft branches. It certifies bounded CI mechanisms, not the above external operational gates.
