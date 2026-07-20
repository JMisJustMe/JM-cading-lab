# JM THEORY FULL-BODY READER — SCREEN-FIT RECEIPT v0.8.2

**Date:** 20 July 2026  
**Corrected reader:** `theory/full-bodies/all-37-v0_8_2.html`  
**Permanent doorway:** `theory/full-bodies/all-37.html` redirects to v0.8.2.

## Device-reported regression

The corrected 37-body population loaded, but the list cards and opened manuscripts exceeded the Android portrait viewport. Long unbroken metadata values—especially source paths and source-status strings—forced horizontal page width and cropped text beyond the right edge.

## Screen-fit correction

v0.8.2 applies a late viewport lock to the verified v0.8.1 reader:

- `html` and `body` are capped to 100% width with horizontal overflow disabled;
- cards, grid children, reader surfaces, claims and document bodies receive `min-width: 0` and `max-width: 100%`;
- source paths, metadata, headings, paragraphs, list items and blockquotes use `overflow-wrap: anywhere` and `word-break: break-word`;
- manuscript `pre` and `code` blocks wrap safely while preserving local scrolling where required;
- mobile top bars use `auto / minmax(0,1fr) / auto` grids so the centre title can shrink;
- the reader body is pinned to the viewport width with 14px phone gutters;
- a post-load audit records horizontal overflow and reapplies wrapping to known problem surfaces if any remains.

## Cache route

The permanent doorway now targets `v=0812`, avoiding the previous mobile-cached layout.

## Governing lock

> Full body must also mean full-screen-readable body.

> A manuscript that exists beyond the viewport is not yet properly delivered.
