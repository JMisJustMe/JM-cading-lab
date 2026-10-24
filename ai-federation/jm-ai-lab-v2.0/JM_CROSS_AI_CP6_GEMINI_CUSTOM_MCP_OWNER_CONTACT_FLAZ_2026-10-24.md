# JM ECOSTATE — CROSS-AI FEDERATION | CP6 Gemini Custom MCP Owner Contact FLAZ

**Date:** 2026-10-24 (owner desktop screenshots, local times near 20:14–20:16)
**State:** FLAZ · OWNER-VISIBLE CUSTOM APP MCP DISCOVERY PASS · GEMINI-REPORTED BUILD-MESH TOOL RETURN SOURCE-MATCHED · RAW GEMINI INVOCATION TRACE NOT PROVIDED
**Custody:** Additive file on existing isolated GitHub branch `jm-cross-ai-cp1-cp2-flaz-2026-10-24`. No merge to main, no update of frozen CP1–CP5.1 files.
**Owner laws:** RECOVER BEFORE REBUILD · NO DING, NO CLAIM · CONTACT BEFORE CROWN · INTEGRATION ≠ REPLACEMENT · MESH ≠ MERGE · CHANGE THE PLUG, NOT THE BODY.

## OPEN FIRST — What changed
Earlier CP5 established Gemini consumer-web API/MCP as BLOCKED in its *then-exposed tool context*. CP6 originally proposed owner-side Gemini CLI as a separate host plug. Owner subsequently discovered Gemini's **Settings → Connected Apps → custom MCP app** capability and configured the existing **JM ECOSTATE Build Mesh Native MCP** at:
`https://jm-ecostate-build-mesh-mcp.onrender.com/mcp`

No CLI, new middleware, copied code, extra server or parallel JM adapter was necessary to expose this MCP to that Gemini custom app.

## 1. Owner-device screenshot evidence
Two exact user-supplied 1920×1080 PNG screenshots were hashed locally during this ChatGPT conversation. The *unredacted image files are NOT uploaded to this public GitHub repository*, because the screenshots display owner account/profile/location details. The screenshot hashes are custody pointers only; they do not prove underlying network packets.

1. Custom app setup screenshot (`image(20261024-191432).png`):
   SHA-256 `d647077433fb75bdc8a8eb286a012f1071e263b3c1f197f35499da3b50ac23bd`.
   Gemini modal says **Save your custom app**; name `JM ECOSTATE Build Mesh Native MCP`; **Available actions**, last synced 2026-10-24 20:13:48, shows these 17 discovered tools:
   - `search_builds`
   - `resolve_current_head`
   - `trace_lineage`
   - `build_mesh_status`
   - `find_capability_donors`
   - `build_capability_mesh`
   - `plan_capability_inheritance`
   - `estate_keeper_contract`
   - `prepare_operation_gate`
   - `recover_build`
   - `proof_state`
   - `continue_build_plan`
   - `batch_recover_builds`
   - `compare_builds`
   - `detect_propagation_gaps`
   - `build_sync_contract`
   - `plan_artifact_route`.
   This is owner-visible custom-app action discovery — not merely the previous GitHub import box.

2. Gemini conversation screenshot (`image(20261024-191713).png`):
   SHA-256 `4297a76ecca41c44099002eeba2eba6cbe6d34acff07497b68d96993a51d9ef0`.
   The user message invokes the connected app via `@JM ECOSTATE Build Mesh Native MCP` and asks for one call to `build_mesh_status` with `probe_navigator=false`; Gemini's rendered response explicitly states `Live MCP Call Executed: YES`, `Tool Invoked: build_mesh_status`, server version `0.8.5`, `PASS`, and begins a JSON payload. The cropped visible portion does not show an independently inspectable native tool-call activity card/log.

The owner also pasted Gemini's entire corresponding JSON tool-response claim into ChatGPT. Its key values are recorded below.

## 2. Independently checked service response
ChatGPT independently invoked its own **connected JM ECOSTATE Build Mesh MCP** tool `build_mesh_status(probe_navigator=false)` once during this contact and compared returned data to the owner's pasted Gemini output. Matching fields:

```json
{
  "server": "JM ECOSTATE Build Mesh Native MCP",
  "version": "0.8.5",
  "estate_keeper_contract_schema": "JM.BuildMesh.EstateKeeperContract/0.7.6",
  "current_project_records": 22,
  "current_registry_schema": "JM.CareerCurrentProjectRegistry/0.24",
  "current_registry_date": "2026-10-06",
  "current_registry_body": "JM Opportunity Front Door v0.8 — Maximal Current",
  "current_registry_sha256": "7debfd83bb13ccebc94acf96978e567ceaf8772272cb1ccbcd0c6931850a5d31",
  "current_registry_source": "current_registry.json",
  "current_registry_loaded_bytes": 27978,
  "current_registry_path_mode": "SERVICE_LOCAL",
  "current_registry_hash_mode": "SHA256_EXACT_LOADED_BYTES",
  "current_registry_reload_policy": "PROCESS_START",
  "overlay_entries": 42,
  "capability_profiles": 34,
  "artifact_surface_profiles": 6,
  "navigator_cache_ttl_seconds": 300,
  "navigator_endpoint": "https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/mcp",
  "navigator_contact": {"state":"NOT_PROBED"},
  "plugin_historical_register": "1,074 lineages retained in JM ECOSTATE Build Mesh package"
}
```

