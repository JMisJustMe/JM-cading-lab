# Games&Beyond — The JM Games House v0.1A

> **One front door. Many sovereign game rooms.**

Games&Beyond is the editable host and navigation body for JM games, creator engines, reusable loops, benchmarks, recovery bodies and proof nodes.

It connects independent bodies without flattening them into one game or one source file.

## What works in v0.1A

- Phone-first House, Rooms, Edit, Proof and Routes surfaces.
- Registry of current games, engines, loops, benchmarks, host shelves and governance nodes.
- Batch import of standalone `.html` bodies through the browser file picker.
- Local persistence through IndexedDB.
- Mounted bodies open inside an isolated in-app room or a new browser window.
- Host-assisted route finding for body-native **Edit**, **Logic**, **Source** and **Proof** controls.
- Honest fallback when a mounted body does not expose a host-detectable route.
- Editable body passports: name, version, room, stage and role.
- Exact mounted HTML source editing.
- Recovery revisions and one-step/latest revision restore.
- Per-body export.
- Registry-only House export.
- Full local House export including mounted HTML and revisions.
- Receipt export.
- Offline-capable PWA shell.
- Capacitor/WebView Android source route.

## Mount workflow

1. Open `index.html` through GitHub Pages or a local web server.
2. Press **Mount HTML Bodies**.
3. Select one or many self-contained JM HTML bodies.
4. Games&Beyond matches known names and aliases to registered rooms.
5. Unknown bodies enter **Benchmarks & Recovery** with a passport-review status.
6. Open, edit, test or export the body from its own room.

A registered body never displays a fake Play door. Its Play/Edit/Source actions activate only when its HTML is present in the local House database.

## Editability contract

Every active mounted body must remain reachable through:

- Play/Open
- Direct Edit
- Logic/Route Edit where the body exposes it
- Source
- Test
- Save
- Undo/Recovery
- Export
- Receipt

Games&Beyond also exposes a host-level exact-source workbench, so a body can still be inspected, revised, tested and recovered even when its internal UI uses different terminology.

## Source and archive boundary

The browser database is a working mounted copy. It does not replace:

- exact historical source files;
- owner-controlled Zionfolders;
- body-specific source vaults;
- frozen benchmarks;
- full archives and receipts.

**CONNECT ≠ MERGE** and **MOUNTED ≠ SOURCE ERASED**.

## Android route

The folder contains:

- `package.json`
- `capacitor.config.json`
- `android-route.json`

From this directory, with Node and Android Studio installed:

```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```

The route is source-ready. A compiled, device-tested, signed or Play-Store-published APK is **not** claimed yet.

## Current registered rooms

### Playable Games

FOURFOLD, FUTARIZED, T-Boys Core Clash, Rim Route, Crewbound Arena, House Siege, Western Sniper PvP, Dead Reckon, Fight Clash Chameleon and cardBORED.

### Engines & Creator Hubs

GameForge, GlyphPlay, GlyphForge, JM Game Native Core, JM GameCore and PLAYFORM.

### Loops & Reusable Organs

Drag & Aim, Aiming Run and Combound.

### Benchmarks, Hosts and Governance

Quadze, JM Studios Host Shelf and the Loopit / GlyphPlay / GameForge Boundary rejoin node.

## Keeper laws

```text
PLAYABLE ≠ ENGINE
LOOP ≠ GAME
PROOF ≠ RELEASE
REGISTERED ≠ MOUNTED
CONNECT ≠ MERGE
RECOVER BEFORE REBUILD
NO DING, NO CLAIM
```
