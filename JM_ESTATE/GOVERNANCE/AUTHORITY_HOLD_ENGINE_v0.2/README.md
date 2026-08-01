# JM Authority Hold Engine v0.2

**Status:** Multi-Governance Intelligence Alpha  
**Canonical source:** `../THE_INSTRUCTION_HANDOFF_v1.0/`  
**Previous embodiment:** `../AUTHORITY_HOLD_ENGINE_v0.1/`

> **CURRENT GOVERNANCE + CHALLENGE → AUTHORITY HOLD → VALIDATION → CONTINUE OR HANDOFF → TRACE**

v0.2 preserves the frozen law body and v0.1 while adding simultaneous instruction packets, nested scopes, deterministic authority priority, bounded delegation chains, HMAC-SHA256 receipts, replay reconstruction, a RouteOS envelope, and a five-room phone/laptop PWA.

## Open first

Open `index.html` or `OPEN_FIRST.html`.

## Source map

- `core/constants.mjs` — state and challenge families.
- `core/util.mjs` — scope, conflict and priority laws.
- `core/models.mjs` — instruction, challenge and delegation packets.
- `core/delegation.mjs` — root and redelegation chains.
- `core/governance.mjs` — mount, hold, resolve and expiry.
- `core/handoff.mjs` — eight-gate challenge decisions.
- `core/receipt.mjs` — signed receipts.
- `core/replay.mjs` — event replay and RouteOS bridge.
- `core/engine.mjs` — OneBody engine surface.
- `tests/core.test.mjs` — 19 field trials.

## Validate

```bash
node --check core/*.mjs
node --check app.mjs
node --check sw.js
node --test tests/core.test.mjs
python3 surface_check.py
python3 -m json.tool manifest.webmanifest >/dev/null
sha256sum -c SHA256SUMS.txt
```

## Version law

v0.2 extends the working machinery. It does not rewrite the frozen v1.0 law body or replace v0.1.
