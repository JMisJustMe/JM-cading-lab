# JM3232 Navigator — Public Plugin Submission Dossier v0.1

Status: SUBMISSION PREP BODY — NOT YET SUBMITTED / NOT YET APPROVED / NOT YET PUBLISHED

## Separation law

- Canonical JM3232 Navigator Browser Bridge v0.1 remains unchanged.
- Owner/live-contact descendant remains the full 10-tool durable-write body at `https://navigator-live-contact.jm-inline-contact-probe.pages.dev/mcp`.
- Public Plugin submission descendant is deliberately read-only and exposes no shared mutable user state.
- Public Plugin endpoint: `https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/mcp`.

## Submission type

Use **With MCP** → **MCP-only plugin**.
Use **Universal** MCP Server URL.

## Proposed listing

- Plugin name: **JM3232 Navigator**
- Short description: **Search and recover governed JM Estate routes.**
- Long description: **JM3232 Navigator helps users search preserved JM Estate bodies, fetch governed source records, resolve Radius Lexicon RootWords, inspect source lineage, and check Navigator publication status. The public Plugin descendant is intentionally read-only: it preserves source identity and claim boundaries without creating marks, registrations, receipts, or other shared mutable user state.**
- Category: **PRODUCTIVITY**
- MCP URL: `https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/mcp`
- Authentication: **None for v0.1 public read-only descendant**
- UI resource: `ui://jm3232-navigator/stringdoor-v0.1.html`
- CSP: widget advertises no external connect or resource domains.

## Tool surface — exactly five read-only tools

1. `search`
2. `fetch`
3. `navigator_resolve_rootword`
4. `navigator_return_lineage`
5. `navigator_bridge_status`

Every public tool advertises:

- `readOnlyHint: true`
- `openWorldHint: false`
- `destructiveHint: false`
- an explicit object `outputSchema`

The following owner/live-contact write tools are intentionally NOT exposed by the public Plugin descendant:

- `navigator_open_stringdoor`
- `navigator_create_stringmark`
- `navigator_register_body`
- `navigator_create_stringreceipt`
- `navigator_export_savepack`

## Starter prompts

1. **Search the JM Estate for Radius Lexicon and show me the strongest matching records.**
2. **Fetch the full Navigator record with ID RL-RADIUS-LEXICON.**
3. **Resolve the RootWord Radius and explain its meaning radius and claim boundary.**
4. **Return the source lineage for RL-RADIUS-LEXICON.**
5. **Check the JM3232 Navigator publication status and source counts.**

## Positive review tests

### P1 — Search
Prompt: `Search the JM Estate for Radius Lexicon and show me the strongest matching records.`
Expected tool: `search`
Expected result: Ranked matching records with stable IDs, source kind/file information, relationship hints, and explicit no-merge boundary.
Fixture/auth: None.

### P2 — Fetch
Prompt: `Fetch the full Navigator record with ID RL-RADIUS-LEXICON.`
Expected tool: `fetch`
Expected result: Preserved record text, metadata, source route, relationships, flags, and stable ID.
Fixture/auth: None.

### P3 — RootWord
Prompt: `Resolve the RootWord Radius and show its meaning radius, use law, visual face, wordplay face, and claim boundary.`
Expected tool: `navigator_resolve_rootword`
Expected result: Strongest Radius Lexicon entry plus governed meaning/boundary fields and nearby alternatives.
Fixture/auth: None.

### P4 — Lineage
Prompt: `Return the source lineage for RL-RADIUS-LEXICON.`
Expected tool: `navigator_return_lineage`
Expected result: Preserved source, source file, lineage, connections, authority and claim boundary.
Fixture/auth: None.

### P5 — Status
Prompt: `Check the JM3232 Navigator publication status and source counts.`
Expected tool: `navigator_bridge_status`
Expected result: Read-only bridge/source status with no user-state mutation.
Fixture/auth: None.

## Negative review tests

### N1 — Unrelated weather
Prompt: `What will the weather be in London tomorrow?`
Expected behavior: Do not invoke Navigator; use the appropriate current-information route instead.
Why: Weather is outside Estate retrieval/lineage/RootWord/status scope.

### N2 — Unrelated prose
Prompt: `Write me a funny birthday message for my friend.`
Expected behavior: Do not invoke Navigator.
Why: No Estate retrieval or governed source route is required.

### N3 — Write request on public descendant
Prompt: `Create a Stringmark for RL-RADIUS-LEXICON.`
Expected behavior: Explain that the public Plugin descendant is read-only and does not expose Stringmark creation.
Why: Mutable owner-state tools are intentionally excluded from public v0.1 to prevent shared user-state mixing.

## Initial release notes

**Initial public submission of JM3232 Navigator as an MCP-only, read-only Plugin descendant. The plugin exposes governed Estate search, source fetch, Radius Lexicon RootWord resolution, source lineage, and publication-status inspection. The full owner/live-contact runtime remains a separate 10-tool descendant with durable write state and is not submitted as the public multi-user body.**

## Domain verification

The deployment workflow accepts the OpenAI portal challenge token as the optional `openai_apps_challenge` workflow-dispatch input and publishes it verbatim at:

`https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/.well-known/openai-apps-challenge`

Do not invent or pre-seed a verification token. Use only the exact token issued by the OpenAI submission portal.

## Required portal-side items still awaiting real proof

- OpenAI Platform organization with **Apps Management / `api.apps.write`** access.
- Verified individual or business publisher identity.
- Public publisher-matching website URL.
- Public support URL.
- Public privacy-policy URL.
- Public terms URL.
- Production-ready logo chosen deliberately, not accidentally.
- Portal-generated domain verification token and successful challenge check.
- Successful **Scan Tools** result against the public Plugin MCP endpoint.
- Final availability countries/regions selection.
- Policy attestations.
- **Submit for Review** receipt.

## Claim boundary

Preparation, deployment and automated proof do not equal OpenAI review submission, approval, publication, Plus-plan availability or in-product contact. Those require separate Dings from the Platform and ChatGPT surfaces.
