# RouteOS Two Generated Bodies Gate v0.3

This gate removes the final hand-authored CPL3 reference blob from the bounded RouteOS proof.

## Route under proof

`Two distinct JM .jm.cading sources → recovered JM Android Forge v1.1 parser → two OneBody identities → two deterministic x86-64 CPL3 assemblies → RouteScheduler → distinct RouteOS states → Body 2 source-owned #UD → FaultHold → RecoveryBody → Body 1 continues`

## Frozen requirements

- Body 1 and Body 2 have distinct source, IR and assembly hashes.
- `boot.S` contains no user-body code, `int 0x80`, or deliberate `ud2`.
- Body 2's deliberate fault is generated from `FAULT_UD_AFTER 3` in its own source.
- Both bodies cross PermissionGate and change RouteOS state before the fault.
- Body 1 continues after Body 2 is blocked.
- PIT timer receipts continue through RouteScheduler.

No Ding is claimed until independent GRUB/QEMU execution passes.
