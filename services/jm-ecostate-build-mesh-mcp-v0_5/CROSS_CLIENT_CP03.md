# JM ECOSTATE Build Mesh — CP03 cross-client candidate (proposed v0.8.6)

**State:** additive source candidate; Gemini architectural audit reports PASS; production / authenticated dual-client contact HOLD.

## Authority and ancestry

- Branch base: `build-mesh-native-mcp-v0-5`, commit `62ae265115f7804a91e6ed5f2a7bf70453d77c55`.
- Exact original `server.py` Git blob SHA: `48ada9e796edea8396a6490d908b7b713a9b9bf2`.
- CP03 `cross_client.py` is preserved byte-for-byte from the previously audited candidate, blob SHA `f9a8a7a5a9747590f38eda9e4d456d884cb60bc3`.
- Existing Build Mesh tools, registry, Navigator donor, estate bodies and host authority remain separate.
- Render has `autoDeploy: off`; this PR must not automatically deploy.

## Scope

Four **public-safe, read/plan-only** MCP tools are appended to the existing native `TOOLS` and `HANDLERS`:

1. `cross_client_issue_receipt`: generate a short-lived 30-minute signed token using a self-declared client label and shared challenge.
2. `cross_client_verify_pair`: compare two unexpired, differently labelled server-issued receipts from one server process.
3. `handoff_task_capsule`: generate a 10-minute signed, bounded operation-intent token for an enumerated task kind and public-safe body reference.
4. `verify_carrier_receipt`: validate signed capsule syntax, expiry and expected *claimed* target.

MCP JSON-RPC `tools/call` response retains both `content` and optional standards-supported `structuredContent` (protocol 2025-06-18). Original `/mcp` Streamable HTTP behavior is inherited, including GET 405 where no SSE is provided.

## Security and evidence boundaries

- No authenticated ChatGPT/Gemini identity. Both labels are unauthenticated assertions.
- No public write mailbox, freeform task execution, persistent storage, source upload, shared internal state, or privilege elevation.
- Tokens are bearer receipts reusable until expiry; not single-use replay protection.
- Signing keys are random per process; a Render restart invalidates tokens. A multi-instance deployment would require a reviewed key/issuer design.
- Two labels on one server do not prove two independently authenticated clients.
- Human must carry the capsule token between models. Successful token verification is not proof the recipient did the proposed work.
- Public read access does not grant Estate source or authoring authority.

## Evidence and release gates

- **Prior local CP03 candidate:** 90/90 local tests PASS, independent Gemini architecture PASS, as reported in the prior audit exchange.
- **This GitHub branch:** repo-native integration regression and HTTP checks are added with GitHub Actions candidate workflow. Treat status as unknown until CI completion is read back.
- **Existing hosted proof workflow:** `jm-build-mesh-native-mcp-proof.yml` currently assumes 0.8.5 and polls for that hosted version. It is a version-pinned historical production proof, not suitable for asserting 0.8.6 before deployment. Prepare a separate version-aware production proof after staging/local CI, preserving the old receipt.
- **Before merge/deploy:** inspect exact GitHub diff; run candidate workflow and original offline tests; preserve hosted baseline; review Render production sequencing; then explicitly approve promotion.
- **After deploy:** verify server version and old tools, original Navigator donor PASS, full MCP tools/list, signed live ChatGPT and Gemini tool invocations with matching challenge/issuer, and real client-side receipts. No Ding outside verified scope.

**JM law:** RECOVER → INHERIT → IMPROVE → TEST → COMPARE → DING → PROMOTE → PRESERVE. MESH ≠ MERGE · ACCESS ≠ AUTHORITY · CONTACT BEFORE CROWN.
