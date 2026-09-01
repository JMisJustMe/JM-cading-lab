# JM RouteOS Game Estate v2.0A — Five Crowns Live Cartridge

This is the missing native host behind the existing JM Estate Compass handoff:

`jmrouteos://cartridge/five-crowns`

The Android package is exactly:

`com.jmisjustme.routeos.gameestate`

The clean Compass host already routes that URI and package. Installing this app completes the doorway.

## What is usable

- a real offline Android app rather than a proof document;
- a cartridge library with a built-in Five Crowns module;
- touch, keyboard and D-pad movement;
- ordered collection of PrimitiveRoute, DispatchRoute, EntryRoute, KernelContractRoute and OrchestrationRoute;
- FaultHold and RecoveryBody represented as a recoverable gameplay law;
- local progress persistence;
- crown explanations, exact freeze heads, PR inspection links and final proof facts;
- return route to JM Estate Compass when it is installed.

## Build

Requirements:

- Java 17
- Gradle 8.9
- Android Gradle Plugin 8.7.3
- Android SDK 35 / build-tools 35.0.0

Build the unsigned release APK:

```bash
gradle --no-daemon -p routeos-live-estate :app:assembleRelease
```

Run the proof checks:

```bash
node routeos-live-estate/tools/test_simulation.js
python3 routeos-live-estate/tools/verify_live_estate.py
```

## Deep-link contract

Primary:

```text
jmrouteos://cartridge/five-crowns
```

Aliases:

```text
jmrouteos://cartridge/routeos-five-crowns
jmrouteos://cartridge/routeos-v1.9a
jmrouteos://cartridge/orchestrationroute
```

## Frozen parent

- Commit: `110909c7199bcfbd7007ed56437d05a8aea5967b`
- Anchor: `anchor/routeos-kernel-jm-native-v1-9a-orchestrationroute-ding-pass`

## Claim boundary

This app makes the frozen RouteOS Five Crowns work playable, navigable and explainable. It does **not** run the x86 kernel inside Android, replace QEMU evidence, or claim that RouteOS is a general-purpose operating system.

The playfield uses code-native vector rendering intentionally so the cartridge remains dependency-free, offline, deterministic and small. The visible interface follows the existing dark, luminous Compass/GlyphPlay estate language rather than inventing a separate product skin.
