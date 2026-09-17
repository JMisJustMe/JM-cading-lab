# RouteOS Kernel JM-Native v0.3A — Generated PermissionGate

This body begins from the frozen v0.2A anchor:

`f76343108422109e8aa939d785d0d88bdba61f08`

It does not reopen or alter the locked v0.2A proof.

## Operational advancement

The JM source:

`source/permissiongate.jmroute`

now defines PermissionGate behaviour for:

- `TRACE_READ` permission, trace and return route;
- `YIELD` scheduling continuation;
- unknown-call denial, return value and continuation.

`permissiongatec.py` deterministically generates the operational C office. `integrate_permissiongate.py` removes the handwritten v0.1A syscall-dispatch block and replaces it with a call into that generated office.

## Proof requirements

The v0.3A machine gate must prove all of the following in one run:

1. the v0.2A authority still enters the kernel;
2. the handwritten PermissionGate block is absent;
3. the generated PermissionGate office is compiled into the ELF;
4. the generated office announces its exact JM source hash at runtime;
5. `TRACE_READ` still passes through PermissionGate;
6. PIT scheduling, two CPL3 bodies, FaultHold, RecoveryBody and safe-body continuation still pass.

## Claim boundary

A passing v0.3A proves **one JM-generated operational kernel office**. It does not claim that the scheduler, memory body, fault body, boot body or assembly carrier are yet generated from JM source.

## Local gates

```bash
python3 tools/permissiongatec.py source/permissiongate.jmroute --out-dir generated --check
python3 -m unittest discover -s tests -v
```
