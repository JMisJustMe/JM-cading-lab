# JM RouteOS Game Estate v2.1A — Estate Shelf Route

This is the next usable body above the frozen **Five Crowns Live Estate v2.0A**.

The Android host is no longer a one-cartridge doorway. It now carries a versioned, offline shelf with two real registered routes:

```text
jmrouteos://cartridge/five-crowns
jmrouteos://cartridge/estate-router
```

The Android package remains exactly:

```text
com.jmisjustme.routeos.gameestate
```

That preserves the existing JM Estate Compass handoff while making the destination discoverable.

## What is usable

### Five Crowns

- touch, keyboard and D-pad movement;
- strict PrimitiveRoute → DispatchRoute → EntryRoute → KernelContractRoute → OrchestrationRoute progression;
- FaultHold and RecoveryBody checkpoint law;
- local progress persistence;
- permanent-anchor finish state;
- exact crown and proof explanations.

### Sovereign Estate Router

- canonical 100-body registry mounted from six repository-proven source batches;
- natural-language build request routing;
- search by body name, role, family and capability;
- direct and adapter-required compatibility explanations;
- mandatory Source Ledger, TraceBox and Dings injection;
- no-supreme-body and identity-preservation laws;
- copyable route receipts;
- game, compiler, Estate OS and conversation quick routes.

### Compass shelf body

`compass-mount/JM_ROUTEOS_ESTATE_SHELF_v2_1A.html` is a self-contained HTML body that can be selected inside the clean JM Estate Compass host. It exposes both native routes without requiring the owner to remember package IDs or URI syntax.

## Recovered source

The registry and compatibility matrix are mounted byte-for-byte from:

```text
agent/sovereign-estate-integration-v1
```

The browser router is an explicit UMD/browser/CommonJS adaptation of `coding-estate/integration/router-core.mjs`. Its lineage record preserves the donor Git blob identities and mounted SHA-256 hashes.

## Build

Requirements:

- Java 17
- Gradle 8.9
- Android Gradle Plugin 8.7.3
- Android SDK 35 / build-tools 35.0.0

Build the unsigned release APK:

```bash
gradle --no-daemon -p routeos-live-estate :app:assembleRelease
```

Run all local authority checks:

```bash
node --check routeos-live-estate/app/src/main/assets/estate-router.js
node --check routeos-live-estate/app/src/main/assets/app.js
node routeos-live-estate/tools/test_simulation.js
node routeos-live-estate/tools/test_estate_router.js
python3 routeos-live-estate/tools/verify_live_estate.py
python3 routeos-live-estate/tools/verify_estate_shelf.py
```

## Frozen parent

- Commit: `8cc8cb5143ec8fef766acf464ef860d00d4c0e36`
- Anchor: `anchor/routeos-five-crowns-live-estate-v2-0a-ding-pass`

The v2.0A Live Estate and v1.9A kernel remain independently frozen and authoritative.

## Claim boundary

This body proves an offline multi-cartridge host, a real Compass-importable shelf, and deterministic routing across the known canonical 100-body registry.

It does **not** merge all JM bodies into one, prove every possible composition, install private Compass content automatically, boot the x86 kernel inside Android, replace the QEMU machine receipts, or claim that the whole Estate is finished.
