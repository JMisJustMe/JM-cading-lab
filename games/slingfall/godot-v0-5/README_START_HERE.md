# SLINGFALL — CONVOY FRONT v0.5

**Godot 4.7.2 / Android-first / offline / native GDScript.**

This is an independently preserved playable successor to v0.4 Siege Circuit, not a replacement or a web wrapper. It inherits the original 3 contested zones, Bulwark/Dart/Warden, drag-to-fling, autonomous opposing deployments, unique combat signatures, tactical cover, physical crosswinds, delayed ion strikes, bunker upgrades, and original schema-2 save paths/`project.godot` identity.

## Two actual match types

- **Classic Zone Siege** (inherited): capture Ridge, Crossroads and Supply to score 105 before your rival or timeout.
- **Convoy Extraction** (new): switch the **MISSION** selector on the title screen to CONVOY EXTRACTION, then DEPLOY. Move allied champions near the moving cargo vehicle; it requires an escort to advance. Rival fighters intercept, stop and damage it. Warden's field role repairs its hull. Escort through four physical route checkpoints for energy, salvage and a separate extraction victory. Win requires the vehicle alive at extraction; losing its hull or the time limit causes defeat, irrespective of capture score. Existing zones and combat still matter.

## Owner-device workflow

Godot Android editor → Import existing project from this ZIP (`project.godot` at ZIP root) → Play ▶ in landscape. Menu mission selector is above DEPLOY. Lower controls retain v0.4 positions. Drag or tap on the battlefield to deploy; when a champion is already out, order them toward the moving convoy by tapping the appropriate contested area/zone. Classic mode remains the default. The convoy mode can be completed without any network connection.

## Source inheritance and boundaries

The literal earliest HTML source remains under `ancestry/SLINGFALL_v0_1_FIELD_CONTACT.html`, SHA-256 `b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62`. v0.2/v0.3/v0.4 project files remain separate. The `config/name` intentionally remains `SLINGFALL — Field Ascent` to preserve the Android Godot save identity. Existing schema-2 battles with no `operation` or `convoy` keys recover as Classic Siege. New mission fields are additive and remain persisted.

Tests: inherited Python static suites plus `tests/test_v05_source.py`, and real-Godot `tests/host_logic_test.gd` on CI. Results are only promoted to a host-specific PASS after Godot itself runs those tests. Owner Fold touch feel, complete visually witnessed convoy match, performance and Android APK remain HOLD until observed. Never infer Android acceptance from Linux headless CI.
