# JM TARGET BRIDGE — GDevelop Contact 001 · Runtime Receipt v0.8

**Date:** 27 September 2026  
**Host:** GDevelop  
**Project body:** `JM_TARGET_BRIDGE_GDEVELOP_CONTACT_001_v0_8.json`  
**Project blob SHA:** `4346208f18321db68859da3191673a91d42d51c6`  
**Source authority:** JM  
**Evidence mode:** user-reported real-host runtime observation  
**Scope:** bounded first host-contact specimen only

## Expected bounded semantics

`Right input → Player movement → Player/Coin contact → score 0→1 → Coin consumed`

## Observed result

The creator reported **PASS** after opening the generated GDevelop host body and previewing it in the real GDevelop host.

Within this bounded contact scope, the observed runtime is therefore recorded as:

- movement: **PASS**
- Player/Coin contact: **PASS**
- score delta 0→1: **PASS**
- Coin consumption: **PASS**
- real host: **YES**

## Ding gate

**SCOPED GDEVELOP HOST DING: EARNED**

This does **not** claim:
- universal GDevelop compatibility;
- Unity/Unreal/other-host compatibility;
- resolution of Hazard consequence;
- resolution of exact Goal-after-collecting predicate;
- resolution of starting Player HP.

Those remain outside this bounded proof.

## Return delta

The important contact-produced correction is architectural:

**v0.7 could describe/lower the JM body for GDevelop but still required human reconstruction inside the host.  
v0.8 adds a generated native GDevelop project body so the bridge, rather than the human, carries the bounded specimen across the host boundary.**

That correction should propagate into the common Target Bridge host-contact standard:

**HOST ADAPTER READY ≠ HOST-INGESTIBLE BODY READY.**

For a host-contact Ding, the bridge must emit or otherwise deliver a body the target host can actually ingest without silently transferring reconstruction work back to the creator.

## Preserved HOLDs

- `hazard.consequence`
- `goal.after_collecting`
- `starting_player_hp`

## Keeper

**SOURCE STAYS JM. HOST BECOMES CAPABILITY. CONTACT DECIDES COMPATIBILITY.**

**BRIDGE CONTACT MEANS THE BRIDGE CARRIES THE BODY ACROSS.**
