# JM × REA — Read-only Evidence Contact v0.1 (candidate)

**Status:** isolated experimental host adapter; **NOT** integrated with JM Build Mesh / JM32-1DA / Target Bridge; **NO DING**.

## Recovered authority

- JM root `AGENTS.md` and Estate build-law, inheritance, and capability-routing standards govern this probe.
- JM `agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md` supplies the *plug, not body* separation.
- JM TraceBox / RouteBox and existing JM `REVERSE_ENGINEERING_MAP.md` remain distinct original authorities. This script is a *candidate evidence carrier*, not a new sovereign debugger, decompiler, or TraceBox replacement.
- Upstream REA sources inspected: `docs/cli.md`, `docs/android-analysis.md`, `src/domain/evidence.ts`, `src/domain/evidenceBundle.ts`, `src/domain/analysisSnapshot.ts`, `src/domain/residualUnknown.ts`. REA's published guide documents `rea evidence-export IN OUT` and analysis snapshots with an `evidence_bundle` field.

## How to run (offline, Python standard library)

```sh
python3 jm_rea_evidence_contact.py /path/to/rea-evidence.json /path/to/NEW-jm-trace-candidate.json
python3 -m unittest -v test_jm_rea_evidence_contact.py
```

Generate the source using an existing REA installation, if available (not required to test this adapter):

```sh
rea evidence-export /path/to/rea-evidence.json /path/to/rea-canonical-evidence.json
```

`--expect-input-sha256 <digest>` verifies input file bytes match an expected digest. `--include-locations` is opt-in because locations can reveal private paths; do not publish reports without inspecting them.

## What it does

1. Reads a *copy* of REA's canonical evidence bundle or analysis snapshot; no source execution or network calls.
2. Records SHA-256 of the exact supplied JSON bytes, original REA Evidence IDs, provider, target artifact hashes, operation, source-stated confidence/authority, limitations and unknown history.
3. Rejects duplicate IDs, malformed record IDs, missing evidence links and incomplete unknown histories.
4. Emits a *new* JSON file only, with exclusive-create protection (existing output untouched). Never sends source or result anywhere.
5. Redacts REA `normalized_result` and `raw_result` by design. Source paths/offsets are omitted unless `--include-locations`.
6. Explicitly marks REA integrity authentication, actual JM execution, provider runtime contact, owner-device contact and promotion **not performed**.

## What it does NOT do

- Does not run REA, JADX, Ghidra, a target APK, an emulator, or JM services.
- Does not cryptographically reauthenticate REA's canonical semantic Evidence IDs or ResidualUnknown revision digests; use REA's own `evidence-import` validation separately.
- Does not interpret derived source as original source, grant author rights, or provide a licence to republish proprietary code.
- Does not update Estate registry, deploy or change protected builds, claim host-adapter contract proof, or upload sensitive outputs.
- Does not accept arbitrary REA CLI responses; only exported *bundle* JSON or snapshot JSON with `evidence_bundle`.

## Proof and next gate

The unit tests are synthetic, standard-library-only boundary tests. They prove only the projection and its non-destructive safeguards in the local test environment. Until real REA-generated Evidence is imported, and the resulting candidate is checked against the original, the host plugin remains **EXPERIMENTAL / HOLD**. Later recipients need their own contact and receipts.

**Lineage / source reading:**
- https://github.com/morluto/rea/blob/main/docs/cli.md
- https://github.com/morluto/rea/blob/main/src/domain/evidence.ts
- https://github.com/morluto/rea/blob/main/src/domain/evidenceBundle.ts
- https://github.com/JMisJustMe/JM-cading-lab/blob/main/agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md
- https://github.com/JMisJustMe/JM-cading-lab/blob/main/estate-publication/apps-tools-games/apps-tools/built-enough-body-return-v0.2/REVERSE_ENGINEERING_MAP.md