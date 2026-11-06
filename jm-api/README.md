# JM ECOSTATE API v1.1 — One entrance, independent authorities

This is an append-forward successor to the original JM API v1. It does NOT replace or merge any source API body. The same portable core runs in Node 22+ on Windows/Termux and as a Cloudflare Pages Function when separately deployed.

## Original service contacts

- JM Build Mesh: separate public-safe MCP source/discovery/provenance.
- JM MCP Workshop: separate tool recipe/build/test authority.
- JM Live Experience CP07: separate admission authority.
- JM Cloud Contact: existing protected /api/estate-contact and /mesh/v1 workspaces and signed receipts.
- JM Owner Vault: existing protected /api/owner/vault, owner key, R2 object/version custody.
- JM AILatheo: existing /api/ailatheo creator entitlement/billing service.
- JM Phone Commander: existing localhost-only Termux API. Never publicly expose its local token or port.

Historical relative bodies JM Studios API (June), SHIMS Reading Backend (July) and JM Sovereign Agent Gateway (October) are marked historical reported/current source unverified, not assumed to be newly unified or live.

## Local use from repository root

    node jm-api/server.mjs
    node tests/jm-api-v1.test.mjs
    node tests/jm-api-http.test.mjs
    node tests/jm-api-reconciliation.test.mjs

Base: http://127.0.0.1:8787/api/jm/v1

Public-safe GET: /, /health, /meta, /services, /lineage, /capabilities, /openapi.json.

Only fixed public upstream probe: GET /contact/cloud-contact/ready. This contacts https://jm-cloud-contact-server-v05.onrender.com/ready with GET/no credentials and reduces the response to status. Does not read returned JSON, follow redirects, or probe any private endpoint. Unavailability is an explicit HOLD.

POST /plan accepts JSON with operation and optional subject, max 2048 UTF-8 bytes. All plans are PLAN_ONLY: discover, recover, compose, test, admit, workspace, vault, entitlement, phone. This entrance is not an arbitrary proxy and never executes the protected operation or forwards its credentials.

## Proof and promotion

The companion tests comprise 28 original/expanded contract tests, 5 actual localhost HTTP tests, 14 reconciled service/gate tests. This candidate is approved for SOURCE/LOCAL_CONTACT only when these same source bytes pass; not a deployed/owner-device crown.

The Pages candidate lives at functions/api/jm/[[path]].js; it MUST be reviewed as a draft PR in the existing source repository. Original services/registries/credentials stay untouched. Public deployment, live Pages routing, owner Fold8 and separate service write/readback remain OPEN gates. Preserve v1 ZIP as ancestor and do not treat an unmerged branch as installed production.


## CP04 live contact and Python client check — 4 November 2026

Post-merge evidence supersedes the earlier *candidate-only* release-gate status above; the older text remains as historical context.

