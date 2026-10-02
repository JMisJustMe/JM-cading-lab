# AILatheo Creation Workbench — Creator Preview + Commercial Sandbox Rail FLAZ Receipt v1.0

**FLAZ date:** 2 October 2026  
**State:** **FLAZ COMPLETE | FROZEN | LOCKED | ANCHORED | RETURN-READY**  
**Canonical body:** `AILatheo Creation Workbench — Creator Preview v0.1`  
**Workbench contract:** `JM.CreationWorkbench/0.25`  
**Customer / entitlement contract:** `JM.AILatheoCustomer/0.1`  
**Canonical public door:** `https://jmisjustme-estate.pages.dev/ailatheo/`  
**Frozen evidence head:** `2be300bbdfa0ff3f94d684662a90556c9664f860`  
**Scope:** public Free Creator Preview + first-run product contact + Signal Garden runtime + customer identity / recoverable entitlement + Stripe **test-mode-only** subscription rail + canonical deployment/proof wiring.

## F — FROZEN

The following earned state is frozen as the accepted parent for continuation:

- Creator Preview v0.1 is packaged and public-facing with the promise **Build it. Connect it. See it work.**
- first contact preserves **no account wall before product contact**;
- the first-run choice is **START BLANK** or **EXPLORE SIGNAL GARDEN**;
- Signal Garden uses the normal Workbench project machinery rather than a sample-only runtime:
  - Pulse Pad;
  - Glow Orb;
  - Gate Bloom;
  - three native bodies;
  - two native links;
  - editable route;
  - native consequence chain;
  - Reset Sample recovery;
- the established BODY / ACT / LINK / TEST / UNDO / SAVE creation route remains intact;
- the public `/ailatheo/` door routes into the real Workbench;
- Free and Creator are separated without making project ownership dependent on payment;
- Creator customer identity is implemented through a high-entropy recoverable account key;
- only the account-key SHA-256 lookup hash is stored server-side;
- server-side entitlement remains separate from project bytes and project ownership;
- monthly and annual Stripe sandbox subscription routes are defined at:
  - **£15/month**;
  - **£150/year**;
- Checkout Sessions are created server-side;
- Creator access is not granted merely because the browser returns from Checkout;
- Checkout return is reconciled against provider state before Creator activation;
- Stripe webhook signatures are verified;
- Stripe event processing is idempotent;
- subscription lifecycle states preserve active / grace / cancel-at-period-end / downgrade distinction;
- Stripe Customer Portal handoff exists;
- the Workbench can recover entitlement on another session/device using the Creator Account Key;
- billing failure or missing billing infrastructure does not disable local Free creation;
- the entitlement API is excluded from service-worker caching;
- checkout/cancel/portal returns go back to the stateful Workbench rather than the marketing door;
- Creator account creation remains closed until the complete entitlement rail is configured;
- v0.1 is hard-locked to **Stripe test mode** and refuses a live Stripe key/mode.

This stage must not be silently reopened merely because the next phase mounts credentials or performs the first real sandbox transaction. Those are descendants of this frozen parent.

## L — LOCKED

Locked continuation laws:

- **NO DING, NO CLAIM.**
- **CONTACT BEFORE CROWN.**
- **RECOVER BEFORE REBUILD.**
- **MONEY MAY CROSS ONE SYSTEM; ACCESS MUST BE PROVEN IN ANOTHER.**
- **PAYMENT SUCCESS ≠ PRODUCT UNLOCK UNTIL ENTITLEMENT IS CONFIRMED.**
- **SUCCESS PAGE IS CONVENIENCE. BILLING STATE IS AUTHORITY.**
- **ACCOUNT CREATION MUST ADOPT / PRESERVE CREATIVE CONTINUITY; IT MUST NOT REPLACE THE WORKSPACE WITH AN EMPTY BODY.**
- **THE USER'S PROJECT IS THE CONTINUOUS BODY. ACCOUNT, DEVICE, NETWORK AND SUBSCRIPTION ARE ROUTES AROUND IT.**
- **PAY FOR MORE CAPABILITY — NEVER PAY TO REGAIN CONTROL OF YOUR OWN WORK.**
- **A SUBSCRIPTION MAY CONTROL ACCESS TO OUR CAPABILITY. IT MUST NOT BECOME QUIET OWNERSHIP OF THEIR CREATION.**
- **PRIVATE IS A STATE. PUBLIC IS AN ACTION.**
- **FAILURE MUST DEGRADE THE ROUTE — NOT DESTROY THE BODY.**
- **THE PRODUCT SHOULD KNOW ENOUGH TO SERVE THE CREATOR — NOT EVERYTHING IT CAN POSSIBLY LEARN ABOUT THEM.**

The v0.1 sandbox rail is explicitly not authorised to charge live money.

## A — ANCHORED

### Source / merge anchors

