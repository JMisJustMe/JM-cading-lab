# JM FTR First-Person v0.5.1-R1 — Source-Linked Renderer Recovery

**Owner:** JM / TB Scott · **date:** 29 October 2026 · **status:** CI-VERIFIED, branch source; **NOT merged/deployed**.

This is a thin **working descendant of the existing game**, not another engine, a duplicate JM game, or an imitation of a third-party product.

## Original identity retained
- Original immutable anchor: `../ftr-first-person-v0.5.1/` (FROZEN 2026-08-02).
- Original world/core/controls/raycast sprites/input/style are **referenced by relative URL** from the preserved frozen source. They were **not copied into this folder**.
- R1 contains just the minimal playable HTML carrier, one patched renderer limb, one optional standard-Gamepad command bridge, a manifest, and an independent offline service worker.
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
