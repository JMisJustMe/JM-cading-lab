# JM ECOSTATE — CP8.1 Gemini Source Access HOLD → Exact Source Relay FLAZ

**Date:** 2026-10-24
**Status:** FLAZ · GEMINI SOURCE ACCESS HOLD RECORDED · THREE EXACT SOURCE FILES BYTE VERIFIED · OWNER RELAY PREPARED · GEMINI PEER REVIEW STILL OPEN
**Custody:** Additive to frozen AI Federation history, isolated branch `jm-cross-ai-cp1-cp2-flaz-2026-10-24`. No production/main code change or previous FLAZ mutation.
**Principles:** RECOVER BEFORE REBUILD · NO DING, NO CLAIM · INTEGRATION ≠ REPLACEMENT · CONTACT BEFORE CROWN · MESH ≠ MERGE.

## Owner-relayed Gemini CP8 result (claim-level)
Gemini's connected `JM ECOSTATE Build Mesh Native MCP` returned:
- `recover_build(query="SLINGFALL",limit=5)` → `ABSENCE_NOT_PROVEN`, basis `NO_AUTHORITY_MATCH`, Navigator contact `PASS` with five fuzzy/non-authoritative public candidates. A legacy public registry not naming a new CP8 build does not prove absence of its real source or current branch.
- Gemini reported no callable GitHub REST/raw source fetch in that session. It could not directly access the three named CP8 GDScript files at pinned commit `b39ea467ef570ce8f695c15402912c23090e273e`, draft PR #450. `SOURCE_ACCESS_HOLD` correctly returned; **no peer-review claim earned**.
- Gemini requested exact source bodies to be manually relayed. No attempt to bypass the public MCP's read-only tool boundary.
- ChatGPT separately re-ran `recover_build(query="SLINGFALL",limit=5)`: independently returned `ABSENCE_NOT_PROVEN`, `NO_AUTHORITY_MATCH`, Navigator `PASS`, five results. This only verifies the hosted registry response, not the private full estate.

## Recovery: exact pinned files (GitHub connector, not reconstructed)
Source authority: `JMisJustMe/JM-cading-lab@b39ea467ef570ce8f695c15402912c23090e273e`.
Target: https://github.com/JMisJustMe/JM-cading-lab/pull/450
Direct authenticated `fetch_file` returned all three original UTF-8 files at exact commit. A separate local relay generated the same UTF-8 bytes and independently recomputed their **actual Git blob SHA-1** (Git blob header plus bytes), matching GitHub's returned blob IDs for all three:

| File within `coding-estate/integration/codegornization-cp08/godot/` | Exact bytes | Git blob SHA-1 | SHA-256 |
|---|---:|---|---|
| `CP08Tactics.gd` | 2141 | `c3e503fcdbb436417dae0ce69af4d79c1bd4c082` | `ba2f8a79fe3204b947a5c7df09cb86c612618f5fb97378b41a99ddc44ec8a4f6` |
| `CP08Recipient.gd` | 1830 | `bdb15c33d42711bc8044a4cabb4c610a4b133099` | `bfb658817289ca27c67f5117f29286f62d2c06cc5ca305f8a0c96893b7309b5e` |
| `tests/cp08_tactics_test.gd` | 2901 | `5bc8d3de0d5fe1200d1d587fd7703ab5890ee2c0` | `66aaca03d654ad3944c947876e62176123dfb4ea1795366fbbcda2456591c684` |

The **single, owner-pasteable Markdown packet** includes those three complete verbatim sources and an additionally labelled **bounded inherited ancestor excerpt** from `games/slingfall/godot-v0-7/Main.gd`, pinned `_land` lines 407–419. It is not a replacement parent file and no raw Gemini reply to this packet has yet been received.

- `PASTE_TO_GEMINI.md`, 9481 UTF-8 bytes, SHA-256 `bfea126284ceff7b4e3526774f7d57afaeb8a22ffe2f475632687df5e4c9e68b`.
- Optional evidence ZIP (same three sources + Markdown + manifest), 8112 bytes, SHA-256 `3ea7e6d0baa5d64eb2b9e5a05ddffde805509e74a45b9544575413668e3dca0f`, CRC clean.
- Exact original files remain in the pinned GitHub source; relay packet is a carrier, not authority.

## A source-grounded review concern (NOT FIXED)
In inherited `Main.gd`, `_land(h)` assigns `h["order"]=z["id"]` when a newly landed champion falls within zone radius +24. The CP8 child's `_enemy_step` assigns `rival["order"]=decision["zone"]` while the red champion is still airborne. A zone landing can therefore overwrite the selected tactical order. The CP8 unit/integration test checks the post-spawn order, not the actual post-landing order, so its 12/12 success does not test persistence of tactical movement intent. Require independent Gemini source review and/or a real native post-landing regression before promoting that aspect of gameplay. Do not change protected ancestor merely to hide the issue.

Additional proper review boundaries: all native fields consumed after spawn should be checked against the inherited combat/landing behavior; preserve three game modes SECTOR/CONVOY/BEACON, CP03 native cancellation, save schema, and original JM bodies. Gemini's reviewed source may be owner-relayed but must not be called Gemini independently fetched.

## Next operation
Owner attaches/downloads **one** `PASTE_TO_GEMINI.md` source packet into the same Gemini chat, asks for source-specific critique and minimal testable improvement (prioritise spawn→landing→movement and character differential), and returns the actual Gemini finding. ChatGPT then checks the critique against pinned inherited body and, if justified, makes only a CP8 child revision on its isolated draft branch with a new native regression and independent CI. GitHub/Library/production mutations only with actual route evidence.

**Current verdict:** `CP8_1_EXACT_THREE_SOURCE_RELAY_PASS__GEMINI_SOURCE_ACCESS_HOLD_PRESERVED__POST_LANDING_INTENT_TEST_OPEN`.
