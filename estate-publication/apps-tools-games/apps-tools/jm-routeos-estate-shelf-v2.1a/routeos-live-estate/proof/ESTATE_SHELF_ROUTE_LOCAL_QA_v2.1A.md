# RouteOS Estate Shelf Route v2.1A — Local QA Receipt

## Frozen parent

- `8cc8cb5143ec8fef766acf464ef860d00d4c0e36`
- `anchor/routeos-five-crowns-live-estate-v2-0a-ding-pass`

## Recovered authority

- canonical registry: 100 bodies;
- source batches: 6;
- duplicate body IDs: 0;
- duplicate body names: 0;
- source-batch proof failures: 0;
- forbidden compatibility laws: 5;
- recovered registry and compatibility files matched their mounted SHA-256 identities.

## Executed checks

- `node --check app/src/main/assets/estate-router.js` — PASS
- `node --check app/src/main/assets/app.js` — PASS
- `node tools/test_estate_router.js` — PASS
  - game route carries GameForge, Game-CODING, JM GameCore, Seedform, Pattern-Tapping, Source Ledger, TraceBox, Dings and delivery;
  - compiler route carries Parser, Compiler, JS Emitter, Source Ledger, TraceBox and Dings;
  - Estate OS route carries RouteCore Native, OS_CODING, CodeHand RouteOS, Source Ledger, TraceBox and Dings;
  - Parser → Compiler direct compatibility verified;
  - unrelated family route requires an adapter;
  - cartridge IDs and aliases resolve generically.
- `python3 tools/verify_estate_shelf.py` — PASS
  - two registered offline cartridges;
  - exact Compass package and deep-link contracts;
  - no Android internet permission;
  - self-contained Compass shelf body;
  - 100-body registry and six source parts;
  - five forbidden laws;
  - responsive Estate Shelf surface and generic router controller.

## Browser/device boundary

This local gate verifies source, state and interface contracts. The Android release build, APK content inspection, zip alignment and installed-device contact are delegated to GitHub and the owner device. No installed-device DING is claimed by this receipt.
