# CP08 Security & Release Gates — adversarial closure, bounded

## Verified code-level protections
- Only `sk_test_` accepted. Test account/environment enforced by signature, session prefix `cs_test_`, `livemode=false`, immutable server price GBP 1499, fixed original offer ID, registered Stripe host.
- Raw-body webhook with timestamp tolerance and timing-safe HMAC comparison. Unexpected event/order/session/offer/amount/currency/mode mismatches rejected; event-id replay deduplicated; failed/late payments cannot overwrite confirmed-paid state.
- Payment claims from arbitrary browser/client payloads NEVER counted. Orders move to `PAID_TEST_PROVIDER_CONFIRMED` only on verified signed fixture (tests); no live status available.
- Durable one-process JSON ledger: store pending intent before remote create; Stripe idempotency key derived from server-owned order ID; retry same request key after ambiguous network timeout. Atomic rename, filesystem sync, owner-only file mode. Fatal corrupted ledger does not reset as blank.
- Admin routes require long bearer token and stay on localhost. Public order status requires an unguessable per-order capability. No card data or Stripe secrets in UI. Checkout request rate limit (simple local-memory safety gate). Lockfile rejects simultaneous startup.
- Manual release can only become `MANUAL_TEST_RELEASE_READY_NOT_DELIVERED`, never actual delivered or paid live.

## Required before any internet exposure
1. **Merchant identity & authority:** verify exact owner/legal entity, Stripe live merchant/KYC status, ownership, address disclosures and payment processor permissions. RUKQUSS REALITY LTD incorporation remains OPEN until authoritative evidence.
2. **UK consumer law:** approved trader identity, legal contact, total price/tax, delivery/compatibility/support, cancellation/exceptions, durable confirmation, separately expressed instant-supply consent and loss-of-cancellation acknowledgement for digital content. Draft `JM-DIGITAL-CONSUMER-LEGAL-REVIEW-PENDING` is NOT a valid legal release. Professional review required. See GOV.UK online selling and UK Consumer Contracts Regulations 2013 regulation 37 and 16.
3. **Privacy & compliance:** lawful basis/privacy notice, email retention/deletion, backups and log redaction; account for tax/VAT and territories; approved reader-file IP/licence, refund rights, accessibility and customer support.
4. **Production backend:** replace single-instance JSON ledger with transactional database and durable uniqueness (order/client key/webhook event); robust distributed locking/idempotent API, uptime monitoring, backups/restore drills, authentication/origin threat model, abuse protection, testing of Stripe API version/event changes.
5. **Secure fulfillment:** a verified payment alone is not completed delivery. Bind an approved reader-package digest to sale and account, create revocable short-lived downloads, record customer communication and actual fulfilment, reconcile refunds/disputes and failed/expired sessions.
6. **Provider contact:** create CP08-generated actual test Checkout Session via actual connected owner test credentials, route an authentic signed Stripe test webhook through the deployed test endpoint; verify persistence/readback, retries and matching idempotency. The historical Stripe test session is not CP08's provider contact.
7. **Fold/new input:** browser-size confidence inherited, but this new operator's physical Fold interaction untested. Changed-risk testing only; do not re-demand owner contact for every unchanged parent.

## Non-regression rules
Original 242-route Money Menu (v1.1 / v1.2) unchanged. CP01–CP06 UI and CP07 backend maintained as separate sovereign predecessors. No new legal/payment claim transferred from a donor merely through shared code or naming. MESH ≠ MERGE; SAME-NAME ≠ SAME-STATE; NO DING NO CLAIM; customer intent ≠ contract; sandbox payment ≠ real money; READY TO DELIVER ≠ DELIVERED.