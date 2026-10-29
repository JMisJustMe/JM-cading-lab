# JM FTR First-Person v0.5.1-R1 — Source-Linked Renderer Recovery

**Owner:** JM / TB Scott · **date:** 29 October 2026 · **status:** CI-VERIFIED, branch source; **NOT merged/deployed**.

This is a thin **working descendant of the existing game**, not another engine, a duplicate JM game, or an imitation of a third-party product.

## CP08 — sovereign JM-native organs now execute **inside** this live R1 game

**Verified live browser implementation:** `ftr-native-core-contact.mjs` imports the **exact repository-owned** `coding-estate/sovereign-ten/direct/game-native.mjs` (which imports original `native-core.mjs`) and `coding-estate/integration/ftr-eight-contact.mjs` KicPlay translation. It also imports original `coding-estate/sovereign-batch-six/direct/game-input-native-a.mjs` for `JMVisualGraft` and `JMVisualRuntime`. Those source modules are **not copied** into this game.

**Earned new mechanic:** after acquiring one original Trace Core, use the **CORE PULSE** button (touch) or press **G** (keyboard). The genuine `GameCodingRuntime` checks a native precondition based on the original game's actual state. `JMGameCoreRuntime` dispatches the approved rule and checks its invariant. An approved result then invokes **original** `window.FTR.command('SCAN')` and `window.FTR.command('FIRE')`. The original game's scan counter and cooldown increase, ammunition decreases, and the actual rendered game continues; no simulated state replaces the original game world. Without a core, ammo or cooldown readiness, the action is refused without spending a shot. This is a deliberate earned combined shortcut, not replacement of ordinary Scan or Fire.

**KicPlay live source contact:** `window.JMFTRNative.kicPlay({source,gesture,pressure,sequence})` calls the recovered JM KicPlay `contactEvent` and original-recipient routing plan, dispatching into the real FTR command recipient. An unsupported `Create` action remains HOLD, not aliased to unrelated mechanics. Source names Ama-Pro/GripRoute/PalmVerse here denote the **original JM contact grammar**, **not proven physical hardware**.

**Actual JM visuals:** `JMVisualGraft` derives the live `JM NATIVE CONTACT: APPLIED/DENIED` expression from original native verdict state; `JMVisualRuntime` turns real input contact into a readable field and trace. The result appears in the small R1 HUD output, with exact original native receipts available through `window.JMFTRNative.last()`. The original raycast renderer remains the world renderer. This is a genuine live JM visual-state integration, not evidence of a different GPU renderer replacing FTR.

**Gardles-native remains exact-source HOLD:** neither generic input validation nor the original native invariant checks are renamed Gardles. Do not claim Gardles-native execution until its original source is recovered, verified and integrated without regression.

**Exact tests:** https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40920495686 — 19/19 R1 browser checks PASS, 16/16 original frozen/repair checks PASS, four CI jobs SUCCESS. Original Game-CODING and GameCore gated an earned action, KicPlay drove PHASE, native JM visuals rendered the result, and all original modules reloaded **offline**. The same **19/19** R1 browser tests also passed in Microsoft Edge 156 on the owner's connected Windows laptop using the original source and temporary test dependencies. This is real laptop browser-host execution, not owner-held phone or actual human/controller test. Publication validation, JM M001 and integration conformance independently passed on the same code head.

## Original identity retained
- Original immutable anchor: `../ftr-first-person-v0.5.1/` (FROZEN 2026-08-02).
- Original world/core/controls/raycast sprites/input/style are **referenced by relative URL** from the preserved frozen source. They were **not copied into this folder**.
- R1 contains the minimal playable HTML carrier, one patched renderer limb, a standard-Gamepad command bridge, one authentic JM-native contact module, a manifest, and an independent offline service worker.
- The original game still reports `window.FTR.version = "0.5.1"`; **R1 identifies the source-linked carrier/recovery route**, not a newly authored game-engine version.
- The only modified original-renderer statement: `ctx.scale(side<0?-1:1)` → `ctx.scale(side<0?-1:1,1)`. The ancestor remains byte-exact (Git blob `333463f73344b9af84204bea32b3cef7195388c2`).

