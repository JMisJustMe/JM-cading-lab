# LiveForge Engine Body v0.1

LiveForge Engine Body is a lightweight offline-first product bench for JM ecosystem work.

## Use it for

1. Pasting raw source material.
2. Auto-routing it to a branch.
3. Checking branch identity and locks.
4. Forging a product-body Markdown shell.
5. Leaving a Ding/receipt.
6. Exporting state for recovery.

## Do not use it as

- Central Switchboard replacement
- whole estate archive
- game engine replacement
- proof that all branches are complete

## Published source layout

- `app-model.js` — branch registry, sample state and state declarations.
- `app-runtime.js` — intake, routing, forging, receipts, import/export, rendering and Switchboard handoff.
- `index.html` — actual product bench UI.
- `styles.css` — responsive phone/laptop body.
- `service-worker.js` + `manifest.webmanifest` — offline/PWA route.

The original keeper used one application script. This public GitHub source separates model and runtime so the branch law and product operations remain readable without changing the application route.

## Persistence

Browser `localStorage` is used for convenience. Export JSON after important work, especially on Android, because downloaded standalone HTML can lose practical access to prior browser state.

## Hard locks

- LiveForge is bench, not hub.
- Central Switchboard remains master.
- Restore before rewrite.
- No Ding, no completion claim.
