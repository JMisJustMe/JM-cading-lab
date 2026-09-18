# JM ChatGPT Host Adapter v0.1.1 — Recovery-First Graft

**Status:** host-adapter build body / source-integrity PASS / MCP runtime proof lane active / ChatGPT contact not yet crowned.

This is **not a new JM game engine, runtime, or game IR**. It is the smallest new host-target graft found necessary after Estate recovery.

## Reused authority

- **JM Visual Interaction Runtime** remains the interaction/runtime authority.
- **JM GameCore / GameForge / GlyphPlay / GlyphForge / PLAYFORM** remain donor/runtime lanes.
- **`jm.gamecore.playable-ir/v0.3`** is reused from the frozen source body.
- **`jm.onebody-abi/v0.1`** remains the host-neutral carrier ABI.
- **JM32-1DA Cross-Device Runtime Adapter v0.2** supplies the precedent: extend only for a new device/runtime target.
- OpenAI MCP Apps / ChatGPT is only the **new host surface**.

## v0.1.1 hardening

The first host adapter was cut down to the current minimal MCP server shape: Node native HTTP + `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps` + `zod`. Express and CORS packages were removed because they are unnecessary for this adapter.

The proof is deliberately split into three lanes:

1. **Source lane** — exact frozen donor SHA/IR/ABI and no-mutation law.
2. **Runtime lane** — automated MCP initialize, tool listing, resource listing/read, render-tool call and receipt generation.
3. **Contact lane** — actual playable interaction inside ChatGPT. This remains open until physically contacted.

## Frozen source body

The complete local package carries an exact copy of:

`00_OPEN_FIRST_UNTITLED_FIELD_BRANCH_v0_9_FROZEN.html`

SHA-256:

`7391dd5bc1c4ff1565d70b69354cfdd79a121f8e6f6a1d671d75b57d463ee7ea`

The GitHub branch keeps a body pointer/hash rather than pretending the Library donor was already re-authored or seated here. Runtime CI may create a **marked transport fixture** when the exact donor bytes are absent; that fixture can prove MCP transport only and never source authority.

## Tool and resource

Tool: `render-jm-game`

Resource: `ui://jm/untitled-field-branch-v0.9.html`

The adapter exposes the existing body through MCP Apps metadata while preserving:

- `CARRIER_NOT_SOURCE_AUTHORITY`
- `mergeForbidden: true`
- playable IR `jm.gamecore.playable-ir/v0.3`
- OneBody ABI `jm.onebody-abi/v0.1`

## Run

```bash
npm install
npm run check
npm run contract
npm run integration
npm start
```

Endpoints:

- MCP: `http://localhost:8000/mcp`
- health: `http://localhost:8000/health`

## Automated runtime receipt

GitHub Actions workflow:

`.github/workflows/jm-chatgpt-host-adapter-runtime-proof.yml`

Expected artifact:

`MCP_RUNTIME_PROOF_v0_1_1.json`

A green runtime receipt proves MCP transport/tool/resource behavior only. **It does not count as ChatGPT Inline Contact.**

## Third Ding criterion

The proof succeeds only when the playable body is genuinely interactive **inside the ChatGPT conversation surface**. A file, screenshot, static card, external browser preview, local server or CI transport pass does not qualify.
