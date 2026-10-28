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
