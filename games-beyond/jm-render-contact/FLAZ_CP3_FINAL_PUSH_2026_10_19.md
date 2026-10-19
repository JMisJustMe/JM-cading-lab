# JM RENDER EVOLUTION — FINAL FLAZ · CP3 · 2026-10-19

**State: FLAZ at tested engineering scope.** This checkpoint is not equivalent to hardware release approval.

## Recovery / authority
- Owner JM / JMISJUSTME.
- Main source: `JMisJustMe/JM-cading-lab`, protected integration PR #376.
- Final frozen source commit: **`89e721b492d02840b197f814ccef214875aedbf5`**.
- Earlier verified CP2 protection branch `jm-render-evolution-cp2-flaz-20261019` remains separate and unchanged.
- Original Astra CP2 HTML (`JM_ONE_ON_ONE_v0_6_0_EVOLUTION.html`, 73,235 bytes) SHA-256 `d393e381db46bae9b3c758b72c8c82e380857cd7ab1ccab70b25a17f86c0c385`. Preserved verbatim.
- Astra's native CP2 vertex/fragment shader hashes: `1c11cddccb982c3ef147183d5d9a27a06c673d6b60dcdaa11a7de1367bff4da0`; `6b0756f52d61e3e400597dfbd7530eadce50929ecfef1bb5f140e0236657dcf4`.

## Final source descendants
1. `games-beyond/jm-render-contact/receivers/JM_WRESTLEFORM_DUAL_EXPRESSIONS_v0_3_6_CP2_DYNAMIC_INSTANCING.html`
   - Inherits original CP2 GLSL text and CP2 24-float-per-instance matrix/tint/finish data arrangement.
   - Raw WebGL2 and ANGLE-instanced WebGL1 supported. Without support it keeps real WebGL1 direct drawing.
   - Simulated 3-frame test on each of 3 driver paths: 92 native direct draws/frame, 7 native WebGL2 or ANGLE draws/frame (3 instanced groups holding 88 opaque actor pieces), original gameplay and dual expressions retained.
   - 30 opaque final ring objects compiled into one indexed draw, 1 translucent ring mark separate, 2 soft shadows; live actors continue.
   - Earlier v0.3.1 ... v0.3.5 remain separate. No original overwritten.

2. `games-beyond/jm-render-contact/receivers/JM_ACTUAL_ENGINE_v12_2_2_CP2_LIGHTING.html`
   - Builds on v12.2.1 buffered direct rendering and inverse-transpose normals.
   - Adapts CP2 hemispherical lighting, fresnel/specular highlights, fog and colour mapping to its own vertex/material contracts.
   - Real source first-open mock: 2D↔3D↔2D, render-scene synchronization and recovery boundary preserved; retained parent dual-core 11/11 self-test.
   - Source lighting is CP2-derived, *not falsely claimed* to be byte-identical shader transplantation in this recipient.

## Evidence and gates
- Workflow: `JM Renderer Contact Boundary QA` run **39298600208** / completed **SUCCESS** at frozen commit; **12/12** separate test commands passed, including source-authentic GPU instancing and engine light regression.
- Source-level and mocked driver jurisdiction only. Real WebGL pixel/shader compilation did not run because available Chromium denied WebGL context. This is **not** hardware FPS proof.
- Original owner's Android/Fold first-open, touch, quality comparison, thermal endurance and WebGL1 actual-driver evaluation: **HOLD**, to be conducted with owner device.
- COMBOUND/UNTETHERED/AFTERHOURS canonical source inheritance and production main promotion: **not claimed**.

## Preservation
- No canonical `main` merge.
- This frozen checkpoint branch should stay immutable; any further iteration goes to a distinct new development branch.
- No deletion, housing reorganisation or duplicate estate storage operations were performed to create this checkpoint.
- Exact receipts are carried in the FLAZ export ZIP, with temporary external copies for download, not persistent Library duplication.

**Ding scope:** Native renderer source integration, shader source recovery/inheritance, three driver-route simulated fallback, preserved JM Actual Engine, and 12-test GitHub CI success. **Hardware crown HOLD.**
