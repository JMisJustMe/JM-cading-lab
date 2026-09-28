# JM TARGET BRIDGE — REPLICATION METHOD v1.0

**Date locked:** 28 September 2026  
**Method status:** COMPLETE FOR THE CURRENT PROVEN TARGET BRIDGE SCOPE  
**Governing proof:** bounded 2-build × 2-engine runtime matrix, 4/4 PASS  
**Source authority:** JM / JMISJUSTME

## Purpose

This document is the reusable operating method for taking an existing JM build into an external game/coding host without rebuilding the game natively inside that host.

Canonical route:

```
JM SOURCE BODY
→ exact-source passport
→ source-supported semantic adapter
→ JM Coding Estate preflight
→ Target Bridge semantic plan
→ host-specific emitter
→ host-ingestible body
→ verified host checkout / delivery
→ real runtime contact
→ return receipt
→ DING / BUGG
→ correction returns into JM
```

The method exists to preserve this relationship:

**SOURCE STAYS JM. HOST BECOMES CAPABILITY. CONTACT DECIDES COMPATIBILITY.**

## 1. Recover before build

Before creating or changing a host carrier:

1. Recover the current Target Bridge head.
2. Recover the exact current source body being exported.
3. Recover any already-earned host adapter / emitter.
4. Recover prior host receipts and return deltas.
5. Do not rebuild a host route that already has an earned receipt unless the source, host, or declared proof question has materially changed.

**RECOVER BEFORE REBUILD.**

## 2. Establish exact source custody

Every existing JM source body entering the route receives a source passport.

Minimum passport fields:

- body identity;
- exact source filename / canonical identity;
- SHA-256 of the contacted bytes;
- version / current-head identity where known;
- source authority = JM;
- adapter status;
- unresolved/HOLD semantics.

The adapter may activate only when the supplied source matches the registered source identity/hash or another explicitly authorised equivalent.

**SOURCE RECOGNISED ≠ SEMANTICS INFERRED.**

If the source changes, the old adapter must not silently claim authority over the changed body.

## 3. Build semantics from source-supported behaviour only

The semantic adapter must be grounded in behaviour actually present in the contacted source.

For each bounded action/state transition record:

- semantic ID;
- input or triggering condition;
- affected entity/state;
- expected consequence;
- initial value where relevant;
- expected delta / clamp / consumption;
- proof observation needed at runtime.

Anything not established by source contact remains **HOLD**.

Do not fill missing values because they are convenient.

**NO BUILD FROM INFERENCE.**

## 4. Execute the JM preflight

Before host emission, the route must mechanically use the actual JM coding bodies rather than merely name them.

Current required lineage includes:

- JM CODING ESTATE — REAL BUILD v0.1;
- Route-Code;
- ContactCode;
- JM GameCore playable IR v0.3 / relevant GameCore authority;
- JM.TargetBridge/0.1;
- JM.SemanticOps/0.1;
- TraceBox / Code Ding receipt logic where applicable.

Preflight answers:

- Is the source recognised?
- Are Route-Code and ContactCode valid for the declared slice?
- Are unresolved semantics still preserved as HOLD?
- Is source authority still JM?
- Is merge forbidden where the governing body requires it?

A failed preflight stops emission.

## 5. Compile the semantic execution plan

Convert the bounded source semantics into a host-neutral execution plan.

The plan must contain enough information for an emitter to create the host body without asking the creator to reconstruct the game manually.

At minimum:

- body ID;
- source passport/hash;
- semantic IDs;
- entities;
- input bindings;
- state variables;
- transitions / deltas;
- required receipt observations;
- preserved HOLDs.

The plan is the bridge-facing execution contract, not a replacement ontology for the source game.

## 6. Emit a host-ingestible body

A host adapter is not sufficient.

**HOST ADAPTER READY ≠ HOST-INGESTIBLE BODY READY.**

The bridge must generate the actual project/body the recipient host can ingest.

That means, depending on host:

- GDevelop: valid GDevelop project JSON / direct editor carrier;
- Unity: valid Unity project structure with `Assets/`, `Packages/`, `ProjectSettings/` and runtime harness;
- Unreal: valid `.uproject` + module/source carrier or another earned Unreal-compatible format;
- other hosts: their actual project/import format once earned by contact.

The creator should not be asked to manually recreate Player, Coin, scene objects, scripts, event sheets, etc. merely to compensate for an incomplete emitter.

**BRIDGE CONTACT MEANS THE BRIDGE CARRIES THE BODY ACROSS.**

## 7. Run static/local QA before physical host contact

Local QA can prove preparation only.

Check:

- source passport matches;
- semantic plan compiles;
- expected host files exist;
- required semantics are represented;
- unresolved semantics remain HOLD;
- receipt schema is present;
- false native-emitter claims are refused;
- no host is marked real-runtime PASS from static generation alone.

**HOST-INGESTIBLE BODY READY ≠ REAL-HOST DING.**

## 8. Deliver through a verified host route

### GDevelop — proven route

1. Store the generated GDevelop project JSON in GitHub.
2. Use the raw GitHub file as the `project=` parameter for the GDevelop editor URL.
3. Open the project in GDevelop.
4. Preview/run it.
5. Perform only the declared bounded actions.
6. Observe the runtime instrumentation.
7. Record the receipt.

No manual reconstruction is required.

