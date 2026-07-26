# T-Boys Duo Circuit v0.1 — Native Source Stack

## `01_TBOYS_DUO_CIRCUIT.cading`

```txt
CADBODY TBOYS_DUO_CIRCUIT v0.1
AUTHORITY Theodore Benjamin Scott / JM / JMISJUSTME
MODE CRAFTIK / CURRENT-BEST FLOORBOARD BUILD

BODY Team.Bluefin = [Aero, Nova]
BODY Team.CrimsonGear = [Raze, Grit]
BODY Arena.CracklineCircuit
BODY Field.RouteCore
BODY Zone.CrackSpot
BODY Rail.NorthEast
BODY Rail.NorthWest
BODY Rail.SouthEast
BODY Rail.SouthWest

SIGNAL select.active
SIGNAL select.partner
SIGNAL aim.anchor
SIGNAL aim.route
SIGNAL aim.force
SIGNAL aim.release
SIGNAL contact.fighter
SIGNAL contact.rail
SIGNAL contact.crackspot
SIGNAL damage.transfer
SIGNAL state.marked
SIGNAL state.anchored
SIGNAL state.unstable
SIGNAL state.fractured
SIGNAL momentum.gain
SIGNAL assist.open
SIGNAL assist.commit
SIGNAL tag.commit
SIGNAL surge.ready
SIGNAL core.break
SIGNAL ko
SIGNAL last.body
SIGNAL match.ding

ROUTE SELECT_DUO -> SET_RELATION -> SELECT_ACTIVE -> AIM_ANCHOR -> ROUTE_SHAPE -> FORCE -> PREVIEW -> RELEASE -> TRAVEL -> CONTACT -> TRANSFER -> PARTNER_RESPONSE -> FIELD_CHANGE -> SETTLE -> RECOVER_OR_FINISH -> TRACE

STATE lobby | ready | player_aim | player_action | settle | enemy_read | enemy_action | assist_window | broken_duo | victory | defeat | paused

TRACE shot.open
TRACE shot.release
TRACE rebound
TRACE impact
TRACE damage
TRACE state.change
TRACE assist
TRACE tag
TRACE surge
TRACE core.break
TRACE ko
TRACE match.end

LAW Nothing begins below the strongest relevant proven quality equivalent.
LAW Scope may narrow from larger teams to two fighters; gameplay, consequence, identity, control and presentation may not silently weaken.
LAW Both fighters remain operationally relevant through active embodiment, assist, tag, linked state, cover, recovery and broken-duo consequence.
LAW Donors supply organs; the flagship authors its own body plan.
```

## `02_TBOYS_DUO_CIRCUIT.kading`

```txt
KADING TBOYS_DUO_CIRCUIT v0.1

RELATION Bluefin.Aero <-> Bluefin.Nova = SKYLINE_RELAY
RELATION Crimson.Raze <-> Crimson.Grit = CRASHWALL
RELATION Active <-> Partner = LIVE_DUO
RELATION Fighter <-> AimProfile = CHARACTER_HAND_GRAMMAR
RELATION Fighter <-> Arena = CONTACT_CHANGES_FIELD
RELATION Team <-> Momentum = PRESSURE_MEMORY
RELATION CrackSpot <-> Impact = ROUTE_CORE_CHARGE
RELATION KO <-> Partner = LAST_BODY_HANDOFF

DONOR_ORGANS
- FOURFOLD: live assist, counter-pressure, last-body consequence, arena reaction, relation sentence, recovery and battle voice.
- T-BOYS: Bluefin/Crimson identity, named units, health spine, drag-aim-release, energy/action rail and toyetic collision feedback.
- SPLITSHADOW: movement identity, momentum, pressure states, wall mastery and collision spectacle.
- BEASTSTEP_CLASH: Flick / Flow / Manual are translations of one combat truth; Flick is implemented first.
- AIM_CONTACT_FLOORBOARD: Direct, reverse/slingshot, flick, arc, tether, moving-target pressure and persistent-cursor routes remain selectable organs.

SOVEREIGN_BODY
- Camera: portrait tactical theatre, locked field with restrained impact kick.
- Playfield: vertical Crackline Circuit with diagonal reaction rails and central Route Core.
- Unit embodiment: character-shaped vector bodies, not pucks.
- HUD: top rival duo, central field, bottom player duo/action rail.
- Match loop: duel turns with live partner response, momentum reversal and KO handoff.
- Progression seed: rematch adaptation and post-match route choice.
```

