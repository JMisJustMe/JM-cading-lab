# JM Business World CP07 — Stripe Checkout Evidence Gateway
**27 October 2026 | BIAT → bounded FLAZ | EXECUTABLE SANDBOX-READY SOURCE, NOT LIVE SALES**

## Authority
- Exact protected parent CP06 commercial-release readiness; CP01→CP06 and Money Menu 242-route source/data authority remain separate and unmodified.
- Inherit *Secrets of Silence* manual sandbox payment and owner Android PDF/EPUB delivery receipt as historical proof, **not** live revenue.
- This package is a companion server and tests, not a replacement of existing JM business website or Stripe assets.
- Existing Stripe connection was reported as `livemode:false` JM estate/FTR sandbox. No live business onboarding/contact proven.

## Functional route
`server-owned eligible offer → verified consent fields → Stripe Checkout Session (test) → signed raw-body webhook → environment/amount/currency/session/metadata matching → durable order ledger → provider-confirmed payment status → manual-reader-delivery readiness`.

This is runnable in Node 22+ without packages, but it is NOT plugged into a deployed public website. The only eligible Checkout offer in this bounded implementation is the historically sandbox-proven **Secrets of Silence — Digital Edition at £14.99**. All other seven source-grounded offers remain independent, enquiry-only or release-retest-open. No customer-facing digital rights are implied by catalogue listing.

## Safe running and local route
Use your OWN sandbox secrets injected as environment variables (never put secrets in a public ZIP, repository or local HTML):
```
STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... \
JM_LEDGER_FILE=/private/path/jm_cp07_test_ledger.json \
JM_SITE_ORIGIN=https://your-authorised-test-domain.example \
node gateway.mjs
```
Local listener: `127.0.0.1:8787` only. Forward a properly configured Stripe test-mode signed webhook to `/webhook` in a test environment via a secure deployment or controlled Stripe CLI forwarding. A checkout request to `/checkout` must include this exact shape:
```
{"offerId":"jm-secrets-of-silence","customerEmail":"buyer@example.com","consent":{"termsVersion":"JM-CONSUMER-DIGITAL-DRAFT-1","acknowledged":true,"immediateDigitalSupply":true,"lossOfCancellationRightAcknowledged":true}}
```
`JM-CONSUMER-DIGITAL-DRAFT-1` is **NOT a lawyer-approved merchant terms release**. Do not sell live on this draft. The success URL cannot grant payment truth. The gateway never exposes Stripe secrets to the browser. It does not distribute reader files on its own.

## Live release blocks
1. UK seller/company identity and Stripe live mode account owner verification and merchant status.
2. UK consumer disclosures, digital cancellation wording, privacy/tax/rights and terms reviewed for exact intended offering.
3. Audit-ready deployment: authenticated admin, secrets manager, TLS, rate-limits/abuse protection, server-side origin/auth model, durable transactional DB, backup and restore, webhook retry/concurrency and provider refund/dispute reconciliation.
4. Secure product delivery of **approved reader binaries only**, entitlement checks, buyer notices, controlled access, refund/failure handling. Existing owner-received test delivery does not prove automatic external customer fulfilment.
5. Live provider readback and real authorised customer acceptance. DO NOT infer live sales from simulated tests.

## Evidence
Run `node --test gateway.test.mjs`. **12/12 local tests PASS**. Includes HMAC signature/replay/stale-body, price lock, consent, fake livemode, event order, delayed payment, duplicate release, restart ledger persistence and forged order rejection. Ledger is atomically replaced at file level for one instance only; not suitable for clustered workers or high concurrency. Embedded test-mode fixtures are not live Stripe integration proof. No account secret included.

## FLAZ
Frozen: CP07 **standalone local sandbox-gateway code, tests, manifest, lineage and boundaries**.
Locked: No live-money, real-buyer, external-delivery or production-security DING.
Anchored: Original CP06 and earlier source/lineage kept unmodified.
Zionfoldered: Save CP07 folder and verify readback.
Next: real connected **test account** Stripe session, signed webhook and end-to-end delivery rehearsal, then only later eligible live authorisation/review.