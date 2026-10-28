# JM3232 AIRBORNE → ChatGPT CP03 — ORIGINAL UI + In-App Internet Contact

**Date:** 28 October 2026  
**Authority:** JM / JMISJUSTME original bodies remain sovereign  
**Status:** EXECUTABLE PREVIEW FLAZ / real Chromium host-emulation PASS; genuine ChatGPT Android-host DING OPEN.

## Source and inheritance
- Canonical original source: JM3232 Unified Browser AIRBORNE v1.5.2; its protected source SHA-256 `e118664cb4c8fab77a355ec610693b09b8dd077626f825ce728c5fc06cde7562`.
- Original promoted carrier SHA-256 `b41d03fdc5a4fd9545ed30beac5477e70a54ddf479bb580f4650333a41387569`.
- Live canonical carrier includes its separately purposeful 90-byte existing contextual return-route script, SHA-256 `2ece6163a5ca81ff89ca056ffc9d508eefd04977dbe8ae470573f0e664ec4d8a`. Do not remove.
- Protected independent local-source v0.6 Capability Contact / TBS.String-FLL-Librarian source SHA-256 `55557c339041cb9704cdbb142d59bced5e0f1e37380c336710ddb091d5c70af7`. Do not overwrite.
- Existing public Navigator Worker: five original read-only Estate tools, public-safe registry and source-sanitation kept unchanged.

## CP03 actual implementation
One additional `navigator_render_original_browser` tool and `ui://jm3232-navigator/airborne-chatgpt-cp03.html` resource returns the full (~6.18MB) original HTML, hash checked and refused on unknown source hash. Reversible carrier changes: one HTML `<base href>`, one host bridge script in `<head>`, one exact additive call to `JM3232_CHATGPT_BRIDGE.internet` in the **existing original** `fetchInternet`, and one saved-state adapter in its **existing original** `saveStore`. No replacement UI. Remove carrier changes to restore byte-identical original HTML.

A separate seventh read-only `navigator_internet_search` tool fetches real public results, validates source URLs, labels providers and failure states. It routes results back into original `state.webResults` before original `renderMainOnly()`. The original DuckDuckGo handoff remains available as independent external route; it is no longer necessary for returned search rows. It does NOT build a universal third-party webpage renderer or claim full Internet coverage.

ChatGPT host bridge uses `window.openai.callTool` when offered, with MCP Apps `ui/initialize` + `tools/call` parent messaging fallback. Bounded `window.openai.setWidgetState` carries existing browser navigation/bookmark/receipt/config state; no owner-write or server-side account state.

## Proof
- Source/regression CI and live hosted MCP preview: GitHub Actions `40623091568`, success; 7/7 tools present (5 inherited + 2 new), forbidden writes rejected; 1 UI resource, original source identity exact after reversing adapter.
- Actual public search `OpenAI documentation`: Bing RSS returned five source-labelled HTTPS results. Wikipedia provider reported UNAVAILABLE; never invent results.
- Real Chrome/Chromium at **390px** and **1365px** (using emulated ChatGPT JS host) loaded the actual original AIRBORNE UI, searched with the original form, rendered the tool result inside the original result view, saved source receipt and widget state, and had no horizontal viewport overflow. Both PASS at GitHub run `40623091568`.
- Preview MCP endpoint: `https://jm3232-cp03-preview.jm-inline-contact-probe.pages.dev/mcp`. The public connected production plugin endpoint remained unchanged during preview.
- GitHub PR #554 retains CP01 Python bridge donor as separate independent source. No false collapses.

## Limits (remain OPEN)
- Actual ChatGPT custom MCP app connection/refresh in authenticated user's host (requires host-side acceptance/approval). Source tested under an emulated, not actual, ChatGPT host.
- Actual physical Android Fold display, touch, clipboard, accessibility and viewport; no owner-device proof inferred from Chrome emulation.
- ChatGPT UI memory limits when displaying >6 MB HTML, any iframe CSP review, runtime tool approval, model/app host lifecycle and reconnect persistence are not yet observed.
- State save uses bounded widget-state, not an Estate account-sync or arbitrary private source upload.
- Search only returns source snippets/links inside browser, not embedded universal third-party browsing engine.

**FLAZ bounded:** preview source integrity, original UI+search integration, privacy regression, two-width Chromium and hosted public search. **Final whole-browser ChatGPT physical FLAZ held until actual host/owner contact.**
