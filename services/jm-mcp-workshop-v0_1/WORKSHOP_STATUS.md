# JM MCP WORKSHOP — CP02 staged forward development (26 October 2026)

**Inherited CP01:** 52/52 initial tests; exact eight original source files in the GitHub PR #479 lineage; original ZIP retained.

**CP02 differences:** 7th `workshop_run` live typed executable tool; owner-facing HTML/CSS/JS Workshop experience with sample recipes, quick builder, JSON editor, real MCP call, live result readout and ZIP export. Generated child MCP v0.2.0 created and executed independently.

**Locally verified:** 80/80 Python tests PASS, JS `node --check` PASS. HTTP serves UI/CSS/JS and responds to actual `workshop_run`. Chrome/Playwright local test was blocked by administrator denying localhost navigation. Separate remote browser probe initially found HTTP 403 on same-origin POST; narrow canonical-origin hotfix landed, 80/80 tests PASS, Render deployment LIVE, and independent hosted GUI retest passed 7/7 assertions (score, greeting, validate). This is browser contact, not JM physical Fold acceptance.

**GitHub:** PR #479 remains draft, branch code exact. Hosted live execution proof is GitHub Actions #40252139106 PASS; separate Render service jm-mcp-workshop.onrender.com LIVE after origin hotfix deployment dep-dbfaelg473hc73ceat60. Build Mesh not repointed. **HOLD:** direct ChatGPT and Gemini connector discovery/calls, JM Fold physical interaction and owner acceptance, any autonomous AI communication, and full modern MCP 2026-07-28 compliance.

No production publish or private JM source write authority. `workshop_publish` emits bytes only, no publishing to Render or GitHub.