- Creator Preview first-run product body merge: PR #317 → `e3c8fe3e0c069765b8a20bb9b69699a05ccf940d`
- public Creator Preview door + runtime proof merge: PR #318 → `64cf6910d7f257729a9175014e12ec2e54690787`
- customer identity / entitlement / Stripe sandbox rail merge: PR #319 → `b774843ba99039eb6bfdacaa43c016d84ef8f27e`
- canonical live-proof query repair: PR #320 → `2be300bbdfa0ff3f94d684662a90556c9664f860`

### Runtime / proof anchors

- PR-head AILatheo proof #128: **PASS**
  - Creator Preview static contract;
  - customer entitlement contract;
  - Workbench JavaScript syntax;
  - full rendered GripCube contact;
  - Creator Preview first contact;
  - Signal Garden runtime;
  - QA visual receipts.
- post-merge AILatheo proof #129 on `b774843b…`: **PASS**
- canonical Cloudflare Estate deploy/proof #94 on `2be300bb…`: **PASS**
  - deterministic Estate assembly;
  - deployment;
  - canonical Estate source proof;
  - `/ailatheo/` live contact;
  - `/api/ailatheo?action=status` live contact;
  - Navigator public MCP tail;
  - live integration proof artifact.
- Estate Sovereign Integration Live #54 on `2be300bb…`: **PASS**
- Estate Production Rail #50 on `2be300bb…`: **PASS**

### Stripe sandbox anchors

- product: `prod_VMxqgyKzUStLvS` — **AILatheo Creator**
- monthly test price: `price_1UMDugITOnrhaQrKma04hsmh` — **GBP 15/month**
- annual test price: `price_1UMDuiITOnrhaQrKVw6SWOOy` — **GBP 150/year**

These are sandbox objects. They are not live-commerce authority.

### Canonical implementation anchors

- `ailatheo/index.html`
- `unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html`
- `functions/api/ailatheo.js`
- `tests/ailatheo-customer-entitlement.mjs`
- `tests/ailatheo-v3-creator-preview.mjs`
- `tests/ailatheo-v3-creator-preview-render.spec.mjs`
- `.github/workflows/prove-ailatheo-v3.yml`
- `.github/workflows/deploy-estate-sovereign-integrated-v1.yml`
- `sw.js`
- this receipt.

## Z — ZIONFOLDERED / RETURN-READY

This stage is closed as a recoverable parent.

A fresh continuation must **not** reopen:
- commercial architecture passes 01–30;
- Creator Preview product-definition work;
- first-run / Signal Garden packaging;
- Free ↔ Creator doctrine;
- customer entitlement state-machine design;
- Stripe sandbox product/price creation;
- server Checkout design;
- webhook/idempotency design;
- the service-worker billing cache boundary;
- the canonical deployment proof-harness repair.

### Explicit open frontier

The following are intentionally **OPEN** and are not claimed by this FLAZ:

1. mount a private `AILATHEO_CUSTOMERS` R2 binding on the canonical Cloudflare project;
2. mount `AILATHEO_STRIPE_MODE=test`;
3. mount the Stripe **test** secret key;
4. mount the Stripe **test** webhook signing secret;
5. mount the two proved sandbox price IDs;
6. mount `AILATHEO_PUBLIC_ORIGIN=https://jmisjustme-estate.pages.dev`;
7. configure the Stripe sandbox webhook to `/api/ailatheo?action=stripe-webhook`;
8. execute one real Stripe **sandbox** Checkout;
9. prove the resulting Creator entitlement without trusting the success redirect alone;
10. reload / reopen and recover the same entitlement;
11. recover Creator on a second session/device using the Creator Account Key;
12. prove cancellation / period-end / recovery behavior against actual Stripe sandbox events;
13. only after all sandbox gates pass, define a deliberate production/live-money promotion descendant.

**No live payment DING is claimed.**  
**No real-money transaction is authorised by this FLAZ.**

## Restart rail

`RECOVER THIS FLAZ → MOUNT CLOUDFLARE SANDBOX BINDINGS / SECRETS → PROVE /api/ailatheo STATUS READY → RUN ONE STRIPE TEST CHECKOUT → VERIFY WEBHOOK / ENTITLEMENT → RELOAD → SECOND-SESSION RECOVERY → CANCELLATION / PERIOD-END TEST → SANDBOX DING OR BOUNDED CORRECTION`

## Closure declaration

**STATUS: FLAZ COMPLETE | FROZEN | LOCKED | ANCHORED | RETURN-READY — AILATHEO CREATOR PREVIEW + COMMERCIAL SANDBOX IMPLEMENTATION / DEPLOYMENT-PROOF SCOPE**

**LIVE MONEY: HARD-LOCKED OUT.**

**NEXT EVIDENCE FRONTIER: REAL STRIPE SANDBOX CONTACT AFTER CLOUDFLARE CREDENTIAL / R2 MOUNT.**
