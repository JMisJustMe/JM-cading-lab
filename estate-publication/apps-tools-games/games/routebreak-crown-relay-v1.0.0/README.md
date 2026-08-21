# ROUTEBREAK: Crown Relay v1.0.0

**Body:** `JM.GAME.ROUTEBREAK.CROWN_RELAY`  
**Status:** First Playable Crown — source-published  
**Carrier:** HTML5 Canvas + JavaScript

## GitHub publication route

The Library keeper originally carried one 35 KB `src/game.js`. For readable GitHub custody, that exact source order has been split without behavioural rewriting into:

1. `src/game-core.js` — body specification, input, start and fighter update;
2. `src/game-simulation.js` — collisions, combat, abilities, recovery and scoring;
3. `src/game-render.js` — rendering, HUD, receipts, audio, touch and runtime gates.

`index.html` loads those files in the original order. The service worker caches the split source body.

## Modes

- **Crownfall:** three-stock ring-out battle. Damage increases knockback; the last surviving route-body wins.
- **Crown Relay:** carry the crown shard into your own gate. Contact forces a drop; first to five wins.

## Route-bodies

- **RUSH / BURST:** speed and route stealing.
- **BRACE / QUAKE:** mass, pressure and field denial.
- **ARC / BOLT:** range, angle and interruption.
- **SHIFT / BLINK:** position rewriting and recovery.

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move | A/D or arrows | Direction dock |
| Jump | W, Space or Up | Up |
| Strike | J | HIT |
| Route ability | K | POWER |
| Guard / parry | Hold L | GUARD |
| Dash / recovery | Shift | DASH |
| Pause | P or Escape | Pause button |
| TraceBox | Backquote or Trace | Trace button |

## Keeper proof inherited from the source package

- Runtime self-test gate: **24/24 PASS**
- Static/package QA: **42/42 PASS**
- Chromium desktop/mobile contact QA: **36/36 PASS**
- Tested mobile viewport: **390 × 844**, no horizontal/page overflow

## Boundary

The original Library ZIP and its receipts remain the package authority. This directory is the public readable source route. Binary proof screenshots and generated PNG icons were not copied through the text-only connector in this wave.
