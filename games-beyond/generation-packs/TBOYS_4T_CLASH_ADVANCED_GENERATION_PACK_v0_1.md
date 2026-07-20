# T-Boys: 4T Clash — Advanced Generation Pack v0.1

**Route:** FORMED WORLD + PROVEN CORE CLASH SEED → FIRST FULL ADVANCED PRODUCT BODY  
**Source anchors:** T-Boys Core Clash v0.1 Final Graft; PLAYFORM / GripRoute build lane; seven-mode T-Boys architecture  
**Unity proof role:** first hybrid generation proof

## Crown

> Pick your 4T. Face their 4T. Prove your Forty.

## Product law

T-Boys is not a generic physics demo and not a Humanimals branch. It is a toy-board arcade strategy world in which characters express themselves through movement, contact, ricochet, team use and mode-specific objectives.

Core Clash is the proven ancestor and first game loop. Unity must use that ancestor to generate a fuller T-Boys product body rather than merely reskinning the browser build.

## Existing proven seed

### Core loop

```text
CHOOSE ACTIVE T-BOY
→ TOUCH
→ DRAG BACK
→ READ LAUNCH LINE
→ RELEASE
→ MOVE / COLLIDE / RICOCHET
→ DAMAGE RIVAL CORE OR CREATE FIELD CONSEQUENCE
→ RECOVER
→ CHANGE ACTIVE BODY
→ CHARGE 4T POWER
```

### First complete 4T crew

| T-Boy | Movement word | Core gameplay identity |
|---|---|---|
| **Jax** | Direct | clean line, dependable contact and readable first-use body |
| **Riko** | Bounce | ricochet and rebound route specialist |
| **Tanko** | Brace | hold, block, resist and pressure-control body |
| **Ziggy** | Curve | altered route, curved approach and angle expression |

### First rival four

| Rival | Movement word | Rival purpose |
|---|---|---|
| **Raze** | Strike | aggressive direct pressure |
| **Nyx** | Trick | deceptive angle and route change |
| **Brikk** | Block | defensive obstruction and core protection |
| **Bolt** | Shock | burst contact and disruptive speed |

### Proven product contract

- one player versus AI rival
- Bluefin versus Crimson Gear
- four selectable T-Boys
- rival core and player core
- aim-drag launch
- collision-based damage
- hazards and arena bodies
- character switching with real gameplay meaning
- 4T power charged through use of the crew
- challenge/campaign route
- receipt/proof route

## Wider T-Boys architecture

### Three main pillars

1. **Clash** — Core Clash and Crew Clash
2. **Ball Clash** — Court Clash flagship, Goal / Pass Clash and later sports bodies
3. **Fight Clash** — close-combat swipe, counter and tag route

### Supporting modes

- Reflect Clash
- Fortified Forts
- Clash Corps

These modes belong to the world architecture but are not all part of the first Unity slice. The project must make room for them through adapters without pretending they already exist as finished software.

# First Unity product contract

## Product name

**T-Boys: 4T Clash — Core Season Proof**

## Proof scene

**Scene name:** `TB_CoreClash_Proof01`

## First-playable scope

- Bluefin four: Jax, Riko, Tanko and Ziggy
- Crimson Gear four: Raze, Nyx, Brikk and Bolt
- one complete portrait-first mobile arena
- player core and rival core
- aim, drag, release and collision route
- character selection and switching
- four distinct movement behaviours
- arena bumpers and one slowing/holding hazard
- AI rival with readable intent
- 4T power requiring meaningful use of all four crew members
- three challenge levels
- round, win, reward and receipt states

## First challenge ladder

| Challenge | Objective | What it proves |
|---|---|---|
| **Bench Chemistry** | use three different T-Boys | switching is functional and character identity matters |
| **Fourfold Fire** | trigger 4T Burst twice | team-use meter and power route work |
| **Prove Your Forty** | win before Round 9 | full loop, AI pressure and pacing function together |

## Visual and spatial direction

T-Boys should look like a premium physical-digital toy board rather than a military shooter or realistic sports simulation.

The first scene should communicate:

- collectable character bodies with strong silhouettes
- bright readable teams
- tactile launch, bounce and impact
- a board with real depth and material response
- quick readable turns
- playful energy with deeper tactical routes underneath

Recommended body: **3D arena with a portrait-first camera and controlled top-oblique perspective**. The player should always understand active T-Boy, route line, rival core, hazards and expected contact.

## Input contract

### Touch primary