- PR [#727](https://github.com/JMisJustMe/JM-cading-lab/pull/727) merged at 02:46 UTC on 2026-11-04.
- Existing GitHub Pages /api-hub/ and /api-hub/visual/ were both HTTP 200 from the authorised Samsung SM-F976B Termux connection.
- The existing Estate JM API returned HTTP 200 with parseable public JSON on root, health, meta, services, lineage, capabilities and openapi.json. Health reported schema JM.API/1.1, state HANDLER_RESPONDING; OpenAPI reported 3.1.0.
- On that same device the default Python-urllib/3.13 user-agent received HTTP 403 at the public health endpoint, but a Python urllib request identifying itself as JM-API-Client/1.0 received HTTP 200 with valid JSON. This is a client/network access distinction, not proof that private services are reachable.

Python 3 public read-only example (no secret required):

```python
import json
from urllib.request import Request, urlopen

url = "https://jmisjustme-estate.pages.dev/api/jm/v1/health"
req = Request(url, headers={
    "User-Agent": "JM-API-Client/1.0",
    "Accept": "application/json",
})
with urlopen(req, timeout=12) as response:
    data = json.load(response)
    print(data["schema"], data["state"])
```

The User-Agent names this client truthfully; it is not a privileged credential and gives no bypass of service authorization. A successful public health GET does **not** test remote upstreams, private storage, write effects, logged-in owner routes, UI tap acceptance or every indexed historical API. Protected operations continue through their original controlled services.


## CP05 archival API-stage provenance — 4 November 2026

Recovered original protected ChatGPT Library home `/JMStudio (WIP)/`, not an invented public GitHub backend.

- `JM_STUDIOS_GIFTDROP_B2_0_API_LAYER_COMPLETE_INTAKE_GATE_RUNNER_ONLY.zip`: original SHA-256 `fb2cdb5a119887fc0eb2acceeabbf1d53b9de0e3f38b2cf332179e23c09df13a`; ZIP CRC PASS; 7 files; exact 4,271,093-byte standalone HTML. Original `B1_COMPLETE_API_STAGE_DATA.json` records B1.1–B1.9 receiver, room registry, adapters, teaching, proof and import/export contracts plus B2.0 intake gate.
- `JM_STUDIOS_GIFTDROP_B4_0_FINAL_HANDOFF_CONTROLLED_INTAKE_READY_RUNNER_ONLY.zip`: SHA-256 `afa3c3313aa6ef4914f5f21e8c6db28b10a3a7b1e7b00813898612e2f8759549`; ZIP CRC PASS; 7 files; exact 4,282,909-byte standalone B4 HTML. Preserves later guarded intake workflow; distinct from B2.
- Both standalone original HTML scripts passed Node `--check` and Chromium DOM load at 390px and 1280px with no observed JS page errors in these bounded tests. These are neither physical Fold8 tap tests nor private server deployment tests.

The archive/source-discovery hold for the historical Studio API-stage prototypes is resolved. **Current Node/Python server health, authorized service writes, and first real B4.1 intake remain HOLD.** Creator sources remain private, and the original Library packages are unmodified.


## CP05 Fold8 original Phone Commander local contact — 4 November 2026

Authorised Samsung SM-F976B Termux connection recovered an existing original checkout `~/JM_WORKSPACE/JM-cading-lab/agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py`. Started its original `serve --port 8765` command in a separate remote terminal session. Actual bound source uses `ThreadingHTTPServer(("127.0.0.1", port))`. Private token was created under `~/.config/jm-phone-commander/local-token` with owner-only `0600` permissions and was **never displayed, exported or committed**. With a locally loaded private token, `GET http://127.0.0.1:8765/status` returned HTTP 200 and state PASS. Without authorization 401; with browser Origin 403. This proves actual local authenticated service contact during the test, not off-device API reachability, boot persistence, remote operation approval, or public HTML access. Do not publish the local token or try to call the endpoint from a public web origin.

## CP01 cross-MCP API seating — review candidate, 6 November 2026

The existing JM API service catalogue now has proposed **additive** registrations for four existing independent original routes: public-safe JM3232 Navigator and owner-bearer-protected JM Unique Bodies CP08, JM APP//COMMONS CP06, and JM Federation Receipt CP02. The original Build Mesh, Workshop, Live Experience, Cloud Contact, Owner Vault, AILatheo and Phone Commander remain separate.

The additional plan-only operations are `navigate`, `uniqueBodies`, `commons` and `receipt`. The public API does **not** invoke or proxy protected MCPs, forward credentials, issue receipts, open private Library files, modify GitHub or create owner permissions. A catalogue entry or candidate PR is not a fresh provider-client installation, live deployment or authenticated capability proof.

Source authority: original [six-host MCP register](https://github.com/JMisJustMe/JM-cading-lab), JM Build Mesh v0.8.6 and the independently preserved private services. Keep source integrity hold [#774](https://github.com/JMisJustMe/JM-cading-lab/issues/774), Owner Vault fail-closed hold [#591](https://github.com/JMisJustMe/JM-cading-lab/issues/591) and GONG post-merge checks [#536](https://github.com/JMisJustMe/JM-cading-lab/issues/536) separate from API discovery.

Acceptance: run `node tests/jm-api-v1.test.mjs` and the other original JM API suites against these exact bytes; verify expected service IDs, all four `PLAN_ONLY` routes, no credentials, no unauthorised proxy, no server write, and independent new deployment proof before claiming the public endpoint changed.
