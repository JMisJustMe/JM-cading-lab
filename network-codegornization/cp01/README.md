# JM Network CODEGORNIZATION — CP01

## Recovery and identity
Owner-directed FLAZ baseline: `FLAZ/ASSEMBLY_01_BASELINE_2026-10-27.md`.
This candidate imports **original executable donor modules** from Sovereign Ten and Batch Six. It does not duplicate or edit their implementations.

Original executed donors (10): FlowTalk, JMLogic, JM32-1DA, RouteScript, RouteVM, RouteOS, TraceBox, Dings, CombiBind, Choice Box.

## Actual behavior
`JMNetworkFederation.process({id,channel,message,role,validated})` performs, in process:
- Input contract checking, Choice Box corridor selection (mail/device/storage)
- Native FlowTalk interpretation, native JMLogic decision, native JM32 policy
- Native CombiBind capability compatibility without identity collapse
- Native RouteScript graph / RouteVM checksum-checked bytecode / RouteOS service dispatch
- Side-effect: a genuinely populated local in-memory queue when allowed; duplicates, guest, unvalidated requests denied
- Native TraceBox event journal (sanitized), and native Dings proof object only on local queue completion
- Proof-field receipts and deterministic 64-bit *non-cryptographic* donor digests

### Key boundary
**This is not SMTP/IMAP delivery, a live private device network, a persistent disk store, authenticated identity, or production security.**
The role and `validated` fields are test fixtures and MUST NOT be exposed as trust decisions for real external callers.
The queue has no cross-process persistence. Traces contain typed state events, not raw message payloads.
The native Ding confirms only a LOCAL QUEUE consequence. Remote Ding: HOLD.
Do not attach real providers until authenticated identity, replay strategy, durable queue, transport receipts and external integration tests are implemented.

## Run
```sh
node network-codegornization/cp01/selftest.mjs
```
The tests are composed from original donor source (relative imports) and require Node 22+.

## Proposed next build
CP02: File-backed atomic spool with replay/CRC/hash verification, cross-process cold-restart tests and real adapter negotiation.
CP03: Account-bound authentication and appropriately scoped SMTP/IMAP provider adapter; SPF/DKIM/DMARC and delivery receipts.
CP04: Owner-device contact, failover, privacy audit and independent network/DNS control.
No new public root or DNS change; Cloudflare in-chat connector not in this execution path.

## Evidence state
- Pre-run: source implementation completed in a GitHub draft branch; CI/physical device contact **not automatically proven**.
- Runtime: only claim PASS when CI or locally reproduced actual process execution confirms it.
- FLAZ preserves scope and donor hashes separately from promotion.
