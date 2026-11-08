# CREWBOUND CP06 — User-Controlled Starting Formation

## Recovery and lineage
- The authoritative candidate is the existing CREWBOUND 3+2+1 descendant, **not COMBOUND** and **not original CREWBOUND Arena v0.5**.
- The original v0.5 PrimeBody SHA-256 remains `5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7`. No source file for that historical original was changed.
- CP02 exclusive twelve-pilot visuals and names remain separate and unchanged.
- Earlier protected branch ancestry remains intact: CP03 PR #784 (first-command clock); CP04 PR #785 (two independent A/B orders); CP05 PR #794 (unique abilities, relay objectives, match result). This CP06 branch is **stacked on CP05's exact checked commit** `04c39e104f40e6f66db5e1ac00e2d2f294fef7ce`.
- No silent merge, public release or replacement; continue to GitHub source as the authoritative keeper.

## Gameplay advancement
**Actual control over who starts in the arena.** All six existing Shift Crew pilots remain independent and available. Before the first committed command, the player can choose **ARRANGE STARTING SIX**, then tap any two pilots with *different roles* to exchange their starting floor, yard or flex roles and positions. Three floor, two yard and one flex remain invariant. The default lineup remains available, and every rematch resets to it.

The editor is a distinct pre-match interaction: it clears any stale A/B attack drafts when used and cannot be invoked once the first two-fighter battle command is committed. A lineup-locked receipt records the actual three floor names, two yard names and flex identity. The original COMBO/ATTACK/GUARD/MOVE/DEPLOY controls, signature combat kits, scoring relays and simultaneous rival turns are preserved.

The UI uses the already-present CREWBOUND roster cards as direct touch controls, with clear selected-state outlines, an announced help message, a 48px native button target, visible mode/locking state and a correct narrow-screen presentation. No new UI renderer is installed, and source lineage remains with the original existing JM art/Visualang/GripCube donors.

## Proof gates
- 6 added native tests: floor↔flex, floor↔yard, invalid and rival-id rejection, invalidation of stale pair plans, immutable lineup after first go, rematch restores defaults/snapshot reflects actual roster.
- 3 browser scenarios on both mobile and desktop: touch formation swap + battle commit, rejected swap/360px no-horizontal-scroll/rematch, standalone HTML execution with formation control.
- Existing CP05 engine and 16-seed match stress contracts are inherited; the Games & Beyond workflow now runs the complete engine + mobile/desktop browser suite and ensures the CP23 catalogue checks still pass.
- `deliveries/CREWBOUND_CP06_PLAY.html`: single-file offline review with five JS modules + inline runtime. `deliveries/verify-cp06-delivery.cjs` tests byte-for-byte construction from source blob identity and syntax.
- Pass evidence must be observed in current GitHub Actions before marking CI green; emulator contact is **not physical Fold8 acceptance**.

## Closeout and remaining holds
This CP06 is **source and browser-emulated scope only** until verified. Original CREWBOUND and COMBOUND are preserved, as are previous drafts and the public live CP02 page. Physical Fold8 cover/open touch, real gameplay feel and visual owner acceptance remain separate. Public merge or publication requires independent approval and verification. Audio, expanded modes, deeper gameplay balance and multiplayer are additional future evolution, not claims of this one slice.

**Operating law:** Recover before rebuild; contact before crown; integration ≠ replacement; no ding, no claim.
