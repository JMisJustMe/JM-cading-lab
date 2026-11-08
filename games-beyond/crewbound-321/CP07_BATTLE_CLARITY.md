# CREWBOUND CP07 — True Pair-Order Preview & Optional First-Go Practice

**Origin/custody:** This additive slice starts from independently verified CP06 `ccbfedbafbe521f9704eb6955ddfb8cce764baeb`, preserving distinct historical COMBOUND and original CREWBOUND Arena v0.5 (sha256 `5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7`). It does not re-author, merge or replace them. Prior CP03 #784 (first-command clock), CP04 #785 (independent A/B), CP05 #794 (12 unique kits, objectives) and CP06 #795 (editable 3+2+1 opening roles) remain distinct GitHub PRs; their files and histories are retained. No new repository or original-body fork.

## The problem closed
The player can plan different A/B actions, but before CP07 the interface did not show the exact intended two commands, and the original route trace did not clearly label the rival's last actual response. CP07 makes those readable, while using the **same target/action normaliser** as `Game.commit()`. The preview is read-only, never makes a hit prediction, never advances simulated time or consumes RNG. The rival's plan only becomes visible after it has genuinely been committed; no fabricated pre-commit omniscience.

## Implemented
- `Game.pairPreview()` returns the A/B action, fighter, floor/yard/flex role, coordinates, separate/shared choice, readiness and reason where unavailable. Linked BOTH displays its real 35px +/- offset; separate commands retain exact separate destinations. Near-pair bonus is labelled as conditional proximity, not guaranteed success.
- `Game.lastRivalPair()` returns the last actually committed rival pair, with real names/actions/targets (or null before the first go).
- UI adds a compact two-card command preview, target-path markers within the **existing whole-screen arena**, and readable last rival response.
- Optional **PRACTISE FIRST GO** button guides actual steps: select two fighters, choose actions/targets, commit, observe both sides. It changes no combat physics and requires no new training server, replacement engine, account or persistence. Can be exited; rematch resets the guide.
- Source and visual identities still come from CP02 twelve CREWBOUND-only pilots; original COMBOUND cast untouched. CP05 signature, relay, win/rematch and CP06 formation editor continue to run.
- Gameplay remains real-time during simultaneous execution windows; the UI doesn't misrepresent predicted attacks as settled hits.

## Evidence
- Added six targeted native tests for exact preview→commit equality; preserved linked-offset behaviour; no simulation/log mutation; support-cooldown readiness; real rival response; proximity hints. Existing 39 native+stress become **45 expected tests** (37 previous native + 6 new native + 2 stress).
- Added three browser scenarios on both mobile/desktop emulation, covering precise A/B preview, first-go practice, independent target/pointer behaviour, reset, and the portable HTML. Existing 38 browser checks become **44 expected checks**.
- `deliveries/CREWBOUND_CP07_PLAY.html` is a *single HTML download*, assembled from the modular GitHub source with five JS modules and one inline runtime (6 scripts). `verify-cp07-delivery.cjs` reconstructs exact Git blob parity and validates syntax; delivery is a file copy, not the canonical source.
- Existing Games&Beyond House QA retains CP23 broader catalogue checks. Counts are **targets until the current-head workflow finishes**, not claims of passing tests.

## Remaining gates
- A success in GitHub Chromium on mobile-sized emulation is not physical Fold8 touch or folding and not a guarantee that the game is fun/balanced.
- The physical Fold8 first-go tutorial, open/closed screen use, device performance and owner visual acceptance remain distinct holds. New publication and stacked PR merges also require owner release approval.
- The only currently published CREWBOUND direct HTML remains `https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/index.html` (CP02). CP07 standalone review HTML is a **GitHub download to open locally**, not a publicly deployed site.

**FLAZ law:** source recovered; changed only additive descendants; gated tests and receipts must prove their exact claims; no ding without evidence.
