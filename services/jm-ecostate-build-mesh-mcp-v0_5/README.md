# JM ECOSTATE Build Mesh — Native MCP v0.7.2

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
