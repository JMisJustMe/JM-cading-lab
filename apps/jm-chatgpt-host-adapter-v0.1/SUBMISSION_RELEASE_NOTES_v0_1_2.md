# JM Inline Contact v0.1.2 — submission release notes

Initial public submission of **JM Inline Contact**.

The public v0.1 body exposes one read-only MCP tool, `render-jm-inline-probe`, and one interactive UI resource for a deliberately non-sensitive touch/contact probe. The intended user-visible behavior is simple: render the surface inside ChatGPT, touch or drag the field, and observe readable state, visible consequence, and an in-widget trace.

## Submission hardening in v0.1.2

- Explicit output schemas are advertised by both the private host-adapter proof tool and the public probe tool.
- Tool annotations are explicit and behavior-matched: read-only `true`, open-world `false`, destructive `false`.
- Widget CSP is deliberately narrow: no external connect or resource domains.
- Public website, support, privacy policy, and terms routes are live on the same isolated host.
- A domain-verification endpoint is implemented at `/.well-known/openai-apps-challenge` and is ready to serve the exact portal-issued token once supplied.
- GitHub Actions proves the MCP runtime transport independently with a marked fixture.
- GitHub Actions separately proves the public HTTPS MCP endpoint, policy routes, discovered tool metadata, output schema, UI resource retrieval, and render-tool invocation.
- No authentication is required and no reviewer credentials are needed.
- No private or frozen JM game donor bytes are present in the public probe.

## Proof boundary

This submission does **not** claim that ChatGPT Inline Contact has already been reproduced. The Third Ding remains open until the interactive widget is actually rendered and operated inside the ChatGPT conversation surface.
