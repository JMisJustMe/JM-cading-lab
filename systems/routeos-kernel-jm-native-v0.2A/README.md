# RouteOS Kernel JM-Native v0.2A — Boot Authority

This body advances the post-Ding lane without modifying or weakening the frozen v0.1A proof.

## JM source authority

The completed kernel offices and proof obligations are declared in:

`source/routeos_kernel.jmroute`

`tools/jmroutec.py` validates that authority and deterministically lowers it into:

- `generated/routeos_authority.h` — C/x86-64 carrier contract;
- `generated/routeos_authority.json` — canonical machine record;
- `proof/JM_SOURCE_AUTHORITY_RECEIPT.md` — source-authority receipt.

## Boot integration

`tools/integrate_boot.py` opens the exact frozen v0.1A source carrier and integrates the generated authority into the real kernel build. The generated authority now governs these bounded machine values:

- SerialRoute port;
- PermissionGate interrupt vector;
- FaultHold interrupt vector;
- RouteScheduler trace cadence;
- execution-body count.

The integration also adds compile-time compatibility locks and emits the exact JM authority version, source hash and proof parent from kernel space at ignition.

The permanent machine gate is:

`.github/workflows/routeos-kernel-jm-native-boot.yml`

## Governing law

**JM source is authoritative. C, assembly and JSON remain carriers, generated outputs or lower machine floors.**

## Current result

**JM_NATIVE_BOOT_INTEGRATION DING: PASS**

The generated authority compiled into the QEMU-booting kernel, emitted its exact identity before the existing boot receipt, and preserved the inherited memory, interrupt, scheduling, user-boundary, PermissionGate, FaultHold and RecoveryBody proof chain.

See `proof/JM_NATIVE_BOOT_INTEGRATION_RECEIPT.md` for the frozen result and hashes.

## Claim boundary

This proves that JM-native authority is compiled into and governs selected values inside the booting kernel. It does **not** yet claim that the full kernel implementation is generated from JM source. The main operational C and assembly body still comes from the frozen v0.1A machine carrier.

The next gate is to generate one complete operational kernel office from JM source and replace its handwritten carrier implementation without weakening the machine proof.

## Local source checks

```bash
python3 tools/jmroutec.py source/routeos_kernel.jmroute --out-dir generated --check
python3 -m unittest discover -s tests -v
```
