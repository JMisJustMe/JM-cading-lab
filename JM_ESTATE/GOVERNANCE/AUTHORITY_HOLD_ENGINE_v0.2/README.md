# JM Authority Hold Engine v0.2

**Status:** Working multi-governance alpha  
**Canonical source:** `../THE_INSTRUCTION_HANDOFF_v1.0/`  
**Previous embodiment:** `../AUTHORITY_HOLD_ENGINE_v0.1/`

> **Later is not automatically stronger.**

v0.2 preserves the frozen law body and expands the first engine into a multi-instruction governance system. It does not rewrite v0.1 or silently replace the canonical v1.0 source.

## What changed after v0.1

- multiple simultaneous instruction packets;
- nested and overlapping scope paths;
- compatible governance at different scopes;
- conflicting new packets held as candidates rather than treated as governing;
- deterministic priority using boundary, authority, scope specificity and verification before time;
- root delegations and bounded redelegation chains;
- delegated challenges and replacements;
- competing-authority visibility;
- HMAC-SHA256 receipt signing and verification;
- event-ledger replay that rebuilds state;
- RouteOS `INPUT → ROUTE → STATE → SIGNAL → OUTPUT → TRACE → RECOURSE → NEXT_ACTION` envelopes;
- responsive phone/laptop interface and offline PWA shell.

## Open first

Open `index.html` or `OPEN_FIRST.html`.

The interface contains five rooms:

1. **Governance** — mount packets and resolve routes.
2. **Handoff** — challenge active governance and inspect the eight gates.
3. **Delegation** — mount root and child authority chains.
4. **Replay** — reconstruct state from receipts one event at a time.
5. **Trace** — export/import, sign/verify receipts, and generate RouteOS envelopes.

## Local validation

```bash
node --check core.mjs
node --check app.mjs
node --check sw.js
node --test core.test.mjs
python3 surface_check.py
```

## Version law

v0.2 is a new embodiment mounted from the same frozen source. Fixes to v0.2 should be traced as patches or a later version. v0.1 remains intact as the first working embodiment.

## Claim boundary

This is a governance and decision-support engine. A verified channel, key, delegation record, or local signature does not by itself prove a hidden human identity, motive, legal mandate, or institutional authority. Real consequential use requires suitable authentication and governing safeguards.