Its `mode` is the service's existing **read-only authority / external-current-registry / capability-mesh / artifact-router / sovereign-sync-contract / estate-keeper-contract / operation-planning** mode. Returned `NOT_PROBED` is correct for `probe_navigator=false`; do not infer a failed Navigator service.

**Evidential precision:** This direct ChatGPT call authenticates that the owner-pasted Gemini result matches the live JM service at comparison time, but is **not itself evidence that Gemini dispatched the separate tool call**. The owner-visible Gemini action-discovery UI and matching full response significantly strengthen Gemini's own live-call claim; underlying Gemini tool invocation trace, request ID, and server-side per-client logs were not separately inspected here.

## 3. CP6 proof matrix

| Lane | Verdict | Evidence boundary |
|---|---|---|
| Gemini custom MCP app can list JM Build Mesh actions | **PASS — OWNER-VISIBLE** | Screenshot of synced 17-action list |
| Gemini session can address the custom app | **PASS — OWNER-VISIBLE** | `@JM ECOSTATE...` shown in submitted prompt |
| Gemini reported `build_mesh_status(probe_navigator=false)` executed | **OWNER-ATTESTED; SOURCE-CROSS-CHECKED** | Gemini's rendered claim and complete relayed JSON match an independent current ChatGPT live response |
| Independent Gemini raw tool invocation trace | **OPEN** | No tool-call event/request ID/server-side execution log recovered |
| ChatGPT→Build Mesh native tool | **PASS** | Separate actual connected MCP call, v0.8.5 response |
| Gemini→GitHub authenticated REST/PR/write | **NOT TESTED BY CP6** | GitHub import and Build Mesh MCP are separate lanes |
| Public read-only service boundary | **PRESERVED** | No private Library access or writes claimed |
| Production merge / source mutation | **NONE** | Isolated additive documentary checkpoint only |
| Owner-device gameplay or broad cross-AI federation | **NOT ESTABLISHED** | Only this custom-app MCP service/contact experiment |

**Scoped Ding:** New host-connection access through Gemini's custom app, tool discovery, and credible owner-visible read-only status return. Do **not** silently promote this into writable sovereign memory, GitHub mutation, private archive sharing, whole-Estate availability, or verified raw Gemini invocation logs.

## 4. Next smallest test (no rebuild)
In the existing Gemini chat, expand the *native connected app/tool activity details* for the `build_mesh_status` answer, if the UI provides them, and preserve tool name, request arguments, return/error and time. Do not perform a production write; this is only to close the remaining raw-dispatch evidence boundary.

As a bounded functional demonstration after that, ask Gemini to invoke an actual **different read-only JM tool** such as `resolve_current_head` for a known JM build, and compare its returned service-specific result against an independent Build Mesh tool response. Distinguish returned effect from invented interpretation. Preserve the original result, mark only the tested lane PASS.

Security: Custom connected app consents can share conversation/context or other accessible app data with the external server. This JM endpoint presently declares public-safe, read-only operation, but the owner should keep private material out of requests and should not grant unneeded write or broad-data permissions in later MCP revisions.

## 5. Inheritance and continuation
Prior same-branch CP4–CP6 baseline:
`JM_CROSS_AI_CP4_CP5_CP5_1_CP6_CONTACT_FLAZ_2026-10-24.md` (creation commit `2bab8e38a11fe9496a7f73e948433876c9262ae5`, blob `743f37676e90aae7211df930351c7d3a0572163d`).
Other earlier CP1–CP3 FLAZ files and `JM_CROSS_AI_STRAIGHT_RUN_CONFORMANCE_RETURN_2026-10-24.md` are retained, not replaced. GitHub CI conformance evidence remains Run `40047000489`, Job `120730918192` with scoped-memory **37/37 tests OK**, nine registered adapters, and Node/Python parity; none of those are Gemini native execution.

**Checkpoint verdict:** `CP6_GEMINI_CUSTOM_MCP_DISCOVERY_PASS__STATUS_RETURN_OWNER_ATTESTED_SOURCE_MATCH__DIRECT_DISPATCH_TRACE_OPEN`.

**Recover first. Use the existing JM body. Integrate, don't replace. No Ding beyond the evidence.**
