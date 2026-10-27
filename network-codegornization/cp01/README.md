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

## Actual descendants
- CP02: `../cp02/jm-durable-spool.mjs` — atomic plaintext local file spool, SHA-256 integrity, duplicate refusal and independent-process recovery.
- CP03: `../cp03/jm-private-contact.mjs` — HMAC-signed localhost HTTP contact to a separate receiving process, with durable custody.
- **99/99 bounded checks PASS** at tested commit `7d0407d1d5b1782f9b2b741939a58f3bfe9a1fef` (GitHub Actions run 40430072967).
- Whole-push provenance and HOLDs: `../FLAZ/CP01_CP03_WHOLE_PUSH_OPEN_FIRST_2026-10-27.md`.

## Remaining CP04+ work
Actual physical owner-device Fold↔laptop contact; secure private transport and account authentication; real domain and managed mailbox configuration; provider SMTP/IMAP receipt tests; backup/restore and failover. No public root or DNS changes made. Cloudflare in-chat connector is not in the execution path.

## Evidence state
- Pre-run: source implementation completed in a GitHub draft branch; CI/physical device contact **not automatically proven**.
- Runtime: only claim PASS when CI or locally reproduced actual process execution confirms it.
- FLAZ preserves scope and donor hashes separately from promotion.
