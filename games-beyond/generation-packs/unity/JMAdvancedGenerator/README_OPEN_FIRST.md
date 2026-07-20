# OPEN FIRST — JM Advanced Game Generator Unity Proof Pack v0.2

## What this package is

An **import-ready, playable-source, compile-pending** Unity package for the first two advanced-engine proofs:

- `WS_Dustfall_Proof01` — Western Sniper advanced regeneration
- `TB_CoreClash_Proof01` — T-Boys first full-product generation proof

The package no longer opens onto a placeholder-only scene. Its Editor builder creates two named scenes whose runtime components generate the actual first 3D gameplay bodies when Play begins.

It still does **not** claim a Unity Ding before the user's editor compiles and runs it.

## Target editor

Prepared for the user's working Unity 6 editor route. The runtime uses Unity 6 Rigidbody APIs and supports either enabled input backend through conditional compilation:

- Input System route when `ENABLE_INPUT_SYSTEM` is active
- legacy Input Manager route when `ENABLE_LEGACY_INPUT_MANAGER` is active

The package does not force an Input System installation or a settings change before first contact.

## Import route

Copy this package's `Assets/JM` folder into the root `Assets` folder of a Unity project.

## Source tree

```text
Assets/
└── JM/
    ├── Core/
    │   ├── IJMGameAdapter.cs
    │   ├── JMContactReader.cs
    │   ├── JMGameBodyDefinition.cs
    │   ├── JMGameHost.cs
    │   ├── JMGameIntent.cs
    │   ├── JMProofPanel.cs
    │   ├── JMProofSnapshot.cs
    │   ├── JMRuntimeFactory.cs
    │   └── JMTraceBox.cs
    ├── WesternSniper/
    │   ├── WesternSniperAdapter.cs
    │   ├── WSDestructibleCover.cs
    │   ├── WSFighterHitbox.cs
    │   ├── WSProjectile.cs
    │   └── WSProofRuntime.cs
    ├── TBoys/
    │   ├── TBoysCoreClashAdapter.cs
    │   ├── TBBody.cs
    │   ├── TBCoreTarget.cs
    │   ├── TBSlowHazard.cs
    │   └── TBProofRuntime.cs
    └── Editor/
        └── JMProofSceneBuilder.cs
```

## Builder output

Use **JM → Build Advanced Proof Scenes**. It creates:

```text
Assets/JM/Data/WesternSniper_v0_1.asset
Assets/JM/Data/TBoys4TClash_v0_1.asset
Assets/JM/Scenes/WS_Dustfall_Proof01.unity
Assets/JM/Scenes/TB_CoreClash_Proof01.unity
```

## Western Sniper first visible body

Pressing Play in `WS_Dustfall_Proof01` should generate:

- a side-readable 3D Dustfall duel field
- player and AI rival
- movement and touch/mouse aim routes
- hold, adjust and release aiming
- rifle and revolver with different speed, spread and damage
- destructible timber, stone and metal cover
- material-weighted damage
- metal and shallow-angle ricochets
- dodge and peek contacts
- best-of-three health/round route
- visible HUD and touchscreen backup buttons
- TraceBox proof export

## T-Boys first visible body

Pressing Play in `TB_CoreClash_Proof01` should generate:

- a portrait-readable 3D Core Clash toy board
- Bluefin: Jax, Riko, Tanko and Ziggy
- Crimson Gear: Raze, Nyx, Brikk and Bolt
- selectable crew bodies
- drag-back launch route
- Direct, Bounce, Brace and Curve behaviour
- bumpers, a hold/slow hazard and two damageable Cores
- readable rival AI turns
- Bench Chemistry progress
- 4T power requiring valid use of all four crew identities
- round and match recovery
- visible HUD and touchscreen controls
- TraceBox proof export

## First laptop path

1. Open the intended Unity project.
2. Copy/import this `Assets/JM` tree.
3. Wait for compilation to finish.
4. Confirm the Console has no red errors.
5. Use **JM → Build Advanced Proof Scenes**.
6. Confirm the two data assets and two scenes were created.
7. Open `Assets/JM/Scenes/WS_Dustfall_Proof01.unity`.
8. Press Play and exercise movement, aim, weapon, cover and proof export.
9. Open `TB_CoreClash_Proof01.unity`.
10. Press Play and exercise selection, launch, movement identities, Core damage, 4T and proof export.

## Proof files

The visible **EXPORT PROOF** button writes a JSON receipt under:

```text
Application.persistentDataPath/JM-Proof-Receipts/
```

The receipt contains the game proof snapshot and the full TraceBox event route.

## What is currently proven

- source contracts are mounted in GitHub
- shared host and separate adapters exist
- governed character and arena data assets are generated
- two playable runtime bodies are present in source
- interface contacts are guarded from firing gameplay underneath UI buttons
- visible proof export exists
- the scene/data builder has an exact use path

## What is not yet proven

- Unity compilation on the user's editor
- generated scene contact on the user's laptop
- final graphics or character assets
- final animation and audio
- production balance
- Android build performance
- networking

Those enter only after actual editor contact.

## Keeper

> The laptop opens onto two generated JM game proofs—not an empty scene. Shared host. Separate adapters. Different games stay different. No Ding before compile contact.
