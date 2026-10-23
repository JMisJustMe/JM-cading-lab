# SLINGFALL — CONVOY FRONT v0.5

**Godot 4.7.2 / Android-first / offline / native GDScript.**

This is an independently preserved playable successor to v0.4 Siege Circuit, not a replacement or a web wrapper. It inherits the original 3 contested zones, Bulwark/Dart/Warden, drag-to-fling, autonomous opposing deployments, unique combat signatures, tactical cover, physical crosswinds, delayed ion strikes, bunker upgrades, and original schema-2 save paths/`project.godot` identity.

## Two actual match types

- **Classic Zone Siege** (inherited): capture Ridge, Crossroads and Supply to score 105 before your rival or timeout.
- **Convoy Extraction** (new): switch the **MISSION** selector on the title screen to CONVOY EXTRACTION, then DEPLOY. Move allied champions near the moving cargo vehicle; it requires an escort to advance. Rival fighters intercept, stop and damage it. Warden's field role repairs its hull. Escort through four physical route checkpoints for energy, salvage and a separate extraction victory. Win requires the vehicle alive at extraction; losing its hull or the time limit causes defeat, irrespective of capture score. Existing zones and combat still matter.

## Owner-device workflow

Godot Android editor → Import existing project from this ZIP (`project.godot` at ZIP root) → Play ▶ in landscape. Menu mission selector is above DEPLOY. Lower controls retain v0.4 positions. Drag or tap on the battlefield to deploy; landed blue champions automatically escort the cargo and red champions try to intercept it. Tap the cargo to order all live allies to escort; tap a capture zone to reassign them to defend territory. Classic mode remains the default. The convoy mode can be completed without any network connection.

## Source inheritance and boundaries

The literal earliest HTML source remains under `ancestry/SLINGFALL_v0_1_FIELD_CONTACT.html`, SHA-256 `b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62`. v0.2/v0.3/v0.4 project files remain separate. The `config/name` intentionally remains `SLINGFALL — Field Ascent` to preserve the Android Godot save identity. Existing schema-2 battles with no `operation` or `convoy` keys recover as Classic Siege. New mission fields are additive and remain persisted.

Tests: inherited Python static suites plus `tests/test_v05_source.py`, and real-Godot `tests/host_logic_test.gd` on CI. Results are only promoted to a host-specific PASS after Godot itself runs those tests. Owner Fold touch feel, complete visually witnessed convoy match, performance and Android APK remain HOLD until observed. Never infer Android acceptance from Linux headless CI.

## Real host acceptance (bounded)

Native Linux Godot 4.7.2 headless run **39999092319** passed **64/64 gameplay and control assertions**, with no failures. See `tests/GODOT_NATIVE_RUNTIME_RECEIPT_v05.json`. Classic Siege remains tested as inherited, new convoy gameplay and actual pointer input are tested as a separate bounded operation. This is not evidence that human-operated touch feel, visually rendered Android scene, APK export, or full game-balance have passed. Those remain HOLD.
