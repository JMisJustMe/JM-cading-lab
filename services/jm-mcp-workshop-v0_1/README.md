# JM MCP WORKSHOP — v0.1.0 (independent CP01)

**Purpose:** Give JM the ability to define a new MCP tool as a safe data recipe, test what it actually does, compare it with an ancestor, and export an independent working MCP server. This is a separate system: **it does not modify, import or replace JM Build Mesh**.

## What works

- Six callable MCP tools: `workshop_define`, `workshop_connect`, `workshop_compose`, `workshop_test`, `workshop_compare`, `workshop_publish`.
- Readable MCP resources: `workshop://recipe/example` and `workshop://contract/operations`.
- One prompt: `design_safe_capability`.
- A typed bounded recipe language: inputs, ordered `steps`, outputs. Supported operations: `copy`, `uppercase`, `lowercase`, `prefix`, `suffix`, `length`, `add`, `join`, `format`, `literal`.
- **Real behavior**: `workshop_test` interprets an authored recipe against concrete test cases and reports exact results / mismatches.
- **Real source export**: `workshop_publish` returns a deterministic base64 ZIP with `server.py`, the interpreter and MCP transport; that child server is runnable independently and accepts its newly authored tool by name.
- Two transports: remote Streamable HTTP JSON responses via `POST /mcp`, and stdio using `python server.py --stdio`. MCP protocol versions supported: 2025-03-26, 2025-06-18 and 2025-11-25 (bounded subset; not every optional SDK feature).

## Quick local run

```shell
python server.py --stdio
# OR
PORT=10000 python server.py
# GET /healthz for service metadata; POST JSON-RPC to /mcp
python -m unittest discover -s tests -v
```

Simple API request:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"workshop_test","arguments":{"recipe":{"slug":"jm_greeting","description":"Create a short personalised JM greeting using a safe programmable sequence.","inputs":[{"name":"name","type":"string","required":true}],"steps":[{"op":"uppercase","from":"name","as":"upper_name"},{"op":"prefix","from":"upper_name","value":"JM says hello, ","as":"greeting"}],"outputs":["greeting"]},"cases":[{"arguments":{"name":"Theo"},"expected":{"greeting":"JM says hello, THEO"}}]}}}
```

## Safety, scope and proof

- All tools are **non-mutating to external systems** and stateless. `CONNECT` is a proposed donor route; no automatic JM Estate source access, account permissions, API credentials or device control is granted.
- `PUBLISH` produces ZIP bytes to the caller; it does **not** upload, publish or deploy a service on its own.
- No arbitrary Python, JavaScript, shell commands, imports, URI fetching or unrestricted filesystem interaction from recipes. Only explicit primitive operations may be executed.
- HTTP has Origin checks, bounded request bodies and optional `JM_WORKSHOP_TOKEN` bearer authentication. Configure an authenticated gateway and persistent custody before introducing any write operations; deployment to a public URL should otherwise be regarded as public read-only access.
- Proof layers remain separate: syntax/unit/process/local HTTP; GitHub CI; Render host; ChatGPT tool invocation; Gemini invocation; actual JM coding-body effects and owner device experience.
- Open/plan/test/export is not equivalent to autonomous AI collaboration or real delivery to external hosts.

**Estate governance:** REUSE BEFORE REBUILD · MESH ≠ MERGE · ACCESS ≠ AUTHORITY · INTEGRATION ≠ REPLACEMENT · NO DING NO CLAIM.
