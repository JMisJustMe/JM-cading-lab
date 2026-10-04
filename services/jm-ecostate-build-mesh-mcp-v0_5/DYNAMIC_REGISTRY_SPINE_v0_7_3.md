# JM Build Mesh v0.7.3 — Dynamic Registry Spine

Operation gate: `JMOP-3c7d33c98747edf1bacb6301`

## Recovered defect

The hosted v0.7.2 service was live and correct at its deployed branch, but current-registry metadata and records were duplicated inside `server.py`. That made a registry update require server-code editing and allowed the registry body, declared hash and routing references to drift apart.

## v0.7.3 correction

`current_registry.json` becomes the explicit hosted current-registry carrier.

Runtime route:

`REGISTRY FILE → EXACT BYTES → PARSE → VALIDATE → SHA-256 → CURRENT ROUTER → STATUS/SYNC READBACK`

The server:
- loads the registry from the service-local file by default;
- permits an explicit `JM_CURRENT_REGISTRY_PATH` host mount;
- computes SHA-256 from the exact bytes loaded;
- rejects malformed JSON, empty registries, missing required fields and duplicate IDs;
- exposes source, bytes, hash mode, path mode and restart policy in runtime status/sync readback;
- keeps private/direct authority able to outrank the hosted public snapshot.

The Build Mesh self-seat is refreshed from stale v1.0.2 wording to the already-established v1.0.5 Artifact-General Production Spine. No new runtime Ding is claimed by this source change alone.

## Proof ladder

1. Static exact-byte registry proof.
2. PR CI proof.
3. Merge to the deployment branch.
4. Render-hosted v0.7.3 readback.
5. Navigator/Estate contact re-check.
6. Host/client MCP contact re-check.
7. FLAZ only after those consequences agree.

Keeper: **THE REGISTRY HASH MUST DESCRIBE THE BYTES ACTUALLY LOADED, NOT A STRING REMEMBERED BY THE SERVER.**
