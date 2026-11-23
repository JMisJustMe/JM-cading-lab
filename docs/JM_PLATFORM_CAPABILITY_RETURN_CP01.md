# JM ECOSTATE — PLATFORM CAPABILITY RETURN CP01

Date: 28 October 2026. Status: ADDITIVE IMPLEMENTATION, provider/live promotion and owner-device proof OPEN.

## Mission

Create JM-owned implementations of useful external platform capabilities, starting with hosting and commerce. Do not create another website/payment front door just to mimic Render or Stripe. Preserve sovereign source bodies and contracts. External companies may remain carriers until **real** independent replacements are proved.

## Recovered actual donors and current authority

* Existing Cloud: JM CLOUD CONTACT SERVER v0.4.2 first public launch, later v0.5 source; current Cloudflare Estate relay `functions/api/estate-contact.js` and Build Mesh.
* Existing host architecture: `agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md` and `agent-runtime/JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json`.
* Existing commerce: governed Money Menu v1.1 data / v1.2 contact, 242 routes and `money-menu/launch/JM_COMMERCIAL_OFFER_REGISTER_v0_2.json`. Earlier £14.99 Stripe sandbox success is **not** live money; connected provider context was sandbox-only.
* Active coding router: Current-64 identity field, smallest relevant donor selection. Distinguish donor existence from recipient proof.

## CP01 changes

1. `agent-runtime/host-adapters/jm-operated-host/`: an owner-operated, dependency-free static release/serve/verify/rollback adapter. Local CLI mutation only, read-only HTTP, deterministic content hashes, integrity refusal, filesystem guards.
2. `money-menu/commerce-core/`: guarded order-state machine, independent live/sandbox flags, delivery/refund receipt transitions, tamper-evident local journal with readback. Requires trusted external provider verification in future integration.
3. `.github/workflows/jm-platform-capability-return.yml`: two self-contained Node.js test suites and syntax gates, without credentials.

## Gates and inheritance rules

- SOURCE + ENTRY + STRUCTURE + BEHAVIOUR + DELIVERY + RECEIPT; NO DING NO CLAIM.
- FULL BODY → STRAIGHT RUN → CORRECT AFTER.
- HOST ≠ OWNER; CHANGE THE PLUG NOT THE BODY.
- No rewriting old JM bodies, existing domains, public service routes, Stripe/Render accounts, customer records, DNS, billed resources or code on `main`.
- Tests of local static serving are not Render feature parity; tests of synthetic verifier callbacks are not live payment proof.
- No new platform branding or new body identities; these are extensions of the existing host-adapter and Money Menu architecture.

## Remaining larger programme

Bring actual Cloud Contact v0.5 server onto an owner-operated dynamic-process host, with process supervision and persisted storage; verify backup/restore and real deployment on a separate controlled machine, then live domain reachability, TLS and device checks. Build authenticated Stripe sandbox verification (GET server-side) and authenticated provider webhook delivery with replay gates. Preserve prior Money Menu offer and terms authority; add actual lawful digital-delivery consent. Only after merchant/consumer/legal tests and explicit owner approval should real customer payments begin. Reserve managed-card networks and compliance for licensed partners.

## CP02 forward inheritance within the same draft

* Local Node dynamic service supervisor (`supervisor.mjs`): spawn *existing* entrypoint with explicit owner filesystem authority, loopback-only bind, readiness probe, bounded crash restart and shutdown. Does not alter Cloud Contact source or claim Internet hosting.
* Stripe **test-key-only** provider reader (`stripe-test-verifier.mjs`): owner-run GET account + PaymentIntent, account ID cross-check, verified amount/mode/order-reference shape, no client-origin claim. Both modules carry synthetic adversarial Node tests.
* This is not Stripe's entire feature set, nor even a live payment acceptance integration. Actual public hosting, authenticated sandbox account contact and legally compliant live customer sales remain separate OPEN gates.

## CP02 hardening review — 28 October 2026

Recovered development authority: PR #560, head `6732097304edd928c836b307a8d4bbb5bb62a355`, base `2e3f0399d68014644b4793d3472c091acf10d247`. GitHub readback: open draft, no submitted reviews, all 13 head workflow runs successful. This is branch-scoped evidence, not promotion or production proof. Build Mesh plan identity: `JMOP-a95da55f56a038e4ac8f8959`.

Reproduced before repair: provider-await loss of a concurrently created order; competing successful payment overwrites; refund overwriting intervening delivery; absent independently supplied checkpoint comparison; ancestor-symlink static-store escape; unrelated occupied-port readiness accepted; invalid probe timeout accepted; nested private store permitted inside public source. The checkpoint case adds the missing external-checkpoint API; it is not a claim that hash chains alone promised independent anchoring.

Repairs retain the existing host adapter and Money Menu identities: fail-closed local writer locking and fresh state at commit, payment/refund replay checks, explicit checkpoint prefix validation, filesystem ancestry guards, source/store overlap refusal, bounded provider/readiness streams, occupied-port startup refusal, lifecycle/timeout guards and non-disclosing HTTP integrity errors.

Evidence: 24 Node test groups, including four independent Node writer processes creating 32 retained orders; malformed/oversized provider replies; raw hostile HTTP paths; immutable release/rollback and process crash/restart tests. Local runtime: Node v24.22.1 on Linux; configured CI runtime remains Node 22 and must be re-read on the new head. Host-adapter conformance (9 adapters, Node/Python parity), sovereign-agent contract and 37 scoped-memory adapter tests pass. No production deployment or external payment occurred.

Activation trace used the existing sovereign runtime and Current-64 registry: 12 runtime-spine identities selected, 52 available/not selected. Selection does not mean 12 OS processes were spawned. Registry SHA-256: `67851b13f3e6e2082617c9b43106d3e2f657c05b50d98e644ac7d418dc8a94b4`.

Promotion boundaries: independent checkpoint custody/rotation, crash-lock operator recovery, trusted filesystem parents, single-operator static mutation, cooperative loopback settings, unauthenticated readiness/process race, real Cloud Contact v0.5 runtime, actual Stripe sandbox contact, persistent remote storage, encrypted backup/restore, TLS and owner-device contact remain explicit. No independently operable platform is claimed. New-head CI, review acceptance and exact post-merge readback are required before closing Phase 1.
