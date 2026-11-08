# JM CREWBOUND CP08 — Match Reliability, Fair Pilot Progress & Portable Recovery

## Original recovery and lineage
- Original CREWBOUND Arena v0.5 PrimeBody remains independently preserved: SHA-256 `5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7`.
- COMBOUND is a different original game, not a graphics donor to replace CREWBOUND.
- Independent additive lineage remains distinct: CP03 clock repair PR #784; CP04 separate fighter plans #785; CP05 individual combat kits and relay match #794; CP06 starting lineup #795; CP07 exact pair preview and practice #796. CP08 is stacked on CP07's exact verified head `e0ff5afe0a1ab12444168d195cc8e6bd48170e2c`. No earlier branch or published live CP02 is changed.

## CP08 gameplay and interruption repairs
- **Atomic two-fighter orders:** if an issued order fails, all interim unit changes, shield/damage, assist statistics, random generator state and receipts from the attempted commitment roll back. The first fighter no longer receives a free action or spend when the second fighter's order fails.
- **Fair crew experience:** actual hits, damage, yard assists, guards and signature actions contribute to per-pilot after-match experience. All six player's fighters earn progress including reserves; results are awarded once. Grades ROOKIE, SCOUT, TACTICIAN, VETERAN and ACE are recognition only. **Grades confer absolutely no speed, hit-point, power, cooldown or matchmaking advantage.** A same-seed high-rank vs starting-rank regression demands identical combat.
- **Persistent accurate rival receipt:** last actual two-rival-order response survives bounded on-screen event-log turnover. Never claims predicted attacks are already committed.
- **Optional match save:** save to browser-local storage on a deliberate click; no automatic background upload or app account. Export/import a plain JSON capsule to transfer between devices. Capsules contain exact source lineage, cast identity, complete units, formation, roles, current orders and targets, relay state, career, statistics, current clock and deterministic RNG position. Checkpoint validation rejects foreign cast/original SHA, illegal roles, forged body data, invalid JSON, oversized data, unsafe targets, invalid career and excessive receipts without replacing the currently playing game.
- **Comfort priority:** imported match opens paused, user chooses RESUME. Tab/page visibility loss pauses active play; no forced foreground hijacking.
- **Full original game UI retained:** simultaneous two-person decisions, rival motion, unique kits and silhouettes, optional dice, 3+2+1 role editor, contested objectives, win/loss and rematch. Small screens retain focusable large targets and the same full playable arena; save interface is intentionally collapsed.

## Test receipts and scope
- GitHub `Games&Beyond QA` now runs the existing 45 native/stress contracts plus eight new CP08 capsule, atomic-fairness, progression and original-custody cases (53 total expected); plus five new browser tests across mobile/desktop (56 expected), including direct execution of portable standalone HTML.
- `continuity.js` is an additive optional module; original `roster.js`, `cast.js`, `art.js` and `combat-kit.js` stay unmodified. `sim.js` supports deterministic checkpoint recovery without changing the original movement/attack/speed equations.
- `deliveries/CREWBOUND_CP08_PLAY.html`: one-file review HTML, seven inline scripts (six source modules + page runtime); `verify-cp08-delivery.cjs` verifies exact Git blob source parity and syntax. A user-facing download role, NOT production HTML publication.
- GroundZeroJM ASUS host confirmed online with Node and Git, and original local Unity checkout was protected: its uncommitted Unity files were not modified. A temporary memory-only source loader read the new branch with `git show` and completed 53/53 local Node tests after fixing one malformed-JSON fixture length. This is local host evidence, not physical Fold8 gameplay.
- Physical Fold8 ADB transport was confirmed and viewport observations read without foreground interaction: 1080×2520 cover display; 2256×2504 second internal display reported inactive. No game was launched or touched on Fold8 by CP08.
- Do not assert CP08 GitHub CI PASS until its actual final-head workflow results are inspected. Source + local runtime ≠ CI ≠ Fold8 physical acceptance.

## Final independent owner/release holds
- Physical Fold8 touch/play on both cover and unfolded screens, phone call interruption, owner visual/fun/balance acceptance remain physical/owner holds.
- Only single-player/local AI battle is implemented; no real human PvP, backend matchmaking, ranked-authoritative progression or unproven cross-game 96-character sync is claimed.
- Earlier protected PRs and any new CP08 PR must not be merged to `main` or published without a specific release decision. New HTML distribution is via source-traceable GitHub review download; currently published direct CP02 remains `https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/index.html`.

**Law:** Source recovered, no reauthoring originals; actual native/API/host/physical evidence labelled by scope. Keep one keeper with multiple entrances; no ding without proof.
