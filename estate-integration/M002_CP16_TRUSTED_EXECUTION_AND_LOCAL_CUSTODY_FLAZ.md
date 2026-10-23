# JM ECOSTATE — Mission 002 CP16 · Trusted Original Execution and Local Custody

**23 October 2026 · Additive draft PR #429 · local original-execution proof only.**

## Source → execution → return

This checkpoint addresses the next **whole-infrastructure** gate, not one game or application:

1. **Preserved ancestor:** CP15 encrypted RouteVault transport and existing Estate operator, CP14 real Python Knowledge Intake/Assurance/Query/Recipient with source replay, CP13 game/comic/book/music/cartoon/Cading/native-chain/OS/GameCore/embodied typed recipients.
2. **New governed local executor:** `coding-estate/integration/m002-cp16-trusted-host.mjs`, a Node HTTP host listening **only** at `127.0.0.1`, using an explicit bearer credential supplied privately to the host. Unauthenticated and ambient-browser requests are rejected. Only allowlisted source *IDs* are accepted; incoming paths and public arbitrary execution routes are not accepted.
3. **Source contact and state consequence:** An explicitly authorised request causes the *original* CP14 Python+Node and CP13 bodies to execute. Pre-commit replay must reproduce source/recipient output. A source-diverse medium set may change independently typed states. Never equate code selection with actual execution.
4. **Persistence:** An independent HMAC seal covers the saved local JSON; bounded exclusive-writer lock, expected-revision compare, atomic file replacement and readback preserve a durable local state. Duplicate operation ID with the same request recovers the previously committed result without minting another transaction. Revision conflicts are held rather than automatically merging.
5. **Return:** `GET /v1/recover/:operationId` reruns the original Python and native source route from the recorded prior recipient state and approved current documents. Source drift, malformed custody, tampering and stale authority are HOLDs.
6. **Existing client reuse:** The existing CP15 cloud panel can explicitly import a CP14 JSON envelope and stage its bytes for encrypted RouteVault transport. That browser-side import performs SHA-256 byte integrity only. **It does not itself rerun Python, authenticate the producer or grant author authority.** The original encrypted transport and cloud donor remain separate and unchanged.

## Real launcher, not just a module

`scripts/m002-cp16-run-local.mjs` reads a **private owner-provided configuration** from `JM_CP16_LOCAL_CONFIG`, with secrets from `JM_CP16_LOCAL_BEARER` and `JM_CP16_LOCAL_SEAL` environment variables, then binds the host to loopback. The private configuration contains `sourceRoot`, source-ID mapping `sources`, `stateFile`, typed starting `receivers` and `mesh` source/observation snapshots. The original 100-body coding registry is loaded from the repository. Linux/macOS private config must be mode 0600; do not commit tokens or private source files. The host will not listen on 0.0.0.0.

Illustrative command (configure actual values privately):

```bash
chmod 600 /private/jm-cp16-config.json
JM_CP16_LOCAL_CONFIG=/private/jm-cp16-config.json \
JM_CP16_LOCAL_BEARER='<private bearer>' \
JM_CP16_LOCAL_SEAL='<separate private HMAC secret>' \
node scripts/m002-cp16-run-local.mjs
```

API: `GET /v1/state` metadata only; `POST /v1/execute` with `operationId`, `expectedRevision`, `sourceIds`, `question`, `top` and a valid explicitly approved CP13 `request`; `GET /v1/recover/:operationId` exact source replay. Bearer authentication on all routes. No remote plugin or hosted service endpoint is created.

## Exact tests and scoped Ding

- GitHub Actions `JM Mission 002 CP16 Trusted Original Runtime` syntax and live HTTP smoke: a real original source-qualified CP14 execution through localhost, an independently recovered CP14 result, storage across a re-opened host and HMAC tamper detection. Synthetic documents only.
- Existing CP15 and CP13 regression workflows must be independently green on the final head before any user-facing promotion. CP15 new original-CP14-envelope file import remains source-integrated; physical Chrome/Fold workflow is a separate gate.
- This is **local HMAC integrity**, **not encryption at rest**, an external monotonic log, a hardware key, a multi-tenant authorisation policy or a durable offsite database.
- The Build Mesh `mesh` input is an explicitly configured **observation snapshot**, not automatically re-fetched live during each CP16 request, and it is not an owner authentication signature.
- Crash-abandoned exclusive lock recovery is still an explicit operator intervention, not an automatically proven distributed consensus protocol. No public TLS listener, background autonomous agent, private owner Library access, cloud deployment, physical Android acceptance, direct phone↔laptop proof, or production host failover.

## Remaining Mission 002 route

1. Independently accept CP16 in a real trusted laptop/phone runtime; verify local source ownership/consent and recovered authorisation before using private documents.
2. Govern external-host access separately (authenticated TLS, constrained per-user roles, bounded workload, deployment and real production service logs); do not put a local executor behind an unrestricted public browser relay.
3. Prove actual service replacement and offsite restore against persistent remote storage; CP15 isolated HTTP fixture is not that proof.
4. Complete cross-device owner readback with the same source-qualified artifact, not just a ciphertext file; establish HMAC/key custody and recovery.
5. Carry source-authority, creative rendering, OS/AI and production-grade capability into independently qualified recipients, with no single game or file becoming the whole Estate.

**Keeper:** Recover before rebuild · Integration ≠ Replacement · Contact before crown · No Ding, no claim · Do for self off own merits.
