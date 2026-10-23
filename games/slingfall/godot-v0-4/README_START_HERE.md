# JM SLINGFALL — SIEGE CIRCUIT v0.4

**Native Godot 4.7.x Android-first playable successor** of *SLINGFALL v0.3 Living Battlefield*. Preserve source and identity, extend rather than replace. No internet service, webview, external asset package or paid dependency required.

## Actual gameplay changes

1. **Four destructible cover structures** block *40%* of eligible incoming long-range non-Dart damage, consume their own finite HP, and eventually collapse into permanent rubble. Attackers can break them and receive salvage. Bulwark landings and siege pulses actively damage cover; Dart pierces cover. Tactics differ because ground defence can be removed.
2. **Actual crosswind ballistic drift** changes incoming launch position by 26 world units per side, including enemy arrivals. The touch aim arc displays the displaced landing and wind indicator. Drift travels with the projectile and is preserved in the schema-2 battle save.
3. **Ion Storm warning → strike → consequence.** Every five storm seconds one of the three capture zones receives a telegraphed 1.35-second blast: 16 raw damage and short stun to exposed heroes, plus 14 damage to fortifications. Players see its warning ring and have time to move or rethink deployments. No unannounced storm damage.
4. **Adaptive enemy intent** prioritises threatened capture zones and picks a counter-class when one is available, showing an unobtrusive enemy plan readout. It still respects real energy, active deployment slots and cooldowns.
5. **Visual feedback** updates the actual battlefield: structurally cracked barricades, cover health gauges, persistent rubble, ion strike warnings and arcs, drift-adjusted launch preview, HUD tactical state. Distinct champion animations and v0.3 portraits are retained.

## Preserved gameplay

The three unique heroes, their inherited energy costs and signatures, drag/tap-to-fling, original RIDGE/CROSSROADS/SUPPLY layout, enemy launches, automatic combat, zone score rules, score target (105), match length (140 seconds), bunker, salvage and upgrade levels are preserved. Original v0.1 HTML included byte-for-byte. Original source SHA-256: `b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62`.

**Save continuity:** project name intentionally remains `SLINGFALL — Field Ascent`, matching v0.2/v0.3 Godot `user://` residency. Profile/battle filenames and schema `version: 2` are unchanged. A saved v0.2 or v0.3 match gets additive `cover`, `ion_*` and `enemy_plan` fields on recovery. No automatic reset or wipe.

## Import on Android Godot

Download ZIP, use Godot Project Manager → Import, choose this ZIP → project opens with root `project.godot`. Hit ▶ to play. Landscape is preferred. Play with large bottom champion selections, press/touch drag or tap a field location to fling, use orders, rally (Level 2), recall and pause as before.

## Testing and claim ceiling

- Local inherited static suites: 30/30 and 20/20; new code-specific source checks 8/8. These tests **do not** establish actual Godot runtime.
- Native exact Godot 4.7.2 automated gameplay tests are provided in `tests/host_logic_test.gd` and `.github` CI. After a successful real runner, record an independent receipt with run URL, outcome and context.
- Android Fold visual quality, touch responsiveness, APK export and full production-readiness remain separate device acceptance boundaries. Do not claim them without evidence.

Ancestry and earlier v0.2/v0.3 FLAZ packages remain intact. This game workstream is distinct from the separate JM Target Bridge host compatibility work. Do not merge them merely because both can use Godot.

## Actual Godot Linux host proof — earned

**48/48 native gameplay assertions PASS, zero failures** on Godot **4.7.2 stable**, Ubuntu 24.04 GitHub Actions [run 39992770047](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/39992770047). Original 30 and successor 20 static checks plus eight v0.4 structural checks also pass. `tests/GODOT_NATIVE_RUNTIME_RECEIPT_v04.json` records exact scope and holds. First native pass uncovered a time-step ion-warning bypass; corrected source now guarantees warning before strike. This result proves real Linux/Godot gameplay-state execution, **not** Fold touch acceptance, Android APK, or visual polish. User device testing remains deferred. Keep this draft descendant of v0.3 PR #419 unmerged until appropriate acceptance.
