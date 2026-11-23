# JM ChatGPT ↔ Website Control Desk — Host-mediated draft route v0.1

**Date:** 13 October 2026  
**State:** NON-PRODUCTION GITHUB DRAFT · SITE UNCHANGED  
**Target:** JMISJUSTME — JM ECOSTATE  
**Operational plan ID:** `JMOP-8dbd20292dcec5c633a8d68e`

## What is being connected

A ChatGPT conversation can use the already-connected **JM ECOSTATE Build Mesh** to retrieve and plan against public, bounded Estate information. A separate **authenticated GitHub host connector** can stage reviewed text changes on a dedicated branch and verify exact read-back. This is a real two-connector, host-mediated route; it is **not** a new write tool published on the public MCP server, not a direct website-admin token, and not live Cloudflare deployment.

Existing components reused rather than rebuilt:

- Build Mesh v0.8.5 runtime / read-only hosted search, status, lineage and operation gate.
- Build Mesh v0.9 *Recipient Operation Mesh* precedent for independently verified GitHub content-write and Render redeploy consequence classes.
- Canonical `JMisJustMe/JM-cading-lab` GitHub source; no mirror and no wholesale repository duplicate.
- Existing permanent-HTML promotion pipeline, authoritative deployment workflow and JM Owner Vault remain independent.

## Roles and authorization

| Lane | Surface | Authority | v0.1 action |
| --- | --- | --- | --- |
| Discover | Build Mesh MCP | Read-only public bounded data | Retrieve project head, proof and operation plan |
| Source | GitHub connector | Authenticated repository read | Inspect exact current source + branch ancestry |
| Draft | GitHub connector | Authenticated write limited by this operation's intent | Create new non-production branch; add benign public contract files |
| Verify | GitHub connector | Read-back / exact delta | Compare committed bytes to intended content |
| Review | GitHub draft PR | Owner review, source and diff | No automatic merge |
| Deploy | Existing Cloudflare/GitHub deployment | Separate fresh authorization + proof | Not attempted |
| Private state | JM Owner Vault (R2) | Owner-held authenticated session | Not accessed or copied |
| Phone | Acode/Termux/GitHub mobile | Owner-device | Not yet tested for this route |

## First-pass acceptance

1. Read Build Mesh `build_mesh_status`, `resolve_current_head`, `proof_state`, `prepare_operation_gate`.
2. Preserve operation capsule `JMOP-8dbd20292dcec5c633a8d68e` as an authorization *plan*, not a write credential.
3. Create isolated branch `jm-website-chatgpt-control-v0-1` from `main`.
4. Write machine-readable operation contract at `services/jm-ecostate-build-mesh-mcp-v0_5/proofs/JM_WEBSITE_CHATGPT_HOST_CONTROL_v0_1.json`.
5. Fetch the file **from the branch** and compare UTF-8 bytes exactly to the intended content; parse its JSON.
6. Add this operator runbook; read it back exactly.
7. Open a **draft**, unmerged PR for visual diff review; leave deployment and live website source unchanged.

## Example operator requests from ChatGPT

- **Read only:** “Using JM Build Mesh and the current GitHub source, show the website's current declared head, exact source and last proved deployment. Don't change anything.”
- **Draft:** “Recover the existing website component for the change I describe. Make the smallest reviewed descendant on a fresh GitHub branch, verify exact read-back, and leave it as a draft PR.”
- **Compare:** “Compare the draft PR's changed files and relevant tests to the protected main branch. Report regressions as HOLD.”
- **Approved promotion (later):** “After I approve this exact PR and its scope, merge it using the existing gates, then independently verify deployed HTTP routes and owner-device behaviour.”

## Security and storage laws

- **Never** grant unrestricted write actions on the existing public MCP endpoint.
- **Never** commit owner keys, Dropbox files, R2 private content, tokens, or passwords to this public repository.
- **Never** treat a GitHub branch write, an empty diff, a successful CI job, a hosted service HTTP 200 or a redeploy as proof that the site was changed correctly.
- A draft branch may be public because the repository is public; keep drafts free of private content.
- Existing site and owner room presentation/behaviour must not be replaced or regressed.
- Release signing, physical Android contact, website publication and current-authority promotion remain separate.
- Approval of **drafting** is not approval of **merging or deploying**.

## Contact verdict for v0.1

The first host-mediated branch-write and exact read-back are independently checkable. The present branch is a *control-route proof*, not a live Control Desk UI, authenticated Cloudflare write integration, or production site change.

**SOURCE → SIGNAL → CONTACT → ROUTE PRESSURE → STATE CHANGE → DING (scoped) → TRACE → RECOVERY → OUTPUT**

**NO DING, NO CLAIM · RECOVER BEFORE REBUILD · MESH ≠ MERGE · RECIPIENT A DING ≠ RECIPIENT B DING**
