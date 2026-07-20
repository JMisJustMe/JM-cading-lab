# OPEN FIRST — JM Advanced Game Generator Unity Spine v0.1

## What this package is

An **import-ready, compile-pending adapter spine** for the first two advanced-engine proofs:

- `WS_Dustfall_Proof01` — Western Sniper advanced regeneration
- `TB_CoreClash_Proof01` — T-Boys first full-product generation proof

It does not pretend the games are already rebuilt or that Unity has already compiled the package. It prepares the ownership boundary, intent route, TraceBox contact, governed data assets and sovereign adapters before the first laptop compile contact.

## Target editor

Prepared for the user's working Unity 6 editor route. The code deliberately avoids a hard dependency on the optional Input System package at this stage; touch, controller and mouse contacts will feed the common `JMGameIntent` route after the source spine passes compilation.

## Import route

Copy the contents of this package's `Assets` folder into the root `Assets` folder of a Unity project.

Expected source tree:

```text
Assets/
└── JM/
    ├── Core/
    │   ├── IJMGameAdapter.cs
    │   ├── JMGameBodyDefinition.cs
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

The Editor builder creates:

```text
Assets/JM/Data/WesternSniper_v0_1.asset
Assets/JM/Data/TBoys4TClash_v0_1.asset
Assets/JM/Scenes/WS_Dustfall_Proof01.unity
Assets/JM/Scenes/TB_CoreClash_Proof01.unity
```

## First laptop path

1. Open the intended Unity project.
2. Copy/import this `Assets/JM` tree.
3. Wait for compilation to finish.
4. Confirm the Console has no red errors.
5. Use **JM → Build Advanced Proof Scenes**.
6. Confirm the two data assets and two scenes were created.
7. Open `Assets/JM/Scenes/WS_Dustfall_Proof01.unity`.
8. Press Play.
9. Confirm the Console records a Western Sniper adapter boot trace.
10. Open `TB_CoreClash_Proof01.unity` and repeat.

## What this first Ding would prove

- Unity compiles the JM adapter architecture.
- Both games mount through the same host without sharing game-specific behaviour.
- Character and arena identities exist as editable governed data assets.
- TraceBox records boot/contact/proof events.
- The two named proof scenes can be manufactured consistently.

## What is currently proven

- source contracts are mounted in GitHub
- separate adapters exist
- shared intent and TraceBox organs exist
- the scene/data builder has received a source-level sanity repair
- the package has an exact use/test path

## What is not yet proven

- Unity compilation
- generated scene contact on the user's editor
- final gameplay
- final physics
- final art
- touchscreen input
- networking
- production performance

Those enter only after actual editor contact.

## Keeper

> Shared host. Separate adapters. Different games stay different. No Ding before compile contact.
