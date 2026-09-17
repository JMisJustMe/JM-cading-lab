# RouteOS JM-Generated FaultHold + RecoveryBody Receipt

- Version: `v0.6A`
- JM source SHA-256: `2bbcf026b977de46e10ea9d8a337b96a901e69bd6514880fb32fb8d79dedfd00`
- Proof parent: `8b891d1f4bcdf904791588f5bb46adc31908b9d4`
- Machine parent: `3cd46fdfa825391c99f0999bb4939231e03ad619`
- Generated offices: `FAULTHOLD`, `RECOVERYBODY`
- Fault route: save frame → announce → block current body → select safe next
- Fallback route: receipt unhandled vector → return same frame

**Authority law:** JM source defines fault classification and recovery behaviour; generated C is the carrier.
