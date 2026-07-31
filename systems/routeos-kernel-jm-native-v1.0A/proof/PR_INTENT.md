# PR Intent — RouteOS JM-Native v1.0A

## Parent lock

- Frozen proof parent: `a05b26b3901460cfa5623cbb3063d961a9952214`
- Proven machine parent: `dfa52b8e42f2511eeb3082f14fc2eb0584843e27`

## Intended new proof

Replace the single handwritten assembly seam implementing:

- `routeos_isr_ud`
- `routeos_isr_timer`
- `routeos_isr_syscall`
- `routeos_enter_frame`

with deterministic output from `source/assemblyentry_framecarrier.jmroute`, while preserving the exact v0.9A CPU-frame ABI and the ten already-proven generated kernel offices.

## Hold conditions

The lane must stop rather than silently adapt if:

- the four handwritten symbols are not found together exactly once;
- their order has changed;
- the v0.9A 22-qword frame order changes;
- generated output is stale;
- the linked ELF lacks the generated source identity;
- any #UD, timer, syscall, fault containment, recovery or safe-continuation runtime marker disappears;
- disassembly no longer shows synthetic metadata, dispatch, returned-frame switching and `iretq`.

No DING is claimed by this intent file. The machine workflow decides the result.
