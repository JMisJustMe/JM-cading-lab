# JM Live Experience MCP — CP07 public admission rail

**Scope: real live MCP discovery and readiness contact only. NOT the protected game execution service.**

The CP01–CP05 local gameplay MCP and CP06 production-security gate remain separately protected in the owner's ChatGPT Library. This source branch contains **no protected JM HTML games, screenshots, owner keys or private runtime**.

Use `GET /healthz` for ingress status and `POST /mcp` for JSON-RPC. Both 2025-era initialization and 2026 modern discovery are implemented. `GET /mcp` is intentionally 405. The `experience_status` tool returns the exact unsatisfied production gates; six original `experience_*` names are present solely for negative contact and return `AUTHORITY_HOLD` with `execution_occurred: false`. They perform **no gameplay**.

Real game execution requires genuine OIDC/JWKS for each client, independent signed owner-grant authority, explicit original-game release scope, a non-root browser sandbox and actual source/visual/contact proof. **Do not insert protected game HTML or dev/test JWTs into this public branch or the public web service.**

This is independent of `JM Build Mesh` and `JM MCP Workshop`; it replaces neither. A provider's actual MCP connection must be demonstrated before claiming Gemini/ChatGPT interoperability; GitHub import or synthetic probes don't count.

Test: `python -m unittest discover -s services/jm-live-experience-cp07-intake -p 'test_*.py' -v`

JM Law: RECOVER BEFORE REBUILD · INTEGRATION ≠ REPLACEMENT · NO DING, NO CLAIM.
