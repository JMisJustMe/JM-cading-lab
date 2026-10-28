# JM3232 → ChatGPT — CP02 hosted source contact (bounded FLAZ)

**28 October 2026 · owner JM · status: FLAZ at hosted MCP resource/source-contact scope ONLY.** No in-ChatGPT renderer/Android-device DING is claimed.

## Recover before rebuild
- Protected current local head: JM3232 Unified Browser v0.6 Capability Contact — source SHA-256 `55557c339041cb9704cdbb142d59bced5e0f1e37380c336710ddb091d5c70af7`. No mutation.
- Canonical public AIRBORNE v1.5.2: source SHA-256 `e118664cb4c8fab77a355ec610693b09b8dd077626f825ce728c5fc06cde7562`; published carrier SHA-256 `b41d03fdc5a4fd9545ed30beac5477e70a54ddf479bb580f4650333a41387569`.
- Actual live public carrier currently adds *one* already-governed 90-byte contextual return-route organ, SHA-256 `2ece6163a5ca81ff89ca056ffc9d508eefd04977dbe8ae470573f0e664ec4d8a`; preserve that intentional distinct use.
- Existing ChatGPT-connected public Navigator MCP descendant: `navigator/mcp-public-v1/worker.mjs`, originally five bounded read-only tools, no UI resource. Original Python Navigator MCP Bridge retains ten historical methods and separate Stringdoor UI; don't replace it.

## CP02 implementation
The source-authentic route **does not use the CP01 cross-tenant nested iframe**. It extends the already-public JS Worker:
`tools/call navigator_render_original_browser → resources/read ui://jm3232-navigator/airborne-source-cp02.html → hash-pinned live AIRBORNE HTML → ONE base-href adapter → ChatGPT MCP Apps UI`.

The server downloads the original through a single fixed URL, omits credentials and rejects redirects, unknown source hashes, wrong identity markers and overlarge responses. It returns original HTML in the MCP Apps resource, *not a visual imitation*. Removing the one inserted `<base>` tag reproduces the exact live HTML SHA-256. Original scripts/layout/styles remain sovereign. No arbitrary URL fetch, signed-in site, owner write state, Stringreceipt writes or general network proxy is exposed.

MCP Apps `_meta.ui.resourceUri` points to the new UI. Its resource CSP declares only canonical Estate connect/resource origin; `frameDomains=[]` because no nested cross-tenant iframe is authorized. Available display modes inline/fullscreen. Original five read-only tools are byte-compatible at their public result contracts; the sixth tool is read-only/render-only and explicitly `openWorldHint=true` because it retrieves the public browser.

## Live receipts and boundaries
- GitHub Actions PR draft workflow `Navigator Public MCP Estate Integration v1`, run **40620756206**, unit-proof success, preview-cp02 success, production deploy skipped. Hosted preview URL: `https://jm3232-cp02-preview.jm-inline-contact-probe.pages.dev/mcp`.
- Unit checks: preserved five original methods/annotations, sixth render-only method, resource URI/CSP, owner write-tool refusal, untrusted fixture SHA refusal, no arbitrary URL injection.
- Live-source acceptance: full authentic ~6.18 MB browser round trip, SHA-256 exact after reversing the single base carrier adapter.
- Live Cloudflare preview: genuine POST `tools/list`, `resources/list`, `tools/call`, `resources/read`; verified hash-preserving original HTML and denied owner mutation; **PASS**.
- Preceding failed preview run 40620639949 found Cloudflare Workers disallows `redirect:"error"`; corrected to `redirect:"manual"` and explicitly refuse non-2xx. Failure preserved as real adversarial contact and repair, not discarded.

## F / L / A / Z
**F** freeze CP02 source-gate interface; source hashes are governed independent of carrier overlays.
**L** lock: identity ≠ carrier ≠ host, mesh ≠ merge; no Ding no claim; no unrestricted third-party pages; no owner writes on public endpoint.
**A** anchor to workflow run 40620756206, PR #554, existing public adapter, CP01 historical bridge and canonical v1.5.2 lineage.
**Z** source/proof committed and GitHub CI artifact **jm3232-cp02-preview-proof** available; preview deployed with original public production plugin untouched.

### STILL OPEN
1. ChatGPT host actually loading this 6MB MCP Apps UI resource, with SDK initialization, display mode and per-device size/memory acceptance.
2. Rendered original browser interactive controls / touch / viewport inside ChatGPT Android/Fold.
3. Search and Internet-result return staying *inside the same JM3232 UI*, not external DuckDuckGo handoff.
4. Durable receipts/re-entry and original local state migration across the ChatGPT sandbox, which does not share canonical site localStorage.
5. Owner subjective acceptance and production plugin tool-definition review/refresh before promotion.

**Claim: HOSTED PREVIEW MCP SOURCE CONTACT FLAZ. NOT FULL IN-CHAT BROWSER FLAZ.**
