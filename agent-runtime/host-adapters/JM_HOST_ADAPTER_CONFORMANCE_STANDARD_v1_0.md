# JM HOST ADAPTER CONFORMANCE — UNIVERSAL PLUG TESTER v1.0

**Status:** ACTIVE RUNNING STANDARD  
**Authority class:** CONFORMANCE TESTER — NOT HOST / BODY / SOURCE AUTHORITY  
**Contract:** `agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_v1_0.json`  
**Registry:** `agent-runtime/host-adapters/JM_HOST_ADAPTER_REGISTRY_v1_0.json`  
**Tester:** `python3 agent-runtime/host-adapters/jm_host_adapter_conformance.py --all --run-local`

## Keeper

> **CHANGE THE PLUG, NOT THE BODY.**

The JM sovereign core must not be rebuilt merely because the host changes.

## Universal plug shape

`SOVEREIGN CORE → PORTABLE CONTRACTS → CAPABILITY NEGOTIATION → HOST ADAPTER → HOST CONTACT → CONSEQUENCE → RETURNED TRACE`

Each adapter is tested against the same gates:

1. **Core identity**
2. **Portable contract load**
3. **Capability negotiation**
4. **Authority preservation**
5. **Routing meaning**
6. **Host contact**
7. **Returned consequence**
8. **Recovery / re-entry**
9. **Owner/device contact** where applicable

## Proof ladder

`DECLARED → CONTRACT → TRANSPORT → FUNCTION → HOST_CONTACT → OWNER_DEVICE`

An adapter may claim only the highest rung whose required gates are actually PASS.

Therefore:

- transport PASS ≠ function PASS;
- function PASS ≠ actual host-contact PASS;
- host-contact PASS ≠ owner/device PASS;
- one host PASS ≠ another host PASS;
- carrier proof ≠ body identity;
- capability negotiation ≠ authority transfer.

**OPEN is a valid result.** It means the proof boundary is preserved instead of theatrically filled.

## Current matrix

| Adapter / carrier | Class | Current level | Exact open edge |
|---|---|---|---|
| Python reference runtime | Reference runtime | FUNCTION | exact target-host contact |
| Node reference runtime | Reference runtime | FUNCTION | exact target-host contact |
| ChatGPT / MCP host adapter | Host adapter | FUNCTION | genuine in-chat interactive contact |
| AIRBORNE browser/web carrier | Precedent carrier | HOST_CONTACT | sovereign-agent browser wrapper + owner-device |
| GitHub Actions | Execution carrier | FUNCTION | not an owner/device identity surface |
| Android / phone | Declared host route | DECLARED | portable-core wrapper + exact device contact |
| Codex / repository agent | Declared host route | DECLARED | direct portable-runtime host contact |
| Cloud execution/deployment | Route family | DECLARED | exact provider/recipient adapter proof |
| Other compatible host | Future route | DECLARED | thinnest adapter + complete conformance run |

## Tester behavior

The tester must:

- validate every descriptor against the same conformance contract;
- require durable evidence for every PASS gate;
- reject proof-level inflation;
- reject missing evidence files;
- reject duplicate adapter IDs;
- execute the current Python and Node reference runtimes when `--run-local` is requested;
- require byte-identical core capsules for multiple queries;
- require an unknown-domain query to return no fabricated route;
- report OPEN gates without treating them as conformance failure;
- never simulate external host contact.

## Host adapter build rule

When a new host appears:

`RECOVER PRECEDENT → DECLARE HOST CAPABILITIES → WRAP PORTABLE CORE → RUN UNIVERSAL TESTER → CONTACT REAL HOST → READ CONSEQUENCE → ADVANCE ONLY THAT ADAPTER'S PROOF LEVEL`

Do **not** create a new JM agent, new Coding Estate, new Build Mesh or new source identity because a host has different APIs.

## Relationship to runtime

The portable Node/Python runtime proves that the core survives independent executable adapters. This standard is the next layer: it decides what a **specific host adapter** has actually earned.

## Re-entry

> Load the universal conformance contract and adapter registry. Use the same nine gates for every host. Preserve OPEN where direct contact has not occurred. Change the plug, not the body.
