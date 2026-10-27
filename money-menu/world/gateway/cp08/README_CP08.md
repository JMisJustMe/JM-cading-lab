# JM BUSINESS WORLD CP08 — FINISHED LOCAL SANDBOX EDITION
**27 October 2026 · BIAT → FLAZ · actual executable, local-only · no live-money claim**

## Authority / open order
1. `gateway.mjs` — JM-authored Node 22+ implementation. Test-only Stripe hosted-Checkout gateway, hardened from preserved CP07; never auto-upgrades to live.
2. `gateway.test.mjs` — local security, persistence and HTTP tests; `node --test gateway.test.mjs`.
3. `sandbox-demo.html` — first-party JM sandbox operator, served **only** from `http://127.0.0.1:8787/demo` by the gateway. Phone-size views switch **Checkout ↔ Evidence**.
4. `CP08_BIAT_FLAZ_RECEIPT.md` — what was proved and what remains open.
5. `CP08_SECURITY_AND_RELEASE_GATES.md` — threat assessment, required hardening before any external exposure.
6. `STRIPE_HISTORICAL_SANDBOX_READBACK.json` — direct provider readback of **prior** £14.99 test checkout. Not CP08 network contact.
7. `TEST_RESULTS.txt` and `MANIFEST_CP08.json` — source, QA and recovery integrity.

## Inherited sources
- Original source Money Menu v1.1; public contact v1.2 (242 original routes); independent GripCube/GripRail; CP01→CP06 UI/body, CP07 gateway ancestor. All unchanged. CP05 still owns customer nonbinding intent; CP06 owns pre-sale release pack. CP08 is a distinct gateway improvement, not a replacement body.
- CP07 gateway source SHA-256 `b178934f459049cab55a376c4476d837138ad34eadff752879879bf6fb8cd7d1` preserved as parent.
- `JM Providings First Sale Deployment 001` proved old sandbox checkout and Android PDF/EPUB delivery. On 27 October 2026, direct Stripe connector GET returned `livemode=false`, status `complete`, payment_status `paid`, amount `1499`, currency `gbp` for that historical session. **No new real transaction was created.**

## Local run
First run `node --test gateway.test.mjs`. Node 22+; dependencies: built-ins only. This remains a **test-only reference**, not a public payment site.

When the owner has safe local test keys, launch using separate private environmental values:

```sh
STRIPE_TEST_SECRET_KEY='sk_test_...' \
STRIPE_TEST_WEBHOOK_SECRET='whsec_...' \
JM_CP08_ADMIN_TOKEN='owner-private-long-random-32+-character-token' \
JM_LEDGER_FILE='/private/data/jm-cp08-sandbox-ledger.json' \
JM_SITE_ORIGIN='https://your-verified-https-test-domain.example' \
STRIPE_ACCOUNT_ID='acct_...' \
node gateway.mjs
```

Then open `http://127.0.0.1:8787/demo` **on that same computer**. Do not paste secrets into HTML. Do not hand a local test instance to customers. The gateway actively refuses non-loopback network binding and live Stripe API keys. Browser rendering in controlled QA did not constitute a fresh physical Fold input test.

For authenticated real Stripe *sandbox* webhooks, configure the test endpoint/Stripe CLI on a trusted owner machine. Use the matching `whsec_` for that endpoint. Stripe event `checkout.session.completed` only gains TEST paid status after signed, environment- and source-verified evidence. The success page never marks an order paid. The historical Stripe checkout is provider-confirmed; no CP08 physical Stripe webhook was sent in this release.

## Tests and proof
- **54/54** real Node runtime tests passed locally; includes 49 full HTTP Checkout → signed fixture event → protected status → admin/manual TEST-release chain, idempotency/restart, malformed and tampered webhook, rate limiting, lockfile collisions, price/offer/consent checks and stale signature.
- Chromium visual inspection using page-content rendering (direct localhost navigation blocked by test harness policy): Fold portrait **390×844**, unfolded landscape **815×610**, laptop **1440×900**. All three pages horizontally fit. On Fold portrait Checkout/Evidence switch works. No physical owner device claim.
- CP08 operator `Open TEST Stripe Checkout` remains **hidden** until a confirmed sandbox checkout session URL is returned; its URL is constrained to `checkout.stripe.com`.
- Exact files hashed and read back through the ZIP manifest. No API/webhook or admin secret in the release.

## FLAZ state
**FROZEN/LOCKED/ANCHORED/ZIONFOLDERED at LOCAL TEST-ONLY EDITION** after Estate readback. Source tested, sandbox operator test UI, 54 tests and separate historical Stripe provider readback.

**NOT complete as a real commercial platform:** merchant legal verification, UK consumer legal disclosures and rights, live Stripe onboarding/credentials, fresh CP08 Stripe-server webhook, production durable transactional database, authenticated external hosting, backups/monitoring, provider refund/dispute reconciliation, customer notifications and actual external digital delivery/paid revenue. No DING, no claim.