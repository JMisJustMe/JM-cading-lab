# JM Advanced Game Generator — Playable Source Receipt v0.2

**Receipt state:** PLAYABLE SOURCE BUILT / IMPORT-READY / UNITY COMPILE CONTACT PENDING  
**Proof pair:** JM Western Sniper PvP + T-Boys: 4T Clash  
**Target:** Unity 6 editor route  
**Date:** 20 July 2026

## Promotion from v0.1

v0.1 established the governing contracts, shared host, separate adapters, intent route, TraceBox, data definitions and named scene builder.

v0.2 adds the actual first playable runtime source. The generated scenes no longer stop at the temporary marker: on Play, each game-specific runtime removes it and manufactures its own 3D game body.

## Shared organs

- `JMContactReader` — touch, mouse, keyboard and controller contact route with Input System / legacy conditional support
- `JMRuntimeFactory` — materials, primitives, Rigidbody and boundary manufacture
- `JMProofPanel` — visible JSON proof export
- `JMGameHost` — adapter mount, intent routing and proof envelope
- `JMTraceBox` — full event route
- `JMGameBodyDefinition` — editable character and arena identity data

## Western Sniper playable source

### Runtime files

- `WSProofRuntime.cs`
- `WSProjectile.cs`
- `WSDestructibleCover.cs`
- `WSFighterHitbox.cs`
- `WesternSniperAdapter.cs`

### Generated body

- side-readable 3D Dustfall field
- player and AI rival
- left-side movement route
- right-side hold / adjust / release aim
- rifle and revolver distinctions
- projectile gravity and travel
- timber, stone and metal cover
- staged cover damage and break debris
- metal and shallow-angle ricochets
- dodge and peek routes
- best-of-three round governor
- mobile HUD and backup contacts
- visible proof export

## T-Boys playable source

### Runtime files

- `TBProofRuntime.cs`
- `TBBody.cs`
- `TBCoreTarget.cs`
- `TBSlowHazard.cs`
- `TBoysCoreClashAdapter.cs`

### Generated body

- portrait-readable 3D Core Clash board
- Bluefin and Crimson Gear 4T crews
- crew selection
- drag-back launch route
- Direct / Bounce / Brace / Curve behaviour
- rival Strike / Trick / Block / Shock identities
- bumpers and hold hazard
- damageable team Cores
- readable AI turns
- Bench Chemistry progress
- 4T power gated by valid use of all four Bluefin identities
- round and match recovery
- mobile HUD and backup contacts
- visible proof export

## Interface law

Game contacts beginning inside the top or bottom interface chrome are blocked from the gameplay contact stream until release. Buttons therefore do not secretly launch, aim or move a body underneath themselves.

## Proof export

**EXPORT PROOF** writes:

```text
Application.persistentDataPath/JM-Proof-Receipts/<game>_<utc-time>.json
```

Each receipt includes:

- game ID
- scene
- proof status and summary
- intent/contact counts
- score fields
- complete TraceBox event list

## Honest proof boundary

### DINGED

- source recovery
- game-law contracts
- shared host / sovereign adapters
- governed data definitions
- two named scene routes
- two actual playable runtime source bodies
- multi-input contact route
- UI contact guard
- proof export route
- source-level repairs identified during inspection

### NOT YET DINGED

- Unity compilation
- actual Play-mode contact
- visual output on the user's GPU
- device control feel
- game balance
- Android performance
- final graphics, animation or sound

## First real contact

```text
Import Assets/JM
→ compile
→ JM / Build Advanced Proof Scenes
→ WS_Dustfall_Proof01 / Play
→ test movement, aim, weapons, cover, ricochet, AI and export
→ TB_CoreClash_Proof01 / Play
→ test selection, movement identities, Core damage, AI, 4T and export
→ record Ding or BUGG
```

## Keeper

> Do not open Unity merely because Unity opens. Open it when a prepared JM game body is waiting on the other side of Play.
