# JMISJUSTME — The Living Estate v1.15.0

This directory publishes the public-safe, host-neutral GitHub Pages source body recovered from `JMISJUSTME_GITHUB_PAGES_v1.15.0.zip`.

## Source-publication structure

The keeper’s single `assets/app.js` is exposed as six readable classic scripts. The original outer IIFE wrapper was normalised away because an IIFE cannot cross script tags; the scripts share the browser global lexical environment and retain the original function order.

The keeper’s single stylesheet is exposed as four source limbs:

- `styles-base.css`
- `styles-components.css`
- `styles-views.css`
- `styles-responsive.css`

## Validation

- Every JavaScript limb passes `node --check`.
- Re-adding the original IIFE wrapper around the ordered limbs reproduces the original `app.js` byte-for-byte.
- Ordered concatenation of the four CSS limbs reproduces the original `styles.css` byte-for-byte.
- Service-worker cache paths and `index.html` load order match the readable split.

## Public boundary

This is the public GitHub/host source corridor. The separate full-custody owner package remains private and is not copied into this public repository.