## Independent operation and editability
1. Clone the authenticated branch `feat/ftr-eight-discovery-contact-20261029` of `JMisJustMe/JM-cading-lab` (or its future merged source).
2. Run a normal local HTTP server at the **repository root**, for example `python -m http.server 8080` or on Windows `py -m http.server 8080`.
3. Open `http://localhost:8080/estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1-r1/`.
4. Start the original game; touchscreen and keyboard continue using original controls. Standard Web Gamepad can additionally use left stick MOVE, right stick LOOK, A FIRE, B PHASE, X SCAN, Y SIDE, LB FLOW, RB TRACE/INTERACT, Start START (buttons depend on the device's standard map). Unsupported nonstandard controllers report HOLD rather than invented compatibility.
5. After a successful online load, its scoped service worker can reopen the carrier offline, using cached shared original source limbs. It does not delete or seize other JM applications' service-worker caches.
6. Edit the R1 HTML, renderer, Gamepad bridge, manifest or service worker in GitHub/local source. Original frozen source stays recoverable and separate.

## Actual execution receipts
- **GitHub Actions:** https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40913637854
- Existing frozen v0.5.1: original Canvas `scale` BUGG reproduced in real Chromium.
- CP05 corrected temp test carrier: **16/16** PASS.
- CP06 independent source-linked R1 PWA: **12/12** PASS. Real Chromium desktop/mobile emulation, touch start/fire/scan, browser Gamepad API with controlled virtual standard controller moving and firing, unsupported-controller rejection, service-worker installation, fully offline reload and actual subsequent game loop.
- Whole PR native/JM, Godot 4.7.2, Parrot Nmap local-service contact and Kali Linux userland jobs: SUCCESS on the same head.
- Publication validation, JM M001 admission and Estate Integration Conformance: SUCCESS.
- Same-node/browser tool proof is not **owner-phone, actual gamepad, actual glove, Gardles-native, or deployed-domain** proof.

## Next proof boundaries
- Open the R1 carrier on the owner's actual phone and laptop. Confirm touch responsiveness, screen dimensions, sound, visual parity, full game cycle and cold offline reload.
- Test actual standard HID gamepad including axis and button mappings. Azeron devices exposing keyboard/mouse or nonstandard HID need a separately tested mapper.
- Complete gameplay acceptance without synthetic placement/freezing; instrument any issues as BUGG.
- Promote via existing JM publication governance and testable deployment route. **Do not claim live public deployment merely because the GitHub branch is readable.**
- Keep source ownership and all original lineage. No extra generated ZIP or full duplicate game package is needed.

## CP12 — original enemy tactical contact (draft candidate)

**Source-owned recipient, not a separate AI game:** `ftr-tactical-contact.mjs` mounts directly into the original FTR world update and existing CP11 cover. It retains actual source `ftr-world.js` enemies, `ftr-controls.js` `enemyShoot()` projectile production, original `circleFree` collision, `tileAt` doors/map authority and CP11 damage/interception. Authentically imports the existing `GameCodingRuntime` / `JMGameCoreRuntime` from `coding-estate/sovereign-ten/direct/game-native.mjs` before the sentry decides to pressure a player-built barrier. Exact donor: **original FTR AI source**, not generic behavioural simulation.

**Gameplay difference:** after earning a Trace Core and constructing cover, a **sentry** with a firing lane blocked specifically by the new barrier, but not by the original world map, can shoot at the barrier using the original projectile implementation. CP11 then intercepts that projectile and reduces genuine constructed material health. A **flanker** will physically attempt lateral movement using the original `circleFree` checks rather than merely swapping its graphics. The overlay reports real sentry pressure and flanking counts. Press **T** or tap **TACTICS ON/OFF** to compare against inherited source AI. Turning it OFF does not delete the original AI, player, shots, world or controls.

**Proof gates:** the expanded CP12 suite includes 42 real R1 Chromium assertions (36 inherited + 6 new), covering original projectile generation and recorded cover damage, native GameCore identity and trace digest, actual flanker displacement within original collision, tactical switch-off, run restart and offline reload. Original FTR v0.5.1 remains byte-exact; CP09/10/11 stay in their own draft branches. All physical-controller, live phone, user-held visual acceptance, full world completion, native Gardles and public production remain unverified.

**Development:** draft stacked PR #629, branch `feat/ftr-tactical-pressure-cp12-20261029` based on CP11 PR #628. Current code tested on GitHub Actions and the owner's actual Windows Edge host, without modifying their working `JM-cading-lab` Unity source. The local candidate lives in a **purpose-specific temporary sparse checkout** and serves only while its localhost server is active. No second full-game ZIP, public publication or permanent descendant is implied. 

## CP10 — spatial world candidate (NOT CP09 replacement)

**Baseline:** CP09 frozen R1 source head `110c315d0a50e839ecfd8a60f82dd8fbb662b9b3`, retained on its own PR #613. This R1-folder source **candidate branch** is `feat/ftr-spatial-depth-cp10-20261029`; stacked DRAFT PR #624. No new game folder, engine copy, or original v0.5.1 changes.

### Actual changes
- Additional **source-adjacent** `ftr-spatial-depth.js` calls the *original* FTR raycaster and existing sprite projector, reads the **original map `tileAt`**, respects original DDA **`zBuffer`** wall occlusion, and makes sparse world-coordinate floor seams and scan-lit target response. The original floor remains visible; an early dense-block treatment was visually assessed as poor and corrected, not promoted.
- **Original-map route solving**: four-direction BFS follows traversable **actual original FTR** map cells; locked doors are not crossed. First core acquisition opens the real game gate, after which a formerly impossible route to Core B becomes available. Original scan activity reveals world-anchored **depth-occluded route marks** and a range/bearing/step signal. Two acquired cores yield `ALL_CORES_MOUNTED` without fake targets.
- Press **V** or tap **FIELD ON/OFF** to compare optional candidate spatial rendering against the inherited original presentation. Original world/AI/gamepad/touch/raycast-source, score and collision mechanics remain authoritative.
- **No physical radio sensing**, alternative 3D GPU renderer or Gardles-native claims. This is an actual original-engine spatial gameplay descendant, not full AAA rendering.

### Proof and source boundaries
- GitHub Actions four-job run: https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40926716603 — **28/28 R1 browser checks** including 9 new CP10-specific spatial/collision/route/door/performance checks; prior **16/16** FTR browser, native/security/MEETPOINT/THEOGAMY/RouteSense tests and Godot/Parrot/Kali host jobs all SUCCESS. Total **125 bounded checks**, not 125 finished products.
- CI render-section mean **2.50 ms** over **588 samples**, worst 14.20 ms at that runner. This is raycast+CP10 renderer section, **not full-frame FPS or proven 60fps**. The owner's Edge headless run yielded **28/28** and sampled **2.60 ms average** over 846 render-section samples. Compare actual graphical quality on screen before promotion.
- Actual owner-Windows Microsoft Edge screenshot contrast performed in same source-linked R1 state with the Field on/off. Observed original player position and earned core count identical; both screenshot bytes differ. No screenshot bytes committed to Git.
- **Admission:** CP10 code source candidate only; **do not merge/crown** until visual and sustained owner-play gate. CP09 original and source hashes retain authority. Candidate temp checkout is purpose-specific and should be retired or promoted after owner review. No redundant permanent game copies.