## `03_TBOYS_DUO_CIRCUIT.jmlogic`

```txt
JMLOGIC TBOYS_DUO_CIRCUIT v0.1

BATTLE_PREMISE
The Crackline Circuit routes movement into access across the city. Bluefin keeps the route open. Crimson Gear seeks command. Every collision writes pressure into the floor; a full Route Core opens a Break Window.

WIN
A team wins when both rival fighters are knocked out.

ACTIVE_PARTNER
- Exactly one fighter is ACTIVE for ordinary aim.
- The other remains a LIVE PARTNER.
- TAG swaps active and partner before release.
- ASSIST commits the partner to a secondary route after the active release.
- A partner can be struck, shielded, marked, anchored, fractured or knocked out.
- When the active fighter is knocked out, the surviving partner inherits ACTIVE and enters LAST BODY.

AIM
- Default battle method is reverse/slingshot Flick: touch active body, pull away, release toward the opposing route.
- Pull distance controls force; fighter profile reshapes force, preview and consequence.
- Finger position is not the fighter; anchor, route, force and release remain separate bodies.
- Aim preview is informative, not a guaranteed future: state, collision and opponent movement may alter it.

DAMAGE
- Damage derives from relative impact speed, attacker impact identity, defender mass and state.
- Clean committed hits must materially change health, position, state, momentum or partner relation.
- Weak contacts may reposition without full damage but still trace.
- Strong impacts receive hit-stop, camera kick, transformation and battle voice.

PRESSURE_STATES
MARKED: next meaningful rival hit deals increased damage and clears the mark.
ANCHORED: knockback reduced, own launch force reduced, defence increased.
UNSTABLE: force and route carry slight variance; damage dealt and received increase.
FRACTURED: low-health body visibly cracks; the next high-impact clean hit may KO.

MOMENTUM
- Gain from damage, wall mastery, CrackSpot contact, assists, counters and surviving a heavy hit.
- At 100, SURGE becomes available.
- Momentum is pressure memory; it may be spent for a duo surge or preserved for defence.

CRACKSPOT
- Crossing or striking the central zone adds Route Core pressure.
- At 100, the team receives one BREAK WINDOW.
- The next meaningful hit during Break Window adds damage, stronger field transformation and Core Break trace.

RECOVERY
- Physics settle before the next aim.
- Fighter positions are not automatically reset.
- Out-of-bounds routes return through an arena rail with consequence, not free mercy.
- Last Body receives a small momentum pulse, not a full restoration.

AI
- AI reads visible positions, health, states and route geometry only.
- AI may aim, tag, assist and use ability through the same battle permissions as the player.
- No hidden damage multiplier exists merely because the rival is AI.
```

## `04_TBOYS_DUO_CIRCUIT.flowtalk`

```txt
FLOWTALK TBOYS_DUO_CIRCUIT v0.1

READY = "Pull back from your active T-Boy. Release to send the route."
SELECT_AERO = "Aero reads the clean line."
SELECT_NOVA = "Nova bends the answer."
SELECT_RAZE = "Raze wants the shortest violent route."
SELECT_GRIT = "Grit makes the ground take sides."
ASSIST_OPEN = "Partner route is open."
ASSIST_SKYLINE = "Skyline Relay — the second body follows the first answer."
ASSIST_CRASHWALL = "Crashwall — pressure arrives behind armour."
TAG = "Active body changed. The duo remains live."
MARKED = "The next clean contact knows where to land."
ANCHORED = "This body will move, but not cheaply."
UNSTABLE = "The route is alive and dangerous to both sides."
FRACTURED = "One more real answer may end this body."
SURGE_READY = "Pressure has become permission."
CORE_BREAK = "The floor opened. The hit carried the whole circuit."
LAST_BODY = "One fighter now carries the whole duo."
VICTORY = "Bluefin kept the route open."
DEFEAT = "Crimson Gear seized the circuit."

BATTLE_VOICE
AERO_HIT = "CLEAN LINE."
NOVA_HIT = "THE ANGLE WAS WAITING."
RAZE_HIT = "NO ROOM LEFT."
GRIT_HIT = "THE FLOOR CHOSE."
WALL_MASTER = "THE RAIL RETURNED IT."
DUO_CHAIN = "TWO BODIES. ONE ROUTE."
KO = "BODY BROKEN. ROUTE CHANGED."
```

