# JM ECOSTATE × GOOGLE CLOUD — CP-GC1 inherited relay adapter
Date: 2026-10-27
Status: **bounded source / local harness complete, owner Google Cloud deployment HOLD**.

## Recovered authority, never replaced
- Existing canonical JM Estate `functions/api/estate-contact.js`: fixed allowlist, static target, scoped bearer, Origin gate, 32 KB JSON ceiling, redirect/content-type refusal and service timeout. This adapter imports it **unchanged**.
- Canonical JM Cloud Contact Server v0.5 recipient: `https://jm-cloud-contact-server-v05.onrender.com`, fixed by that existing relay; NOT a claim of fresh live Render availability.
- JM Cloud Contact CP-C17 owner-laptop execution already independently proved Docker + PostgreSQL + signed return + recovery; physical Samsung Fold contact on HOLD.
- Independent JM NETWORK CODEGORNIZATION CP04 draft PR #506: 129 CI checks at previous verified head, owner-device TLS LAN still HOLD. This Google Cloud candidate does not merge its original ten native coding bodies into the Edge relay or pretend CP04 ran inside Google Cloud.
- Prior Google Cloud account inspection: `gen-lang-client-0548577910` (then billed), `gen-lang-client-0982509897` (then billing disabled), `luminous-design-s8f9p` (permission insufficient). This document does not select or alter one.

## Real delta
A tiny Node HTTP inbound adapter imports the existing production Estate Functions relay, preserving its fixed target and denying all additional routes. Intended for a future Google Cloud Run container if costs, project authority, identity, regional policy and separate deployment gates permit. It does not create an alternative Cloud Contact database, backend, registry, platform front door or JM engine.

### Local source tests
`node --check cloud-contact-gcp/entrypoint.mjs`
`node --test cloud-contact-gcp/selftest.mjs`

Local tests run a real Node HTTP listener and invoke the actual original `onRequest` code with a synthetic in-process upstream intercept. Their successful synthetic write response is **not** a real Render save, state persistence, Google Cloud contact or external client. Negative tests check missing config, route allowlist, bearer, origin, payload cap, redirects, content type and upstream failure.

### Container build (does not deploy)
From repository root:
`docker build -f cloud-contact-gcp/Dockerfile -t jm-gc1-candidate .`

Container expects `PORT` from Cloud Run. It requires an explicit canonical HTTPS `JM_PUBLIC_ORIGIN` matching the deployed Cloud Run HTTPS origin; without it, all routes return `503 CONFIG_HOLD_PUBLIC_ORIGIN`. Neither `Host` nor `X-Forwarded-*` may choose the upstream destination or origin. An unset origin intentionally prevents accidental exposure before a URL is assigned.

## Actual Google Cloud execution gates (NOT done)
1. Reinspect current project, permissions, billing/credits and quotas. Never assume the historical £0 Oct 1–23 report is today's balance.
2. Obtain user's Google Cloud connection/authorised project; do not create another project just for this candidate.
3. Select dedicated least-privilege service identity. Do not upload Google credentials/owner tokens to git, screenshots or chat. Keep Cloud Run authenticated (no `--allow-unauthenticated`); explicitly bound min instances zero, max instances one; consider billing controls and regional charges.
4. Build image and deploy a candidate revision **only after cost and identity gates**; Cloud Run initially has no `JM_PUBLIC_ORIGIN`, so it fails closed until its actual HTTPS origin is assigned. Do not attach the canonical domain or shift real public traffic.
5. Obtain a Cloud Run identity token (separate from the scoped JM bearer) for the authorised invoker, then call `/api/estate-contact?route=/ready`. Prove exact response and endpoint identity from actual live returned bytes.
6. Independently prove an authenticated scoped workspace save/receipt readback and cold recovery through the candidate; distinguish custody in the existing Render backend from Google Cloud durable storage. Repeat after backend replacement/failover before asserting durability across provider restarts.
7. Test owner Fold and laptop as distinct physical devices using genuine credentials and owner consent. Verify regression and receipt differences, source hashes, and recovery. Promote only after cross-provider performance, security and cost measurements meet requirements.

## Proof boundaries
- Local synthetic Node HTTP + inherited Estate route logic: PASS (only after checks run).
- Container Docker build/boot and GitHub CI: status must come from their own logs, not inferred from source.
- Render live response today: not re-proved here.
- Google Cloud project selection, IAM, Cloud Run deployment, spend, receipt and durable remote storage: HOLD.
- True Fold↔Laptop↔Google Cloud traffic: HOLD.
- Main branch, live site, Render, Cloudflare, protected JM coding bodies and backend database: UNCHANGED.
- No new credentials, cloud paid services or public endpoints are created by source-only CI.

Keeper: RECOVER BEFORE REBUILD · MESH ≠ MERGE · NO DING NO CLAIM · CARRIER ≠ RECIPIENT · EVIDENCE INHERITANCE ≠ FRESH DEVICE PROOF.
