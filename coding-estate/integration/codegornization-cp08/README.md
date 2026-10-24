# JM SLINGFALL CP8 — Rival Tactics (native additive candidate)

**An additive native Godot 4.5.2 child** of protected CP03 cancellation-repair head `59cd680825fa2072cbec3762fccd5323af319474` (draft PR #446). CP8 does not rewrite `Main.gd`, `ConductRecipient.gd` or `CP03Recipient.gd`. The existing input ownership, multi-touch cancellation, energy, three operations (SECTOR/CONVOY/BEACON), companion choreography, save identity and original champion combat are inherited.

CP8's **actual changed gameplay**: after the inherited rival spawn, a deterministic native tactical policy assigns distinct destinations and combat posture. Bulwark pressures defended zones and receives a short shield, Dart searches less defended territory and gains a brief speed burst, Warden routes toward wounded red allies with faster healing readiness. These are state-changing rival order/ability fields consumed by inherited native combat, not marketing labels. SECTOR alone gets the new choices; CONVOY/BEACON preserve their native specialist logic.

## Build from repo root
```bash
node coding-estate/integration/codegornization-cp08/prepare-native.mjs
```
Open `coding-estate/integration/codegornization-cp08/godot/project.godot` in Godot 4.5.2. Test using `--headless --path godot --script res://tests/cp08_tactics_test.gd` from the CP08 folder. CP8 extends a **generated** ancestor copy; repo directory intentionally contains only additive CP8 source files plus preparation script.

## Proof boundaries
One native test program covers 12 stated checks: three role-specific decisions, unsupported/empty cases, determinism, purity, actual sector rival spawn/order/HUD, CP03 inherited touch route and untouched BEACON raider logic. GitHub CI results and actual Godot run must be read before claiming PASS. No Android APK, physical Samsung launch or Gemini code review claim is earned merely by committing files. New CP8 APK/debug signing must be verified separately. The public Build Mesh remains read-only and does not send tasks to Gemini by itself.

**CHANGE THE PLUG, NOT THE BODY · INTEGRATION ≠ REPLACEMENT · NO DING, NO CLAIM**
