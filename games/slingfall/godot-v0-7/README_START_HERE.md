# SLINGFALL v0.7 — WORLD PULSE / JM Gaming Globe

**Native Godot 4 project. A real successor to the sealed v0.6 FLAZ.**

## New v0.7 behaviour

Across Classic Siege, Convoy Extraction and Beacon Defense, three sequential **physical SIGNAL DROPS** enter the playable world. The first drops after 12 seconds; subsequent stations rotate. They last 18 seconds and are won only when a team fields an *actual living non-airborne* champion within 70 world units and sustains control. Opponents contest progress—no automatic bonus. Capturing grants +16 deploy energy (capped), +2 salvage and 5 seconds of local ally shielding. Enemy captures grant the same resource consequence to the red side. The signals expire without reward if left unattended. Tap an active canister to redirect a ready deployed ally without accidentally launching another champion; normal sector, cargo and core orders remain.

**Production feel:** richer role-specific animated silhouettes, movement trails, support orbiters, illuminated arena pylons, physical signal beacons and feedback showing progress and TTL. Older three modes, timing, combat and save identity remain unchanged. This is an incremental 2D stylized presentation leap, not a claim of full 3D production art.

## Controls & inheritance

- Select Bulwark / Dart / Warden along the bottom, tap or drag to fling.
- Tap an active signal canister to order a deployed ally to retrieve it. Rival AI occasionally contests signal drops in Classic Siege.
- Existing touch zones, cargo-tap escort, beacon-tap defend, pause, bunker, rally and game outcomes are inherited.
- `project.godot` name and `user://slingfall_field_ascent_*` paths preserved. Save schema remains **2**, with additive `signal_pulse` and `pulse_recovered`. Original HTML ancestor is byte-for-byte intact.

## Verification boundary

Inherited v0.6 native source used as the foundation. Run `tests/qa_static.py`, `test_v03_source.py`, `test_v04_source.py`, `test_v05_source.py`, `test_v06_source.py`, `test_v07_source.py` and the actual Godot `tests/host_logic_test.gd`. Linux headless Godot runtime is separate from Android input/rendering proof. Samsung Fold touch, GPU performance, visual subjective quality and APK stay **HOLD** unless separately owner-tested. Existing frozen whole-line archive remains untouched. Repository branch/PR is a non-promoted descendant.


## Earned scoped native result (24 October 2026)

Godot **4.7.2 Linux headless** ran **104/104 gameplay checks, 0 failures**. The six inherited-plus-new Python source suites passed **97/97**. [Actual CI run 40039088424](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/40039088424). Evidence: `tests/GODOT_NATIVE_RUNTIME_RECEIPT_v07.json`. This proves bounded host gameplay, not Samsung Fold touch, actual device visuals, APK, or full cross-engine v0.7 parity. **Android HOLD; draft PR unmerged.** The GitHub source folder includes SVG portrait fallbacks; the downloadable ZIP additionally contains the original PNG portraits and complete package-specific hash manifest. Frozen v0.6 FLAZ untouched.
