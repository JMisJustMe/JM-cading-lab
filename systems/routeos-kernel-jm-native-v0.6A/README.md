# RouteOS Kernel JM-Native v0.6A — Generated FaultHold + RecoveryBody

This body advances from the frozen v0.5A anchor:

`8b891d1f4bcdf904791588f5bb46adc31908b9d4`

It generates two coupled operational kernel offices from JM source:

- **FaultHold** — saves the fault frame, classifies invalid opcode vector 6, identifies the current user body and blocks it;
- **RecoveryBody** — selects the next runnable body and preserves safe continuation.

The handwritten fault/recovery dispatcher route is removed and replaced by generated C. The inherited generated stack remains mounted beneath it:

1. PermissionGate v0.3A;
2. RouteScheduler v0.4A;
3. MemoryBody v0.5A;
4. FaultHold + RecoveryBody v0.6A.

## Source authority

`source/faulthold_recoverybody.jmroute`

The deterministic compiler emits:

- `generated/faulthold_recoverybody_office.inc`;
- `generated/faulthold_recoverybody_office.json`;
- `proof/FAULT_RECOVERY_OPERATIONAL_RECEIPT.md`.

## Required machine proof

A valid v0.6A pass must show, in one QEMU trace:

1. MemoryBody generated and executed;
2. RouteScheduler generated and executed;
3. PermissionGate generated and executed;
4. User Body 2 deliberately triggers invalid opcode;
5. generated FaultHold activates and blocks User Body 2;
6. generated RecoveryBody activates and selects the safe runnable body;
7. User Body 1 continues afterward.

## Honest boundary

A passing result proves **five named generated operational offices across four generated bodies**: PermissionGate, RouteScheduler, MemoryBody, FaultHold and RecoveryBody. It does not yet prove generated IgnitionBody, interrupt table construction, user-body construction, assembly entry or the entire kernel.
