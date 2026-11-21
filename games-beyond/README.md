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

**Private source location:** The owner's existing local `GamesBeyond/EngineDoor` folder remains owner-local; its absolute device path is deliberately withheld from this public repository. Its unchanged `START_JM_GAMES.cmd` opens the existing Windows House, which already has the 450-seat Games / Loops / Engines / Beyond / Holds / All source roster plus original version cartridges. The website does not ingest those files automatically; select each owner's existing JSON through the local file picker, not public GitHub.

**Proof:** Original Windows host audit-only 21 November exit code 0, showing CP12 438 roster seats and 65 new CP24 version-cartridge bindings (56 browser-booted and 9 holds; prior editions were reused). Independent bounded CP26 Microsoft Edge 390×844 headless local-loopback test: 21/21 assertions PASS, including CP12 and CP24 imports, Play/Edit link presence, local persistence, no page JavaScript errors and no external requests. Test receipt and review files remain in a disposable owner-local WorkingEditions review folder. The local browser test is **not** GitHub Pages deployment, a full campaign/playthrough, physical Fold8 acceptance, owner acceptance or source writeback.

**Custody gate:** Never publish the owner-private JSON, game/engine source versions, original Windows paths or family-only creations to the public GitHub repository. The existing independent original source houses remain authoritative. No automatic merge or release.


## CP28 — One private index, one Games House entrance (21 November 2026)