- tap a crew body to make it active
- contact active T-Boy
- drag backwards to create tension and route
- move finger to refine angle and power
- release to launch
- tap another available crew member between actions to switch
- use a dedicated 4T power contact only when charged

### Backup controls

Mouse and controller must reach the same game-native intent system. Buttons may aid accessibility but must not become a separate reduced game.

### Intent vocabulary

```text
CREW_SELECT
AIM_BEGIN
AIM_VECTOR
AIM_POWER
AIM_RELEASE
AIM_CANCEL
POWER_TRIGGER
CAMERA_FOCUS
PAUSE
RESET_CHALLENGE
```

## Character data contract

```text
characterId
teamId
movementWord
mass
launchPower
acceleration
friction
restitution
turnControl
collisionDamage
coreDamage
hazardResistance
signatureRule
visualProfile
voiceOrFeedbackProfile
```

## First movement adapters

### Jax — Direct

- lowest route deviation
- clear launch line
- reliable core damage
- easiest onboarding body

### Riko — Bounce

- higher restitution
- bonus after valid bumper contact
- readable ricochet preview after sufficient tension

### Tanko — Brace

- higher mass
- lower launch speed
- resists displacement
- can hold a defensive position and reduce incoming collision consequence

### Ziggy — Curve

- steerable or curved post-release route within a limited window
- lower direct damage balanced by route access
- must feel intentionally curved, not inaccurately launched

## Arena objects

- `TBGameGovernor`
- `TBBluefinCore`
- `TBCrimsonCore`
- `TBBluefinCrewRoot`
- `TBCrimsonCrewRoot`
- `TBArenaBoard`
- `TBBumperSet`
- `TBHoldHazard`
- `TBTrajectoryPreview`
- `TBInputRouter`
- `TBAIRoutePlanner`
- `TB4TPowerGovernor`
- `TBCampaignGovernor`
- `TBTraceBoxBridge`
- `TBHUD`

## Shared system, sovereign adapter

T-Boys may share the generic JM intent router, trace bridge and round governor with Western Sniper. It must not share Western Sniper's weapon, cover, peek, bullet or duel-camera assumptions.

Its own adapter owns:

- crew selection
- launch physics
- movement words
- core damage
- hazard contact
- character availability
- 4T power
- challenge objectives

## 4T power law

The first proof uses the current product principle:

```text
meaningful use of the crew
→ four identities registered
→ team meter charged
→ 4T Burst becomes available
```

The power must not charge through idle button tapping. A character counts when it completes a valid launch/contact action in the current challenge.

## AI contract

The rival AI must be readable before it becomes difficult.

First proof behaviours:

- chooses an available rival body
- predicts a limited set of launch paths
- values direct core contact, useful ricochet and defensive block
- telegraphs selection and intended route briefly
- operates at Standard, Sharp and Relentless challenge profiles

No hidden perfect prediction.

## TraceBox minimum events

- challenge loaded
- crew member selected
- aim begun
- launch released
- bumper contacted
- hazard contacted
- rival contacted
- core damaged
- crew identity registered
- 4T meter changed
- 4T power triggered
- challenge objective progressed
- round ended
- challenge completed
- reward issued
- proof exported

# First Ding test

```text
Open TB_CoreClash_Proof01
→ start Bench Chemistry
→ launch Jax directly
→ switch to Riko and score a bumper route
→ switch to Tanko and resist displacement
→ switch to Ziggy and reach a curved route
→ confirm three-character objective progress
→ charge and trigger 4T power through valid crew use
→ damage the rival Core to zero
→ complete the challenge
→ export TraceBox receipt
```

## Pass conditions

- all four player bodies feel mechanically different
- selection changes behaviour rather than only appearance
- touch aim is stable and adjustable before release
- collision and core damage are readable
- hazards alter route predictably
- AI telegraphs its move and remains beatable
- 4T power requires valid crew participation
- portrait phone view contains all required information
- no horizontal UI overflow
- receipt records challenge and identity routes

## Honest first proof boundary

This first slice does **not** claim:

- all forty T-Boys implemented
- Court Clash, Goal / Pass Clash, Fight Clash, Reflect Clash, Fortified Forts or Clash Corps complete
- online multiplayer
- final monetisation/progression system
- final character art, voice or animation
- complete campaign

It proves that the T-Boys world can become a full advanced product body while keeping Core Clash as an ancestor and maintaining room for sovereign future modes.

## Next earned output

Create the Unity import tree, T-Boys character definitions, four movement adapters, Core Clash scene bootstrap, campaign objective definitions and TraceBox bridge before opening the laptop.
