# JM Money Menu — portable private commerce ledger CP01

An additive **order-state organ** beneath the existing 242-route JM Money Menu; not a new checkout front door and not a card processor. Node 20+, no dependencies; run `node --test ledger.test.mjs`.

Capabilities: explicit offer/terms reference, integer pence, draft orders, trusted-server provider verifier callback, payment state separated into TEST_PAID and LIVE_PAID, delivery receipt only after live verification, verified refund, duplicate event protection, tamper-evident SHA-256 event chain, atomic local-file storage, reload/readback. Private non-PII references only.

**Critical boundaries:** the `verifyPayment` and `verifyRefund` callbacks must themselves be implemented by authenticated, trusted-server calls to an actual payment provider. Tests use synthetic callbacks, not Stripe or live payments. Never accept browser/client event bodies or a boolean `verified` flag as payment proof. This package does **not** include provider API authentication, webhook signature verification, PCI processing, live account activation, merchant compliance, tax, digital-content consent capture, payment links, financial settlement, or production-ready payment processing. Do not take real customer money through this code in CP01.

CP02 hardening serializes cooperating local writers with an exclusive lockfile and reloads state after provider awaits. Lock contention fails with `LEDGER_BUSY`; callers may retry the complete operation. A killed writer can leave a lock: stop all writers, preserve the ledger, verify writer death and integrity, then remove that lock explicitly. Locks are never automatically stolen. This is local-filesystem coordination, not distributed database locking or multi-machine durability. The SHA-256 event chain is tamper-evident **only relative to a separately trusted head**; an attacker who can rewrite both ledger and head can forge history. Introduce independently anchored signatures, managed access control, backups, real provider reconciliation, privacy retention and correct UK consumer terms before live integration.

Existing original JM Money Menu, its customer enquiry handoff and previous sandbox sales evidence remain sovereign. The new code does not promote them to a live sale.

## CP02: Stripe test-only authenticated GET adapter

`stripe-test-verifier.mjs` adds an **owner-operated, read-only verification plug** using Stripe's documented `GET /v1/account` and `GET /v1/payment_intents/{id}` endpoints. It requires a server-held `sk_test_` key, independently verifies the expected Stripe account, and checks PaymentIntent ID, test-mode, success, full amount, GBP and `metadata.jm_order_id`. Return value conforms to the existing `CommerceLedger.verifyPayment` callback. The adapter explicitly rejects `sk_live_` keys. Test: `node --test stripe-test-verifier.test.mjs`.

This is a **synthetic-response tested integration**, not proof of contact with the user's Stripe sandbox account. In production, put secrets in a protected secret manager; never embed a key in a website or commit it. Still open: authenticated real sandbox retrieve, webhooks/signatures, refunds provider adapter, live readiness and all commercial legal gates.

## CP02 security review delta

`verifyIntegrity({checkpoint})` accepts a previously exported `{events, head}` checkpoint and verifies that exact prefix. Keep it in independently controlled custody. It detects truncation and rewritten history relative to that checkpoint, including a fully rehashed altered prefix; it does not create an independent anchor or automatically protect later, unanchored events. Existing ledger schema and order identities are retained.

Synchronous commit sections reload under the writer lock, atomically rename a file flushed with fsync, then flush the containing directory (tested on Linux). Provider awaits hold no lock. Refund reconciliation requires the actual paid reference even on an idempotent replay. Ledger input/output is capped at 16 MiB; capacity exhaustion fails closed and requires an explicit storage migration. No automatic compaction or silent history loss. Store files and every ancestor directory under trusted owner permissions: path guards are not isolation from a hostile process that can rewrite parent directories concurrently.

Stripe responses are bounded to 512 KiB while streaming and cancelled at the limit. Malformed JSON, null/array objects, redirects and incorrect content types are refused. These remain synthetic-response tests; actual sandbox contact is OPEN.
