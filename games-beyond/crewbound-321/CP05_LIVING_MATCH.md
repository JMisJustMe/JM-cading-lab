# CREWBOUND 3+2+1 — CP05 Living Relay Clash
**Scope:** Additive gameplay polish on the previously source-verified CREWBOUND 3+2+1 descendant. This is not a new game replacement or a change to COMBOUND or original CREWBOUND Arena v0.5.

## Ancestry / custody
- Original CREWBOUND v0.5 authored source checksum (the original PrimeBody carrier): `5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7`. Preserved in `roster.js`.
- CP02 gives CREWBOUND twelve new pilots and silhouettes: six player, six rival. `cast.js` / `art.js` remain the original sources of visual identity; not copied from COMBOUND.
- CP03 protected clock repair, PR #784; CP04 protected independent A/B pair planning, PR #785. CP05 branches from CP04's reconciled keeper at `bef8bbf861aa8aa39db12e4494c6b634b6cc508b`.
- CP05 is a separate draft for game refinement, not an automatic merge or published replacement. The historic source originals and their branches/PRs retain authority.

## What CP05 actually adds
- `combat-kit.js`: **twelve bespoke attack/defense/signature profiles**, keyed to the existing exclusive CREWBOUND pilots. Kepler's directional momentum, Ironvale's charge/shockwave, Solace's ally relay, Locke's gate protection, Aster's pulse splash, Nox's mark/precision, Static's phase blink, Latch's bind, Ember's rhythm wave, Wrought's heavy siege resilience, Vivid's long-reach parry, Dasher's high-speed drift. Separate range, damage and cooldown tuning; no renamed visual clones. Original donor physics remain traceable.
- **Two-character tactical synergy**: the chosen pair share a small damage improvement only when physically near one another during the active window. Separate A/B commands and the one-tap BOTH shortcut remain intact. No unlimited extra actions.
- **Rival planning**: rival AI continues simultaneous two-fighter decisions, including guard, movement and yard support. Predictions factor in current opposing velocities; injured fighters bias toward defence.
- **Two living relay zones**: contested circular locations in the original arena reward actually occupying them. Relays contribute modestly to the three-minute result alongside remaining crew health; no automatic score for an empty or contested circle.
- **Match flow**: player/rival health, relay score, contacts, assists, combo hits and result reason. Visible victory/defeat panel, rematch and clean reset.
- **Tactile UI**: existing GripCube-inspired compact horizontally arranged 3+2+1 cards and independent A/B destinations are retained; native Canvas receives signature flashes and relay ring feedback. Full arena remains the active play space. Existing Visualang/artist donors remain separate bodies rather than being imported/overwritten.
- **Offline review HTML**: `deliveries/CREWBOUND_CP05_PLAY.html` contains five source JavaScript modules plus the page runtime, all in one file, for instant phone opening. `deliveries/verify-cp05-delivery.cjs` deterministically checks exact SHA-1 Git blob identity, source parity and script syntax. Delivery is a copy, not a new source keeper.

## Explicit testing gates
- Node game contract: original 23 tests plus **8 new CP05 tests** for unique skills, injury mitigation, signatures, pair proximity, relay capture, match end, yard contribution and source trace.
- Playwright mobile + desktop: original 11 tests plus **5 CP05 tests** for new HUD, signature animations, time-limit result, 360px touch operation and the standalone offline HTML itself. Tests use direct pointer events, not just static screenshots.
- Existing GitHub Games&Beyond full House QA retains its CP22/CP23 game-door coverage, source governance and 22–24 composition workflow.
- **Do not claim PASS until CI actually runs.** A successful browser emulator is not Fold8 physical play. Owner must visually test and accept equipment silhouettes, balance and touch controls on the real phone.
- Publication and PR merges require explicit owner permission. Current official playable CP02 direct HTML remains `https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/index.html`.

## FLAZ closure definition
1. Source saved and original checksum/ancestry preserved.
2. New behaviours observed in native tests and mobile/desktop browser interactions.
3. Standalone HTML matches source and opens without external assets.
4. Device touch, fold-state, owner fun/visual acceptance, optional difficulty/sound polish remain independent holds.
5. Any subsequent live production deployment must carry its own release check and owner approval.

**No Ding, No Claim:** native CI is not physical device; working review HTML is not live public publication; one distinct game with multiple deliberate entrances.