The owner-local existing **GroundZeroJM GamesBeyond/EngineDoor** now has one import-ready
\`JM.GamesBeyondOwnerSourcePack/1.0\` file compiled from the preserved CP12 and CP24
source registers. This is **metadata**, not a new game host or copies of original HTML.

- 438 CP12 historical source seats + 40 CP24 exact-version source families = **478 traceable records**; some refer to the same creative lineage, so these are **not** 478 independent games.
- CP24 retains **81 separately hashed HTML editions** as references, without publishing them.
- **48 engine-source references** and **23 loop-source references** include possible overlapping donor relationships. No source-only reference is labelled a playable launch.
- The original public catalogue still displays **143** reviewed records; further source seats appear after owner-local import and are not silently uploaded to this public repository.

To use it in the existing House, open **Games&Beyond → CATALOGUE → SOURCE / EVIDENCE → IMPORT OWNER SOURCE INDEX · LOCAL** and select the **CP28 all-games/loops/engines private owner-import JSON** already generated in your original EngineDoor folder. The owner index remains in that browser profile's local storage; a different browser or physical phone requires its own approved file selection. Do not upload the private JSON to public GitHub or a website.

Verification: original source roster SHA-256 and owner pack SHA-256 recorded in the private CP28 receipt; **24/24 bounded Microsoft Edge mobile-emulation checks PASS** at 390×844 against the review-branch catalogue. Checked five touch-selected lanes, local import, indexed results, on-demand pagination, filtering, browser-profile reload/persistence and absence of page JavaScript errors / outbound browser requests. **Not** a full gameplay audit, CI approval, deployed-site proof or owner Fold8 acceptance. This change is in a protected draft PR and is **not** merged.


## CP29 — Historical M002 gap reconciliation (21 November 2026)

Owner-private M002 history (2,264 **registered identities, not 2,264 software files**) was cross-checked with the existing CP28 478-source-record importer. **341** historical GAME / GAME ENGINE-category entries were checked; **323** title matches were already represented, and 18 exact-title differences were preserved as follows:

- **17** engine/archive title references were added as **source evidence only**, not new verified engines or release authority.
- **One private family-related game lead remains protected in its original source register**. It is **not** included in the general House importer or published here.

The resulting owner-only single-import index has **495 evidence/source rows**; it preserves the CP12 438 seats, CP24 40 version families, 81 source edition references, and their original associations. **495 is not a count of finished games or independent systems.** The earlier CP28 index and the M002 register remain intact as independent sources.

GroundZeroJM private output: \`Documents\JM_ECOSTATE\GamesBeyond\EngineDoor\CP29_OWNER_ONE_IMPORT_GAMES_LOOPS_ENGINES_PRIVATE.json\`. It is an owner-local file, never a GitHub asset. Import it via existing **CATALOGUE → SOURCE / EVIDENCE → IMPORT OWNER SOURCE INDEX · LOCAL** when the reviewed House changes have been made available by the owner-approved release process.

CP29 owner-only QA: **24/24 PASS** in the same bounded Edge 390×844 local mobile-emulation harness, including source import, five touch navigation lanes, search, on-demand pagination, persistence after reload, and absence of JS errors/outbound browser requests. The exact test and receipts remain privately on GroundZeroJM. Physical device, public deployment, individual full gameplay and release acceptance remain separate unpassed gates.

## CP30 — Typed original player doors (21 November 2026)

Games, Playable Loops and Source/Evidence now expose **existing original CP12-linked Play/Edit/HTML routes** from the owner-imported metadata without publishing original game files or inventing carriers.

- **11** source-linked mounted House records can show OPEN EXISTING HOUSE MOUNT and a distinct CREATE / EDIT MOUNTED SOURCE entrance when an explicit original jm-edit route is present.
- **13** records have existing linked HTML pages without gameplay acceptance: show INSPECT LINKED HTML CANDIDATE rather than claiming a tested game launch. No invented Edit link.
- **414** remaining CP12 source seats have no verified public executable carrier and therefore show the local import/source hold rather than a clickable fake Play button.
- Other original CP24 version families and M002 historical leads remain independently recorded as versions/source evidence; they are not automatically published or counted as extra games.

The **single private owner import** for CP30 is already on GroundZeroJM at `Documents\JM_ECOSTATE\GamesBeyond\EngineDoor\CP30_GAMES_BEYOND_ONE_OWNER_INDEX_WITH_TYPED_ROUTES_PRIVATE.json`.
It carries forward the full CP29 495-source-record body and adds only typed public route evidence derived from CP12. CP29 and CP12 remain unchanged. Do not commit this JSON to a public repo.

**Verification:** 30/30 bounded Edge mobile emulation checks PASS at 390×844, covering five lanes, actual emulated touch activation, owner-local index import and persistence, pagination/search, exact House Play/Edit link rendering, source-only candidate labelling, no fake door for a held title, and no observed JS errors or outbound browser requests. A fresh HTTP HEAD sweep returned **200 for all 21 distinct known public URLs** referenced by the 24 CP12 route records. HTTP 200 is only connectivity, **not** proof of game controls, gameplay, correct version or physical-device acceptance. The public site is not changed until the protected draft is separately approved for release.

## CP31 — Physical OPPO Chrome width correction (21 November 2026)

A **real OPPO CPH2305 running Android Chrome 157** was contacted via GroundZeroJM's existing approved ADB Wi-Fi and Chrome debugging access, using a disposable laptop localhost preview of this review-branch catalogue. No owner-private source index was served to the device, no new game was installed and no public release was made.

- Initial actual Android viewport: **360 CSS px**, with **691px page scrollWidth**; the catalogue was horizontally overflowing. Desktop headless emulation had not caught the original flaw.
- Existing catalogue CSS repaired in-place on the protected review branch, constraining its nested card-grid tracks and child flex/text widths, preserving independent game identities and entries.
- Real OPPO Chrome re-inspection after repair: **360 CSS px viewport / 360px document scrollWidth**. The filter buttons remain a separate intentional horizontal scroll region.
- Post-fix GroundZeroJM local Edge 390×844 regression: **30/30 bounded Play/Edit/source-index/navigation checks PASS**, no reported page JS errors.
- The actual-device synthetic-touch attempt was **NOT accepted**: normal Playwright tap was unavailable in the attached Chrome context, and a later low-level touch attempt hung while the OPPO was dozing. The test process was stopped; its temporary ADB reverse mapping, Chrome debugging forward and test tab were removed without touching pre-existing device bridges or the user's other tabs.

**Scope:** physical OPPO Chrome layout DOM PASS, not a complete gameplay run, physical finger-touch acceptance, native installed app, Fold8 verification or public GitHub Pages proof. All original source/game files, private indexes and version ancestry were preserved.

## CP32 — All games, not 24: correct the default native House view

The **24** from CP30 measures *public route references only* (11 exact linked House mounts + 13 linked HTML candidates). It has never measured the whole JM collection. No games were deleted or excluded to reach 24.

Existing GroundZeroJM original `GamesBeyond/EngineDoor` already draws from the 438 source-seat register; its source register has **212 distinct records tagged GAMES (165), ENGINES (33), or LOOPS (18)** without multi-tag double counting.

The **actual original native Windows category/action audit** after load confirms **ALL 467**, **GAMES 178**, **ENGINES 47**, **LOOPS 24**, **BEYOND 231**, **HOLDS 196** in its role filters. These are overlapping source/native/version/hold entries, **not 467 independent playable games**. Windows CP12 audit also passed native Play/Edit route tests and rejected false Play/Edit for source-only entries.

CP32 safely repaired that **same original Windows Engine Door in place**, not a parallel House: `ALL` is now the default and first selector option; the visible counter is calculated from the real native source array, and the explanatory text states that public links are only some of the doors. Source changes were hash-guarded and backed up privately to `SourceIndexSnapshots/CP32_BEFORE_ALL_DEFAULT` in the original EngineDoor. Original game HTML, engines, edition lineage and custody unchanged.

Both edited PowerShell scripts parse cleanly. The same headless Windows WPF category/Play/Edit audit finished `CP12_WHOLE_CATEGORY_LANES_PASS` and `CP07_AUDIT_READY` after CP32, without opening an owner-facing duplicate window or claiming physical Fold8 use.

The browser House public catalogue (currently 143 public source-array rows) remains a **public-facing subset**; the owner-only local index has 495 source/evidence rows and is not published. This preserves independent original creations and privacy rather than exposing their archive merely to claim a higher number. PR remains unmerged.

## CP33–36 — Owner-first complete House, offline Android receipt (21 November 2026)

**The 24 public Play-link records are not the Games & Beyond collection size.** Independently checked owner-supplied initial 95-game list has 95/95 exact matches in the existing 143-entry public catalogue. The recovered original CP12 source register has 212 different identities in its Games/Engines/Loops typed union, and the original Windows native House shows 467 entries in its ALL role, including native/cartridge additions. Categories are overlapping; none of those counts proves every game completed or released.

An additive **owner-local** adapter now reuses the EXISTING browser `all-games.html`, EXISTING owner JSON importer and EXISTING CP27 localhost working-game host; it does not create a replacement Games House or move original game code. The private 495-source/evidence index auto-loads under a 127.0.0.1-only owner route, without manual file selection or a public URL. Original WPF Engine Door now has an 'OPEN COMPLETE OWNER HOUSE · ALL' button, reusing its original managed game-host lifecycle; public House button remains independent. The owner-specific source index and HTML snapshot remain outside the public Git repository.

**Verified runtime:** CP33 original browser House + owner-index autoload passed **24/24** local Edge checks; CP34 original native WPF owner-control audit PASS, original native CP12 role/Play/Edit audit PASS (ALL 467, Games 178, Engines 47, Loops 24), with PowerShell syntax PASS. A protected self-contained OFFLINE owner HTML derived from the original page, source JavaScript and private metadata passed **19/19** local Edge file-protocol tests without network.

The single offline owner HTML was copied onto the OPPO and Fold8 owner devices, each byte-identical to the private Windows build (SHA-256 verified). On **actual OPPO Android Chrome**, the `content://` offline file opened successfully, 495 sources auto-loaded, the original 143 public catalogue rows remained, search and Games/Loops/Engines/Versions/Source UI responded, and **20/20 real-device Chrome DOM-automation checks PASS** at 360px wide with no horizontal document overflow. This is actual Android Chrome DOM interaction, NOT a physical-owner finger-touch or complete gameplay pass. Fold8 *file custody/hash* was verified; Fold8 browser use is still a separate hold.

