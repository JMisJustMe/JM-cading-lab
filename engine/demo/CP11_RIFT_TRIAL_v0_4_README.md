# JM CP11 Living Form v0.4 — Rift Trial

**Owner:** Theodore Benjamin Scott / JMISJUSTME. Independent additive descendant. **CP10 inherited and preserved** at commit `95a529c26341751af3d26f1a4499a1481801c047`; **CP11 Heartwake v0.3 preserved** at `dea7f5e59e981ddf4ed64149b798fdc01cbd553d`.

## Original owner hardware contact

25 Oct 2026 owner's Samsung Fold screenshot of v0.2: 3/3 seals, 100 health, displayed FPS 60. v0.3 subsequently earned hosted Chromium/WebGL complete two-phase gameplay. Neither screenshot nor CI transfers automatically to v0.4 real hardware performance.

## Additive release changes

* Third optional Crown trial is **earned only** after 3 seals, AWAKEN, 3 Echoes, and Heartwake victory, via the `OPEN THE RIFT TRIAL` button. Three visually and geometrically distinct source-compiled Crown Facets (BULWARK / MIRROR / HEART) have four hits each, new scene color/phase cues and a permanent final outcome. Baseline 3-seal + 3-echo victory remains a completed ending; trial is optional.
* New **DASH / EVADE** touch control (also `F` on keyboard) creates real x/z displacement, short invulnerability and a cooldown. Existing 360 thumb movement, lock-on, camera, pulse, slam, guard, awaken, Heart Surge, pause and restart survive.
* Bounded local completion record (`JM.CP11.RiftTrial.v0.4`) saves seals, echoes and trial victory, catches storage-denial without breaking the game, displays progress in HUD, and keeps history across restart. No archival copies or large payloads.
* 3-stage dynamic mission HUD and phase-specific target labels; instanced static scenery is inherited from v0.3; authored mesh organs compiled using exactly pinned JM compiler and transported to Three.js via the separate PlayZone adapter.
* v0.3 exists unmodified at `engine/demo/cp11-heartwake-v0.3.html`. This candidate is exclusively `engine/demo/cp11-rift-trial-v0.4.html`.

## 32 independent test executions

The workflow `.github/workflows/cp11-rift-trial-32.yml` fans out **32 separate GitHub Actions matrix jobs**, indexed 0–31, each launching a real Chromium + Three.js WebGL browser in its own isolated process and session (not 32 assertions in a mock). Four viewport widths (320, 360, 390, 658 CSS px) crossed with eight behaviors (render/compiled source, lock/camera, 2-axis movement, dash, pause/guard, targeted combat, restart, full three-stage completion including persistent record). Each requires actual frame pixels and reports one `CP11_RIFT_CONTACT_PASS` with case ID, or a failure. Artifacts retain screenshot evidence. One aggregate gate only succeeds when every matrix job passes.

This verifies hosted-browser WebGL and modeled mobile viewport contact **not** physical Samsung Fold or native Android APK runtime. No claim of device FPS until owner screenshot. Do not merge until CI and owner acceptance.