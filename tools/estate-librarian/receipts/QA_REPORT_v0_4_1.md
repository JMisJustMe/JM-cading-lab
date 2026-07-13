# JM Estate Librarian v0.4.1 — QA Report

## Purpose

Professionalise the Android-proven v0.4 body without flattening or replacing its duplicate, lineage, storage-pressure, decision and receipt engines.

## Functional pass

The exact standalone v0.4.1 body was exercised in headless Chromium using 390 × 844 and 1440 × 1000 viewports.

Passed:

- First screen exposes Scan, Review and Archive as the three primary jobs.
- Demo intake mounts 10 records and exact duplicate families.
- The app automatically routes from completed intake to Review.
- Review renders 10 portrait-native file cards.
- Human decisions update from card controls and remain independent of recommendations.
- Archive renders selected candidates and ready/blocked states.
- External destination input synchronises with storage settings.
- Dense table, hashes, lineages, jobs and family details remain available under Advanced Evidence.
- Bottom navigation works on handheld viewport.
- Page scroll width equals client width at both tested viewports.
- Console errors: 0.
- Page errors: 0.

## Native Android additions present in source

- Folder scan start callback.
- Per-file scan progress callback.
- Save success/failure callback.
- Back-to-Home before app exit.
- Branded adaptive/legacy launcher icon.
- Android version code 5 / version name 0.4.1.

## Android compilation and package verification

GitHub Actions run `29255293858` compiled and packaged the v0.4.1 debug APK successfully.

Independent local verification confirmed:

- Android APK archive recognised.
- `classes.dex`, `classes2.dex`, `AndroidManifest.xml`, resources and embedded `assets/index.html` are present.
- APK compressed-data integrity: PASS.
- APK Signing Block: PRESENT.
- APK SHA-256: `d3693f05ed77921b864171870de61165c486e4bdce54ba6e06231de73627465d`.
- Embedded Android HTML matches the standalone and PWA body byte-for-byte.

## Proof boundary

The web/UI body and Android compilation are proven. Physical installation and live runtime behaviour on the user's phone remain a separate v0.4.1 device Ding. The parent v0.4 physical proof is not silently inherited.
