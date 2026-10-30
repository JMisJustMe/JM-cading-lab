# JM Build Mesh v0.8.6 — owner-only native engine candidate

**Not deployed.** Exact parent is live Render commit
f928ffebb99d1d101dc96b45f05cbf04af15cb6a. This is additive to that
parent, not a replacement server, alternative endpoint, or a branch-switch
of protected engine-federation PR #653. Existing Python Build Mesh handlers,
current registry v0.24, cross-client hooks and MCP public routes remain.

**Exact source**: 15 JM original module/corpus/dependency files copied by their
existing Git blob hashes from PR #653; 32 additional dependent original files
had identical Git blob hashes and were left unchanged in host lineage.

**Owner gate**: no JM_ENGINE_OWNER_TOKEN, or an incorrect bearer token, means
the five engine tools are hidden from tools/list and return an unknown-tool
hold. The secret MUST be supplied out of band as a ≥32 character service
environment value, never committed, logged, pasted into the plugin or sent to
the public MCP. The original public-safe read-only handlers remain available.

**Actual execution**: authenticated calls use the original
coding-estate/integration/jm-engine-federation-mcp-stdio.mjs Node program
via bounded subprocess, NOT a Python GameForge or fake native rewrite.
Payload ≤128 KiB, timeout 25s, concurrency bound 2. Subprocess receives
only a minimal environment with NO Render/service secrets.
Original mechanical and geometry execution results are native-only;
do not claim deployed GPU, mobile, or physical owner-device proof from CI.

**Source custody gate**: the candidate pins 16 critical original JM coding,
GameForge, renderer, registry and MCP source files to the exact original Git
blob bytes. Missing or changed donors close the owner gate *before* the engine
appears in `tools/list`; changes during runtime are rechecked before native
execution. A deliberately altered local copy must fail the source check in CI.
A valid HTTP owner credential never overrides this source-identity HOLD.

**Reusable original JM authentication**: the owner’s recovered CP09 OAuth
gateway lineage already implements PKCE S256, short-lived tokens, consent and
scoped original-service delegation. Its deployed Commons and Receipt realms
are separate authorities; their scopes do NOT authorize Build Mesh engine
execution. No new OAuth realm or credential bridge has been deployed, and
no hosted engine can be reached through those existing scopes by implication.

**Render runtime evidence**: Render’s published native-runtime inventory
documents that `node` is supplied even on Python native services:
https://render.com/docs/native-runtimes . This does not measure the exact
existing JM service runtime version. The admission code requires Node 22+
and an intact native MCP program, and fails closed if the real runtime
cannot meet that requirement. The original Render service and its build
and start commands are unchanged.

**Deployment HOLD**: the existing Render service runs the Python runtime.
Confirm Node 22 is available on that exact Python service image, real
owner-client credential delivery is supported, and deployment is authorized.
If either fails, do not admit runtime calls or switch the service branch.
After test proof, use the original service and maintain readback gates.
Gardles native source remains on exact-source HOLD, not generic guard alias.
GroundZeroJM is still offline; no physical laptop test is implied.

**Integration ≠ replacement · Mesh ≠ Merge · No Ding, No Claim.**