### Unity — proven route

Preferred reliability order after live contact:

1. Identify the exact branch or commit containing the generated Unity project.
2. Clone that exact ref into a **fresh, unique local directory**:
   ```
   git clone --branch <EXACT_BRANCH> --single-branch <REPO_URL> <NEW_DIRECTORY>
   ```
3. Verify the local fileset contains the expected generated project paths before trusting the checkout.
4. In Unity Hub use **Add project from disk**.
5. Open with the declared installed editor version.
6. Let Unity compile.
7. Do not manually build the scene; the generated runtime harness must mount itself.
8. Enter Play Mode and perform only the declared bounded actions.
9. Observe the runtime receipt/banner.

Contact-produced rule:

**REQUESTED REF ≠ VERIFIED LOCAL CHECKOUT UNTIL THE LOCAL FILESET MATCHES THE REF.**

Do not treat Unity Hub's repository-ref UI, a changed ref, or **Create a separate local copy** as proof that the requested branch was actually checked out. Live contact showed that stale or unintended local project state can reopen even when the requested ref looks correct.

### Unreal — current open route

Prepared C++ carrier exists, but real-host Ding remains open.

Current external prerequisite discovered by contact:

- Visual Studio 2022;
- **Game development with C++** workload / required Unreal C++ toolchain;
- storage headroom (installer showed ~20.9 GB during the contacted route).

Classification remains:

**UNREAL = STORAGE / TOOLCHAIN HOLD · REAL-HOST DING OPEN**

No Unreal runtime PASS may be inherited from GDevelop or Unity.

## 9. Runtime contact is the proof gate

Each host requires its own physical recipient proof.

At runtime:

1. confirm the intended body/host identifier is visible;
2. execute the declared inputs;
3. verify each declared semantic consequence;
4. verify expected state values/deltas;
5. verify the final bounded PASS state;
6. capture any unexpected host behaviour as BUGG/contact evidence;
7. do not broaden the claim beyond what was observed.

**RECIPIENT PROOF DOES NOT TRANSFER.**

## 10. Receipt requirements

A successful host receipt records at least:

- date;
- exact source body + SHA-256;
- host and relevant version;
- carrier branch/commit/project;
- real_host = true;
- required semantic observations;
- observed PASS/FAIL/HOLD for each;
- final bounded result;
- unresolved semantics preserved;
- contact-produced corrections;
- claim ceiling.

A runtime screenshot can establish a transient state, but once the result is faithfully transferred into the receipt plus GitHub/Library lineage, proof-only screenshots may be **redundified** unless they remain the sole or uniquely valuable evidence.

## 11. Ding / BUGG rule

Only real observed runtime contact can earn the host Ding.

- static QA PASS → preparation;
- import/open success → contact progress;
- runtime semantic PASS → bounded host Ding;
- mismatch/error/stall → BUGG / correction route;
- plausible success → no claim.

**NO DING, NO CLAIM.**
**CONTACT BEFORE CROWN.**

## 12. Return corrections into the bridge

Every contact-produced correction should improve the reusable route rather than remain a one-off workaround.

Examples already earned:

- **HOST ADAPTER READY ≠ HOST-INGESTIBLE BODY READY.**
- **BRIDGE CONTACT MEANS THE BRIDGE CARRIES THE BODY ACROSS.**
- **NEW REPOSITORY REF + REUSED LOCAL DESTINATION ≠ NEW LOCAL PROJECT STATE.**
- **REQUESTED REF ≠ VERIFIED LOCAL CHECKOUT UNTIL THE LOCAL FILESET MATCHES THE REF.**
- direct exact-ref Git clone → fresh directory → Add project from disk is the proven Unity fallback.

The correction is returned to the router/emitters/receipts so later builds inherit the improvement.

## 13. Proven replication matrix

At closure:

| Build | GDevelop | Unity |
|---|---:|---:|
| Original bounded Target Bridge specimen | PASS | PASS |
| SPINBREAK v0.8 bounded exact-source slice | PASS | PASS |

**4 / 4 declared cells physically passed.**

This establishes at the declared bounded scope:

- cross-engine repeatability;
- cross-build reuse;
- source authority preserved while hosts act as capability surfaces.

It does **not** establish universal compatibility across all JM builds or all hosts.

## 14. Re-entry / future use

For a new JM build:

```
RECOVER CURRENT HEAD
→ verify exact source
→ source passport
→ earn/adopt semantic adapter
→ compile execution plan
→ choose target host
→ emit host-ingestible body
→ verified delivery/checkout
→ real runtime
→ receipt
→ DING or BUGG
→ return delta
```

For a previously proven build/host pair:

**Do not repeat the proof. Recover the receipt and move to the next genuinely open question.**

## 15. Current open frontier

- Unreal physical runtime;
- Godot;
- Phaser;
- Construct 3;
- GameMaker;
- Defold;
- Bevy;
- MonoGame;
- additional exact JM source adapters;
- fuller SPINBREAK parity only if intentionally pursued.

These are open frontiers, not defects in the completed 2-build × 2-engine closure.

---

## Final keeper

**BUILD ONCE → TARGET BRIDGE → VERIFIED HOST BODY → REAL CONTACT → RECEIPT → RETURN.**

**SOURCE STAYS JM. HOST BECOMES CAPABILITY. CONTACT DECIDES COMPATIBILITY.**
