# SLINGFALL — Living Battlefield v0.3

**JM Native Godot 4 branch · Android-first · Offline · inherits Field Ascent v0.2**

This is a **playable whole-game successor** of the native SLINGFALL v0.2 project, not a SPINBREAK Target Bridge contact harness. The original `SLINGFALL_v0_1_FIELD_CONTACT.html` remains byte-exact in `ancestry/`; v0.2 source and mechanics are inherited in `Main.gd` and the existing sprite/art resources. The v0.2 file is preserved independently in its earlier ZIP; this archive is a separate successor.

## Play on the Galaxy Fold using Godot

1. Extract/import this ZIP in Godot's Project Manager (or select `project.godot` in the extracted project folder).
2. Set your phone to landscape and press **Play**.
3. **DEPLOY** → choose a hero portrait → tap or drag into the contested field to fling.
4. Capture **RIDGE**, **CROSSROADS** or **SUPPLY**. Once a champion is active, tap a different zone to give its movement order.
5. RECALL retrieves the selected champion. Bunker still unlocks **Squad Rally** at level 2 and the **-4 energy launch cost** at level 3.
6. Pause / home / exit and later **RESUME MATCH** for ongoing state. Local battle and profile names were deliberately kept compatible with v0.2.

## Real game-system additions (not menu-only)

- **Bulwark**: heavy armour reduces received damage; landing makes a timed rupture crater that slows opposing troops; every third hit releases a radius-damage siege pulse and short stun.
- **Dart**: fast landing capture remains; every third hit triggers Razor Rush, repositioning the unit and dealing a separate high-impact strike.
- **Warden**: existing landing shield/heal retained; now heals injured teammates opportunistically and every third hit triggers a restoration wave with shielding plus offensive effect. Longer effective attack reach.
- **Three distinct sectors** retain original capture and score numbers. The **SUPPLY** sector additionally sends +4 energy to its holding team every three seconds.
- **Living field**: weather cycles CLEAR → CROSSWIND → ION STORM according to match time; weather has unique animated field rendering. Impact scars persist temporarily and influence tactical movement.
- **Battle signatures**: new distinct hit effects, animated signature gauges, terrain rings, role-specific attack poses, and post-match signature and salvage counts. Eliminations earn recoverable salvage bonuses.

## Inherited mechanics and constraints

The original three-role launch costs, health pools, 105 score victory threshold, 140-second match, capture power, three-zone geometry, launch physics, recall, opposing AI, bunker costs, level 3 -4 cost, menu/result/screens and base save keys are preserved. This is a gameplay extension, not a replacement. The project deliberately retains the v0.2 `config/name` so Godot can find the original `user://` directory. **Saving uses the v0.2 schema version `2`** and migrates older matches by adding missing v0.3 fields on resume.

## Proof and acceptance

- `tests/qa_static.py` — inherited 30 parity/infrastructure checks.
- `tests/test_v03_source.py` — additional 20 gameplay/source contract checks.
- `tests/host_logic_test.gd` — native headless Godot gameplay regression harness. It launches, lands, damages, signatures, captures, saves, migrates old saves and finishes a match. This is the best available host automation, not device acceptance.
- `tests/DEVICE_TEST_CARD.md` — practical owner acceptance, intentionally optional now.

**Scope boundary:** A successful headless test demonstrates native Godot GDScript execution, not touch quality, phone frame rate, production graphics parity, or an Android APK. Existing Unity/GDevelop Target Bridge v1.1 proof remains separate and untouched.

Creative source authority: JM / JMISJUSTME. Inherit before rebuild; preserve proven working experiences.
