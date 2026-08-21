# FTR First-Person v0.5.1 — True 360 Aim Deck

**Body:** FTR First-Person Perception Body  
**Status:** FROZEN / LOCKED / ANCHORED source publication  
**Carrier:** HTML5 Canvas + JavaScript + PWA

## Capability

- full yaw rotation;
- vertical pitch aiming;
- diagonal combined look;
- right-half swipe-look;
- Aim/Pulse Deck look control;
- tap fire and hold pulse;
- pitch-aware projection, reticle contact and damage;
- browser text-selection, callout and context-menu interference blocked;
- carrier-neutral `LOOK { x, y }` bridge command;
- two Trace Cores, gate breach and extraction route;
- scan, phase, free-move and auto-flow control bodies.

## Readable source route

The keeper’s inline application body was separated at top-level function boundaries into:

1. `ftr-core.js`
2. `ftr-controls.js`
3. `ftr-world.js`
4. `ftr-raycast-sprites.js`
5. `ftr-hud-render-loop.js`
6. `ftr-input-bridge.js`

The original outer wrapper is unnecessary across classic script tags; the scripts share the browser global lexical environment and load in source order.

## Validation boundary

The exact locally extracted six limbs passed JavaScript syntax and re-wrapped/recombined to the original keeper script byte-for-byte. The public files are readable source publication through the connector and preserve the same function order and routes; they are not represented as the original single-file bytes.

## Anchor law

This body must not be silently overwritten. Later revisions branch from this state and retain its receipt, hashes and version lineage.
