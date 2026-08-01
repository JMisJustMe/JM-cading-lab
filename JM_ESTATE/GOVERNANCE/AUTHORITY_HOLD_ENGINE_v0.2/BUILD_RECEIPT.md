# JM AUTHORITY HOLD ENGINE v0.2 — BUILD RECEIPT

**Build date:** 1 August 2026  
**Status:** MULTI-GOVERNANCE INTELLIGENCE ALPHA  
**Canonical source:** `../THE_INSTRUCTION_HANDOFF_v1.0/`  
**Previous embodiment:** `../AUTHORITY_HOLD_ENGINE_v0.1/`

## Delivered

- multiple simultaneous instruction packets;
- nested and overlapping scopes;
- deterministic authority priority;
- held conflict candidates;
- root and bounded redelegation chains;
- release, replacement, suspension, breach and restoration;
- HMAC-SHA256 receipt signing and verification;
- event-ledger replay;
- RouteOS OneBody envelopes;
- five-room responsive phone/laptop PWA.

## Validation

```text
node --check core/*.mjs
node --check app.mjs
node --check sw.js
node --test tests/core.test.mjs
python3 surface_check.py
python3 -m json.tool manifest.webmanifest

19 tests
19 passed
0 failed
surface gate PASS
```

## Transport correction

An opaque archive route was rejected after a transport-integrity fault. The final publication uses modular readable source files and remote hash verification. The failed route is retained in provenance rather than concealed.

> A failed route is not a failed task.

## Version boundary

v0.2 mounts from the frozen v1.0 law body and preserves v0.1 intact. Future changes require a traced patch or later version.
