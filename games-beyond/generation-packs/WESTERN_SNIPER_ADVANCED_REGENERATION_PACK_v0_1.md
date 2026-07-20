# JM Western Sniper PvP — Advanced Regeneration Pack v0.1

**Route:** EXISTING PROVEN GAME → ADVANCED REGENERATION  
**Source anchor:** JM Western Sniper PvP — Identity & Fields v0.5  
**Mounted status:** STAGE-READY / MOUNTED  
**Unity proof role:** first advanced regeneration slice

## Keeper

> Rebuild the body upward. Preserve the tension, route choice, simultaneous fairness and field consequence.

## Existing source identity that must survive

### Governing stack

```text
PrimeBody
→ JM Game Native Core
→ GameForge
→ RouteOS
→ Quadze TapPlace Tension
→ TraceBox
→ FOURFOLD Field Memory donor organ
→ OneBody
```

FOURFOLD contributes field-memory technology only; Western Sniper remains its own live precision duel.

### Existing route frame

```text
SELECT FIGHTER
→ SELECT FIELD
→ CONTACT
→ PLACE
→ TENSION
→ SIGNATURE MOVE OR DODGE
→ PEEK
→ RELEASE
→ RECOIL
→ FIELD ROUTE
→ COVER BREAK OR CONTACT
→ DAMAGE
→ RECOVER
```

### Existing player-facing bodies

**Fighters**

| Fighter | Movement identity | Handling consequence |
|---|---|---|
| **Longshot** | Steady rifle | measured movement, cleaner rifle tension, lower recoil, heavier rifle identity |
| **Quickhand** | Fast revolver | faster feet, rapid revolver recovery, stronger short-cycle handling |
| **Drifter** | Moving aim | keeps aim coherent while changing route; movement and shot preparation remain connected |

**Fields**

| Field | Identity | Mechanical law |
|---|---|---|
| **Dustfall** | calm street | neutral field for pure contact reading |
| **Red Canyon** | crosswind | up-canyon wind bends longer bullet routes |
| **Moon Mine** | low light | visibility pressure makes glints and lanterns more important |

**Weapons**

- Rifle — slower, heavier, stronger damage and head-contact potential
- Revolver — faster reload/recovery, wider spread, quicker contact rhythm

### Existing fairness and contact laws

- simultaneous routes rather than an arbitrary first-turn gift
- local dual touch plus AI-live route
- movement while preparing aim
- cover snap, peek and cover protection
- dodge burst with cooldown and duration
- weapon-specific recoil, reload, speed, spread and damage
- projectile travel rather than instant fake contact
- trade window for near-simultaneous shots
- breakable cover and cover penetration
- field wind, visibility and glint pressure
- trace receipt and field memory

## Active-route additions to preserve

Later Western Sniper development established additional requirements that the advanced body must carry:

- primary and alternative aiming methods
- glide/follow adjustment after the initial aim location
- all backup controls connected to touchscreen play
- destructible protection with meaningful health
- distinct guns rather than cosmetic cycling
- ricochet and explosive-material possibilities
- richer 3D spatial presentation

The alternative aim may reuse a proven direct-tracking donor organ, but Western Sniper must not be collapsed into Dead Reckon or House Siege.

# First Unity playable contract

## Proof scene

**Scene name:** `WS_Dustfall_Proof01`

## First-playable scope

- one complete **Dustfall** 3D arena
- one human player versus one AI rival
- **Longshot** and **Quickhand** selectable; Drifter data present but not required for first Ding
- rifle and revolver
- two destructible cover structures per side
- movement, cover snap, peek, dodge, aim, glide-follow, release, recoil, projectile travel, impact, damage, recovery and round reset
- AI pace: Fair
- best-of-three round governor
- TraceBox proof export

## Camera and spatial direction

Use a side-readable 3D duel space rather than an unrestricted first-person shooter.

The player must be able to read:

