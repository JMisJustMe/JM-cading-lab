# JM ChatGPT Host Adapter v0.1 — Recovery-First Graft

**Status:** build body / not crowned / Third Ding not claimed.

This is **not a new JM game engine, runtime, or game IR**. It is the smallest new host-target graft found necessary after Estate recovery.

## Reused authority

- **JM Visual Interaction Runtime** remains the interaction/runtime authority.
- **JM GameCore / GameForge / GlyphPlay / GlyphForge / PLAYFORM** remain donor/runtime lanes.
- **`jm.gamecore.playable-ir/v0.3`** is reused from the frozen source body.
- **`jm.onebody-abi/v0.1`** remains the host-neutral carrier ABI.
- **JM32-1DA Cross-Device Runtime Adapter v0.2** supplies the precedent: extend only for a new device/runtime target.
- OpenAI Apps SDK / MCP Apps is only the **new host surface**.

## First contact body

The complete local package carries an exact copy of:

`00_OPEN_FIRST_UNTITLED_FIELD_BRANCH_v0_9_FROZEN.html`

SHA-256:

`7391dd5bc1c4ff1565d70b69354cfdd79a121f8e6f6a1d671d75b57d463ee7ea`

The adapter reads that body unchanged and registers it directly as the MCP Apps widget resource. The GitHub branch records a body pointer/hash rather than pretending the Library donor was already seated in this repository.

## Tool

`render-jm-game`

Current v0.1 supports the frozen `jm.untitled-field-branch/v0.9` body only. This is deliberate: **prove the host route before generalising body loading**.

## Run

```bash
npm install
npm run check
npm start
```

Endpoints:

- MCP: `http://localhost:8000/mcp`
- health: `http://localhost:8000/health`

Set `JM_BODY_PATH=/absolute/path/to/00_OPEN_FIRST_UNTITLED_FIELD_BRANCH_v0_9_FROZEN.html` when the donor is not stored under `body/`.

For ChatGPT contact, the MCP endpoint must be reachable by a supported ChatGPT custom-app/developer route (or later publication route). **Do not count successful local serving as Inline Contact.**

## Third Ding criterion

The proof succeeds only when the playable body is genuinely interactive **inside the ChatGPT conversation surface**. A file, screenshot, static card, external browser preview, or local server does not qualify.

## Current platform boundary — 21 Aug 2026

OpenAI currently documents custom MCP app testing as a web surface; custom MCP apps are not presently available on mobile. Therefore this v0.1 graft can target the official in-chat widget route on supported ChatGPT web, but it does **not** by itself prove the Android Third Ding. The two historical Android inline manifestations remain separate observed evidence.
