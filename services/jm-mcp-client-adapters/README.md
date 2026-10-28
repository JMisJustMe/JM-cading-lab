# JM ECOSTATE — Gemini CLI bearer carrier (not Gemini Web OAuth)

**Recover before rebuild.** These local proxies route to the existing standalone, authenticated Render services, **without becoming their engines**. No remote service, authority, tool definition, protocol, signature or source blob is altered.

## What is actually supported

- JM APP//COMMONS CP06: `https://jm-app-commons-cp06-mcp.onrender.com/mcp` → exact six native APP//COMMONS tools.
- JM Federation Receipt CP02: `https://jm-federation-receipt-cp02-mcp.onrender.com/mcp` → the exact independent CP01-generated receipt tool.
- Original protected endpoints still require their two *distinct* bearer credentials; no credentials are stored in this source tree.
- Each proxy executes on the **user's own local machine** as an MCP stdio client carrier and sends authenticated JSON-RPC HTTPS to its original server. It stores no source, request body or credentials.

## Install on the owner machine (when available)

1. Keep this repository checkout. Open a terminal in the repository root.
2. In the Render Dashboard, read each service's separately controlled token securely: `JM_COMMONS_TOKEN` and `JM_WORKSHOP_TOKEN` on their respective distinct Render service. **Never put them in a chat, Git commit or public web form.** If the dashboard does not reveal an existing token value, rotate it in both the service and your local credential store rather than guessing.
3. Make the two variables available in the local shell (example names: `JM_COMMONS_REMOTE_TOKEN`, `JM_RECEIPT_REMOTE_TOKEN`). Keep them out of shell history where possible. They are *not* the same credential.
4. Merge just the two `mcpServers` entries from `gemini-cli-additive.example.json` into existing Gemini CLI `settings.json`, preserving all previously installed MCPs. Launch Gemini CLI from the repository root. Use `/mcp` for status and call `jm_original_inspect` / `jm_federation_receipt_cp01` through their separate registered aliases. Do **not** set `trust:true`.
5. If `python` is not on the PATH, supply the local absolute Python executable in `command`; set the repository directory as the working directory.

Gemini CLI officially supports stdio MCPs and environment-variable interpolation in the `env` block, permitting this credential-safe approach. **This is not configuration for Gemini Web Custom Apps**, whose OAuth-client registration does not accept a raw static bearer token field.

## Proven and held

- Real local test harness: a functioning in-process HTTP recipient, six tests, two distinct aliases, authenticated request forwarding, actual tool response readback, bad/missing credentials failing closed, unsafe URL override blocked, malformed JSON refused, no secret in stdout/stderr.
- Production-host deployment and bearer-source isolation of each original server are verified separately by Render.
- **HOLD**: actual user laptop (GroundZeroJM was offline at last contact) or physical Fold execution; direct Gemini CLI owner-machine run; Gemini Web and ChatGPT native registration of both new protected MCPs. No local CI test may be promoted into these.
