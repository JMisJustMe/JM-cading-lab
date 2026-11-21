# JM GameCore × PlayZone — CP10 Mesh Bridge

Authority: Theodore Benjamin Scott / JMISJUSTME  
Operation gate: `JMOP-2ecbf4d767fce914f43bd0b6`

Additive ESM route only. It does not replace `coding-estate/sovereign-ten/direct/game-native.mjs`, JM Actual Engine, Game-CODING, GameCore or the existing PlayZone renderer.

Source-authored mesh lines → JMMeshCompiler → typed Float32/Uint16 buffers and metadata → JMPlayZoneAdapter → THREE.BufferGeometry and MeshStandardMaterial → caller's actual scene/render loop.

### Authoring grammar

- `v x y z` coordinates; `f i j k` zero-based triangle indices (not OBJ one-based)
- `color #RRGGBB` or `0xRRGGBB`
- `deform none|wave|pulse amp=0.15 freq=2`
- Unknown wrapper/extension lines ignored without ownership transfer.
- 65,536 vertices maximum (Uint16); invalid faces, nonfinite values and malformed recognized statements are rejected.

### Host contract

Import both modules, call `JMMeshCompiler.compile(source)`; pass IR to `new JMPlayZoneAdapter(THREE).createMesh(ir)`; add the returned mesh to the scene; call `adapter.update(timeSeconds)` during animation, `setDeformEnabled(false)` to reset, and `dispose()` on shutdown. Geometry is independently owned, old mesh detached and disposed on replacement, and normals/bounds refreshed when vertices move.

### Tests and limits

From repository root: `node --test tests/cp10-mesh-bridge.test.mjs`.

The 9-vertex / 14-triangle fixture is representative, not the exact GolemCore artifact observed on the owner's Fold. Node unit tests use a Three.js API test double: this tests headless parsing and bridge logic, **not** a real WebGL GPU render. Physical Fold rendering, GPU profiling, sustained 121 FPS, actual 1-draw-call batching, and native-game adoption for **this branch** remain HOLD until separately run and evidenced. An existing Fold screenshot's numbers cannot be transplanted as proof of this changed code.
