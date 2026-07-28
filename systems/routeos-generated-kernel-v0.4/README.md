# RouteOS Generated Kernel Gate v0.4

This gate proves the next bounded step after **RouteOS Two Generated Bodies v0.3**.

## Route under proof

`JM kernel blueprint (.jm.cading) → recovered Cading parser → Kernel OneBody IR → generated boot.S + routeos_kernel.c + linker.ld → two generated CPL3 bodies → GRUB/QEMU → PermissionGate → RouteScheduler → FaultHold → RecoveryBody`

## Frozen requirements

- v0.4 contains no maintained target `routeos_kernel.c`, `boot.S`, or kernel linker script;
- the hosted backend generates all three after checkout;
- the blueprint and Kernel OneBody hashes are embedded in the ELF and printed during boot;
- both distinct generated user bodies remain provenance-bound;
- the generated kernel must reproduce memory, interrupts, scheduling, PermissionGate, serial device, fault ownership and safe-body continuation;
- no Ding is claimed until independent GRUB/QEMU execution passes.

## Claim boundary

A pass proves target-kernel source generation through a hosted JM compiler backend. It does not prove compiler self-hosting, real-hardware breadth, production hardening, filesystems, graphics or networking.
