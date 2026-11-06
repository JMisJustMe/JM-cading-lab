# CREWBOUND CP04 — Independent Pair Commands

## Source continuity
This candidate evolves the existing, separate **CREWBOUND 3+2+1** descendant, not COMBOUND, the original CREWBOUND v0.5, or the 22-body Games & Beyond carrier. Its immediate parent is the protected CP03 first-command match-clock repair in draft PR #784. It does not replace that repair.

## Core improvement
A go is not merely two fighters receiving the same command. Each of the two selected fighters can receive **its own action and target** before the commands resolve simultaneously alongside the rival's independent plans.

The CP04 implementation adds:
- **BOTH (linked)**: the existing fast tap-two / choose one action / aim once / commit shortcut still works; the two bodies have a small target offset, as before.
- **A**: choose the first fighter, select COMBO/ATTACK/GUARD/MOVE/DEPLOY, tap/flick its destination.
- **B**: choose the second fighter, select a different action and tap/flick a different destination.
- **COMMIT PAIR** only activates when both selected fighters have valid targets (either independent or shared). The command receipt records both exact actions and both targets, while the rival issues two plans/interventions during the same resolution window.
- A/B reticles are visibly distinguishable. Changing the pair clears stale abandoned plans; choosing a linked target/action clears the corresponding independent overrides.
- The clock remains frozen until a successful first paired commitment (inherited CP03 behaviour).
- Your exclusive 12-character CP02 cast and all original source ancestry stay unchanged.

## Proof and release gates
- Source-specific engine assertions cover separate A/B actions/locations; unchanged linked shortcut; stale-selection cleanup; and linked override clearing.
- Mobile and desktop Chromium scenarios exercise the **real buttons and canvas pointer events** for independent and linked controls, including rival participation and rematch reset.
- The existing Games & Beyond QA GitHub Action now runs Node engine tests before Playwright browser tests.
- CI success proves source and browser-emulated scope only. **Actual Fold8 finger feel, folded/unfolded layout and owner acceptance remain separate.**
- This branch is stacked on the protected CP03 draft. It must not be merged straight into main or published before CP03 is independently accepted and proper release authority is provided.

**Storage:** GitHub is the code keeper. New build docs, tests and routes are versioned in this existing repository. No new warehouse or repository.

**Direct HTML:** The current public CP02 remains available at `https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/index.html`. CP04 has no independently verified public HTML URL and should not be presented as live.
