# JM Authority Hold Engine v0.2 — Field Trials

## Trial set

1. **Original shared-channel probe** — a later contradictory message from the same phone remains held when source and release are unverified.
2. **Nested scope** — broad and narrow compatible packets govern together.
3. **Conflicting mount** — a newer contradictory packet becomes a held candidate, not an automatic replacement.
4. **Root delegation** — verified authority is granted within a bounded scope and rank.
5. **Redelegation chain** — child authority cannot exceed the parent scope or rank.
6. **Delegated replacement** — a verified chain can authorise a replacement while preserving both traces.
7. **Emergency boundary** — a stronger boundary suspends governance without erasing it.
8. **Breach and restoration** — behaviour may breach an instruction while governance and history remain distinguishable.
9. **Signed receipt** — HMAC-SHA256 verifies an unchanged receipt and rejects tampering.
10. **Replay reconstruction** — instruction and delegation state are rebuilt from the receipt ledger.
11. **RouteOS bridge** — the live stack becomes a OneBody route envelope.

## Validation result

```text
19 tests
19 passed
0 failed
```

The trial suite is executable in `core.test.mjs` and is rerun by the repository workflow.
