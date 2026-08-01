# RouteOS Authority Hold Bridge v0.2

The engine exports a OneBody envelope:

```text
INPUT → ROUTE → STATE → SIGNAL → OUTPUT → TRACE → RECOURSE → NEXT_ACTION
```

## Fields

- **INPUT** — the message, event, or action requiring governance.
- **ROUTE** — normalised scope, subject, and channel.
- **STATE** — `UNBOUND`, `GOVERNING`, or `CONTESTED` for the queried route.
- **SIGNAL** — the current authority evaluation signal.
- **OUTPUT** — the strongest applicable governing packet, where one exists.
- **TRACE** — recent handoff receipts.
- **RECOURSE** — the route for correcting or validating the current condition.
- **NEXT_ACTION** — `MOUNT_INSTRUCTION`, `VALIDATE_HANDOFF`, or `CONTINUE`.

## Mount law

The bridge carries Authority Hold decisions into RouteOS. RouteOS remains the wider route body; the engine remains the specialist governance layer. Shared form does not make them identical bodies.
