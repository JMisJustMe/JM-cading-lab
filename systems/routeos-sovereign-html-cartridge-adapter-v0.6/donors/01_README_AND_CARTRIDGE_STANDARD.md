# RouteOS v103.0 — Cartridge Standard + First-Party SDK

Open:

`00_OPEN_FIRST_ROUTEOS_v103_0_CARTRIDGE_STANDARD_FIRST_PARTY_SDK.html`

## JM Cartridge Standard v1.0

A package is a portable JSON body with:

- `recordType: JMCartridgePackage`
- `standard: JM-CARTRIDGE/1.0`
- manifest identity and semantic version
- publisher and trust status
- declared permissions
- required and optional actions
- required analog routes
- player count and offline status
- isolated save namespace
- runtime base cartridge
- declarative scene patch
- declarative action/lifecycle hooks
- FNV-1a integrity receipt

## Lifecycle

`INSTALL → BOOT → READY → PLAY → SUSPEND → RESUME → SAVE → EXIT`

## Security boundary

Imported packages do not execute arbitrary JavaScript.

The v1.0 package runtime accepts declarative scene changes and a restricted hook vocabulary:

- TRACE
- DING
- SCORE
- ENERGY
- HEAL
- SET_RULE
- SPAWN
- PACKAGE_DATA_ADD

Unsupported permissions and altered integrity receipts are rejected.

## Separate first-party packages

### Pulse Orbit

- package ID: `jm.firstparty.pulse-orbit`
- independent version and save namespace
- rebound/aim cartridge route
- package-specific rules, scene additions and hooks

### Seed Runner

- package ID: `jm.firstparty.seed-runner`
- independent version and save namespace
- traversal/collection route
- package-specific rules, scene additions and hooks

Both packages exist as separate `.jmcart.json` files and are also embedded for direct-open use.

## SDK

`04_JM_CARTRIDGE_SDK_v1_0.js` provides:

- package creation
- signing
- validation
- canonicalisation
- integrity generation

## Library functions

- install
- update
- rollback
- remove
- inspect
- validate
- import
- export
- launch
- separate save capture
- Quick Resume
- lifecycle receipts
