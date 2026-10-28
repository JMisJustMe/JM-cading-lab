# JM Unique Bodies CP09 — OAuth connection gateway (not a second engine)

**Owner:** JM / JMISJUSTME. **Date:** 28 October 2026.
**Original engine/Atlas:** `https://jm-unique-bodies-cp08-contact.onrender.com/mcp` remains unchanged and bearer-protected on its existing Render service. Its Fold portal, owner token, atomic source, donors and Atlas are not altered or redeployed by this gateway.
**New connection-only OAuth seat:** `https://jm-unique-bodies-cp09-oauth.onrender.com/mcp`.

## ChatGPT Plugins — screenshot fields

- **Name:** `JM Unique Bodies — OAuth Connection`
- **Description:** `Owner-authorised OAuth contact to original JM Unique Bodies CP08 atomic tools and Atlas, preserving the independent donor.`
- **Connection:** Server URL.
- **Server URL:** `https://jm-unique-bodies-cp09-oauth.onrender.com/mcp`
- **Authentication:** **OAuth** — **NOT** No authentication.
- Use the normal Scan Tools/Create flow. OAuth protected-resource metadata, OAuth server metadata, dynamic client registration, S256 PKCE and owner-consent page are exposed by this gateway. **Do not put a bearer token in Name, Description, URL, GitHub or chat.**
- When redirected to `https://jm-unique-bodies-cp09-oauth.onrender.com/oauth/authorize`, only approve the client you recognise and enter the EXISTING CP08 owner bearer into that secure, same-origin consent form. This is a real owner action not performable by the assistant. It verifies the secret LIVE against the original CP08 `tools/list`; an arbitrary registered client does not gain access.
- The default read scope is `cp08:read`, displaying `atomic_contact_history`. For owner-approved write ability `atomic_contact_execute`, request both `cp08:read cp08:execute` in the client OAuth scope selection and review the consent page carefully. Unknown scopes and write calls using read-only tokens fail closed.

## Gemini screenshot — two DIFFERENT workflows

- In the **Import code** box, use a **GitHub repository/branch URL**, NOT any `onrender.com/mcp` endpoint:
  `https://github.com/JMisJustMe/JM-cading-lab/tree/feat/jm-unique-bodies-cp08-fold-atlas-20261027`.
  This imports/reviews source only; it **does not register an MCP tool**.
- For a real native Gemini MCP custom app, use **Gemini Settings → Connected Apps → Custom apps → Add**, where available; enter the CP09 gateway's `https://jm-unique-bodies-cp09-oauth.onrender.com/mcp` as its **MCP server URL** and follow the OAuth authorisation flow. The endpoint supports dynamic client registration, so it does not require inventing a client ID or putting the JM owner token in Google's GitHub importer.
- Existing Gemini Build Mesh connector was previously selected but a Gemini-native tool call returned a generic error without a receipt. Do not claim Gemini CP09 tool-call success until a real client result is seen.

## Exact implementation and proof boundaries

- CP09 `cp09_oauth.py`: client registration, protected-resource and server discovery, PKCE S256, single-use code, scoped short-lived access token and rotating refresh token, strict callback host/path validation, owner consent (same-origin form), rate limiting.
- CP09 `cp09_remote_admission.py`: owner secret verified by authentic remote CP08 JSON-RPC tools/list before any grant; owner secret retained **only in process RAM** and never returned to the client. OAuth bearer tokens identify a scoped in-memory association with the original CP08. No new Atlas.
- CP09 `cp09_oauth_broker.py`: exact original CP08 endpoint is fixed, forwards accepted requests to original authenticated dispatcher, enforces scope and strips no owner authority, does not replace CP08 code.
- GitHub CI `.github/workflows/jm-unique-bodies-cp09-oauth.yml` independently exercises original CP08 native source/regression, CP09 OAuth, real local broker→original Atlas write/history and remote public HTTPS discovery, redirect protection, registration and denial. Real **production OAuth login remains OWNER ACTION HOLD**, because it requires the actual original owner token; no token is in tests or source.
- Runtime token sessions are **ephemeral in memory**: a CP09 service restart requires re-authorisation. Original CP08/Atlas remains intact across this OAuth-gateway restart, subject to original CP08's separate storage durability limitations.
- Never confuse a successful registered client or source importer with a cross-client native tool-call DING.

**No DING No Claim · MESH ≠ MERGE · BODY ≠ ROUTE ≠ SEAT · RECOVER BEFORE REBUILD.**

## BIAT → FLAZ CP09 live contact closure (28 October 2026, additive readback)

**BIAT / recovered and preserved:** Original sovereign CP08 `https://jm-unique-bodies-cp08-contact.onrender.com/mcp` and Fold/Atlas are still distinct from the CP09 OAuth connection seat `https://jm-unique-bodies-cp09-oauth.onrender.com/mcp`. No CP08 engine source, owner secret or Atlas carrier was changed in this pass. Shared APP//COMMONS and Receipt OAuth carriers have their **own** independent authorities and gates, recorded in `services/jm-mcp-oauth-relays/FLAZ_2026-10-28.md` on branch `feat/jm-commons-receipt-oauth-gateways-20261028`; their code does not substitute for this sovereign CP09 branch.

**A hard fault fixed:** The prior CP09 transport rejected `notifications/initialized`. It now returns empty HTTP 202 after authenticated notification intake, rejects a fake notification that has an `id`, refuses anonymous notifications with 401, returns authenticated GET `/mcp` 405 without a message body when the GET stream is unsupported, and passes legitimate JSON-RPC commands and scoped tool responses into original CP08. This is protocol compatibility, **not** a direct owner/client tool-call DING.

**Adversarial proof:**
- [GitHub Actions run 40627449468](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40627449468): SUCCESS at runtime commit `0682f151aac40139933899264b8fbc4f3d70b6fa` (8 OAuth admission + 18 broker/notification + 10 original transport + 6 live HTTPS = 42 passing tests).
- Render service `srv-dbglq86gekts7389sl8g`, deployment `dep-dbgmqsnf3r2c73a5l8lg`, exact deployed commit `0682f151aac40139933899264b8fbc4f3d70b6fa`, verified **LIVE** after deploy.
- Owner token content is **never** part of this GitHub record, CI test, rendered response, or issued MCP client access token. Recovered Library-carried token candidates remain **candidates** until checked against the current original CP08 bearer; name/hash/length alone are not authentication proof.
- Cross-client Gemini and ChatGPT **genuine owner-authorised** `tools/list` plus `tools/call` **NOT VERIFIED**. The owner's report is that these newer connections were not working in either host. Do not promote server/CI success to client success.

**FLAZ (bounded):** F = exact original CP08 and separate CP09 seat recovered; L = live deployed source and 42/42 CI contact; A = adversarial notification, auth refusal, method/scope tests; Z = this GitHub-attached, source-versioned trace. **CP09 transport repair FLAZ: CLOSED at bounded transport/deployment scope. Cross-client authorised working connection: HOLD.** Persisted OAuth client/session registration across Render restarts: HOLD. Durable CP08 free-tier SQLite Atlas and physical Fold device DING: independently HOLD. Current 2026-07-28 MCP stateless discovery (`server/discover`) has not been certified by these 2025-era handshake tests and must not be inferred.

**Rules:** No DING No Claim; SOURCE ≠ CONNECTION; TEST ≠ LIVE AUTHENTICATION; MESH ≠ MERGE; recover before rebuild; owner credentials never disclosed.
