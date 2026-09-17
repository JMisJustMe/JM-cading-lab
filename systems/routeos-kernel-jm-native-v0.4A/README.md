# RouteOS Kernel JM-Native v0.4A — Generated RouteScheduler

This body begins from the frozen v0.3A anchor:

`2e814746c846fc5aeb45bee7bb03338d7c9a0896`

It does not reopen or alter the locked v0.3A PermissionGate proof.

## Operational advancement

The JM source:

`source/routescheduler.jmroute`

now defines RouteScheduler behaviour for:

- two-body round-robin selection;
- blocked-body exclusion;
- READY → RUNNING state handoff;
- body run accounting;
- current-frame preservation and return to READY;
- no-runnable-body FaultHold and halt.

`routeschedulerc.py` deterministically generates the operational C office. `integrate_routescheduler.py` removes the handwritten scheduler block from the already-integrated v0.3A kernel and replaces it with the generated implementation.

## Two-office stack

The v0.4A machine proof mounts operational offices in this order:

1. v0.2A boot authority;
2. v0.3A generated PermissionGate;
3. v0.4A generated RouteScheduler.

PermissionGate continues to call `select_next` and `save_current`, which now resolve to the JM-generated scheduler office.

## Proof requirements

The machine gate must prove:

1. exact descent from the frozen v0.3A anchor;
2. the handwritten scheduler office is absent;
3. one generated `select_next` and one generated `save_current` are compiled;
4. the RouteScheduler announces its exact JM source identity before the first user-body entry;
5. the generated PermissionGate remains active and handles live syscalls;
6. PIT switching, User Body 2 fault capture, RecoveryBody and User Body 1 continuation remain intact.

## Claim boundary

A passing v0.4A proves **two stacked JM-generated operational kernel offices**. MemoryBody, FaultHold, IgnitionBody and the assembly floor remain carrier-owned at this stage.

## Local gates

```bash
python3 tools/routeschedulerc.py source/routescheduler.jmroute --out-dir generated --check
python3 -m unittest discover -s tests -v
```
