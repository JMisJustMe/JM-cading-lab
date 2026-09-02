# JM Portable Body — KICSHIFT v0.1 Portability Proof

Status: **ASSISTANT-SIDE PORTABILITY PROVED — OWNER-PHONE DING OPEN**

Parent/contact source: Lovable project `KicShift Arena`  
Contacted Lovable commit: `5e6f751af20fe80e43608fde5972827c94d848e9`

## What this body proves

KICSHIFT is no longer dependent on Lovable as its executable home. The contacted game source has been preserved as a JM-owned descendant, stripped of the Lovable/TanStack Start carrier scaffold, built independently, run with WebGL2 outside Lovable, exercised with desktop and mobile-touch inputs, and delivered through two Estate-controlled public carriers.

Lovable remains useful as a forge/test surface. It is not required by the portable gameplay carrier.

## Governing route

`CONTACTED SOURCE → PRESERVE GAME BODY → ISOLATE CARRIER ASSUMPTIONS → JM BUILD HARNESS → INDEPENDENT BUILD → WEBGL RUN → MOBILE TOUCH CONTACT → CANONICAL PUBLIC CARRIER → SECOND CARRIER → BYTE PARITY → OWNER PHONE CONTACT → PORTABILITY DING`

## Preserved game body

The first parity descendant deliberately avoided redesigning KICSHIFT. The contacted `src/game/*` body was transplanted into a lean ordinary web harness:

- React 19
- TypeScript
- Three.js
- React Three Fiber
- Vite
- Tailwind only for the inherited HUD utilities

Removed from the gameplay carrier:

- `@lovable.dev/vite-tanstack-config`
- TanStack Start / Router carrier requirements
- Nitro server carrier
- React Query scaffold
- Lovable error-reporting/runtime scaffold

The Vite carrier uses `base: "./"`, making one production build relocatable across Estate subroutes and independent static hosts.

## Proved contacts

### 1. Independent source + build — PASS

GitHub Actions run `33578677174` installed dependencies on Node 22 and built the game outside Lovable successfully.

- carrier artifact: `jm-kicshift-carrier`
- carrier size: `311045` bytes
- carrier SHA-256: `861cc7e26c0596b247126ce9f67a386d61050a889d62beff98b3b4ed75bf2c17`
- lean source artifact: `jm-kicshift-source-body`
- source artifact size: `27780` bytes
- source SHA-256: `0249b63cfe269cf3545a11f7a56d26fd48e46b05118ba15ed41c8ced466429c4`

### 2. Independent WebGL runtime — PASS

The carrier was run outside Lovable in Chromium with WebGL2 enabled.

- desktop proof viewport: `1280x720`
- WebGL: `WebGL 2.0`
- gameplay/HUD scene rendered
- movement, KIC charge/release, DASH, GUARD and SHIFT exercised
- runtime/page errors: `0`

### 3. Mobile-touch execution — PASS at emulated-device scope

The same carrier was run at a `915x412` mobile landscape viewport with touch input enabled.

- joystick drag exercised
- KIC touch/hold/release exercised
- DASH / GUARD / SHIFT touch controls exercised
- WebGL2 scene remained live
- runtime/page errors: `0`

This is genuine touch-path/browser execution but is **not** represented as the owner's physical handset contact.

### 4. Canonical Estate carrier — PASS

`https://jmisjustme-estate.pages.dev/games-beyond/kicshift/`

The game is mounted beneath the existing JM Estate canonical public door rather than inventing a new permanent identity door.

### 5. Second independent carrier — PASS

`https://jmisjustme.github.io/JM-cading-lab/games-beyond/kicshift/`

### 6. Public byte parity — PASS

GitHub Actions run `33578814070` fetched both public carriers and compared the delivered `index.html`, JS bundle, CSS bundle and portability manifest against the Estate repository copies. Both public carriers matched the Estate body byte-for-byte for the checked files.

## Current boundary

Everything that can be proved without the owner physically touching the independent public game has been completed.

The remaining final gate is intentionally human/contact-based:

`OWNER PHONE → PLAY INDEPENDENT CANONICAL ROUTE → CONFIRM CONTACT / PARITY → PORTABILITY DING`

Until that happens, the lawful state is:

**ASSISTANT-SIDE PORTABILITY PROVED | OWNER-DEVICE DING OPEN**

Keeper: **DON'T REBUILD WHAT THE ESTATE ALREADY KNOWS — ASSEMBLE IT, THEN MAKE CONTACT PROVE THE JOIN.**
