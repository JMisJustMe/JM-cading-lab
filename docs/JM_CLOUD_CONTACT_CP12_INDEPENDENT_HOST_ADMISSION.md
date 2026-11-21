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
  "expectedReceiptKeyId": "REPLACE_WITH_INDEPENDENTLY_PINNED_24_HEX",
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


## BIAT signing-identity correction (28 Oct 2026)

The operator configuration additionally **requires** `expectedReceiptKeyId`, lowercase 24-hex derived from a separately verified historical ECDSA-P256 public key. The example string above is deliberately **not a valid key ID** and must never be substituted with the key supplied by an untrusted recovery host. CP12 hashes the recovered PEM's **public** JWK with the donor's exact canonical-JWK algorithm; preflight refuses absence, a mismatched identity, a wrong key type, insecure private-file permissions, or a missing signer. No key is generated. The CI original-server loopback test checks the live `/receipt-key` ID matches before and after a full process stop/restart. This does not retroactively repair Render's observed public signing-key rotation; live original identity remains HOLD until independently proven and owner authorized.
