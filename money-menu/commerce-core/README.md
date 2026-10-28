# JM Money Menu — portable private commerce ledger CP01

An additive **order-state organ** beneath the existing 242-route JM Money Menu; not a new checkout front door and not a card processor. Node 20+, no dependencies; run `node --test ledger.test.mjs`.

Capabilities: explicit offer/terms reference, integer pence, draft orders, trusted-server provider verifier callback, payment state separated into TEST_PAID and LIVE_PAID, delivery receipt only after live verification, verified refund, duplicate event protection, tamper-evident SHA-256 event chain, atomic local-file storage, reload/readback. Private non-PII references only.

**Critical boundaries:** the `verifyPayment` and `verifyRefund` callbacks must themselves be implemented by authenticated, trusted-server calls to an actual payment provider. Tests use synthetic callbacks, not Stripe or live payments. Never accept browser/client event bodies or a boolean `verified` flag as payment proof. This package does **not** include provider API authentication, webhook signature verification, PCI processing, live account activation, merchant compliance, tax, digital-content consent capture, payment links, financial settlement, or production-ready payment processing. Do not take real customer money through this code in CP01.

A single-process local file has no cross-process transaction locks or multi-machine durability. The SHA-256 event chain is tamper-evident **only relative to a separately trusted head**; an attacker who can rewrite both ledger and head can forge history. Introduce access control, exclusive locking, independently anchored signatures, backups, real provider reconciliation, privacy retention and correct UK consumer terms before live integration.

Existing original JM Money Menu, its customer enquiry handoff and previous sandbox sales evidence remain sovereign. The new code does not promote them to a live sale.

## CP02: Stripe test-only authenticated GET adapter

`stripe-test-verifier.mjs` adds an **owner-operated, read-only verification plug** using Stripe's documented `GET /v1/account` and `GET /v1/payment_intents/{id}` endpoints. It requires a server-held `sk_test_` key, independently verifies the expected Stripe account, and checks PaymentIntent ID, test-mode, success, full amount, GBP and `metadata.jm_order_id`. Return value conforms to the existing `CommerceLedger.verifyPayment` callback. The adapter explicitly rejects `sk_live_` keys. Test: `node --test stripe-test-verifier.test.mjs`.

This is a **synthetic-response tested integration**, not proof of contact with the user's Stripe sandbox account. In production, put secrets in a protected secret manager; never embed a key in a website or commit it. Still open: authenticated real sandbox retrieve, webhooks/signatures, refunds provider adapter, live readiness and all commercial legal gates.
