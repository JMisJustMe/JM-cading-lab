# RouteOS JM-Native v2.0A — Observatory + Continuity Maximum Push

**Status:** construction body mounted on the frozen v1.9A OrchestrationRoute parent. The kernel C integration compiles locally. A machine crown requires the new GitHub Actions QEMU route to pass on the committed branch and then pass again on a frozen head.

## What this push adds

### 1. TraceLedgerRoute

A fixed 128-record kernel ring captures ordered boot, health, scheduling, syscall, fault, quarantine, recovery and continuation events. High-value events emit structured serial receipts:

```text
[JMTRACE] seq=7 tick=75 kind=RECOVERY body=2 vector=6 value=0
```

The ledger is bounded, allocation-free and supervisor-owned. It does not claim persistent storage.

### 2. RecoveryPolicyRoute

Each registered body receives a fault count. The v2.0A policy uses a deliberate one-fault budget, matching the existing Body 2 invalid-opcode proof: the faulting body is quarantined by remaining `BODY_BLOCKED`; the safe body continues. The inherited FaultHold and RecoveryBody identities are preserved.

### 3. HealthProbeRoute

After descriptor, vector, user-map, body-frame and interrupt-controller installation, six deterministic boot checks verify:

- Multiboot2 handoff magic;
- the frozen two-body contract;
- Body 1 / Body 2 identities;
- both initial READY states;
- no body selected before first entry;
- a bounded trace capacity of at least 32 records.

A successful boot emits `JMHEALTH ... state=PASS`.

### 4. CapabilityManifestRoute

The machine emits a concise capability line declaring the version, trace capacity, fault budget, body count, visual carriers and package families. This gives decoders and operators a stable, machine-readable handoff.

### 5. Kernel Observatory

`render_observatory.py` converts the decoded QEMU trace into a self-contained responsive HTML dashboard and SVG operational map. It is usable on phone or laptop with no network dependency.

### 6. ReleaseCarrierRoute / Zionfolder

The release packager assembles:

- bootable ISO;
- symbol-bearing ELF;
- kernel source and JM source;
- symbols and disassembly;
- raw and structured traces;
- HTML and SVG observatory;
- SPDX 2.3 SBOM;
- SHA-256 ledger and manifest;
- QEMU and GDB launchers;
- governance and operator documents;
- OPEN_FIRST route;
- one ZIP carrier.

## Eight append-only hooks

1. scheduler selection;
2. `TRACE_READ` pass;
3. `YIELD` pass;
4. unknown syscall denial;
5. recovery selection and recent trace dump;
6. fault-budget quarantine;
7. boot health/capability/ready activation;
8. first and post-recovery continuation.

No earlier generated office is removed or renamed.

## Operational route

`ImageCarrier → BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → KernelContractRoute → PrimitiveRoute → SerialRoute → OrchestrationRoute → DescriptorInstall → VectorRoute → UserMapRoute → BodyFrameInstall → InterruptController → HealthProbeRoute → CapabilityManifestRoute → TraceLedgerRoute → RouteScheduler → PermissionGate → FaultHold → RecoveryPolicyRoute → RecoveryBody → safe Body 1 continuation → Observatory decoder → HTML/SVG → Zionfolder`

## Construction proof already completed

The exact frozen v1.9A integrated `routeos_kernel.c` from workflow artifact `8813185233` was used as the parent. The v2.0A integrator mounted all eight hooks and the resulting freestanding C compiled with:

`clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror`

The machine/QEMU boundary remains governed separately.
