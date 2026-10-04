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

The service carries the curated current-project registry and 1 October current overlay. Historical/public search and lineage are delegated to the separate public-safe JM3232 Navigator MCP donor. The plugin package remains the carrier of the 1,074-lineage all-body register.

**MOUNT ≠ MERGE · DONOR ≠ OWNER · SEARCH ≠ PROOF · NO DING, NO CLAIM**

This service is read-only. `continue_build_plan` creates a continuation route; it does not mutate an Estate body.


## Current-registry reconciliation v0.5

The hosted service now loads `JM_CAREER_CURRENT_PROJECT_REGISTRY_v0_5.json` as an additive descendant instead of carrying a stale embedded v0.4 snapshot. Frozen v0.4 remains unchanged.

The registry file is read at runtime and its SHA-256 is computed from the exact deployed bytes, so the status surface cannot silently drift from the loaded registry body.

The Build Mesh current record now names **v1.0.5 — Artifact-General Production Spine** and preserves the still-open proof boundary for a fresh ChatGPT connector-schema contact of the 16th tool.
