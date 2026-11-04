# JM Games CP26 — PUKA Input Sovereignty and Device Parity

**Parent:** PUKA v0.17A FLAZ original; no game-world, art, rules or bankroll reset.
**Current status:** Draft unmerged candidate. CI result and hardware/owner acceptance are separate gates.
**Existing canonical player door:** `games-beyond/puka/` → `00_OPEN_FIRST.html` (unchanged).
**Source authority:** `puka-ui.js` calls the *existing* `newHand()`, `playerAction()`, `snapshot().legal`, `raiseOptions()`, `persistable()`, `save()`, `render()` and `openEvidence()`. No new simulated poker game, no replacement engine, no copycat table.

## Functional native changes

1. **Laptop keyboard:** N deal/next, F fold, C check/call (whichever original state legally allows), R show/hide PUKA's real raise options, 1–4 choose an original legal raise amount, E review, Escape close raise. No illegal action dispatched on wrong turn.
2. **Standard Gamepad API:** connect/disconnect aware, D-pad/left stick choose current legal actions, A confirm, B fold/close, X check/call, Y raise, shoulder buttons choose legal raise amount and Start deal/next or evidence. Digital edges prevent held buttons from replaying multiple actions. Disconnect clears input state. Browser gamepad support depends on connected hardware; no physical PS5/Portal contact claimed.
3. **Table visuals:** small native input guide alongside the actual player action buttons, selected gamepad action highlighted, touch-first coarse-pointer layout still prioritises cards and actions.
4. **State and evidence:** action dispatch follows the same authentic PUKA decision rules and durable save/evidence flow as touch buttons, with no change to hand data, hidden information, randomness, read calibration, ranks or royal progression.

## Proof
- `games-beyond/tests/puka-input-cp26.spec.mjs` exercises *actual* game state by playing legal Fold, Raise and next-hand decisions, persisted event evidence, an edge-triggered Gamepad API mock and keyboard Review; both mobile and desktop browser configurations.
- `.github/workflows/jm-puka-input-cp26.yml` runs these Playwright tests and the original PUKA core regression without changing the shared Estate CI.
- **Test result must be read from GitHub Actions; do not promote source changes alone to PASS.**

## Holds
- Owner's genuine Samsung Fold / laptop keyboard and hardware gamepad play, performance and perceived table feel.
- No full-Estate parity or native controller certification implied by synthetic Gamepad API.
- Existing PUKA FLAZ and other game CP24/CP25 candidates stay unmerged/unchanged until separately accepted.

**Law:** Integration ≠ Replacement. One original game; new native inputs; earned proof; no duplicate front door or dead delivery descendants.