No family-only original was published. No original game/engine HTML modified, no public release or Play Store upload, no draft merge, no game executables bundled into the metadata HTML. Public Play/Edit route links still need connectivity and per-game gameplay/owner acceptance. All original custody and separate versions remain protected. The ephemeral test server, port forwarding and test tunnels were stopped after verification.

## CP37–38 — Fold8 device check and corrected whole-estate totals (21 November 2026)

The 24 CP12 linked public game/HTML routes are not the total estate. **Source-based House summary now reports** exactly **95 game-labelled rows in the 143-row public catalogue**, plus **180 game-source seats, 48 engine-source seats, 23 loop-source seats and 495 owner source records** when the owner-local index is loaded. These are evidence/edition roles, not additive counts of distinct finished games; original same-title contacts overlap. Source integrity and private original custody remain unchanged.

**Fold8 physical device** (SM-F976B Android 17, folded/narrow Chrome viewport 360 CSS px): existing protected offline House opened through Android's local file provider. Real Android Chrome debugging interaction checks across five sections, source filters, search, Play/Edit link rendering, DOM layout and automatic 495-index load **20/20 PASS** (CP37). This proves on-device Chrome DOM operation, NOT an owner finger tap, unfolded display layout, device-controller support or completed game sessions.

The complete offline owner House was rebuilt from the exact reviewed original House source with improved counts and without any new original game body. Prior offline HTML copies were SHA-verified and preserved in GroundZeroJM private source snapshots. Final **private offline keeper** SHA-256: `1930125337d3a6b337b07be6323488de22fa9ba9776e98d5ad738dd65a49d047` (455,958 bytes). The matching file is in Downloads on both owner devices; post-transfer SHA-256 matches on OPPO and Fold8. Filename: `JM_Games_And_Beyond_OWNER_OFFLINE_ONE_HOUSE.html`. Neither file was uploaded to GitHub.

