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
