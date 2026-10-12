# JM × REA v1.0 — Actual executable integration of authentic REA findings into existing JM bodies

**Date:** 12 October 2026 · **Disposition:** experimental descendant on `experiment/rea-evidence-contact-20261010`, draft PR #356, no merge/promotion.

## Original mission

External REA reverse-engineering/static-analysis Evidence → identify existing authored JM capabilities → turn those verified function identities plus original JM source grammar into executable JM instructions → run original JM and independent JM reconstruction → detect differences and preserve protected identities. **Not** another playable COMBOUND development mission.

## What is now genuinely executed

1. **Authentic REA `rea-agents@6.1.0`** inspects `coding-estate/sovereign-ten/direct/game-native.mjs` in GitHub Actions and emits canonical Evidence. REA's **own** `evidence-import` validates its bundle; the standalone CLI now re-runs this real validation before execution, independently from the previous in-job command.
2. `jm_rea_evidence_driven_execution_v1_0.mjs` checks the REA semantic and application graph join; the REA root artifact matches the declared source artifact; original REA method nodes `trigger`, `simulateFrame`, `dispatch` (plus optionally discovered `collide`, `combo`) belong to `game-native.mjs` with SHA-256 matching the **actual original source bytes**. Missing/moved/ambiguous/tampered entries HOLD.
3. The existing v0.8 adapter passes verified REA semantic edges to **actual original Sovereign Ten JM32** and **TraceBoxRuntime**. Candidate links remain candidates; REA unknown frontiers remain reported rather than silently resolved.
4. The existing **JM GameCoding and JMGameCore source grammars** are parsed both by the original JM parsers and the independently authored v0.6 parsers. Equal AST identity is checked. Only function classes found in the REA graph enter the executable command list; mechanic names, core systems/events, collision, combos and update intervals are **generated from the JM program source**, not pretyped in the test plan.
5. Genuine authored **GameCodingRuntime** and **JMGameCoreRuntime** execute these instructions. **IndependentGameRuntime/IndependentGameCore** (built in earlier v0.6, not created in this stage) independently execute the same source-derived plan. After each step, outputs, state, frames, original/independent game Trace and core Trace must agree.
6. Original JM32 policy and TraceBox record the resulting scoped original-vs-replica consequence comparisons. A mutation of the reconstructed runtime causes visible mismatch, and no source/host/device crown is transferred.

### Exact tested result

- **32/32 source-derived executable sessions**; **192/192 original/independent behavioural comparisons**; **1,952 internal frame updates**.
- Generated operation counts: `trigger` 64, `collision` 32, `combo` 32, `dispatch` 32, `frames` 32.
- From the separately verified **real REA graph**, inherited bounded projection contains **52** selected static relations with **1,204** unknown frontiers. These unknowns are not runtime mismatches and do not imply 1,204 failures; they are unresolved static analysis regions.
- Eight (later expanded) negative/positive executable tests cover missing REA identity, wrong source digest, missing upstream real validation, altered graph join, bounded sessions, mutation mismatch and correction of bounded receipt counts.
- Standalone executable: `jm_rea_evidence_driven_cli_v1_0.mjs` requires the actual REA record and matching bundle, calls the **real installed REA CLI** `evidence-import`, re-verifies input integrity and writes only a fresh `mode 0600` receipt. Absence of REA, wrong bundle, replaced source, existing output or failed independent parity yields HOLD and **no receipt**.

## Re-run without private COMBOUND or a laptop

From an authorised checkout with Node supported by `rea-agents@6.1.0` and **actual installed REA 6.1.0**, first produce a genuine REA application record and bundle. The existing `.github/workflows/jm-rea-application-v0_6.yml` demonstrates the exact commands. Then:

```sh
node agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_evidence_driven_cli_v1_0.mjs \
  --rea /absolute/path/to/genuine-rea-record.json \
  --bundle /absolute/path/to/validated-rea-bundle.json \
  --output /absolute/path/to/NEW_JM_EXECUTABLE_RECEIPT.json \
  --sessions 32
```

No permanent game source files are created or copied. The CLI source (`game-native.mjs`) is already the authored *public* repository body and must match the REA node artifact digest. The original protected COMBOUND v2.3 HTML is **not involved** in this public-source end-to-end proof.

## What this is *not*

- **Not autonomous reconstruction of arbitrary JavaScript**: REA confirms source identity/relationships and gates callable entrypoints; the independent grammar/parser/game runtime were separately authored using JM's public source subset. REA has **not invented function implementations**.
- **Not private COMBOUND analysis by REA**: direct real-REA contact on the exact protected COMBOUND source remains gated by privacy/compatible local installation. Prior TypeScript/Chromium contact, owner-tested COMBOUND and 14/14 launch comparisons remain independent proof, not transferred into REA authority.
- **Not full JM32-1DA v2.2.1 compiler or Target Bridge recipient proof**. The JM32 policy runtime here is the **smaller public Sovereign Ten body**. Private Library's current registry seat confirms JM32-1DA v2.2.1 has a separately sealed 17,539,390-byte, 521-file archive, SHA-256 `9055aa40180028b7ec2e3acd4f54aa57de263441de5fb8819db317509e959db9`; its pointer is not the executable archive and does not transfer runtime/contact proof.
- **Not target-device output, Unity/GDevelop bridge transport, binary/APK analysis, full-game replay, marketplace release or `main` merge**. Those remain recipient/contact-dependent HOLDs.

## Next authoritative work

1. Run actual REA on protected COMBOUND via v0.9 private source runner (only on an authorised host with supported Node/REA, no GitHub upload). Compare genuine private function evidence to measured protected mechanics, then selectively reuse existing JM original/independent code.
2. Establish actual isolated contact with the exact protected **full JM32-1DA v2.2.1** compiler archive and exact JM Target Bridge recipient. Never substitute `JM32` policy or public portable EveryBody adapter and imply full compiler proof.
3. Only when executable behaviour is reconstructed and compiled for an explicit host, run host/device/contact parity and owner-directed promotion. No generic test-bloat or unapproved archive/copy.

**Law:** RECOVER BEFORE REBUILD · INTEGRATION ≠ REPLACEMENT · CONTACT BEFORE CROWN · NO DING, NO CLAIM · MESH ≠ MERGE.
