# Games&Beyond — Live House Route Reconciliation — 20 September 2026

**Trigger:** Owner-device screenshot showed the canonical public Games&Beyond House still presenting the older Whole-Estate House v0.7 / 22-mounted / 24-full route state, including FOURFOLD Arena v0.17 in Rooms.

## Diagnosed seam

The live public House is:
`games-beyond/index.html`

The earlier September correction had updated:
`games-beyond/all-games.html`

The House service worker then injected v0.6/v0.7/v0.8 modules into the root House. As a result, the source catalogue and the actual public House were two separate surfaces.

## Correction applied

- `games-beyond/index.html` now explicitly separates **Mounted Rooms** from the **Whole Current Games Catalogue**.
- A direct **WHOLE GAMES CATALOGUE** route was added to the House hero.
- The Rooms copy now states that Rooms are mounted exact carriers, not the whole census.
- `whole-estate-current-catalogue-v1.js` mounts/replaces the House CATALOGUE tab with the census-driven current Games Estate.
- The current catalogue contains **71 visible Estate records** at this reconciliation pass. This is not claimed as 71 unique sovereign games.
- `sw.js` cache revision advanced to `games-beyond-v0-9-whole-estate-current-r1`.
- The service worker now applies House-document injection only to the House root/index instead of every Games&Beyond navigation.
- `all-games.html` and this reconciliation receipt are precached.
- A one-time service-worker update/reload hook was added so an owner device controlled by the older worker can cross to the corrected route.
- The stale v0.7 public label was retired in favor of **Whole-Estate House · Mounted Rooms + Current Catalogue**.

## Boundary

**MOUNTED ROOM ≠ ALL KNOWN GAME.**

A Room means an exact carrier is mounted into the public House workbench. The Catalogue may lawfully show current heads, private/unmounted bodies, families, HOLDs and playable proof loops without falsely claiming that every one is mounted, public, downloadable or release-crowned.

## Static source verification

- `whole-estate-current-catalogue-v1.js` — syntax PASS.
- `sw.js` — syntax PASS.
- `routeos-v0-7-label.js` — syntax PASS.
- current `all-games.html` record count — 71 visible records.

## Owner-device deployment gate

External Pages contact must still be confirmed on the owner's device. Source correction and service-worker migration route are committed; public edge/device Ding is not fabricated before the owner sees the corrected House.

## Keeper

**ROOMS HOLD THE MOUNTED BODIES. CATALOGUE HOLDS THE WHOLE KNOWN GAME ESTATE.**
