# JM THEORY FULL-BODY READER — CORRECTION RECEIPT v0.8.1

**Date:** 20 July 2026  
**Corrected reader:** `theory/full-bodies/all-37-v0_8_1.html`  
**Legacy doorway:** `theory/full-bodies/all-37.html` redirects to v0.8.1.

## Failure observed

The v0.8 reader used broad title containment to select recent/canonical records. Four additional similar-title census records were therefore included:

- expected: 24 collection + 13 canonical = 37
- observed: 24 collection + 17 recent matches = 41

The exact-count guard correctly refused to render a false 37-body crown, but the loading screen did not clearly distinguish an active wait from a stopped failure.

## Correction

The v0.8.1 reader now:

1. selects the same 24 numbered collection manuscripts;
2. iterates the declared list of 13 canonical titles;
3. chooses one best source body for each declared title;
4. prevents the same source record being chosen twice;
5. requires the final exact total `24 + 13 = 37`;
6. rejects similar-title surplus records rather than counting every substring match.

## Visible loading route

The reader now displays:

- source contact;
- `Loaded section X of 7`;
- source-length check;
- 297-route decode;
- 24-collection selection;
- one-per-title canonical selection;
- `Verified: 24 + 13 = 37`.

Each source request has a 20-second timeout. A stopped load removes the spinner and displays **Retry now** and **Return to Vault**, so an error is no longer presented as an indefinite wait.

## Governing lock

> One declared body per canonical route. No broad substring crown.

> No waiting on a reported failure.
