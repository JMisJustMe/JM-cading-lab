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

## 31 October — Fight Clash RouteOS recipient saved-bout return

Inherited RouteOS Console Home v0.8 Seed Runner proof from `ai-host-contact/routeos-body-contact/ROUTEOS_REAL_CONTACT_RECEIPT_v0_1.json` (36176942770) and production receipt (36177697130) without rerunning or transferring it to this recipient. Fight Clash keeps its original `fight_clash_chameleon_v0_4` key, `FightClashRouteOSState` recordType and version0.4 packet, JMGameCore, combat, rendering and controls. Separate Boxout body remains untouched.

New test-only commit `5bb3b579ec595641c9995fbb0bc35f0f87e818bb` exercised actual saved running/paused bouts, real document close/new-page reopen, and malformed/incomplete packets against original `566eb6c93ef9` game bytes. Chromium run https://github.com/JMisJustMe/JM-cading-lab/actions/runs/41220232578 job124593069349: **6 new failures /16 inherited passes**. Both viewport profiles restored behind First Bell; incomplete game packets could leave partial RESTORED state. Failure artifact13049039749 preserves traces/screenshots. The original restore also retained running=true with no scheduled frame; source-to-handler contact distinguishes this from the prior Seed Runner route.

Forward repair validates complete packet/game/fighter shapes before live assignment, leaves rejected stored bytes intact, restores active bouts deliberately paused, dismisses only the valid return's intro, synchronises mode and Resume controls, clears old held contact/queued frames, and lets the original pause/loop resume exactly once. No offline elapsed-time simulation is introduced. Paused saves remain paused. A transitional round-result callback/winner is not carried by the old0.4 format: settling-round SAVE is explicitly held without replacing the previous save; old transitional/incomplete packets are rejected rather than presented as recovered. No replacement persistence store or packet migration.

Focused browser checks cover running and paused saves, two actual close/reopen cycles each, exact restored serialized game state except explicit paused policy, frozen clock before Resume, progressing clock after Resume, movement and keyboard/mobile-touch strike response, one scheduled chain, plus16 invalid/incomplete packet variants with retained bytes and a usable fresh game. Actual repaired-head Chromium result pending. Same-origin browser persistence does not prove cross-device, offline-file browser portability or owner hardware contact.

First repaired-head run41220580853:20/22 PASS; two strict state comparisons exposed the original resize handler remapping coordinates even when arena bounds were unchanged (single-bit float drift). Preserved the exact comparison rather than adding tolerance. Original resize now reprojects fighters only when arena bounds actually change; ten same-size notifications are included in the return regression. Exact original resize-handler differential reproduces drift before and retains identical coordinates after. Pending exact final-head browser proof; real size changes retain original projection.

Fight Clash final return commit `1a0bc3f06775e2f395c1fee31d2d67c2a19d852d`: exact-head Chromium https://github.com/JMisJustMe/JM-cading-lab/actions/runs/41220974054 job124595259110 **22/22 PASS**, including all six new mobile/desktop saved-return cases,16 invalid packet variants per profile, two actual close/reopen cycles per running/paused case, exact restored state, same-size resize idempotence, resume clock/input and exactly one frame chain. Native settling-round SAVE guard separately executed: returns false and performs zero storage writes. This closes the bounded Fight Clash same-origin lifecycle gate, not physical-device or cross-device recovery.

## 31 October — Drag & Aim original power ceiling and preview parity

Continued original CP24 Loop Kernel v0.9.9-alpha recipient; source_vault v0.9.8.2 and Aiming Run descendants unchanged. Reproduced actual original release handler:250-unit pull gives16.25 velocity while1000 gives65, despite both reporting capped250 power/100%. The existing preview had the same unbounded vector. Reused the original launch coefficient/tune through one small local shotVelocity() calculation that caps radial pull at250 for both original release and preview. Short pulls, direction, keyboard route, collisions, progression, trace and receipt/export bodies remain.

Exact-handler differential:100→6.5 retained,250→16.25 retained,1000→16.25 capped. Focused browser candidate observes original guide first-segment velocity, performs native mobile touch/desktop mouse pulls100/250/600, checks capped speed and power, downloads the original Play Receipt, checks chain validity and compares actual release vector to preview. Native coordinate quantisation is assessed using actual recorded power/vector, not assumed integer event positions. Browser result pending exact head. No generic replacement game, new engine, release promotion or physical-device claim.

## CP24 forward — Drag & Aim initiating-pointer and interrupted-contact recovery

Continued exact head56bad10c5fe6472e2d9ac1d5028298464af8900a. Recovered original private Shared Mechanisms v1.2 HTML (native libfile_bdc710bfd5b08191b318a8cccd66b6bd;SHA25663794bab0bdf612d1af5c6c3c0e2141bbf80a8ff33dbe64f4a416bb4290f85d3), its Drag/Aim/Release contracts and existing kernel contract. Private original not copied into this public branch. Drag contract names pointer loss/stuck drag and contact rebinding; Release requires prepared-state contact-up and protects against double fire. No new input engine or mechanic identity.

Executing exact original kernel handlers reproduced unrelated pointerup firing1 shot, unrelated cancel discarding the owner drag and missing lost-capture recovery. Existing handlers now retain initiating pointerId, ignore unrelated down/move/up/cancel/capture loss, recover on owner interruption/blur/hidden/reset, clear held capture and write original trace's drag.cancel reason instead of release. Original keyboard synthetic up explicitly uses null identity; both Space and Enter remain the same bounded original shot route. Original shotVelocity, preview, renderer, collisions, levels and export contract unchanged.

Exact-handler differential PASS for ownership and lost owner capture/no phantom shot. Existing contact suite adds native two-finger/mobile and mouse/desktop ownership, isolated unrelated release observation, owner release receipt, native cancellation/lost capture, focus-loss event, reset/restart and keyboard resume after each interruption. Original downloadable receipts and trace chains are checked. Browser result pending exact head. Inherit24/24 at previous head only for unchanged scopes; physical Fold/multitouch feel stays separate TESTER HOLD.

Initial exact-head run41226906915:27/28 PASS, including native two-finger release ordering, desktop recovery and all inherited checks. Artifact13051919725 (ZIP SHA256ff8c33ec9678117820bc96c2dd809c5ee0faeae6cd9b37c2b8999ac51fa1c598) trace identifies first mobile lost-capture scenario waiting immediately after releasePointerCapture, before another native pointer event. Test now delivers the next native move to process the pending capture override before asserting recovery. Game source unchanged; strict READY/no-shot/keyboard assertions retained. Final browser proof pending.
