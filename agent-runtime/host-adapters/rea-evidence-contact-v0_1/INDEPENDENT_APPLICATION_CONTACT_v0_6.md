# JM × REA v0.6 — independent source parsing and application-level state comparison

**Current experimental descendant, isolated GitHub draft PR #356.** No changes to `main`, no protected parent overwrite, no promoted release/Ding. All new logic was added below the existing host-adapter branch.

## What actually executes

Source: the original public JM Sovereign Ten `route-proof-native.mjs`, `game-native.mjs`, `native-core.mjs` and `native-corpus.mjs`, including the authored `Door` / `PlayerInteraction` micro-application.

v0.6 builds three independent parsers and IR lowerers for the tested RouteScript, Game-CODING and JM GameCore source subset. They **do not invoke the original JM native parse or lower routines**. A separate independent game runtime evaluates the resulting source-derived actions, including mechanics, collision checks, combos, frame updates, event dispatch, invariant checks and persistent local game state. Original JM GameCodingRuntime and JMGameCoreRuntime provide the reference implementation.

### Results observed in GitHub Actions on 12 October 2026

- **120/120** RouteScript programs match original source AST and graph IR; the independent interpreter also matches their state consequences.
- **96/96** application sessions match original JM runtime across **672/672 interaction checkpoints**.
- **4,536** source-controlled simulated frame updates; **192** collision checks; **96** combos; **96** GameCore event dispatches. State, frame counts, observable outcomes, mechanics/core trace order are compared after each action.
- Independent Game-CODING and JM GameCore parsers matched original AST and IR, including the organ/system references.
- Deliberately tampered game-state reconstruction diverges and is counted as failure; malformed route references, nonexistent mechanics and unknown actions remain HOLD conditions.
- Existing JM TraceBoxRuntime stores 96 per-session proof events. Existing JM32 Sovereign Ten policy keeps the result **non-promotable without owner-device proof**.
- Real upstream REA 6.1.0 inspected `coding-estate/sovereign-ten/direct/game-native.mjs`, found **52 function nodes**, including `trigger`, `simulateFrame`, and `dispatch`, and REA's own evidence-import validated that source analysis.

### Verified receipts

- [Actual JM app behavior and independent source parser CI](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38263053860)
- [Real REA inspection of JM game code plus game application parity](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38263250477)

### Local reproducibility / no duplicate archive leak

Inside the JM checkout with Node 22+:

```sh
node --test agent-runtime/host-adapters/rea-evidence-contact-v0_1/test_jm_rea_application_v0_6.mjs
node agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_application_cli_v0_6.mjs --output /absolute/path/to/NEW-v06-receipt.json
```

Optional: `--expect-game-sha256 HEX` locks the exact original game-native source. The offline runner never modifies native JM files and refuses to overwrite an existing receipt. It records source hashes and scoped outcomes only. It does **not** run REA or authenticate REA Evidence in that process. CI keeps full REA graph JSON only on the ephemeral runner; it does not persist another graph archive in Library or release assets.

## Exact limits and pending recipient contacts

1. The independent parsers cover the exercised RouteScript, Game-CODING and GameCore grammar subset, not every JM grammar or full JM32-1DA compiler dialect. Their feature coverage is not general source semantic equivalence.
2. The game-state comparison concerns the authored *Sovereign Ten Door/PlayerInteraction micro-application*. It is not contact against a latest protected COMBOUND/UNTETHERED/other full game, and it does not prove rendering, input feel, graphics, animation, audio, story or full gameplay.
3. The REA 6.1.0 analysis identified original game functions, but it did NOT generate the replica on its own: the independent implementations were source-guided and separately authored; REA's static function graph does not itself prove runtime causality.
4. No APK decompilation, native binary reverse engineering, physical Android device execution, fold/laptop parity or download/install test has yet been established.
5. The **full private JM32-1DA v2.2.1 compiler** and existing JM TARGET BRIDGE recipient are not joined to this executable graph-parity lane; the exercised public Sovereign Ten JM32 is a distinct policy organ.
6. Proven results remain confined to GitHub Actions/Node CI; owner-specific gameplay contact, durable recovery, release promotion and `main` merge remain explicitly open.

**Recovery law:** recover protected game head → inherit exact controls and device composition → run original vs reconstructed runtime/visual contact → attach target compiler/bridge → owner phone/laptop DING → compare and promote. Keep REA as external investigation donor and retire ephemeral transport copies after use.