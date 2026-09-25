# JM Inline Contact — Codex Portal Handoff

## Objective
Drive the existing OpenAI Platform plugin submission as far as permitted without unnecessary user input. Treat user/manual involvement as a last resort and stop only for a genuinely human-only, credential, identity, legal-attestation, or final-publisher confirmation gate.

## Source / branch
- Repository: `JMisJustMe/JM-cading-lab`
- Branch: `jm-chatgpt-host-adapter-v0.1`
- App directory: `apps/jm-chatgpt-host-adapter-v0.1/`
- Submission import: `apps/jm-chatgpt-host-adapter-v0.1/chatgpt-app-submission.json`

## Truth boundary
Do **not** claim the Third Ding until a newly produced JM body is actually touchable / interactive inside a ChatGPT conversation message. MCP, HTTPS, CI, portal registration, tool scan, or submission success are infrastructure Dings only.

## Existing public body
- MCP URL: `https://inline-contact.jm-inline-contact-probe.pages.dev/mcp`
- Website: `https://inline-contact.jm-inline-contact-probe.pages.dev/`
- Support: `https://inline-contact.jm-inline-contact-probe.pages.dev/support`
- Privacy: `https://inline-contact.jm-inline-contact-probe.pages.dev/privacy`
- Terms: `https://inline-contact.jm-inline-contact-probe.pages.dev/terms`
- Domain challenge route already exists at `/.well-known/openai-apps-challenge` and is waiting only for any portal-issued exact verification token.

## Submission fields
Use the checked-in `chatgpt-app-submission.json` as source of truth where the portal supports import.

Expected visible fields:
- Name: `JM Inline Contact`
- Version: `1.0.0`
- Subtitle: `Interactive contact in chat`
- Category: `Developer Tools`
- Description: use the checked-in submission JSON text.
- Developer Identity: select the already-verified Individual identity shown by the Platform account.
- Plugin Author: use the exact verified legal-name value supplied/accepted by the portal; never substitute `JM` if the portal requires the legal name.
- Commerce / purchasing: leave off / unchecked. The public probe does not sell or direct users to purchase anything.
- Authentication: none, if asked for MCP auth.
- MCP type / route: Standard / Universal-style single fixed endpoint, using the exact MCP URL above.

## Icons
Use the current JM Inline Contact logo already prepared by the user/session. Do not block the submission merely to redesign it; the user explicitly accepted the current version for now.

## Codex operating instructions
1. Open the existing OpenAI Platform plugin draft if present; do not create duplicates unless the current draft is irrecoverable.
2. Import `chatgpt-app-submission.json` when the portal offers the import control.
3. Fill or verify all app info and URLs from this file and the checked-in JSON.
4. Register the fixed MCP endpoint and run `Scan Tools` / equivalent discovery.
5. If tool discovery or schema checks fail, inspect the current branch, make the smallest truthful source fix, run local/CI proof, and retry.
6. If the portal issues a domain-verification token, copy the exact token, patch only the existing challenge route, deploy through the repo's existing Cloudflare Pages workflow, verify the public challenge response, then retry verification. Do not ask the user to touch Cloudflare manually.
7. Enter Developer Mode and exercise every main positive use case and the exposed tool. Verify the UI genuinely renders interactively in ChatGPT if the platform permits it.
8. Produce the requested demo recording / URL only from the real Developer Mode app behavior. Do not fabricate a recording or use a static mockup.
9. Continue through review checks and fix actionable technical blockers autonomously when possible.
10. Stop and request the user's hand only if the UI demands a credential, identity action, legal attestation, billing authorization, or an explicit publisher/final-submit confirmation that Codex is not permitted to perform.

## Existing proof state
- Frozen donor/source integrity preserved.
- Host adapter exists.
- MCP runtime integration proof passed.
- Public HTTPS MCP tool/resource integration proof passed.
- Explicit output schemas and safety annotations are present.
- Public policy/support routes are live.
- OpenAI individual developer identity has been verified.

## Do not regress
- Do not replace the existing JM runtime/body with a fresh generic implementation.
- Do not merge donor identity into host identity.
- Do not expose private/frozen donor content in the public probe.
- Do not lower Inline Contact success to a file link, screenshot, static panel, or external preview.
