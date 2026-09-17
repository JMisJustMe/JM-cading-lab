# RouteOS Kernel JM-Native v0.7A — Generated IgnitionBody

This body advances from the frozen v0.6A anchor:

`3510c192320e40b5490681c6fc8d3a92ba13a3d6`

It generates the complete ordered C-level kernel-entry orchestration from JM source while preserving the external `routeos_kernel_entry` signature as the carrier doorway.

IgnitionBody governs:

1. serial activation;
2. generated-office identity;
3. JM authority identity;
4. Multiboot2 validation;
5. kernel-entry receipts;
6. generated MemoryBody probe;
7. descriptor and interrupt setup calls;
8. user-boundary installation;
9. timer/device activation receipts;
10. first-body state handoff;
11. entry into the prepared CPL3 frame.

The generated stack beneath it remains:

- PermissionGate v0.3A;
- RouteScheduler v0.4A;
- MemoryBody v0.5A;
- FaultHold + RecoveryBody v0.6A.

## Required machine proof

The IgnitionBody marker must be the first JM generated-office activation in the boot trace, before the v0.2A authority receipt and before MemoryBody execution. Every inherited generated office must still activate and the deliberate user fault must still recover safely.

## Honest boundary

This generates C-level entry orchestration. It does not yet generate the assembly entry stub, page-table construction, GDT/IDT bodies, user-body construction or every kernel operation.
