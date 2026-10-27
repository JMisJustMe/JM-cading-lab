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

## Candidate-only exact-origin browser MCP compatibility

The CP08 bearer-authenticated gateway is **not** opened to arbitrary browser origins.
Existing same-origin Fold contact and authenticated no-Origin server-to-server calls
stay as before. An owner may **separately** authorise specific HTTPS browser
origins by setting `CP08_ALLOWED_BROWSER_ORIGINS` to a comma-separated list
(e.g. `https://chatgpt.com,https://gemini.google.com`). An unset variable
means no external provider browser-origin access. Wildcard, remote HTTP
and malformed entries fail at boot; unauthenticated calls still return 401.

This candidate inherits Workshop CP04's exact-origin `OPTIONS /mcp` preflight,
allowed-header constraints, `Vary: Origin` and non-wildcard CORS response.
Denied/ambiguous preflight gets no access grant. Existing Atlas `server/discover`
is admitted only with an explicit modern 2026-07-28 MCP header contract and
modern Accept. Original `atomic_contact_execute` / `atomic_contact_history`
tool scope remains unchanged. Other tools and external state writes remain blocked.

**Production restrictions remain unchanged:** this branch is not deployed;
real owner-provider account contact and token provisioning require separate
approval; Free Render SQLite is ephemeral and does not satisfy durable remote
Atlas/redeploy recovery. A browser-compatible tool is not an authorised game
execution or a new source owner.

## CP09 standalone OFFLINE Atlas custody and no-overwrite restore (additive)

**Why:** The existing live CP08 Render Free service is genuinely online, but
`JM_BODIES_DB=/tmp/jm-cp08-atlas.sqlite3` is an ephemeral carrier. Local
SQLite restart and visible browser contact do **not** establish remote backup
or survival across Render redeploy. Do not treat the live Free instance as the
sole keeper of irreplaceable original JM Atlas state.

This CP09 descendant provides a **local operator-owned backup carrier**, not
a public MCP tool, external upload, scheduled backup or a change to the live
Render process. The existing Atlas, protected CP07 atomic runtime, original
ContactBand/GlyphBody JS donors and identity remain unchanged.

After obtaining legitimate operator access to a copy of the actual database,
use on an authorised host (preferably while writes are stopped; snapshot is a
SQLite-consistent point in time, not a live migration protocol):

```sh
cd services/jm-unique-bodies-cp08
python3 atlas_custody.py snapshot --db ./atlas.sqlite3 --archive ./JM_CP09_COLD_VAULT.zip
# Print the independent archive SHA from the output and KEEP IT separately.
python3 atlas_custody.py verify --archive ./JM_CP09_COLD_VAULT.zip --expect-sha256 <64-character-sha-from-export>
python3 atlas_custody.py restore --archive ./JM_CP09_COLD_VAULT.zip --expect-sha256 <64-character-sha-from-export> --db ./restored-atlas.sqlite3 --apply
```

Restore refuses a missing independent SHA256 pin, modified/tampered archives,
extra ZIP entries, invalid SQLite or CP07 receipt/hash history, non-existing
destination directory and **any existing destination file**. Atomic exclusive
fresh-path publication never overwrites the source or recipient. The source
database is opened read-only through SQLite's online backup API; the staged
SQLite copy is independently integrity-checked before ZIP publication. A
restored database must still pass original CP07 history and replay with zero
new writes; tests provide that exact local contact. Archive contents are
**not encrypted** and may contain original JM data: save only into owner
approved encrypted/private custody, not public GitHub, Render logs or chat.

Required additional production gates: authorised read/export of live CP08
Render database *before* any suspension/redeploy; actual independent off-host
durable storage and access; owner-held SHA pin; restore from that external
carrier into a separate approved host; verified post-host-redeploy history
and original donor replay. No production durability crown from this local
backup/restore test alone. Existing separate JM Market Survivor PostgreSQL
is **not** a recipient by default.

## CP10 operator-only one-shot export for a live ephemeral service (candidate)

CP09 protects an **accessible local SQLite file**, but Render Free does not
make its running `/tmp` database available to the owner's machine through
the ordinary public portal. CP10 provides a narrow **read-only extraction
route** using CP09's genuine SQLite-consistent, hash-pinned archive.

The new `POST /custody/export` route is disabled by default. It never appears
in `tools/list`; it is not an MCP write tool or browser-facing button. Only a
deliberate `CP08_CUSTODY_EXPORT_ONCE=1` setting **plus** a separate strong
`JM_BODIES_CUSTODY_TOKEN` (>=32 characters, not the original bearer) can
start it. When enabled it requires both the original owner bearer
`Authorization: Bearer ...` **and** `X-JM-Custody-Grant`, forbids browser
Origin and Cookie, forbids query strings and request bodies, returns the
consistent zipped Atlas plus external SHA-256 checksum, and permits only
**one successful export attempt per process**. No credentials or source DB
are written into logs.

Owner-controlled transfer procedure **after separately approved deploy,
secret configuration and off-host private storage are available**:

```sh
# Obtain secrets privately from the authorised hosting controls,
# never paste them into ChatGPT, a repo, CI log or screenshot.
curl --fail-with-body --show-error --silent \
  -X POST \
  -H "Authorization: Bearer ${JM_BODIES_TOKEN}" \
  -H "X-JM-Custody-Grant: ${JM_BODIES_CUSTODY_TOKEN}" \
  -D JM_CP10_RESPONSE_HEADERS.txt \
  -o JM_CP10_ATLAS_CUSTODY.zip \
  "https://jm-unique-bodies-cp08-contact.onrender.com/custody/export"
# Read X-JM-Archive-SHA256 from the private response headers,
# verify with CP09 atlas_custody.py and store ZIP + digest independently.
```

Do **not** enable the export route or deploy this candidate merely to test
it. The downloaded archive is **unencrypted**, so carry it only over valid
owner-approved HTTPS and store it in independently protected encrypted
private storage. Deactivate the route after the single export. A Free
instance reset, deletion or replacement **before export** can lose data;
this capability does not magically recover an already-lost instance.

Successful local HTTP CI earns only the dual-grant/one-shot/export/restore
claim. Actual Render transfer, independent off-host storage, physical Fold,
ChatGPT/Gemini account access, durable redeploy and production promotion
remain HOLD until their own DINGs.
