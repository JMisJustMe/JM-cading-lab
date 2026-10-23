# SLINGFALL v0.6 — BEACONFALL (JM Gaming Globe)

**Android-first native Godot 4 project. Third actual operation. Not a replacement.**

## Three playable missions

- **CLASSIC ZONE SIEGE:** original three-zone, first to score / time limit, champion flinging and automatic enemy deployment.
- **CONVOY EXTRACTION:** protect and escort actual moving cargo through four checkpoints; Warden repairs, attackers interdict and damage the cargo.
- **BEACON DEFENSE (new):** protect the signal core from **three successive class-specific assault waves** (Dart → Warden → Bulwark). Raiders physically strike and damage the core; Warden allies repair it, and owning Crossroads raises a finite damage-absorbing charge that opposing Warden raids can drain. Only cleared waves earn resupply and progression; destruction or timeout loses. Use the MISSION selector above DEPLOY to choose a mode.

## Visual and animation advances

Native GDScript battlefield searchlight sweeps and beacon architecture, moving role-sensitive gait and accessories, authentic floating damage values from post-armour loss, pulse rings, hit response and animated core damage/charge. Built-in portraits and prior authored battlefield survive. No external internet services.

## Controls

Same familiar selection and fling controls. Select a champion, tap/drag into the battlefield, rally or tap a zone to order a deployed champion. In BEACON mode, tap the signal core to direct deployed defenders to protect it. No mandatory new control layer. Existing v0.5 save/profile keys, `project.godot` identity, schema version 2 and sibling legacy files are retained. Older saves migrate with additive `beacon` fields.

## Source, status and evidence

The immutable original HTML ancestor stays in `ancestry/`, SHA-256 `b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62`. The v0.2–v0.5 Godot projects are predecessors; their proofs and hold boundaries carry forward at their exact scopes. Python structural tests do NOT equal Godot runtime; native gameplay must be separately checked. Android owner-device feel, APK, complete session balance, and rendered visual judgement remain **HOLD**, with no request for a phone test right now.
