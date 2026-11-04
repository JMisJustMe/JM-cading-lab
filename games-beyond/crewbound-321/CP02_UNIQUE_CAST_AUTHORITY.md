# CREWBOUND 3+2+1 — CP02 Twelve Exclusive Pilots

**Authority:** The existing `JM.CREWBOUND.GAME_SOURCE/0.5` PrimeBody is the historical mechanics donor. Exact archived HTML SHA-256: `5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7`. Existing COMBOUND is separate, and its original shared-looking character designs are neither copied nor altered.

**User creative instruction (4 Nov 2026):** CREWBOUND must have its *own*, recognisably different characters from COMBOUND; prefer direct working HTML links for review; save continuing work to existing GitHub rather than sending code-page links.

## What changed
- Created `cast.js`: **12 exclusive playable identities**, six on each side, each with a unique silhouette, equipment, colour palette, original player-facing name, movement profile, offensive manoeuvre, defensive manoeuvre, signature title and personality.
- Created `art.js`: custom authored **humanoid tactical pilots / crew sports combatants** in canvas, individually equipped with wing skates, broad armour, relay ribbons, tower shield, solar rings, rangefinder, split boots, chain spool, resonance drums, siege rig, energy lance or glide wheel. All independently drawn locally in JavaScript; no externally borrowed creature art.
- Retained `roster.js` as an **unmodified, explicit PrimeBody mechanics donor**; `cast.js` documents which ancestor gives each character their HP, mass, power and effect ancestry. Historical names are NOT playable-display identities.
- Sim now selects the exclusive roster, moves each fighter according to individual manoeuvres and retains verifiable donor combat laws via an explicit `archetype` key rather than overloading their new names.
- `index.html` uses new full-body silhouettes on field and clean standalone portraits in character cards, with **stable touch controls** (no DOM destruction/recreation every animation frame).
- `cast.html` gives the owner a **separate direct HTML gallery**, with all 12 portraits, profile details, player/rival filters, and a silhouette-only comparison toggle. It links back to the playable game.
- Original Games & Beyond 22-body payload, COMBOUND and CREWBOUND v0.5 remain byte-for-byte untouched.

## 12 character designs

| Side | Exclusive identity | Combat role | Unique visual kit | Mechanical donor |
|---|---|---|---|---|
| SHIFT | Kepler | Skyline skater | Twin fin skates; aerodynamic winged helmet | Zipp |
| SHIFT | Ironvale | Anchor bruiser | Oversized hydraulic gauntlets and heavy shoulders | Brax |
| SHIFT | Solace | Relay choreographer | Flowing twin signal ribbons and dancer coat | Mira |
| SHIFT | Locke | Gate captain | Full-height tactical barrier and tower visor | Grove |
| SHIFT | Aster | Pulse aerialist | Floating ring hoops and split solar cape | Orbi |
| SHIFT | Nox | Stealth line-reader | Angular rangefinder, facemask and scarf | Vexa |
| COUNTER | Static | Phase acrobat | Split-jacket, antenna hair and spring boots | Skip |
| COUNTER | Latch | Bind specialist | Chain spool and grappling hook lance | Knot |
| COUNTER | Ember | Blast percussionist | Twin resonance drums and heat visor | Orbi |
| COUNTER | Wrought | Siege wall | Crawler armour, ram collar and bulk headwear | Grove |
| COUNTER | Vivid | Laser fencer | Energy lance and pointed fencing helmet | Vexa |
| COUNTER | Dasher | Low-gravity rider | Single glide wheel and asymmetrical rider armour | Zipp |

## Gameplay authority and fairness
- The new game still runs 3 floor + 2 yard + 1 flex per crew, with exactly two selected player orders per command window and simultaneous rival floor and support commands.
- All twelve `cp01_proposed_speed` values are distinct. Additional manoeuvre tunings include banking, charging, weaving, anchoring, orbiting, sidestepping, zigzagging, luring, pulsing, fencing and drifting.
- Original combat donor keys are source metadata. Each new character has its **own signature name**, outfit and identity. Damage laws remain explicitly attributable to the original donor archetype and are not claimed as twelve entirely independent combat engines.
- Two descendant-specific health tuning differences: Wrought gets +5% to Grove-derived HP; Dasher gets -4% to Zipp-derived HP. Donor baseline remains intact in `roster.js`.
- No pay-to-win mechanic and no random dice gate to play; optional die provides a small bounded modifier.
- Character motion and relationship balance are **prototypes**, not claims of final competitive balancing or full animations.

## Gates
- Stage 1: existing CP01 16/16 native engine tests; mobile+desktop Chromium 8/8 pass.
- Stage 2: CP02 native tests and Chromium gameplay/portrait/gallery/touch stability tests must pass **after** the new cast changes. Use existing `Games&Beyond QA` pipeline and source authority manifest; no dummy certificates.
- Stage 3: merge only to separate `games-beyond/crewbound-321/` directory on the existing GitHub Pages site; never change `?jm-play=crewbound-arena`.
- Stage 4: verify **real public HTTPS direct HTML** for both `/crewbound-321/index.html` and `/crewbound-321/cast.html`.
- Stage 5: Fold8 physical finger-tap, fold/unfold and owner visual approval separate holds. Owner may propose visual redesign without endangering the original.

**JM law:** Recover → Identify → Connect → Improve → Verify. No Ding, no claim. One body, one hot authority and one independent recovery route.
