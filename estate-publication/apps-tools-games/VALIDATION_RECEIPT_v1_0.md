# Apps / Tools / Games Publication Validation Receipt v1.0

**Branch:** `agent/estate-apps-games-publication-wave-1`  
**Repository:** `JMisJustMe/JM-cading-lab`  
**Date:** 2 August 2026

## Source-complete bodies

### TraceBox / RouteBox v5.7R

- JavaScript syntax: PASS
- Service-worker syntax: PASS
- `DATA_MODEL.json`: valid JSON
- `VERSION.json`: valid JSON
- `manifest.webmanifest`: valid JSON
- Required source/PWA assets present: PASS
- Published status: **SOURCE COMPLETE**

### JM Verballage v0.1

- Browser JavaScript syntax: PASS
- C carrier compiled with `gcc -std=c11 -Wall -Wextra -pedantic`: PASS
- C demonstration emitted valid JSON: PASS
- Browser source, PWA organs, seed village and C carrier published
- Published status: **SOURCE COMPLETE**

### ROUTEBREAK: Crown Relay v1.0.0

The original `src/game.js` was separated only at top-level function boundaries:

1. lines 1–271 → `game-core.js`
2. lines 272–418 → `game-simulation.js`
3. lines 419–end → `game-render.js`

Validation:

- `node --check game-core.js`: PASS
- `node --check game-simulation.js`: PASS
- `node --check game-render.js`: PASS
- concatenation in browser load order equals original `src/game.js` byte-for-byte: PASS
- PWA source list updated to the three readable limbs
- Published status: **SOURCE COMPLETE — READABLE SPLIT, ROUND-TRIP PROVEN**

## Source-partial body

### JM3232 Navigator Browser Bridge v0.1

- Published Python modules compile: PASS
- Published: architecture, README, governed bridge core, MCP server and dependencies
- Not published in this wave: multi-megabyte restored search index, lexicon, source-authority HTML bodies, proof images and full widget/data package
- Running `server.py` from the public branch alone is therefore not claimed
- Published status: **SOURCE PARTIAL — DATA CORPUS RETAINED IN LIBRARY KEEPER**

## Package register

- Exact public-safe Library packages hashed: **22**
- Combined registered ZIP size: **22,002,895 bytes**
- Private/keystore packages excluded from public payloads
- Oversized archive routed to Releases/LFS/split-assets requirement

## Claim boundary

**DING:** authenticated source commits, registers, crosswalk and validation receipt exist on GitHub.

**NO DING:** not every registered Library ZIP byte has been copied into the repository. The connector is text-oriented; large/binary bodies remain registered by exact hash until an appropriate binary route is used.
