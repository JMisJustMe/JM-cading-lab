# SLINGFALL v0.6 — BEACONFALL (JM Gaming Globe)

**Android-first native Godot 4 project. Third actual operation. Not a replacement.**

## Three playable missions

- **CLASSIC ZONE SIEGE:** original three-zone, first to score / time limit, champion flinging and automatic enemy deployment.
- **CONVOY EXTRACTION:** protect and escort actual moving cargo through four checkpoints; Warden repairs, attackers interdict and damage the cargo.
- **BEACON DEFENSE (new):** protect the signal core from **three successive multi-class assault waves** (1 Dart → 2 Warden+Dart → 3 Bulwark+Warden+Dart). Raiders physically strike and damage the core; Warden allies repair it, and owning Crossroads raises a finite damage-absorbing charge that opposing Warden raids can drain. Only cleared waves earn resupply and progression; destruction or timeout loses. Use the MISSION selector above DEPLOY to choose a mode.

## Visual and animation advances

Native GDScript battlefield searchlight sweeps and beacon architecture, moving role-sensitive gait and accessories, authentic floating damage values from post-armour loss, pulse rings, hit response and animated core damage/charge. Built-in portraits and prior authored battlefield survive. No external internet services.

## Controls

Same familiar selection and fling controls. Select a champion, tap/drag into the battlefield, rally or tap a zone to order a deployed champion. In BEACON mode, tap the signal core to direct deployed defenders to protect it. No mandatory new control layer. Existing v0.5 save/profile keys, `project.godot` identity, schema version 2 and sibling legacy files are retained. Older saves migrate with additive `beacon` fields.

## Source, status and evidence

The immutable original HTML ancestor stays in `ancestry/`, SHA-256 `b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62`. The v0.2–v0.5 Godot projects are predecessors; their proofs and hold boundaries carry forward at their exact scopes. Python structural tests do NOT equal Godot runtime; native gameplay must be separately checked. Android owner-device feel, APK, complete session balance, and rendered visual judgement remain **HOLD**, with no request for a phone test right now.

## Native verification completed

GitHub Actions [Godot 4.7.2 run 40001872726](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40001872726) completed successfully with **90/90 real native headless GDScript gameplay checks**, 0 failures. All inherited offline structural suites total **82/82 PASS**. `tests/GODOT_NATIVE_RUNTIME_RECEIPT_v06.json` is the scoped evidence card; it does not confer Android, visual quality, APK or whole-game production clearance. Source was corrected after an initial parse error, then wave two and three were expanded to multiple physically spawned raiders. The successful run is for the expanded final source. **No phone testing is requested.**
