# JM KICSHIFT — Portability Proof v0.1

**Status:** ASSISTANT-SIDE PORTABILITY PROVED | OWNER-DEVICE DING OPEN  
**Authority:** JM Estate  
**Proof date:** 2026-09-02  
**Canonical keeper:** **DON'T REBUILD WHAT THE ESTATE ALREADY KNOWS — ASSEMBLE IT, THEN MAKE CONTACT PROVE THE JOIN.**

## Parent contact

- Forge/test surface: Lovable
- Project: `KicShift Arena`
- Project id: `e1802764-2c0b-430e-8160-f02d1951109b`
- Contacted source commit: `5e6f751af20fe80e43608fde5972827c94d848e9`

The contacted parent was used as source/contact evidence. The portability descendant did not redesign the game before the first parity proof.

## JM descendant

Source body:

`apps-tools-games/jm-portable-body/kicshift-v0.1/`

Public carrier route:

`games-beyond/kicshift/`

The descendant preserves the contacted game organs and replaces the Lovable/TanStack Start carrier scaffold with an ordinary Vite + React + TypeScript + Three.js / React Three Fiber body. The production build uses relative asset paths so the carrier can move between static hosts without changing the game source.

## Evidence chain

### A — Source independence

PASS.

The gameplay body is stored in the JM repository and does not require the Lovable-specific `@lovable.dev/vite-tanstack-config` package to compile or run.

### B — Independent install/build

PASS.

GitHub Actions run `33578677174` executed on Node 22 outside Lovable:

`checkout → npm install → vite build → artifact`

Result: success.

Artifacts:

- `jm-kicshift-carrier` — 311045 bytes — SHA-256 `861cc7e26c0596b247126ce9f67a386d61050a889d62beff98b3b4ed75bf2c17`
- `jm-kicshift-source-body` — 27780 bytes — SHA-256 `0249b63cfe269cf3545a11f7a56d26fd48e46b05118ba15ed41c8ced466429c4`

### C — Independent WebGL execution

PASS.

The built carrier was run in Chromium outside Lovable with WebGL2 enabled.

Desktop evidence:

- viewport: `1280x720`
- WebGL: `WebGL 2.0`
- arena, player, Flux Gate, HUD and controls rendered
- movement exercised
- KIC hold/release exercised
- DASH exercised
- GUARD exercised
- SHIFT exercised
- page/runtime errors: `0`

Screenshot hashes:

- initial: `a782c721ad0e9aafd54c3176768298b86b2aeb89586310a9e91e895f9a4d91f2`
- interaction: `0332750afab452fb4de4f94bae99a11201781bd9dcad4488a7f064b1bfc81cc6`

### D — Mobile touch-path execution

PASS at emulated-device scope.

- viewport: `915x412`
- mobile/touch browser mode enabled
- joystick drag exercised through touch events
- KIC touch/hold/release exercised
- DASH / GUARD / SHIFT touch controls exercised
- WebGL2 remained live
- page/runtime errors: `0`

Screenshot SHA-256:

`5292a6bd903ab11d652e30bd72f07b937c93447c0b91aa18ce696db787dfdb91`

This proves the mobile touch path in a browser runtime. It does not impersonate physical owner-device contact.

### E — Canonical public door

PASS.

Canonical JM Estate route:

`https://jmisjustme-estate.pages.dev/games-beyond/kicshift/`

KICSHIFT inherits the existing Estate public door rather than inventing a new permanent identity boundary.

### F — Second carrier

PASS.

GitHub Pages mirror:

`https://jmisjustme.github.io/JM-cading-lab/games-beyond/kicshift/`

This proves the game is not tied to one public hosting carrier.

### G — Public carrier byte parity

PASS.

GitHub Actions public proof run `33578814070` fetched both the canonical Cloudflare route and GitHub Pages mirror and compared their delivered files with the Estate repository carrier.

Checked:

- `index.html`
- production JS bundle
- production CSS bundle
- `PORTABILITY_MANIFEST.json`

Result at proof run: both carriers served matching Estate bytes for all checked files.

## What the proof now establishes

At assistant-executable scope, the route is complete:

`LOVABLE CONTACT → SOURCE COPY → JM HARNESS → INDEPENDENT INSTALL/BUILD → WEBGL RUN → MOBILE TOUCH PATH → CANONICAL PUBLIC ROUTE → SECOND CARRIER → BYTE PARITY`

Therefore the meaningful architecture claim is now evidenced rather than philosophical:

**Lovable is a replaceable forge/test surface for this KICSHIFT descendant. The JM source body and game contact can survive outside it.**

## Final open gate

One gate is deliberately left uncrowned because it requires the owner rather than automation:

`OWNER PHYSICAL PHONE → OPEN CANONICAL JM ROUTE → PLAY → CONFIRM PRACTICAL PARITY → DING`

Until that physical contact occurs, the correct status remains:

**ASSISTANT-SIDE PORTABILITY PROVED | OWNER-DEVICE DING OPEN**
