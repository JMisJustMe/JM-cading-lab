# JM SLINGFALL CP16 · HTML Living Field v0.3 — FLAZ

**Status:** Earned offline single-file browser playable preview. **Does not replace** signed native Godot CP16/PR #467, and is not evidence of HTML changes inside Android.

## Quick play
Open `JM_SLINGFALL_CP16_LIVING_FIELD_v0_3_QUICK_PLAY.html` offline. Tap an arena zone to fling; drag from the blue launcher for precise delivery. Use **ORDER** then tap a zone to send deployed allies there for no extra energy. **SAFE / POWER** retains all six tactic pairs: BRACE / HEAVY WARD, RALLY / SURGE HEAL and TRAP / DIVE.

## Major player-facing changes since v0.2
- Squad orders set actual ally destinations and save/recover.
- Bulwark damage mitigation, Dart three-hit critical cycle, Warden healing pulses, each with distinct graphical cues.
- Real possession effects: RIDGE 15% mitigation nearby, CROSSROADS 22% allied movement uplift, SUPPLY faster energy regeneration. All-three-zone Dominion gives bonus score and energy.
- Three telegraphed rival waves and role-differentiated battlefield behaviour, returning gameplay rather than proof display.
- Mobile touch, portrait and landscape responsive user-facing control layouts from v0.2 preserved.

## Test result and scope
**32 independent Chromium contexts**, **8 screen sizes**, **192 route UI contacts**, **1,868/1,868 JavaScript/browser assertions PASS**, 4 longer accelerated wave simulations; **0 JavaScript exceptions**. Tests include real DOM button presses for every SAFE/POWER route, actual energy/HP/shield/stun consequences, touch deployment, touch squad orders, and visibility/fit.

The complete owner screenshot → v0.1 → v0.2 → v0.3 lineage, full test harness, screenshots, 32 browser run receipts and source hashes are **FLAZ saved with CRC and exact Library readback**:

`/JM Estate/Games/SLINGFALL/JM_SLINGFALL_CP16_HTML_LIVING_FIELD_v0_3_WHOLE_LINEAGE_FLAZ_2026-10-25.zip`

Archive SHA-256: `18806fabc5e5df3a6de1782cb7b2d4b75b0f4d82405f2486b1853e47d9606ff2`.

The **existing separate native CP16 FLAZ** is not duplicated, and remains at:

`/JM Estate/Games/SLINGFALL/JM_SLINGFALL_CP16_SIX_ROUTES_32_RUN_NATIVE_FLAZ_2026-10-25.zip`

SHA-256 `9d682be784221ce5cfab3e8a1b9279cf363e325041a84a98ebb57fa5ed613bb7`, independently verified with ZIP CRC, native 32/32 and 1,696/1,696 test results. HTML is an authored source-aligned preview, not the original Godot runtime in a browser.

## HOLD and next return
No owner Fold physical acceptance for v0.3; physical screenshot evidence belongs to earlier HTML. No proof of native Godot port of new mechanics. When owner returns: **open and play v0.3, inspect real thumb/field flow, iterate visible game feel; only then consider integrating proven mechanics into native child and rerunning native/device checks**. Preserve all original bodies, avoid a premature merge or release.