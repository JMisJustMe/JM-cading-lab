# CREWBOUND — 3 + 2 + 1 · CP01 Living Orders

**Status:** independently playable **experimental descendant**, pending actual browser/Fold8 touch acceptance. **Not** a replacement for CREWBOUND Arena v0.5, COMBOUND, REBOUND//RIOT or the public 22/24 Games & Beyond House.

## Recovered source and ownership
- Original public CREWBOUND v0.5: `games-beyond` exact compressed payload, registered as `crewbound-arena`. Uncompressed pack SHA-256 verified against original payload manifest before extracting its source in a temporary Termux reference.
- Original extracted CREWBOUND v0.5 source SHA-256: `5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7`.
- `roster.js` contains only documented fighter attributes and relationships extracted from the existing PrimeBody TokenBody. `cp01_proposed_speed` is deliberately NEW descendant tuning and must not be mistaken for a speed attribute in the original.
- Original v0.5 body, its House payload, game IDs, GameCore or COMBOUND were **not changed**. This CP01 descendant has its own code and accepts independent extension.

## 3 + 2 + 1 rules
- Each side selects six fighters: **3 active on the floor + 2 yard support + 1 flex**. Flex may enter, yielding **4 floor + 2 yard**.
- Each player go requires **two distinct fighters**. Tap their cards, select COMBO / ATTACK / GUARD / MOVE / DEPLOY, tap or flick the field, then **COMMIT PAIR**.
- The rival simultaneously chooses up to **two independent planned orders**. Both teams move, evade, make contact and counter during a single continuously advancing physics clock — no freeze while planning.
- Fighters have distinct proposed movement speeds tied to their original silhouette, mass and movement words; powers inherit original semantics: Zipp rebound Surge, Brax shove, Mira relay shield, Vexa mark, Grove guard, Orbi ring, Knot bind, Skip sidestep.
- Two yard fighters can **intervene** through guard, movement/relay or damage assists while staying off-floor. Supports have five-second cooldown. Downed floor fighters can be replaced from living reserves.
- Optional fair six-sided die mildly modifies the next paired attack: never substitutes for aim, movement or character strengths. No pay-to-win element.
- Trace receipts keep `MATCH_START`, `ORDER`, `SIMULTANEOUS_PAIR_COMMIT`, `YARD_INTERVENTION`, `CONTACT` and `MATCH_END`.

## Controls and devices
- Portrait/mobile-first `index.html`, with an HTML canvas and real pointer/touch events. No remote service, account, new host or premium dependency.
- On-screen buttons are 44px+ touch targets, interactive canvas has an accessibility label, and `prefers-reduced-motion` is respected.
- Open this exact directory on a normal static server or after publication under the **existing** `games-beyond/crewbound-321/` website route.
- Two-character order input is user-assisted; idle fighters move autonomously and defend. Actual finger play, character balance, fold-state recovery, offline caching and sound design are **not yet DINGed**.

## Acceptance evidence
- Native Termux on Samsung SM-F976B, Android 17: `node --test sim.test.cjs` verified **16/16 PASS** on first implementation pass.
- Node syntax check and inline HTML script syntax check: **PASS**.
- Four Playwright browser checks live in `games-beyond/tests/crewbound-321.spec.mjs`; these MUST be executed before claiming browser-rendered acceptance.
- The main Games House remains unchanged. Public publishing must follow successful browser QA and correct governance; this branch starts as **draft**.

## Next polish after verified playable build
Character-specific attack/defence animation, full arena selection including floor substitutions, richer yard action timing/cooldowns, improved rival tactical predictions, unique CREWBOUND silhouettes, better TraceBox history and physical Fold8 folded/unfolded play. Preserve both true originality and identifiable character lineage. No Ding, No Claim.
