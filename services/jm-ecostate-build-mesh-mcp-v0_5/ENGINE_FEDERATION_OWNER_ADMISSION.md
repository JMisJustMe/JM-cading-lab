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

**Deployment HOLD**: the existing Render service runs the Python runtime.
Confirm Node 22 is available on that exact Python service image, real
owner-client credential delivery is supported, and deployment is authorized.
If either fails, do not admit runtime calls or switch the service branch.
After test proof, use the original service and maintain readback gates.
Gardles native source remains on exact-source HOLD, not generic guard alias.
GroundZeroJM is still offline; no physical laptop test is implied.

**Integration ≠ replacement · Mesh ≠ Merge · No Ding, No Claim.**
