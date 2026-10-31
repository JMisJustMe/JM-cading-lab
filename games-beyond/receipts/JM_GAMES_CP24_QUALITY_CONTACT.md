# JM Games&Beyond — CP24 Cross-Game Quality Contact

**Status:** SOURCE-CANDIDATE / BROWSER-CI PENDING / PHYSICAL OWNER-DEVICE HOLD  
**Authority:** Original JM game bodies and existing `games-beyond/JM_GAME_STANDARD_BUILD_ORDER.md` and `JM_CONTACTED_GAME_QUALITY_PORTABILITY_NORM_v1.0.md`.  
**Law:** **Standardise contact quality, NOT game appearance, code stack, character identity or mechanic sovereignty.**

## Why the games currently differ

The whole-Estate standard already exists and is retrospective, but older bodies were not all patched or independently verified at its highest relevant floor. A written standard or donor PASS does not transfer physical-device proof, runtime performance or owner approval. The House catalogue also includes *different kinds* of bodies (games, engines, experiments, loops and recovery carriers). Do not count them all as identical playable releases.

## CP24 actual edited receivers

| Exact original source | Source-owned functional change | Protected source authority | Gate |
| --- | --- | --- | --- |
| `games-beyond/bodies/drag-aim-loop-kernel-v0-9-9.html` | Keyboard arrows adjust direction/power; Space/Enter commits through existing `up()` shot route, not a second physics engine. Canvas is focusable. Pointer cancellation now aborts rather than firing a phantom shot. | Drag & Aim original core, collision, tune, levels, animation and receipts | Source changed; browser run pending |
| `games-beyond/bodies/fight-clash-v0-4.html` | Input state released on blur/visibility loss; pointer cancellation no longer punches/slips; keyboard focus/edit boundaries; reduced-motion camera shake; accessible viewport zoom | Fight Clash original 128 Hand/RouteOS, three modes, movement/combat, renderer, HUD | Source changed; browser run pending |
| `games-beyond/bodies/futarized-v1-2.html` | Original six-face game gains safe-area fit, 44px primary action minimums, short-portrait scrolling, cancelled/blurred charge timer cleanup, keyboard focus indication and reduced motion | FUTARIZED original Aim/Route/TCG/Convergence, arena engine, source lineage | Source changed; browser run pending |

These are three *different* recipient patches, not generic recolours or synthetic game demonstrations.

## Common gate wired into the EXISTING CI

`games-beyond/tests/jm-contact-quality.spec.mjs` is invoked by `.github/workflows/games-beyond-qa.yml` with **mobile Chromium + desktop Chromium**. It checks actual document boot, canvas presence, horizontal overflow and browser page errors, keyboard shot contact, held-control cleanup and short-portrait target sizing. Successful CI would prove **browser context only**. Physical Samsung/desktop hands-on game feel, FPS, graphics quality, accessibility certification and native APK release remain independent HOLDs.

## Whole-Estate propagation

The established Games & Beyond House already has its own mounted-body and registry gates. This CP24 patch intentionally does NOT:
- edit `games-beyond/index.html`, because another active game-influence PR touches it;
- edit Aiming Run's historical `v0.1A` body, since CP03/CP04 stronger source-owned Aiming Run descendants are in active PRs #552/#553;
- claim every registered/mounted body has passed CP24;
- flatten PUKA, FOURFOLD, FTR, COMBOUND, KICSHIFT, Gadles/Gardles or JM renderers into a single game implementation;
- merge, publish, replace a canonical game door or retire a historical original.

**Next receiving-body gates:** resolve each actual current head, compare to these three real-source fixes and the existing Estate standard, select only relevant donor organs, run each body's native renderer/interaction test and physical-device acceptance. A passing test for one body is never universal certification.

## Recovery/rollback

These changes are isolated on `feat/jm-cross-game-quality-contact-cp24-20261030`. Frozen originals on `main` remain unchanged unless a separately reviewed PR is merged. No temporary copies are required to stay resident.

## 31 October — FUTARIZED original aiming pointer ownership

Continued the existing CP24 public v1.2 recipient from `0ed16bb79d3ddddb28402052cbd88387f33c9777`; this does not replace private v3.3, v3.1 publication or other role authorities. Direct execution of the original event handlers reproduced an unrelated pointerup firing one shot (expected zero); no lostpointercapture handler existed. The existing drag now retains its initiating pointer ID, ignores unrelated moves/releases/cancellation, and cancels on its own capture loss. Reset Duel also clears the active charge timer/drag so a late release cannot fire into a new duel. Original launchAim, physics, stage progression, other controls and visual identity remain.

The existing jm-contact-quality browser suite gains a real mouse-drag plus unrelated-pointer regression, normal owner release, capture loss cancellation and active-drag reset. Local exact-handler execution passes; actual Chromium proof remains pending until the exact updated head runs. Physical Fold/multi-touch feel remains separate TESTER HOLD; no merge, deployment or new public source permission inferred.

## 31 October — Fight Clash single simulation loop

Original public Open Ring v0.4 recipient at PR650 head 3e22f737d18c5db088bd324fcf0d064132cd5a66; separate Boxout v1.1 source is not replaced. Executing the exact original pause() handler with one frame already pending reproduces two queued callbacks after same-task pause/resume. Repeated resume can multiply the original simulation chain. The existing pause() now schedules only when no frame is pending; original loop, combat, renderer, 128 Hand controls and RouteOS remain unchanged. Exact-handler differential PASS: twenty pause/resume cycles keep one queued callback; a drained paused loop resumes once.

The existing contact suite adds actual Chromium scheduler observation through original browser requestAnimationFrame callbacks, forty genuine pause-button transitions, paused clock stability, resume progression and page-error checks. Browser result pending exact-head CI. Physical-device feel remains TESTER HOLD. The prior FUTARIZED commit's exact-head 14/14 Chromium proof remains at https://github.com/JMisJustMe/JM-cading-lab/actions/runs/41216750111; FUTARIZED bytes unchanged. GONG CP03 classifies changed script/input scope; CP06 syntax PASS for spec, HTML needs the browser contact. No physics/128 Hand/M001/AI Studio manual retest, merge or deployment.
