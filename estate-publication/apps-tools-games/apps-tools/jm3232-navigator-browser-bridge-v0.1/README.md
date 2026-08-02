# JM3232 Navigator Browser Bridge v0.1

A source-restored, Stringline-governed MCP app bridge for ChatGPT/Codex. It **does not replace JM3232 Navigator** and does not invent another browser shell.

## Active route

```text
OpenAI / host browser
  = reaches, opens, navigates and inspects after user-approved access

JM3232 Navigator
  = identifies, interprets, routes, marks, receipts and preserves

WEB OR ESTATE REQUEST
→ search / fetch
→ Stringdoor resolution
→ RootWord / Radius interpretation
→ Stringmark or lineage return
→ Stringreceipt
→ SavePack custody
```

## Source authorities mounted

- `JM3232_UNIFIED_BROWSER_v1_0_OPEN.html` — current source body; retains Navigator URL opening, Estate intake, bookmarks/history, Stringreceipts and SavePack custody while adding Radius Lexicon, Visualang map, compare, rooms, source registry and TraceBox receipts.
- `01_JM_ESTATE_HEAD_REGISTRY_v0_2_3.json` — Estate identity, proof, route, preservation and next-action authority.
- `04_JM_ESTATE_PUBLIC_SUBSET_v0_2.json` — bounded public subset for Navigator consumption.
- `RADIUS_LEXICON_v1_0_OPEN.html` — preserved donor copy; the active extracted lexicon is sourced from the Unified Browser body.

The extraction script creates 881 searchable source-preserving records, including 640 Radius Lexicon entries. It does not flatten duplicate sources into one unnamed record.

## App archetype

`interactive-decoupled`

- `search` and `fetch` are standard read-only data tools.
- JM-specific actions preserve Stringdoor, RootWord, lineage, Stringmark, body registration, Stringreceipt, SavePack and status operations.
- The widget is a compact one-screen Stringdoor field; the data tools remain useful without it.

## Run locally

```bash
cd JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1
python scripts/extract_authorities.py
python server.py
```

Open `http://127.0.0.1:3000/`.

MCP endpoint:

```text
http://127.0.0.1:3000/mcp
```

Health receipt:

```text
http://127.0.0.1:3000/health
```

## Test

```bash
python -m pytest -q
```

## Connect in ChatGPT Developer Mode

1. Run this server locally.
2. Expose port `3000` through a trusted HTTPS tunnel.
3. In ChatGPT, enable Developer Mode under **Settings → Apps & Connectors → Advanced settings**.
4. Create an app using the tunneled URL ending in `/mcp`.
5. Refresh the app after tool/resource changes.
6. Approve external hosts only when a Stringdoor actually needs them.

## Tool surface

| MCP name | JM route |
|---|---|
| `search` | `navigator.search_estate` |
| `fetch` | `navigator.fetch_source` |
| `navigator_open_stringdoor` | `navigator.open_stringdoor` |
| `navigator_resolve_rootword` | `navigator.resolve_rootword` |
| `navigator_return_lineage` | `navigator.return_lineage` |
| `navigator_create_stringmark` | `navigator.create_stringmark` |
| `navigator_register_body` | `navigator.register_body` |
| `navigator_create_stringreceipt` | `navigator.create_stringreceipt` |
| `navigator_export_savepack` | `navigator.export_savepack` |
| `navigator_bridge_status` | `navigator.bridge_status` |

Dotted names are preserved in `data/CANONICAL_TOOL_MAP.json`; MCP-safe names are used on the wire.

## Boundaries

- No signed-in site access has been approved from this environment.
- No HTTPS deployment or ChatGPT Developer Mode connection is claimed.
- `open_stringdoor` resolves a governed navigation plan; the host browser performs the navigation.
- Registering a body is not proof of that body.
- SavePack holds governed pointers, registrations and receipts; it is not a duplicate warehouse of every full source body.
- No final Ding is claimed.

## Current OpenAI references used for the scaffold

- Apps SDK quickstart: `https://developers.openai.com/apps-sdk/quickstart`
- Build an MCP server: `https://developers.openai.com/apps-sdk/build/mcp-server`
- Build the ChatGPT UI: `https://developers.openai.com/apps-sdk/build/chatgpt-ui`
- Plan tools: `https://developers.openai.com/apps-sdk/plan/tools`
- Apps SDK reference: `https://developers.openai.com/apps-sdk/reference`
- MCP Streamable HTTP transport: `https://modelcontextprotocol.io/specification/2025-06-18/basic/transports`