- both fighters
- cover health
- projectile route
- cross-field depth
- glint and exposure
- impact material

Recommended first body: **2.5D side duel rendered in full 3D**, with controlled depth lanes and a camera that can briefly tighten during aim and impact without hiding the opponent.

## Input contract

### Touch primary

- **left contact zone:** move / route control
- **right contact zone:** place aim point, hold tension, glide/follow adjustment, release to shoot
- **quick gesture:** dodge
- **weapon contact:** rifle/revolver swap
- **cover proximity:** automatic cover snap with explicit peek exposure

### Backup controls

Every visible button must call the same intent route as touch. No separate weaker button-only implementation.

### Intent vocabulary

```text
MOVE_AXIS
AIM_BEGIN
AIM_PLACE
AIM_TENSION
AIM_ADJUST
AIM_RELEASE
AIM_CANCEL
DODGE
WEAPON_SWAP
PEEK_BEGIN
PEEK_END
```

## World objects

- `WSGameGovernor`
- `WSPlayer01`
- `WSRivalAI`
- `WSCover_Player_A/B`
- `WSCover_Rival_A/B`
- `WSProjectilePool`
- `WSField_Dustfall`
- `WSCameraRig`
- `WSInputRouter`
- `WSTraceBoxBridge`
- `WSHUD`

## Material-contact table

| Material | Rifle response | Revolver response | Proof requirement |
|---|---|---|---|
| timber cover | penetration chance + heavy splinter | repeated chip damage | visible cover health and staged break |
| stone edge | deflect/fragment at shallow angle | small ricochet possibility | readable spark/dust and altered route |
| metal plate | clear ricochet at valid angle | sharper but lower-energy rebound | audio + trail confirms changed route |
| fighter body | high damage, strong recoil recovery | lower damage, faster next-cycle | distinct hit reaction and damage trace |

Explosive barrels or special ammunition remain Stage 2 unless the first slice reaches Ding without destabilising touch, aiming or performance.

## Character handling data

Character identity must be data-defined rather than hidden in scene code:

```text
fighterId
moveSpeed
acceleration
steadyFactor
rifleSpread
revolverSpread
rifleReloadFactor
revolverReloadFactor
dodgeSpeed
dodgeCooldown
recoilFactor
damageFactor
movingAimFactor
signatureTrail
```

## Arena data

```text
fieldId
windVector
visibilityFactor
glintFactor
coverLayout
materialSet
lightingProfile
fieldMechanic
```

## TraceBox minimum events

- match started
- fighter selected
- field selected
- weapon switched
- aim begun
- aim adjusted
- shot released
- projectile deflected
- cover damaged
- cover broken
- fighter hit
- dodge triggered
- trade contact
- round ended
- match ended
- proof exported

# First Ding test

```text
Open WS_Dustfall_Proof01
→ choose Longshot
→ move using left-side touch
→ snap to cover
→ place and hold rifle tension
→ adjust aim without restarting it
→ release and visibly damage rival cover
→ swap to revolver
→ dodge an AI shot
→ break one cover body
→ hit the rival
→ complete a round
→ export TraceBox receipt
```

## Pass conditions

- no first-turn advantage
- touch and backup controls reach identical intents
- aim remains adjustable after initial placement
- rifle and revolver feel mechanically different
- cover visibly takes staged damage and breaks
- projectile path responds to material contact
- camera never hides required duel information
- stable mobile frame pacing in the proof scene
- receipt records the full route

## Honest first proof boundary

This first slice does **not** claim:

- all three fields complete
- all three fighters production-complete
- online networking
- final art or animation
- complete weapon roster
- full campaign/progression

It proves that the Western Sniper gameplay body survives regeneration into a higher-powered 3D host and gains meaningful facilities unavailable to the current browser body.

## Next earned output

Create the Unity import tree, data contracts, input-intent router, Dustfall bootstrap and TraceBox bridge before opening the laptop.
