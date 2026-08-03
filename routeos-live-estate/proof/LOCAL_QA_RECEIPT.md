# RouteOS Five Crowns Live Estate v2.0A — Local QA Receipt

## Frozen parent

- `110909c7199bcfbd7007ed56437d05a8aea5967b`
- `anchor/routeos-kernel-jm-native-v1-9a-orchestrationroute-ding-pass`

## Deterministic checks

- `node --check app/src/main/assets/core.js` — PASS
- `node --check app/src/main/assets/app.js` — PASS
- `node tools/test_simulation.js` — PASS
  - safe five-crown route completed in 18 moves;
  - future crown rejected out of order;
  - deliberate fault counted once;
  - RecoveryBody returned to the last mounted crown;
  - mounted progress survived recovery;
  - complete route reached the permanent anchor;
  - saved state restored.
- `python3 tools/verify_live_estate.py` — PASS
  - ten authority files present and non-empty;
  - exact package, deep-link scheme and host verified;
  - no Android internet permission;
  - offline HTML assets only;
  - all five crown identities and freeze heads present;
  - Compass return bridge present;
  - responsive and reduced-motion contracts present.

## Browser QA

Fallback reason: no interactive Browser connector was available in this build environment, so Playwright drove system Chromium directly against an in-memory assembled version of the offline cartridge.

Checked viewports:

- desktop: `1440 × 1000`;
- mobile: `430 × 900`.

Verified:

1. the library first viewport keeps one clear action and the five-crown route visible;
2. the play surface renders the grid, player, five crowns, hazards, walls and anchor;
3. keyboard and touch/D-pad controls update real simulation state;
4. the mobile control deck leaves the player and first crown visible;
5. crown order, TraceBox, proof navigation and responsive panels remain legible;
6. no remote script, stylesheet, image or font dependency is required.

## Android boundary

The local environment does not carry Gradle or the Android SDK. The release APK build, APK package inspection, zip alignment, checksum receipt and artifact upload are therefore delegated to the repository workflow and are not claimed here yet.
