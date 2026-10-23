# JM Target Bridge / Godot first-contact proof card

**Goal**: Extend the frozen Target Bridge 2×2 physical proof with a new **Godot** recipient, using the SAME existing `SPINBREAK v0.8` source.

1. In Godot Android Project Manager, Import **`JM_TARGET_BRIDGE_GODOT_SPINBREAK_v0_2.zip`** (or import `godot/project.godot` if you extracted the ZIP).
2. Open and press ▶ to launch the scene. Landscape recommended.
3. Verify all labels load and initial meter reads spin 100 / stability 100 / integrity 100. **No Ding yet.**
4. **Hold RIGHT** until the turquoise spinner YOU touches coral RIVAL A. Observe both route and movement and collision marks in TRACE.
5. **Tap KIC once**; verify that it marks `signal.kic`, `kic.spin_cost` and spin falls exactly 4.2 from 100 to 95.8 (if done before WAKE).
6. **Tap WAKE once**; verify +16 stability (capped 100), +7 spin (capped 100), -3.5 integrity, and second WAKE has no effect.
7. With the nine events actually observed, expect **9/9 · BOUNDED GODOT CONTACT PASS** (not full game parity).
8. **Tap COPY** to put JSON receipt on Android clipboard; paste it back into this conversation. The project also saves it in Godot `user://JM_TARGET_BRIDGE_GODOT_RETURN_RECEIPT.json`.
9. Record screenshot and any errors. If any consequence is absent, mark BUGG/HOLD, not PASS.

Note: This intentionally tests only the previously-source-supported same bounded SPINBREAK semantic slice; it does not convert full SPINBREAK or inherit four earlier runtime Dings as Godot proof.

Owner-initiated test is optional and deferred. Native `tests/host_logic_test.gd` is an automated alternative on a machine with Godot installed.

**Proof freeze:** 14 offline tests pass. Native GDScript headless runner is authored but has not executed yet. Android owner acceptance deferred; no request to re-test.
