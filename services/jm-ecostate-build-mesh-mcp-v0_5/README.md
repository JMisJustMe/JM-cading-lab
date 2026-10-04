# JM ECOSTATE Build Mesh — Native MCP v0.7.3

Read-only native control-plane descendant for JM ECOSTATE Build Mesh.

## Native tools

- `search_builds`
- `recover_build`
- `resolve_current_head`
- `proof_state`
- `trace_lineage`
- `continue_build_plan`
- `build_mesh_status`
- `batch_recover_builds`
- `find_capability_donors`
- `compare_builds`
- `build_capability_mesh`
- `detect_propagation_gaps`
- `plan_capability_inheritance`
- `build_sync_contract`
- `prepare_operation_gate`
- `plan_artifact_route`

### Artifact-general route

`plan_artifact_route` is the shared production/delivery dispatcher for `book`, `comic`, `theory`, `app`, `apk` and `download` surfaces. It returns one common governed route plus surface-specific build, proof and delivery gates. The public MCP remains PLAN_ONLY; authorized hosts perform actual writes/builds/deploys and must read back the consequence before Ding.

Target identity is resolved before fuzzy capability matching. A weak vocabulary resemblance must not silently redirect an operation to a different body.

## Data/authority topology

The service loads the hosted current-project registry from `current_registry.json` (or an explicit `JM_CURRENT_REGISTRY_PATH` override) and computes SHA-256 from the exact bytes actually loaded. Registry schema/date/body/record count/hash/source are therefore runtime readback, not duplicated hardcoded claims. Invalid JSON, missing required fields, empty records or duplicate record IDs fail closed at startup. The 1 October current overlay remains a separate routing layer. Historical/public search and lineage are delegated to the separate public-safe JM3232 Navigator MCP donor. The plugin package remains the carrier of the 1,074-lineage all-body register.

**MOUNT ≠ MERGE · DONOR ≠ OWNER · SEARCH ≠ PROOF · NO DING, NO CLAIM**

This service is read-only. `continue_build_plan` creates a continuation route; it does not mutate an Estate body.

## Current-registry integrity route

`EXTERNAL REGISTRY BYTES → UTF-8/JSON PARSE → REQUIRED-FIELD + UNIQUE-ID VALIDATION → SHA-256 OF EXACT LOADED BYTES → CURRENT HEAD ROUTING → STATUS/SYNC READBACK`

The default registry is service-local for portable deployment, while `JM_CURRENT_REGISTRY_PATH` permits an authorized host to mount a different registry carrier without editing server code. Changing a registry file does not silently transfer authority: private/direct current evidence can still outrank the hosted snapshot, and a process restart is required before changed bytes become the running registry.
