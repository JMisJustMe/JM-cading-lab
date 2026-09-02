# PUKA CONTINUITY + CROWN READINESS v1.0

**Status:** MACHINE-SIDE COMPLETION TARGET  
**Product body:** PUKA v0.14A Human Game over the v0.13 Deep House and v0.12 Full Table ancestors  
**Canonical public door:** `https://jmisjustme-estate.pages.dev/games-beyond/puka/`  
**Keeper:** **BODY EVOLVES -> DOOR STAYS -> STATE RETURNS.**

## Purpose

This pass does not create a second PUKA identity and does not mint a new public URL. It closes the machine-side continuity/crown-readiness gap around the existing living body.

The proof target is:

**CANONICAL DOOR -> OPEN_FIRST -> PWA IDENTITY -> LOCAL STATE -> SERVICE-WORKER/CACHE CHANGE -> RE-ENTRY -> SAME BODY/STATE**

## Required continuity claims

- the owner-facing canonical door remains `/games-beyond/puka/`;
- `index.html` continues to route that door into the single `00_OPEN_FIRST.html` body while preserving query/hash;
- the PWA install identity is explicitly pinned to the existing installed start route rather than silently deriving a new identity later;
- the manifest scope remains the PUKA body, not the Estate root;
- the existing primary local-state key remains stable across descendants unless an explicit migration is introduced;
- service-worker cache replacement may delete stale PUKA caches but must not delete application local state;
- reload/re-entry after service-worker reinstallation must restore the same validated active hand;
- public-door continuity is not treated as proof that state exists by itself: persistence still comes from the proved storage/restore machinery.

## Crown boundary

Passing this body proves machine-side continuity and crown readiness only. It does not manufacture owner aesthetic approval, installed physical-Android lifecycle proof, Cold Ding or final crown.

## No version churn rule

This continuity closure remains attached to PUKA v0.14A rather than inventing a cosmetic product version. A later product version is earned by a material product jump.
