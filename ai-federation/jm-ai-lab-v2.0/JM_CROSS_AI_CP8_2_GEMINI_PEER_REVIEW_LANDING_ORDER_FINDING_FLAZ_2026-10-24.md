# JM ECOSTATE — CP8.2 Gemini Source Review FLAZ | Landing Order Finding
Date: 2026-10-24. Owner-relayed Gemini source review; independent code-grounding by ChatGPT. **Finding preserved before attempted repair.**
Source authority: `JMisJustMe/JM-cading-lab@b39ea467ef570ce8f695c15402912c23090e273e`, draft PR #450, base repair PR #446 at `59cd680825fa2072cbec3762fccd5323af319474`.
Relayed sources: exact pinned `CP08Tactics.gd` (Git blob `c3e503fcdbb436417dae0ce69af4d79c1bd4c082`), `CP08Recipient.gd` (`bdb15c33d42711bc8044a4cabb4c610a4b133099`), `tests/cp08_tactics_test.gd` (`5bc8d3de0d5fe1200d1d587fd7703ab5890ee2c0`), and a bounded inherited `games/slingfall/godot-v0-7/Main.gd::_land` excerpt.
## Source-grounded defect nomination
Gemini correctly reported its previous `SOURCE_ACCESS_HOLD` and did not invent a source inspection. After the exact source relay, Gemini performed source-text review (NOT native Gemini execution) and proposed **CP8-DEFECT-001**:
- `CP08Recipient._enemy_step` assigns `rival["order"]` to a role-selected distant zone during flight.
- Parent `Main._land` unconditionally assigns `h["order"]=z["id"]` when landing within a nearby zone. The alternate zone destination can be lost before native movement begins.
- Existing 12 tests assert spawn-time assignment, not post-landing tactical persistence, so their all-green result cannot establish that intended feature.
- Proposed child-only override: preserve red CP8 tactical order, call `super._land(h)` for all inherited native capture/terrain/landing effects, then restore the tactical target when still valid. No protected parent modification.
- Required falsification: land a CP8 red Dart physically at RIDGE with intended target SUPPLY, and verify target SUPPLY survives, RIDGE capture consequence remains, ordinary/non-CP8 champions preserve inherited behavior, and unrelated operations remain untouched.
## Proof class / route
Gemini source review: **OWNER-RELAYED, SOURCE-ALIGNED**, `HOLD_PENDING_LANDING_ORDER_CORRECTION`. ChatGPT independently inspected original parent source; the mechanism is plausible from code. At freeze point, **no red-native reproduction or post-fix runtime PASS yet**.
Route: add native fail-first regression on isolated CP8 draft branch → capture genuine failing CI → implement minimal child override → rerun actual Godot and Android CI → record passing tests, original preserved and artifact SHA → retain owner Fold acceptance separate. Do not merge to main or replace prior FLAZ.
Governance: NO DING, NO CLAIM · RECOVER BEFORE REBUILD · INTEGRATION ≠ REPLACEMENT · MESH ≠ MERGE.