**Current-head QA:** 19/19 self-contained offline Microsoft Edge tests PASS, 24/24 privately hosted existing House auto-import tests PASS, 20/20 OPPO Android Chrome current-head tests PASS; OPPO summary explicitly displays the corrected counts. Fold8 Chrome previously passed 20/20 on the immediately preceding identical-layout edition; the final corrected-count file was hash-verified on Fold8. A later background reload on Fold8 was blocked while its foreground app was in use; no renewed Fold8 DOM acceptance is claimed for the final 455,958-byte file. Background Chrome reload on OPPO returned a stale content URI until the local file was explicitly reopened; after reopening, current-head OPPO test passed. This is a resolved OPPO URI issue, not a missing game.

Source-backed Windows Engine Door owner control and ALL 467 selector remain in place. The 81 exact HTML source editions retain independently bounded browser boot/input receipts; no claim of 81 fully completed games. No merge, release, remote public index or private family item publication. Real game-by-game completion, owner touch and Fold8 unfolded-mode acceptance are separate gates.

## CP39 — Original game-edition hash closeout (21 November 2026)

GroundZeroJM read-only audit of the recovered **81 exact HTML source editions**: **81/81 original source files present and exact SHA-256 matched**, and **81/81 corresponding verified-runtime HTML files present and exact SHA-256 matched**. **9** of those verified runtime editions are separate working copies; their original version ancestors remain byte-exact and protected. Receipt: owner-local `GamesBeyond/EngineDoor/CP39_81_ORIGINAL_VERSION_HASH_RECHECK_RECEIPT.json`.

This is a fresh **STATIC HASH / SOURCE CUSTODY PASS** against prior CP28 browser-input boot receipts. It is not a new round of all 81 gameplay sessions, current release acceptance, 81 different games, Fold8 controller/owner physical tap confirmation, public deployment or PR merge. Existing owner offline file on OPPO and Fold8 keeps final SHA-256 `1930125337d3a6b337b07be6323488de22fa9ba9776e98d5ad738dd65a49d047`; current-head OPPO Android Chrome 20/20 and Edge offline 19/19 passed, while current-head Fold8 background-tab reload remains a hold. Private game source files are not included in GitHub.
