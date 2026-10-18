# JM Cross-Location Storage Census & Reconciler v0.1 — QA Report

**Date:** 13 July 2026  
**Safety state:** permissioned, read-only source inspection

## Verified passes

- Streaming SHA-256: PASS against standard known vectors.
- Three-location reconciliation demo: PASS.
  - Mounted sources: 3
  - Observed files: 10
  - Exact duplicate groups: 2
  - Cross-location exact groups: 2
  - Observed-one-location records: 3
  - Records needing a hash: 2
  - Provable duplicate reclaim in demo: 8.60 MB
- Current-best candidate analysis: PASS; v0.4 outranks v0.3 without becoming an automatic crown.
- Master-audit JSON export: PASS and valid JSON.
- Desktop containment: PASS at 1440 × 1000; horizontal overflow 0.
- Mobile containment: PASS at 390 × 844 across all seven screens; horizontal overflow 0.
- Console/page errors: 0.
- One-body navigation: PASS.

## Verification route

The build environment blocked ordinary localhost and direct-file navigation. Playwright used the installed system Chromium and mounted the exact HTML source through `page.setContent`. Functional state, exports, responsive containment and console errors were checked against that mounted source.

## Android state

- Android source carrier: PRESENT.
- Native permissioned folder-tree selection: PRESENT.
- Recursive hashing, progress, pause and cancel bridge: PRESENT.
- GitHub Actions APK compilation: governed by this branch workflow.
- Physical Android installation and field Ding: PENDING user-device proof.

## Claim boundary

This proof does not claim access to unselected storage or prove that files were moved, deleted, compressed or backed up. Exact-duplicate claims require matching full SHA-256 values. “Observed in one location” means one mounted manifest, not proof that no other copy exists elsewhere.
