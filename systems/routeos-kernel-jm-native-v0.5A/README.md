# RouteOS Kernel JM-Native v0.5A — Generated MemoryBody

This body begins from the frozen v0.4A anchor:

`52706adf66b5060b3aec17f21982d9cf5eddc23d`

It does not reopen or alter the locked PermissionGate or RouteScheduler proofs.

## Operational advancement

The JM source:

`source/memorybody.jmroute`

now defines MemoryBody behaviour for:

- kernel-owned aligned heap storage;
- block count and block size;
- free/used ownership state;
- first-free allocation;
- allocation exhaustion to null;
- exact-block release;
- used-state requirement and double-release failure.

`memorybodyc.py` deterministically generates the operational C office. `integrate_memorybody.py` removes the handwritten allocation/release body after the v0.4A stack has been reconstructed.

## Three-office stack

The v0.5A machine proof mounts operational offices in this order:

1. v0.2A boot authority;
2. v0.3A generated PermissionGate;
3. v0.4A generated RouteScheduler;
4. v0.5A generated MemoryBody.

The boot probe itself calls the generated allocator and releaser before the interrupt and user-body route begins.

## Proof requirements

The machine gate must prove:

1. exact descent from the frozen v0.4A anchor;
2. the handwritten MemoryBody office is absent;
3. one generated allocator and one generated releaser are compiled;
4. MemoryBody announces its exact JM source identity before `MEMORY INITIALISED`;
5. the generated scheduler and PermissionGate remain active;
6. both user bodies, PIT scheduling, FaultHold, RecoveryBody and safe continuation remain intact.

## Claim boundary

A passing v0.5A proves **three stacked JM-generated operational kernel offices**. FaultHold, RecoveryBody, IgnitionBody and the assembly floor remain carrier-owned at this stage.

## Local gates

```bash
python3 tools/memorybodyc.py source/memorybody.jmroute --out-dir generated --check
python3 -m unittest discover -s tests -v
```
