# JM THEORY MULTIHUB v0.4 — INTERACTION REPAIR RECEIPT

**Date:** 20 July 2026  
**Public route:** `https://jmisjustme.github.io/JM-cading-lab/theory/`

## User-reported failure

On an Android phone, the public Theory Multihub felt locked: the page would not reliably scroll and controls were difficult or impossible to activate.

## Root fault

The first public shell locked `html` and `body` to `overflow:hidden` and depended on nested full-height scroll surfaces. It also attached the primary navigation only after all seven compressed data sections had loaded and decoded. That combination was brittle inside Android and in-app browser surfaces.

## Repair

- Mobile uses ordinary document scrolling rather than a nested page-level scroll trap.
- The theory reader retains its own explicit vertical touch-scroll surface when opened.
- Buttons and links use manipulation touch handling and 46–48px-class targets.
- Project controls stack to full width on portrait phones.
- Project child routes become full-width readable touch rows on portrait phones.
- Navigation is delegated and bound immediately, before payload completion.
- Loading failure exposes Retry, Use the visible shell and CAUSE MUST PASS escape routes.
- Cache-busting query updated to `v=0410`.

## QA environment

Browser plugin was not present. Playwright used the system Chromium executable. Direct localhost navigation was blocked by the environment administrator, so the exact repaired HTML, CSS, JavaScript and a controlled 297-record data response were loaded through Playwright `set_content` for rendered interaction testing.

## Mobile proof — 390 × 844, touch enabled

- Page identity: PASS
- Meaningful content rendered: PASS
- Feature routes rendered: 8
- Full document scroll height: 3,237px
- Document scroll moved from 0 to a positive position: PASS
- Library rows rendered: 297
- First theory opened: PASS
- Reader visible: PASS
- Reader scroll height: 28,775px
- Reader reached scrollTop 28,081px: PASS
- Back to list closed reader: PASS
- Project trunks rendered: 2
- Console/page errors after final repair: 0

## Desktop proof — 1365 × 900

- Page identity: PASS
- Library rows rendered: 297
- Theory reader opened: PASS
- Console/page errors: 0

## Boundary

This proves the repaired source and rendered interaction path in the stated test environment. Final contact on the user's exact Android device remains the decisive public-device proof.
