# OPEN FIRST — JM Advanced Game Generator Unity Spine v0.1

## What this package is

A compile-ready adapter spine for the first two advanced-engine proofs:

- `WS_Dustfall_Proof01` — Western Sniper advanced regeneration
- `TB_CoreClash_Proof01` — T-Boys first full-product generation proof

It does not pretend the games are already rebuilt. It prepares the correct ownership boundary, intent route, TraceBox contact and sovereign adapters before the Unity laptop session begins.

## Target editor

Prepared for the user's working Unity 6 editor route. The code deliberately avoids a hard dependency on the optional Input System package at this stage; touch, controller and mouse contacts will feed the common `JMGameIntent` route later.

## Import route

Copy the contents of this package's `Assets` folder into the root `Assets` folder of a Unity project.

Expected source tree:

```text
Assets/
└── JM/
    ├── Core/
    │   ├── IJMGameAdapter.cs
    │   ├── JMGameHost.cs
    │   ├── JMGameIntent.cs
    │   ├── JMProofSnapshot.cs
    │   └── JMTraceBox.cs
    ├── WesternSniper/
    │   └── WesternSniperAdapter.cs
    ├── TBoys/
    │   └── TBoysCoreClashAdapter.cs
    └── Editor/
        └── JMProofSceneBuilder.cs
```

## First laptop path

1. Open the intended Unity project.
2. Copy/import this `Assets/JM` tree.
3. Wait for compilation to finish.
4. Confirm the Console has no red errors.
5. Use **JM → Build Advanced Proof Scenes**.
6. Open `Assets/JM/Scenes/WS_Dustfall_Proof01.unity`.
7. Press Play.
8. Confirm the Console records a Western Sniper adapter boot trace.
9. Open `TB_CoreClash_Proof01.unity` and repeat.

## What this first Ding proves

- Unity compiles the JM adapter architecture.
- Both games mount through the same host without sharing game-specific behaviour.
- TraceBox records boot/contact/proof events.
- The two named proof scenes can be manufactured consistently.

## What it does not prove

- final gameplay
- final physics
- final art
- touchscreen input
- networking
- production performance

Those enter after the source spine itself passes.

## Keeper

> Shared host. Separate adapters. Different games stay different.
