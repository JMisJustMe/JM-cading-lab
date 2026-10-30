# JM FTR CP21 — real browser-touch full-game victory / BIAT FLAZ

**Authority:** Original first-person FTR v0.5.1 and unchanged CP19 R1 game. CP20 original-source LAN carrier remains separate. CP09 original protected; CP18 command-driven full win and CP19 touch event core-mounted proof preserved. No gameplay modules, renderers, HUD layout, Gardles, enemy rules, scoring, controls, or original sources modified by CP21.

## Source-owned test

`coding-estate/integration/ftr-cp21-browser-touch-fullwin-selftest.py`: real Microsoft Edge browser with **mobile touchscreen emulation**, driven through Chromium DevTools Protocol `Input.dispatchTouchEvent` for the ORIGINAL `#joy` joystick and original `#act` TRACE; ordinary touchscreen taps of the original `#phase` and existing `#jmEchoLaunch`. The test only reads `window.FTR.state`, `JMFTRQuietTrace` and `JMFTREcho` to observe / choose waypoints. It does **not** invoke FTR.command, FTR.test, mutate actors or world, insert score/health/mount events, bypass gates, teleport, or modify live game logic.

## GroundZeroJM 30 October 2026 / actual observed

- First original world encounter on original spawn through on-screen virtual joystick: waypoint positions `[12.4,17.2]` to `[12.4,15.4]` to `[14.4,15.4]`; original `TRACE` touchscreen hold earned 0.52 progress, then actual `PHASE` and `CAST ECHO` touch inputs distracted two real living enemies, triggered original native `JM.FTR.EarnedQuietTrace` and mounted Core A with original `CORE_MOUNT`, `JM_QUIET_CORE_MOUNT`, +180, no injected score. First check ended 91 integrity, score 985.
- Extended **same-run** end-to-end browser-touch test later reached original Core B, then ordinary joystick traversal of both gate routes and original extraction; first full victory did occur but a test assertion incorrectly required the early bonus event to remain in the terminal event tail. Receipt custody should instead use persistent original `JMFTRQuietTrace.state().earnedCredits`; corrected test accordingly, not gameplay.
- Corrected completed test: genuine `RUN_END(win:true)`, original source time **23.2819 s**, score **3,315**, final integrity **55**, 2/2 source cores, one earned Quiet Core A credit present, no browser JS errors or HTTP failures, original run start unchanged throughout; original #act pressed and released 3 each. Touch gestures used throughout; no programmed FTR.command movement. Tested using real Edge 156 on GroundZeroJM, viewport 393x873 with emulated touchscreen; **not human phone testing**.

## Reproduce outside ChatGPT

Requirements: Python 3; Playwright for Python and installed Microsoft Edge. CP20's real FTR-only server must be running, with the source URL accessible from the laptop. With PowerShell from repository root:

```powershell
$env:JM_FTR_URL='http://127.0.0.1:8765/estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1-r1/index.html'
python coding-estate/integration/ftr-cp21-browser-touch-fullwin-selftest.py
```

To use a currently running LAN server on your laptop, change `JM_FTR_URL` to its actual printed address. `JM_FTR_BROWSER` optionally selects Playwright Chromium channel (`msedge` by default). Playwright Python must already be installed separately; no game dependencies are vendored. Test does not install a phone game, change firewall settings, or public-deploy anything.

## No Ding No Claim

**EARNED:** normal original game completed beginning to WIN using browser-generated on-screen touch gestures; real Quiet bonus and original source gates retained; independently reproducible owner-editable test script; no game replacement. **HOLD:** human/manual play, real physical Samsung Fold/Oppo incoming network and touch events, genuine device gamepad/physical controller, source-native Gardles, full graphics-quality signoff, secure context/offline PWA, independent public deployment, automatic GitHub CP21 test admission, any CP27/M001 failure outside FTR, merge/production crown. Distinguish local test proof from CI proof. Do not delete earlier original source or owner evidence.

## Exact versioned source re-run (GroundZeroJM Edge)
The checked-in, environment-configurable CP21 Python source was re-executed against the original CP20 LAN game without changing gameplay. Independent second bounded real browser-touch WIN: source clock **23.5781 s**, score **3,275**, integrity **55**, **2/2** cores, real RUN_END(win:true) once, original source 
un.started unchanged from spawn, original persistent Quiet earned credit awarded, touch TRACE **3 presses/3 releases**, zero browser JavaScript errors or HTTP failures. This is a second successful input-driven source run, **not** proof of an actual phone, owner manual gameplay or GitHub CI.
