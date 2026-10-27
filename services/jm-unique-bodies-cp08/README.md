# JM UNIQUE BODIES CP08 — authenticated direct Fold ↔ MCP ↔ Atlas

CP08 inherits exact SHA-256-pinned ContactBand / GlyphBody donor JS, CP06 Node runner and protected CP07 atomic Atlas runtime. Their sources are unchanged. CP05–CP07 ancestors are in the included frozen archives and evidence.

## Real local run — same-origin HTTP, no browser shim

Requirements Python >=3.11 and Node >=20. From `CP08_SERVER`:

```sh
export JM_BODIES_TOKEN="$(python3 -c 'import secrets;print(secrets.token_urlsafe(32))')"
export JM_BODIES_DB="$PWD/atlas.sqlite3"
python3 cp08_gateway.py --host 127.0.0.1 --port 8765 --db "$JM_BODIES_DB"
```

Open `http://127.0.0.1:8765/fold` *on the same computer* and enter your generated token. The token stays in the browser's live memory, not localStorage or receipt exports. A Fold on another device cannot reach this loopback URL; do not claim otherwise.

## Remote HTTPS route / Render

Use the `CP08_SERVER/Dockerfile` on a separate Render service in the owner's GitHub repository; never replace the Build Mesh or Workshop. The service requires:

- `JM_BODIES_TOKEN`: random unique strong secret, >=24 characters; not committed to GitHub.
- `CP08_PUBLIC_ORIGIN`: the exact `https://<service>.onrender.com` origin (no trailing slash).
- `JM_BODIES_DB`: path under a **persistent mounted disk** for restart/redeploy durability. Free web services without persistent disk are **EPHEMERAL** and cannot earn durable remote-Atlas claims across deployments.

Root of HTTP `/fold` is the Fold UI. `/mcp` is a same-origin, bearer-authenticated JSON-RPC endpoint limited to `atomic_contact_execute` and `atomic_contact_history` plus MCP `initialize`, `ping`, `tools/list`. Responses return structured receipts. Nonmatching origins rejected. No wildcard CORS or anonymous write access. `/health` exposes only non-sensitive readiness.

If no disk volume is attached, claim only temporary hosted runtime persistence during the process lifetime. The user must complete the physical Fold ↔ remote HTTPS interaction and deliver a screenshot/receipt before physical Fold-connected contact is promoted.

## Tests and evidence

`python3 -m unittest -v test_cp08_transport` — real Python HTTP socket (no mocked transport), 32 writes / 64 events, replay, integrity, origin/auth, restart and concurrency. Source donor SHA pins validated. `test_cp08_browser.py` attempts real Chromium loopback HTTP; in the current container Chromium enterprise network policy reports `ERR_BLOCKED_BY_ADMINISTRATOR` even though direct HTTP socket calls pass. Browser-host direct network contact therefore remains HOLD in this environment, separate from CP07 owner's physical offline HTML contact.

## Immutable compatibility rule

The inherited `server.py`, `cp07_atomic_runtime.py`, `native_contact_runtime.py`, `native_donor_exec.mjs` and three original native modules have been copied byte-for-byte from CP07. CP08 only introduces its own gateway, page, security limits, packaging and tests. The CP07 FLAZ ZIP is included separately unmodified. 

Boundary: source execution / typed transport / native consequence / visible owner contact must be reported as separate evidence categories. No Ding for untested remote conditions.
