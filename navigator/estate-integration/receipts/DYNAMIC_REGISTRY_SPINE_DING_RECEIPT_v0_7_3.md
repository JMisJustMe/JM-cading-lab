# JM ECOSTATE Build Mesh — Dynamic Registry Spine Ding / FLAZ Receipt v0.7.3

Date: 2026-10-04

## Recovered seam

The hosted Build Mesh had reached package v1.0.5 / MCP v0.7.2, but its current-project records and registry identity were still duplicated inside `server.py`. A registry change therefore required server-code editing and could let the routed records, declared SHA-256 and proof text drift apart.

## Change

v0.7.3 externalizes the hosted current registry to:

`services/jm-ecostate-build-mesh-mcp-v0_5/current_registry.json`

Runtime route:

`EXACT REGISTRY BYTES → UTF-8 / JSON PARSE → REQUIRED-FIELD + UNIQUE-ID VALIDATION → SHA-256 OF EXACT LOADED BYTES → CURRENT ROUTER → STATUS / SYNC READBACK`

The service now:
- loads the service-local registry by default;
- permits explicit host mounting through `JM_CURRENT_REGISTRY_PATH`;
- derives registry SHA-256 from the exact bytes actually loaded;
- fails closed on malformed JSON, missing required fields, empty records or duplicate IDs;
- exposes registry source, loaded byte count, path mode, hash mode and reload policy;
- preserves the rule that stronger private/direct current evidence may outrank the hosted public snapshot.

## Source / deployment

- deployment branch: `build-mesh-native-mcp-v0-5`
- v0.7.3 logic merge: `40e33a74231962f9b3ecd00580ab0b6b1a55183f`
- receipt-name correction merge: `0ab56260eae5c004e66038471eab05db4a0b072f`
- live self-seat registry merge: `df73e8f310e9a731eda8e8306738fed072cb41b8`
- Render service: `srv-dave2chsrm7s73bl3p50`
- first v0.7.3 deploy: `dep-db145t7avr4c73a65kv0` → **live**
- self-seat registry deploy: `dep-db146ru0tbcc739ef3jg` → **live**
- hosted proof run after first v0.7.3 deploy: `37200857527` → **SUCCESS**
- hosted proof run for self-seat registry: `37201491128`, attempt 2 → **SUCCESS**

## Exact-byte proof

The first v0.7.3 deployed registry read back:

- records: **19**
- loaded bytes: **15,573**
- SHA-256: `bf92c4161e479746bbe265a0f1ebb243631ee59739d353de0dcca3a3b47eab33`

Then only the external registry body was updated to seat the newly earned v0.7.3 live proof. Static proof recomputed the new registry identity:

- records: **19**
- loaded bytes: **15,892**
- SHA-256: `030153d32ce8c784ea9db9dd399bd76ee368f17b8c699e403c4889a8b1183934`

After the second Render deployment, live Build Mesh status returned that exact second hash and byte count without a server-code edit.

That is the intended dynamic-registry consequence:

> **REGISTRY CHANGE → DIFFERENT BYTES → DIFFERENT HASH → SAME ROUTER CODE → LIVE READBACK MATCH**

## Live consequence

Live MCP readback after the second deployment returned:

- server: `JM ECOSTATE Build Mesh Native MCP`
- version: **0.7.3**
- mode includes **external-current-registry**
- current-project records: **19**
- registry schema: `JM.CareerCurrentProjectRegistry/0.4`
- registry source: `current_registry.json`
- loaded bytes: **15,892**
- hash mode: `SHA256_EXACT_LOADED_BYTES`
- reload policy: `PROCESS_START`
- live registry SHA-256: `030153d32ce8c784ea9db9dd399bd76ee368f17b8c699e403c4889a8b1183934`
- capability profiles: **30**
- artifact surface profiles: **6**
- Navigator contact: **PASS**
- Estate integration: **CONNECTED**
- public registry status: `LIVE_PROVEN_CANONICAL_ESTATE_AND_NAVIGATOR_MCP_CONNECTED`

## Earned claim

**JM ECOSTATE Build Mesh v0.7.3 has a live external current-registry spine whose runtime identity is derived from, and can be read back against, the exact registry bytes loaded by the deployed service. A registry-only change was independently deployed and produced the expected new live SHA-256 without changing router logic.**

## Boundary

This does **not** grant the public MCP mutation authority, private Library ownership, owner/device proof, or transferred proof between recipients. The external registry remains a hosted public current snapshot; stronger direct/private authority can supersede it, and registry changes do not become running state until deployment/process restart and readback.

**NO DING, NO CLAIM · CONTACT BEFORE CROWN · RECOVER BEFORE REBUILD · MESH ≠ MERGE**

**Keeper:** THE REGISTRY HASH DESCRIBES THE BYTES ACTUALLY LOADED — NOT A STRING REMEMBERED BY THE SERVER.

**FLAZ: DYNAMIC REGISTRY SPINE CLOSED AT HOSTED v0.7.3 EXACT-BYTE / LIVE-READBACK SCOPE.**
