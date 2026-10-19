# JM RENDER CONTACT v0.1 — renderer integration boundary

**Owner:** JM / JMISJUSTME. **Status:** isolated engineering contact branch, not production promotion.

This module is a **new, optional interface for existing JM WebGL renderers**. It does not replace MEGALITH, Shatter Halo, GameCore, GameForge, COMBOUND or any sovereign game body.

## CP2 donor integrity
- Reported source body: `JM_ONE_ON_ONE_v0_6_0_EVOLUTION.html`
- Owner-supplied final SHA-256: `d393e381db46bae9b3c758b72c8c82e380857cd7ab1ccab70b25a17f86c0c385`
- Reported performance: 492 → 208 → 73 draw calls; original-to-CP2 CPU work 1.8 → 0.4 ms, no demonstrated FPS increase.
- **The CP2 ZIP binary is currently not accessible to the execution runtime.** This module is a separate contact layer, **NOT** copied CP2 shader/mesh source, and cannot earn CP2 source-inheritance proof until exact bytes and source hash are verified.

## Reusable operations actually implemented here
- Draw provider hook: existing renderer must supply real `draw(item)` and, optionally, `drawInstanced(items)` functions.
- WebGL2 and ANGLE/WebGL1 capability detection with direct fallback.
- Consecutive opaque-instance grouping by mesh/material/shader/state, never reordering translucent or order-sensitive draws.
- 3×3 inverse-transpose normal matrix for nonuniform scales and arbitrary nonsingular shears.
- Stable static-scene cache keyed by body-owned revision, disposal on replacement.
- Per-frame provider-submission counts and CPU timing probes.
- Explicit `beginFrame`, `submit`, `endFrame` contact boundary. Gameplay/input remains in the host game.

## Exact donor integration still held
1. Read CP2 original, compare hash and shaders; do not recreate/rewrite from prose.
2. Pass the correct original CP2 `draw` / `drawInstanced` mechanisms into this bridge **without changing their source authority**.
3. Test in ONE ON ONE and one other actual 3D recipient with real rendering; check visual equivalence and real GPU metrics.
4. Only then prepare separate game-specific improvements for COMBOUND / UNTETHERED / WRESTLEFORM / AFTERHOURS.
5. Owner Android/fold tactile and thermal Ding remains its own gate.

## Test
Run `node games-beyond/jm-render-contact/JM_RENDER_CONTACT_v0_1.test.mjs`.
Tests run on provider mocks and verify ordering, fallback, normal matrix and static cache; they do **not** establish pixel quality or physical GPU performance.

---

## Executed cross-game integration — 19 October 2026

### Protected receiving bodies
- `receivers/JM_WRESTLEFORM_DUAL_EXPRESSIONS_v0_3_1_RENDER_CONTACT.html` — buffer binding reuse, direct-TRS optimisation, diagnostics. Frozen predecessor; Git blob `164c07437cc07e2c6fe48ed17e7b7af2f14f8b56` preserved byte-for-byte.
- `receivers/JM_WRESTLEFORM_DUAL_EXPRESSIONS_v0_3_2_STATIC_BATCH.html` — WRESTLEFORM's *last runtime arena override*, not a dead earlier renderer: 31 static geometry submissions → 1 actual GPU indexed draw; 119 → 89 draw submissions per frame in the simulated WebGL receiver.
- `receivers/JM_WRESTLEFORM_DUAL_EXPRESSIONS_v0_3_3_RENDER_EVOLUTION.html` — v0.3.2 plus inverse-transpose corrected dynamic actor normals and 2 GPU soft-contact shadows. 119 → 91 submissions per frame (23.5% fewer); no draw-count drift on three consecutive mock frames.

### Reusable executable JM organs
- `JM_RENDER_CONTACT_v0_1.mjs` — conservative opaque grouping, WebGL2 / ANGLE / direct detection, normal matrix and disposal.
- `JM_STATIC_BATCH_v0_2.mjs` — source geometry bake to world space, inverse-transpose normal transformation, interleaved material attributes, WebGL1-safe uint16 splitting, GPU buffer replacement/disposal.
- `JM_SOFT_CONTACT_SHADOW_v0_1.mjs` — texture-free GPU radial contact shadows with explicit blend/depth state recovery.

