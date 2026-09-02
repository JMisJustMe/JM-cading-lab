# JM Portable Body — KICSHIFT v0.1 Assembly Pass

Status: **STARTED — source-boundary assembly, not yet portability-crowned**

Parent/contact source: Lovable project `KicShift Arena`
Contacted Lovable commit: `5e6f751af20fe80e43608fde5972827c94d848e9`

## Purpose

This body proves that KICSHIFT is a JM-owned source body whose current Lovable environment is a forge/carrier, not the game itself.

The first pass deliberately does **not** redesign KICSHIFT. It preserves the contacted game source and replaces only the carrier/build assumptions needed to stand outside Lovable.

## Governing route

`CONTACTED SOURCE → PRESERVE GAME BODY → ISOLATE CARRIER ASSUMPTIONS → JM BUILD HARNESS → INDEPENDENT BUILD → RUN → PHONE CONTACT → PARITY CHECK → PORTABILITY DING`

## Current finding

The contacted game route is client-only (`ssr: false`) and the actual game code is ordinary React + TypeScript + Three.js / React Three Fiber. The Lovable-specific dependency is concentrated in the scaffold/build configuration (`@lovable.dev/vite-tanstack-config`) rather than in the game simulation itself.

That means the first JM-body strategy is intentionally lean:

- keep `src/game/*` source unchanged for the first parity pass;
- replace Lovable/TanStack Start scaffold with a minimal Vite React SPA harness;
- retain Tailwind only because the current HUD uses Tailwind utility classes;
- do not add Drei, TanStack Router, React Query, Nitro, Lovable error reporting, or SSR unless the game proves it actually needs them.

## First-pass body

- `PORTABILITY_MANIFEST.json` — lineage, boundary and proof state.
- `package.json` — JM-owned lean dependency surface.
- `vite.config.ts` — ordinary Vite + React + Tailwind config; no Lovable package.
- `index.html` — independent public entry carrier.
- `src/main.tsx` — direct game mount.
- `src/styles.css` — lean Tailwind entry for the existing HUD.
- `src/game/*` — contacted KICSHIFT game body, transplanted without behavioural redesign.

## Truth boundary

**Started is not proved.**

Portability becomes proved only after this descendant installs/builds outside Lovable, runs independently, receives phone contact, and is compared against the contacted parent for gameplay/control/visual parity.

Keeper: **DON'T REBUILD WHAT THE ESTATE ALREADY KNOWS — ASSEMBLE IT, THEN MAKE CONTACT PROVE THE JOIN.**