## `05_TBOYS_DUO_CIRCUIT.routecode`

```txt
ROUTECODE TBOYS_DUO_CIRCUIT v0.1

route battle.start when cast.ready and arena.ready -> spawn.duos -> set.active -> state.player_aim -> trace
route aim.open when state.player_aim and pointer.down on active.alive -> capture.anchor -> preview.open
route aim.shape when pointer.move and aim.open -> calculate.reverse_vector -> profile.transform -> preview.update
route aim.release when pointer.up and pull >= minimum -> velocity.commit -> ability.apply -> state.player_action -> trace
route impact.resolve when fighter.contact -> relative_force -> state.consume -> damage.transfer -> momentum.gain -> field.react -> voice -> trace
route rail.resolve when rail.contact -> rebound -> rail.mastery -> momentum.gain -> trace
route crackspot.resolve when fighter.or.impact enters CrackSpot -> core.pressure + value -> break_window? -> trace
route assist.commit when assist.available and player.action.open -> partner.route -> duo.relation -> trace
route tag.commit when state.player_aim and partner.alive -> swap.active -> trace
route ability.commit when state.player_aim and energy >= cost -> arm.fighter_ability -> trace
route surge.commit when state.player_aim and momentum == 100 -> spend.momentum -> arm.duo_surge -> trace
route settle.complete when all_speed < threshold for settle_window -> evaluate.ko -> handoff.last_body -> switch.turn
route ai.open when turn.enemy -> read.field -> choose.active -> choose.target -> choose.route -> optional.assist_or_ability
route match.end when team.living == 0 -> state.victory_or_defeat -> trace -> ding

GUARDS
- dead fighter cannot aim, assist or tag.
- player cannot release while modal or pause is active.
- assist cannot be used twice in one team cycle.
- ability and surge must show armed state before release.
- no next turn until moving bodies settle or timeout recovery resolves.
- no UI control exists without a live route.
```

## `06_TBOYS_DUO_CIRCUIT.quadze`

```txt
QUADZE TBOYS_DUO_CIRCUIT v0.1

NODE C = Route Core / CrackSpot
ROUTES N NE E SE S SW W NW

FIELD
N  = Crimson rear lane
NE = reaction rail / trick angle
E  = east pressure lane
SE = Bluefin attack rail
S  = Bluefin rear lane
SW = Bluefin support rail
W  = west pressure lane
NW = Crimson support rail
C  = contested core

HANDOFFS
ACTIVE -> PARTNER = assist, tag, cover, last-body inheritance
BODY -> RAIL = rebound, wall mastery, route extension
BODY -> CORE = pressure charge, break window
AIM -> RELEASE = intention becomes movement
CONTACT -> STATE = movement becomes consequence
STATE -> TRACE = consequence becomes recoverable memory

POSITION != DIRECTION
DIRECTION != MOVEMENT
ROUTE != TRAVELLER
MOVEMENT != TRACE
```

## `07_TBOYS_DUO_CIRCUIT.gamecore`

```txt
GAMECORE / PLAYFORM TBOYS_DUO_CIRCUIT v0.1

SIMULATION_OWNS
fighters, positions, velocity, health, energy, momentum, states, turn, active/partner relation, cooldowns, CrackSpot pressure, break windows, collision results, win state, serializable trace.

PHASER_OWNS
containers, procedural character drawing, camera, particles, aim preview graphics, impact rings, text callouts, tweened UI response and pointer plumbing.

DOM_OWNS
team cards, health, momentum, action buttons, intro/pause/result drawers, accessibility labels, trace export and settings.

FIXED_STEP 1/120 second
MAX_CATCHUP 8 steps
WORLD 900 x 1200 portrait tactical field
CAMERA locked + restrained impact kick
SAVE serializable simulation state only

INPUT_ACTIONS
select_active
open_aim
shape_aim
release_aim
tag
assist
ability
surge
pause
restart
open_trace

FIRST_COMPLETE_LOOP
intro -> player aim -> meaningful collision -> partner response -> enemy answer -> pressure/reversal -> KO/last body -> finish -> rematch
```

