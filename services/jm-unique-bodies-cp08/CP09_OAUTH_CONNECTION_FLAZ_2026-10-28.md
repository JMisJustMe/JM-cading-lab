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


## CP10 dual-era candidate — bounded BIAT → FLAZ evidence, 28 October 2026

**Candidate only; no new live deployment:** `feat/jm-unique-bodies-cp10-dual-era-20261028`, draft PR [#557](https://github.com/JMisJustMe/JM-cading-lab/pull/557) against the protected CP09 OAuth branch. Original CP08 engine and Atlas, and live CP09 deployment, are not edited or replaced.

**Actual CP10 code:** `cp10_dual_era.py` + bounded `cp09_oauth_broker.py` changes implement OAuth-gated MCP 2026-07-28 `server/discover`, request metadata/header checks, stripping modern metadata before original CP08 delegation, scoped native `tools/list` / `tools/call` and `resultType=complete` responses. Older client behavior is preserved. Modern tool-only compatibility is NOT a blanket certification of every MCP 2026 feature or client.

**Adversarial evidence:** [GitHub Actions run 40630832105](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40630832105), SUCCESS at source/test commit `97b512d87ad5d92c38b63995edb657955102fca3`: 8 OAuth + 23 broker (including 5 new modern/negative tests) + 10 protected CP08 + 6 hosted HTTPS = **47/47 PASS**. The hosted checks use existing live CP09 and are NOT a CP10 production deploy or genuinely authorised ChatGPT/Gemini native invocation.

**Bounded FLAZ:** F original protected; L candidate source and CI; A header spoof, anonymous, invalid version/method, denied write and original donor regression; Z this versioned candidate branch and PR. **Candidate implementation/test FLAZ CLOSED at synthetic/local/hosted-read scope; production deployment HOLD; owner-authorised ChatGPT/Gemini native `tools/list` and `tools/call` HOLD; OAuth restart persistence HOLD.** Do not promote this branch without independent production + owner-client proof. No DING No Claim; MESH ≠ MERGE.
