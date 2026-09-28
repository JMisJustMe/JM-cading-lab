# Unity Hub Contact Correction — Separate Local Copy v0.1

**Date:** 28 September 2026  
**Contact:** SPINBREAK v0.8 → Unity  
**Status:** ROUTE CORRECTION OBSERVED / RUNTIME DING STILL OPEN

## Observed contact

Unity Hub initially resolved the requested Git ref against the already-existing local destination `C:\Users\theod\JM-cading-lab`. Opening from that state returned the previously proven Player/Coin Target Bridge runtime rather than the new SPINBREAK carrier.

The user then enabled **Create a separate local copy** in Unity Hub. Hub created a fresh checkout with a new local project row (timestamped local name), removing the stale-local-project collision.

## Return delta

**NEW REPOSITORY REF + REUSED LOCAL DESTINATION ≠ NEW LOCAL PROJECT STATE.**

For branch/commit-specific Unity contact, the router should prefer or require a fresh/unique local checkout when the destination already contains another checkout.

Suggested automation rule:

`UNITY_GIT_CONTACT -> if destination exists and ref differs -> CREATE_SEPARATE_LOCAL_COPY / UNIQUE_CHECKOUT_DIR`

This is a route/custody correction, not a Unity runtime Ding.

**NO DING, NO CLAIM.**
