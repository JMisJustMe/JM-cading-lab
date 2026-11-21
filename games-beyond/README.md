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

## CP18 · restored local HTML game import (5 November 2026)

The existing House's older **Mount HTML Bodies** feature is restored in the current proof/recovery room as **IMPORT ORIGINAL HTML (LOCAL)**. Choose a downloaded self-contained `.html` game from the owner device. The House verifies the local text encoding and SHA-256, then uses its existing atomic House import and IndexedDB; the game opens in the existing iframe. No source HTML is sent to public GitHub or the server, and original Drive/Library files are left untouched.

- **COMBOUND Original v3.7.11 CP17:** the pinned original SHA-256 `3b5b791c15ea82e6e240b55d690b6e034bbc6f61ce0143c6a9fb0156326ce242` is checked before it is mounted as `combound-original-v3-7-11-cp17`. This is a separate local candidate from the built-in COMBOUND v0.7. After importing in the *same browser*, the local deep link is `?jm-play=combound-original-v3-7-11-cp17`.
- **Protected JM Studios:** the original pair still requires its dedicated exact-proof House JSON import. Direct HTML import refuses those protected source identities.
- **Unknown owner HTML:** imported under a separate hash-derived `owner-*` ID, not rewritten into an existing public game or automatic new authority. A repeated identical import reopens the mounted source instead of copying it again; a conflicting same-ID source is held.
- The previous **IMPORT ECO/ESTATE FULL HOUSE** JSON workflow stays available, including protected originals and owner local recovery. No game/engine is rebundled or republished.

Owner Fold8 HTML selection/import and deep gameplay remain a physical-owner acceptance gate. Browser syntax and source-level preflight alone are not device acceptance.

## CP19 — Owner phone-only COMBOUND original contact (5 Nov 2026)

The existing **Proof & Recovery** room includes **CONNECT COMBOUND CP17 FROM THIS PHONE**. This is an optional, explicitly user-triggered shortcut to the authentic CP17 source already present in the owner's Fold8 Downloads. It contacts the owner's existing read-only Termux bridge on `127.0.0.1:8877`, compares exact length and SHA-256, then calls the *same existing* HTML import code and IndexedDB transaction as the file-picker route. On success it opens the local game inside the House. It never copies or publishes the original source to GitHub, Drive or a remote server.

The bridge is bound to loopback and only permits the published Games House browser origin (`https://jmisjustme.github.io`) through CORS; it rejects other browser origins. Modern Chrome can require an explicit **loopback network permission** for an HTTPS page to read the phone's local bridge. Permission is not bypassed or automatically granted. If the bridge is stopped, browser blocks local access, or original bytes change, the import fails closed, leaving the existing **IMPORT ORIGINAL HTML (LOCAL)** file-picker fallback intact. Exact owner-source hash: `3b5b791c15ea82e6e240b55d690b6e034bbc6f61ce0143c6a9fb0156326ce242`, 1,277,449 bytes.

No implicit current-crown promotion: built-in public COMBOUND v0.7 remains mounted; CP17 is a separate private locally mounted candidate. Cross-browser physical Fold8 acceptance of the new permission and button remains open until the owner observes it. The direct local game door `http://127.0.0.1:8876/index.html` is an independent proven fallback.

## CP26 · The complete game-system entrance (21 November 2026)

The **existing** Games & Beyond House and native Windows EngineDoor remain the entrance; this is not a replacement game engine, publisher, or duplicate custody vault.

- **GAMES:** Keep the 143 rendered catalogue records; group additional owner-local same-title source contacts for browsing without asserting that they are one game identity.
- **PLAYABLE LOOPS:** Show 10 source-known public loop leads, with direct original House Play/Edit routes only where the mounted body is registered. A mechanism is not automatically a completed game.
- **GAME ENGINES:** Show 10 independent engine families. Original six publicly mounted engine/creator rooms expose separate Play/Use and Create/Edit entrance links, both failing closed if the authentic body is not mounted.
- **VERSIONS / CARTRIDGES:** RouteOS first-party cartridges keep their own selections; original source editions stay versioned and do not auto-promote to current keeper.
- **SOURCE / EVIDENCE:** The browser can *locally* import three existing JSON inventories without uploading them to this public repository: CP12 Windows roster (438 public-safe source-title seats), CP24 original HTML edition manifest (40 source families / 81 distinct edition files), and the separately prepared private CP26 owner A–Z source index (406 headings / 14 donor records / 83 donor-associated loop records). These overlap. Importing is source-contact navigation only, never a completed-game count, Play acceptance or a transfer of source authority.

**Private source location:** `C:\Users\theod\Documents\JM_ECOSTATE\GamesBeyond\EngineDoor` remains owner-local. Its unchanged `START_JM_GAMES.cmd` opens the existing Windows House, which already has the 450-seat Games / Loops / Engines / Beyond / Holds / All source roster plus original version cartridges. The website does not ingest those files automatically; select each owner's existing JSON through the local file picker, not public GitHub.

**Proof:** Original Windows host audit-only 21 November exit code 0, showing CP12 438 roster seats and 65 new CP24 version-cartridge bindings (56 browser-booted and 9 holds; prior editions were reused). Independent bounded CP26 Microsoft Edge 390×844 headless local-loopback test: 21/21 assertions PASS, including CP12 and CP24 imports, Play/Edit link presence, local persistence, no page JavaScript errors and no external requests. Test receipt and review files remain in an owner-local disposable `EngineDoor\WorkingEditions\CP26_GAMES_BEYOND_CATALOGUE_PROBE` folder. The local browser test is **not** GitHub Pages deployment, a full campaign/playthrough, physical Fold8 acceptance, owner acceptance or source writeback.

**Custody gate:** Never publish the owner-private JSON, game/engine source versions, original Windows paths or family-only creations to the public GitHub repository. The existing independent original source houses remain authoritative. No automatic merge or release.
