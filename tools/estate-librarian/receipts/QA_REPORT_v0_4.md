# JM Estate Librarian v0.4 — QA Report

## Build purpose

Extend the existing v0.3.0 Librarian lane with storage-pressure measurement and safe external-archive planning. The build remains permissioned and read-only: it produces evidence, suggestions, decisions, manifests and receipts, but contains no source deletion, movement, rename, merge or overwrite route.

## Lineage boundary

- Parent: **JM Estate Librarian v0.3.0 — Apron Mode**.
- Method: checkpoint-compatible forward patch.
- Known frozen parent SHA-256: `6ff2ce6f8d864127dca1285baedeccc7696f227a03f8c5f0c697611edc21d7a2`.
- The parent source was not falsely reconstructed or flattened into this package.

## Functional QA performed

The exact v0.4 standalone body was exercised in Chromium at desktop and mobile viewports.

Passed:

- Default Storage Cover launches successfully.
- Demo produces 10 records and 9 family cards.
- Exact duplicate engine identifies 2 duplicate groups in the demo.
- Real selected-file intake added three files and raised the register to 13 files with 3 exact duplicate groups.
- Human decisions update independently from machine suggestions.
- No record is automatically crowned as `keep-active`.
- Archive manifest export produces `JM_ESTATE_LIBRARIAN_v0_4_ARCHIVE_MANIFEST.json`.
- Removal-readiness export uses the expected receipt schema.
- Register, family, archive and job views render.
- Mobile viewport 390 px: page scroll width equals viewport width; no page-level horizontal overflow.
- Wide evidence table remains intentionally scrollable inside its own container.
- No console errors or page errors.

## Desktop evidence

- Files after demo: 10 files.
- Exact groups after demo: 2 duplicate groups.
- Human decisions after demo: keep 0; review 10.
- Register rows: 10.
- Families: 9.
- Storage jobs: 5.

## Mobile evidence

- Viewport: 390 px.
- Page scroll width: 390 px.
- No page overflow: true.
- Evidence table container: 366 px viewport over 1100 px table, intentionally internally scrollable.

## Android boundary

The package contains a native Android project with:

- Storage Access Framework folder-tree selection;
- recursive native file enumeration;
- native SHA-256 hashing;
- multi-file chooser support;
- Android document-save export bridge;
- embedded offline web body.

GitHub Actions run `29249979504` compiled and packaged the debug APK successfully. Local delivery verification confirmed:

- Android APK archive recognised;
- `classes.dex`, `AndroidManifest.xml`, resources and embedded `assets/index.html` present;
- no compressed-data errors;
- APK Signing Block present;
- SHA-256: `1213e00a3b79e7101bb571d6623bdc6c03c431836eabc21c1e99bc9c36e737f2`.

Physical-device installation and runtime behaviour remain a separate user-device Ding.

## Safety boundary

- Permissioned selection only.
- Read-only source handling.
- Suggestions never overwrite human decisions.
- External destination evidence is required before a file can be marked removal-ready.
- No delete, rename, move, merge, overwrite or source-edit control exists.
