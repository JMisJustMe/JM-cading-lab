# JM MCP WORKSHOP — v0.2.0 (CP02, separate JM MCP)

**JM owner's selected independent MCP**, not a version or replacement of the live **JM ECOSTATE Build Mesh**. CP01 remains preserved in Git history and the original source ZIP.

## Actually working

- A responsive **owner-facing browser Workshop** on `/` and `/workshop` (the same Python server). Edit JSON recipes, choose three worked examples, use the quick builder, execute through live MCP `tools/call`, inspect results, import/export recipe JSON, and download a generated standalone MCP ZIP.
- **Seven MCP tools:** `workshop_define`, `workshop_connect`, `workshop_compose`, **`workshop_run`**, `workshop_test`, `workshop_compare`, `workshop_publish`.
- MCP resources `workshop://recipe/example` and `workshop://contract/operations`; a design prompt; stdio and stateless Streamable HTTP JSON responses.
- **Real new capability authoring**: a bounded recipe describes input schema, ordered behavior (copy, uppercase, lowercase, prefix, suffix, length, add, join, format, literal), and output contract. `workshop_run` actually computes the result. `workshop_publish` emits a deterministic zip with an independent executable MCP server and its interpreter. A separately launched process has executed an exported game-score recipe.
- **No host code execution:** A recipe cannot import, eval, run JS/Python/shell commands, read arbitrary files or call URLs. `workshop_connect` returns a proposal, not a connection. Nothing is automatically pushed into the Estate.

## Local quick start

```sh
python -m unittest discover -s tests -v
python server.py # choose PORT and HOST through env; browser UI on http://localhost:10000/
python server.py --stdio # newline-delimited MCP JSON-RPC
```

To run an actual authored recipe via MCP HTTP:

```sh
curl -s http://localhost:10000/mcp -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"workshop_run","arguments":{"recipe":{"slug":"add_score","description":"Calculate an original JM scoring effect with bounded integer values.","inputs":[{"name":"a","type":"integer","required":true},{"name":"b","type":"integer","required":true}],"steps":[{"op":"add","from":"a","with":"b","as":"total"}],"outputs":["total"]},"arguments":{"a":12,"b":30}}}}'
```

Response contains `structuredContent.result.total = 42`. A second client can use the identical JSON-RPC tool contract through the hosted `/mcp` endpoint once deployed and connected.

## Hosting and exposure

- Host as a **separate Python web service** using this repository branch, `autoDeploy=no`, `plan=free` where available. Build command: `pip install -r services/jm-mcp-workshop-v0_1/requirements.txt`. Start: `python services/jm-mcp-workshop-v0_1/server.py`. Existing path is kept to preserve initial CP01 lineage; service version is v0.2.0.
- `GET /` serves the owner interface; `GET /healthz` returns instance metadata; `POST /mcp` accepts MCP JSON-RPC. `GET /mcp` returns 405 because server-to-client SSE is deliberately not implemented.
- MCP protocol subset: legacy handshake versions `2025-03-26`, `2025-06-18`, `2025-11-25`; **not yet dual-era `2026-07-28`**. This bounded implementation does not claim full SDK feature coverage.
- If `JM_WORKSHOP_TOKEN` is set, API requests require that bearer token. No token is required by default because CP02 only supports bounded, non-mutating public-safe operations. Do not add external writes to this unauthenticated service.
- Static UI delivered under restrictive CSP, no third-party scripts or dependencies. Browser UI is same-origin only. Uploaded recipe JSON is read in-browser; downloaded files are held by the client, not stored on the server.
- Browser tests may be blocked by a test machine's local HTTP policy. That is a testing limitation, **not proof the UI works on JM's Fold**. Owner visual and touchscreen acceptance require separate direct contact.

## Evidence / release distinctions

Local 76/76 automated regressions PASS: CP01 tests inherited, CP02 direct execution, ZIP child process, HTTP asset routes, origin guard, deterministic output and proof boundaries. JavaScript syntax PASS. GitHub CI is separate. Hosted Render service, live remote POST, ChatGPT+Gemini MCP connections and owner-device tests all require their own receipts before DING.

**Keeper:** RECOVER BEFORE REBUILD · DO FOR SELF OFF OF OWN MERITS · MESH ≠ MERGE · SOURCE ≠ RUNTIME ≠ DEVICE · NO DING, NO CLAIM.