## `08_TBOYS_DUO_CIRCUIT.visualang`

```txt
VISUALANG PLAY TBOYS_DUO_CIRCUIT v0.1

SHAPE
Aero = forward fin / clean vector body.
Nova = orbit wing / curved route body.
Raze = split blade / pressure wedge.
Grit = plated block / anchored mass body.

COLOUR
Bluefin cyan/blue = open route, precision, relay.
Crimson red/orange = seizure, pressure, heat.
Gold = charged permission / momentum / Break Window.
Violet = route bend / unstable relation.
Green = recovery / shield / live support.

POSITION
front lane = active pressure.
rear lane = partner support and vulnerability.
centre = contested Route Core.
rail contact = route extension and risk.

MOTION
pull line = stored direction and force.
path dashes = predicted route, not guarantee.
trail thickness = speed/commitment.
body lean = current route.
partner pulse = duo relation becoming active.

CONTACT
fighter impact = force transfer.
rail spark = angle rewritten.
CrackSpot ring = field remembers contact.
assist line = one body lending route to another.

TRANSFORMATION
health loss = armour/crack/body-light reduction.
Marked = target chevrons converge.
Anchored = ground braces appear.
Unstable = outline splits/oscillates.
Fractured = visible body cracks and exposed core.
KO = body breaks into retained trace shards, not a silent disappearance.
Core Break = arena floor opens with a luminous route fracture.

TRACE
action trace stays hidden during ordinary play, surfaces as concise battle voice, then remains exportable after the match.

SUNNY_GATE
Logic must be readable through shape, movement, contact and transformation before explanation.
SONNY_GATE
The first seconds must invite pull, release, impact and another turn.
```

## `09_TBOYS_DUO_CIRCUIT.tracebox`

```txt
TRACEBOX TBOYS_DUO_CIRCUIT v0.1

RECEIPT_FIELDS
at
match_id
turn
team
active
partner
action
method
anchor
pull
force
profile
ability
assist
contacts
rail_contacts
crackspot_pressure_before
crackspot_pressure_after
damage
state_changes
momentum_before
momentum_after
ko
last_body
outcome
claim_boundary

DING_LEVELS
SOURCE_DING = all native bodies present and mutually consistent.
STATIC_DING = TypeScript compiles, assets/controls/routes are present, no dead action IDs.
BROWSER_DING = full match loop executes in browser with player and AI actions.
PHONE_DING = owner confirms aim, release, impact and UI feel on phone.
SONNY_DING = observed recipient chooses to continue/retry and can read the core action without architecture narration.

NO_CLAIM
No browser, phone, feel or Sonny Ding may be claimed from source/static inspection alone.
```

## `10_TBOYS_DUO_CIRCUIT.carrier`

```txt
CARRIER CONTRACT TBOYS_DUO_CIRCUIT v0.1

STACK Phaser 3.90 + TypeScript 5.8 + Vite contract + DOM HUD
DELIVERY static browser build + editable source project + Zionfolder
ASSET POLICY procedural vector character bodies in first current-best body; stable manifest keys; no blank pucks or generic debug circles.
RUNTIME POLICY simulation outside Phaser scene; scene adapts state; DOM handles dense text/action surfaces.
MOBILE portrait first; touch-action none on playfield; controls >= 44px; safe-area aware.
PERFORMANCE fixed simulation; bounded particles; no unbounded traces; reduced-motion support.
DEPENDENCY BOUNDARY current package includes a CDN Phaser loader because the build environment could not vendor the Phaser binary. Vite/npm source contract is included. Browser execution therefore requires network access unless Phaser is later vendored locally.
```