### First-open and contract evidence
- WRESTLEFORM v0.3.3 fake-DOM + simulated WebGL: 3/3 frames at 91 actual draw calls, 91 frame-reported draws, single compile of 31 source arena draws, 979 stored vertices, 2,616 submitted static indices, 264 normal-matrix uniform uploads over three frames, 6 depth-mask transitions, first match started, SEQUENCEFORM → LIVEFORM route returned.
- WRESTLEFORM gameplay and prior identities preserved; no removed gameplay mechanics.
- Test files: `JM_RENDER_CONTACT_v0_1.test.mjs`, `JM_STATIC_BATCH_v0_2.test.mjs`, `JM_SOFT_CONTACT_SHADOW_v0_1.test.mjs`, `JM_WRESTLEFORM_v0_3_1_RECEIVER.test.mjs`, `JM_WRESTLEFORM_v0_3_2_STATIC_BATCH.test.mjs`, `JM_WRESTLEFORM_v0_3_3_RENDER_EVOLUTION.test.mjs`.
- Run with Node.js 22 using `node games-beyond/jm-render-contact/<test-file>.mjs`. GitHub CI includes these but its remote conclusion is separate from in-chat simulation.

### No proof inflation
These are **real source edits and mocked rendering driver executions**, not browser WebGL shading validation or physical-device FPS evidence. Exact CP2 ZIP has been recovered as an archive, but the programmatic unpack/decode environment has failed; the shaders and mesh compiler inside it have **not been claimed as byte-identical transplanted CP2 code**.

**Ding:** static geometry compiler and full simulated receiver contract **PASS**; hardware WebGL shading, comparable screen captures, Android/Fold touch and thermal endurance, CP2-byte donor proof and production promotion remain **HOLD**. Do not merge/release as canonical game without those gates.

---

## 19 October 2026: alpha-safe renderer and JM Actual Engine inheritance

### WRESTLEFORM v0.3.4 (protected descendant)
- `receivers/JM_WRESTLEFORM_DUAL_EXPRESSIONS_v0_3_4_ALPHA_SAFE.html` extends the protected v0.3.3 recipient.
- Correctly separates the source's one alpha ring marking from 30 opaque static calls: 30 → 1 batched indexed draw, then 1 alpha-mark drawing call.
- Plus 2 GPU soft contact-shadow calls and unchanged character draw path: original 119 → simulated 92 frame submissions (22.7% less).
- Three consecutive mocked-WebGL frames: 92 actual / 92 reported draws, static compiled once, 1 translucent ring source, 1,656 static indices, alpha and depth states restored each frame, full game starts, LIVEFORM ↔ SEQUENCEFORM returns.
- FLAZ claim remains **bounded to source/code simulation**, not physical Android or hardware GPU shading.

### JM Actual Engine v12.2.1 (distinct sovereign engine recipient)
- Source parent: `JM_ACTUAL_ENGINE_v12_2_ENGINE_CLOSURE_FLAZ.html` (70,029-character recovered Library copy), unchanged.
- Recipient `receivers/JM_ACTUAL_ENGINE_v12_2_1_RENDER_CONTACT.html`: original 2D/3D engine, live scene, user controls, source lineage, v12.2 pack/restore/closure APIs kept.
- Actual WebGL drawMesh now uses the JM Render Contact inverse-transpose normal-matrix provider (fixing direction distortion under nonuniform scale).
- Caches repeated consecutive mesh vertex/normal attribute binding, and records actual provider draw/mesh-switch/CPU-frame counts. No fake instancing claim.
- Controlled 6-object source-code draw comparison: 6 draws before/after; GL buffer binds 12 → 6 (50% for that sequence); same draw order and model transforms, 6 correct normal-matrix uploads.
- Simulated first-open executes complete five-script HTML: WebGL context initialised, 2D → 3D → 2D works, sync route matches, scene renders twice, retained dual-core self-test 11/11. The separate v12.2 closure proof was 7/8 in the test's artificial DOM; owner/browser/device closure is **HOLD**.
- Tested by `JM_ACTUAL_ENGINE_v12_2_1_RENDER_CONTACT.test.mjs` and `JM_ACTUAL_ENGINE_v12_2_1_FIRST_OPEN.test.mjs`.

### Updated technical boundary
This **is native renderer technology inherited across two independent JM recipients**: WRESTLEFORM and JM Actual Engine, with all parents frozen. It is a real code-integration descendant, not the original CP2-byte-perfect transplant. The CP2 ZIP archive has been materialized, but binary unzip in the local runtime remains unavailable. The current protected branch **must not be merged into main** or certified for Android hardware without actual browser/driver and device QA.
