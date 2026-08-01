# RouteOS JM-Native FaultClassRecoveryRoute v2.2A

Parent: frozen v2.1A `e47dcec3c0323a8c1c03e222860783b390c8b92c`.

- Body 2: `UD2` → #UD vector 6 → illegal-instruction classification → inherited quarantine/recovery.
- Body 4: controlled retirement through syscall 3.
- Body 5: reuses slot 3 at generation 2, executes `CLI`, enters #GP vector 13, is classified as privilege violation and quarantined.
- Bodies 1 and 3 continue; a later capacity request rejects at tick 200 only after proving no EMPTY or RETIRED slot remains.

JM source SHA-256: `5e1b9bc86f68a2a36ffd1f07668f6aa2e288ffbaa9c0867051b4b00a619e3d46`.

## Construction boundary

This is bounded classification and containment for two real hardware exception families inside the four-slot proof kernel. It does not claim arbitrary exception recovery, instruction retry, executable-file loading, persistent tracing, dynamic virtual memory or a general-purpose operating system.
