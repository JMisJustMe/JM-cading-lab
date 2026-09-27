# JM TARGET BRIDGE — Unity Contact 001 · OPEN FIRST

**State:** HOST-INGESTIBLE BODY READY · UNITY RUNTIME CONTACT OPEN  
**Source authority:** JM  
**Host:** Unity  
**Scope:** bounded first Unity contact specimen

## Why this exists

GDevelop Contact 001 exposed a real bridge rule:

> **HOST ADAPTER READY ≠ HOST-INGESTIBLE BODY READY.**

The Unity contact therefore does **not** ask the creator to reconstruct the test by hand inside Unity.

The bridge carries the bounded specimen across as Unity-ingestible C# source.

## Expected bounded semantics

```text
Right Arrow
→ Player moves right
→ Player contacts Coin
→ score 0 → 1
→ Coin is consumed
→ BOUNDED HOST CONTACT: PASS
```

This is deliberately the same bounded semantic specimen used for the GDevelop Ding so the host comparison stays honest.

## Host-ingest route

1. Open an existing Unity 6 project.
2. Copy this folder:
   `Assets/JMTargetBridge`
   into that project's `Assets` folder.
3. Wait for Unity compilation to finish.
4. Confirm there are no red Console errors.
5. Enter Play Mode in **any scene**.
6. Hold **Right Arrow**.
7. Observe Player movement, Player/Coin contact, score `0 → 1`, Coin consumption and the on-screen PASS line.
8. In Console, inspect the emitted JSON receipt beginning:
   `JM TARGET BRIDGE UNITY CONTACT PASS`

No scene reconstruction, prefab creation, object placement, Canvas creation or inspector wiring is required.

## Why any scene works

`JMTargetBridgeUnityContact001.cs` uses Unity's runtime initialise hook. On Play it manufactures the bounded contact body itself:

- runtime root
- Player
- Coin
- camera if needed
- light if needed
- movement/contact/score/consumption logic
- visible status UI
- trace + JSON receipt

## Preserved HOLDs

- `hazard.consequence`
- `goal.after_collecting`
- `starting_player_hp`

These are not invented merely to make the demo look more complete.

## Ding boundary

### Prepared / statically inspectable now
- Unity-ingestible source body exists.
- Manual host reconstruction is removed.
- Expected semantics match the GDevelop bounded specimen.
- Return receipt structure is embedded.
- Existing unresolved semantics remain explicit HOLDs.

### Still requires real Unity contact
- Unity compilation on the actual host.
- real Play Mode execution.
- observed movement.
- observed Player/Coin contact.
- observed score `0 → 1`.
- observed Coin consumption.
- runtime JSON receipt.
- scoped Unity Host Ding.

## Keeper

**SOURCE STAYS JM. HOST BECOMES CAPABILITY. CONTACT DECIDES COMPATIBILITY.**

**BRIDGE CONTACT MEANS THE BRIDGE CARRIES THE BODY ACROSS.**
