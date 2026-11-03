# JM ECOSTATE — CP39 Native Contact → GameCore playable integration

**Scope:** additive integration of protected JM32-1DA Contact Engine Lab v0.1 and the EXISTING original JM Game-CODING/JM GameCore module. No ancestor, engine, game, or Library original was overwritten. This is a working *software integration*, not a physical Fold8 acceptance or an independently anchored/production-authenticated receipt system.

## Authorities and original homes
- Protected original Contact Lab: SHA-256 `ed72ec0880af89925ab78fe0de125f47613217a3758d9a744dd08420e00c3310`, 28,690 bytes. This file is NOT canonically replaced by the descendant. It remains with its original Library custody.
- Actual native module: `coding-estate/sovereign-ten/direct/game-native.mjs`. The adapter imports this original module directly.
- The new playable `JM32_1DA_CONTACT_NATIVE_GAMECORE_CP39.html` is a distinctly labelled *delivery descendant* of the Contact Lab, preserving the original game's field, rules, receipt tracker, QA and controls and adding a native execution HUD and swipe gesture support.
- CP35/CP36/CP37 are preserved historic tests; their proofs are not reclassified as this release's native/browser proof.

## Verified — 3 November 2026, GroundZeroJM
- Exact recovered Contact Lab SHA verified independently before integration and rechecked after tests.
- Existing sovereign-ten native baseline: **23/23 PASS**.
- Direct original `game-native.mjs` contact adapter: **130/130 PASS** across **nine** genuine original Lab consequence types, coordinate hash/band matching, state/trace evidence, HMAC capture/rejection, wrong routes, tampering, replay, and invariant rollback gate.
- Chromium browser acceptance with phone 390×844, Fold-style 846×700 and desktop 1280×800: **30/30 PASS**. Browser tap emulation, touch-pointer swipe, QA/replay, reset, recovery, real GameCore trace and zero page-level JS errors observed. Original Lab QA remained **16/16 PASS** at each size.
- **This was touch emulation, not a physical Samsung Fold8 test.** No Fold8 DING is claimed.

## Run tests / use the playable
Use a trusted local copy of the original Lab, and run from the repo root:

```bash
node coding-estate/sovereign-ten/direct/native-selftest.mjs
node coding-estate/integration/contact-gamecore-bridge.test.mjs /absolute/path/to/JM32_1DA_CONTACT_ENGINE_LAB_v0_1.html
node coding-estate/integration/make-contact-native-descendant.node.mjs /absolute/path/to/JM32_1DA_CONTACT_ENGINE_LAB_v0_1.html coding-estate/integration/JM32_1DA_CONTACT_NATIVE_GAMECORE_CP39.html
python -m http.server 19837 --bind 127.0.0.1
```

Then open `http://127.0.0.1:19837/coding-estate/integration/JM32_1DA_CONTACT_NATIVE_GAMECORE_CP39.html`. Local HTTP is needed for relative ESM imports; a raw `file://` launch may be blocked by browser module/CORS policy.

## Security boundary / release policy
- Node `contact-receipt-authority.node.mjs` holds an independent *process-local* HMAC key. A host captures the genuine receipt as emitted and seals it. Any subsequent in-memory ledger-plus-receipt modification is rejected against its independently held pin. Signing AFTER an attacker mutates the source is NOT prevented; the host/key must themselves be trusted.
- On the playable browser page the receipt proof is intentionally **session-local**; it is not a server-side attestation or durable signed custody. Never treat the browser HUD as cryptographic origin proof.
- GameCore executes event-specific state consequences and produces native receipts/traces; the *original Contact Lab* remains the authority for the movement, deformation and fracture physics. Do not claim GameCore independently simulated those material laws.
- The `JMGameCoreRuntime` class itself remains nontransactional; this adapter prevents partial commits by isolating each dispatch in a fresh runtime and committing only on success. Other native GameCore callers do not inherit this wrapper automatically.
- **HOLD:** independent durable authentication/chain of custody, actual Fold8 touch/hardware acceptance, an installed APK, and integration into other production games. No storage savings or universal runtime deployment claimed.
- **One keeper:** original Lab remains protected; this descendant has a different playable-native role and the original GameCore module remains canonical.

## Source-to-proof path
Contact Lab event → original eight-stage 128×5 coordinates → exact receipt validation → trusted capture (Node host) or session-local browser pin → adapter → **original** `GameCodingRuntime` and `JMGameCoreRuntime.dispatch` → native outcome/trace/receipt → playable HUD.

## Files
- `contact-gamecore-bridge.mjs` — additive 9-event native adapter, strict stage hashing, session replay guard, commit boundary.
- `contact-receipt-authority.node.mjs` — process-local HMAC capture/verify (Node only).
- `contact-gamecore-bridge.test.mjs` — direct native module test with mandatory protected original SHA (will HOLD rather than fabricate a missing original).
- `contact-gamecore-playable.mjs` — browser HUD and swipe event route.
- `make-contact-native-descendant.node.mjs` — verified ancestor-to-delivery builder.
- `JM32_1DA_CONTACT_NATIVE_GAMECORE_CP39.html` — playable descendant (not a competing canonical original).
- `proofs/CP38_DIRECT_NATIVE_RECEIPT.json` and `proofs/CP39_BROWSER_QA.json` — measured machine receipts.
