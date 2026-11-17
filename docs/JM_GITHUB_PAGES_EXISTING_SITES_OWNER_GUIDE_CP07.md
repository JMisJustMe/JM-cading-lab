# JM GitHub Pages — existing-site owner operating guide (CP07–CP08)

**Source authority:** existing JMisJustMe/JM-cading-lab (public). No new site, migrated keeper, merged house, DNS change, public deployment or owner-device interaction is authorised by this guide.

## 3 · Use the Pages site already running

- GitHub Pages project entrance: https://jmisjustme.github.io/JM-cading-lab/
- Repository Pages settings (owner sign-in): https://github.com/JMisJustMe/JM-cading-lab/settings/pages
- Existing automated deploy workflow: .github/workflows/deploy-pages.yml
- Workflow runs: https://github.com/JMisJustMe/JM-cading-lab/actions/workflows/deploy-pages.yml
- **Important:** The existing deploy workflow publishes after a push to \`main\`. Publishing changes still require owner approval. Work in a review branch first.
- For a separate *public-safe* standalone HTML creation, place an \`index.html\` plus its assets under a distinct, purpose-specific path such as \`demos/creation-name/\`. This is an example, not a request to create a new original body.
- GitHub Pages project URL has a \`/JM-cading-lab/\` prefix; Cloudflare Pages' separate origin does not. Prefer relative asset links rather than blindly writing \`/assets/...\`.
- Keep each original's source authority, canonical keeper and identity. A public browser carrier is not necessarily the original body.
- Recover the distinct existing \`estate-publication/apps-tools-games/apps-tools/jmisjustme-github-pages-v1.15.0/\` donor before changing that lineage.

## 4 · Publication boundary and limits

- GitHub Pages is static hosting. Browser HTML/CSS/JS are supported; server-side Python, Ruby, PHP and persistent private databases need a separate server/API.
- GitHub's published-site maximum is **1 GB**; source repository **recommended** limit 1 GB; bandwidth **soft** limit 100 GB/month; deployment timeout 10 minutes. Custom Actions deployment avoids the default 10-builds/hour limit for branch-based builds.
- Pages is **publicly reachable**, even when a paid plan permits publishing from a private repo. **Excluding files from Pages does not make them private if the source repository itself is public.**
- GitHub disallows Pages as the primary free host for online business/e-commerce/commercial SaaS and discourages sensitive transactions.
- Existing workflow already excludes \`family-gifts/\`. CP07 proposes additionally excluding \`.github/\` from the staged website and enforcing route, credential-like filename, symlink and size gates *before* upload. Those gates only inspect staged **paths and sizes**, not the confidentiality or licensing of content.
- Protect private originals upstream in private custody. Never include credentials, tokens, unpublished family gifts or private repositories in a Pages branch, Actions artifact or browser build.
- No automated merger, removal, overwrite, DNS change or public deployment is implied.

## 5 · Independent sites working together

| Existing entrance | Current role | Keep distinct |
| --- | --- | --- |
| https://rukquss.com/ | Commercial/business gateway | No checkout or sensitive transaction delegated to GitHub Pages |
| https://jmisjustme.github.io/JM-cading-lab/ | GitHub Pages: public Estate, demos, documentation, static proof carriers | Remains its own project-host root |
| https://jmisjustme-estate.pages.dev/ | Cloudflare Pages: related public Estate and Cloudflare-specific runtime functionality | Cloudflare return-route script is an intentional host-specific difference |

The three entrances already cross-link. Do not interpret similar pages as identical publication source or merge their roles. CP08 checks five paired public routes: home, Access Mesh, Games & Beyond, Coding Workshop, API House. On 17 November 2026 GroundZeroJM confirmed all 10 HTTP 200, **2 byte-identical pairs** and **3 pairs identical after removing one exact Cloudflare-only \`estate-return-route.js\` script**. This is not browser interaction, source-proven host synchronization or physical device proof.

## Operator checks (read-only before merging)

\`\`\`sh
python3 governance/estate-integration/verify_pages_stage_cp07.py --self-test
python3 governance/estate-integration/verify_pages_host_parity_cp08.py --self-test
python3 governance/estate-integration/verify_pages_host_parity_cp08.py
\`\`\`

The stage gate is run by \`.github/workflows/deploy-pages.yml\` **after** staging and **before** Pages artifact upload *if this draft change is approved and merged*. To check a constructed stage locally without publishing:

\`\`\`sh
python3 governance/estate-integration/verify_pages_stage_cp07.py --stage _public_site
\`\`\`

**Closeout boundary:** draft changes and offline fixture passes are not CI, merged deployment, live new-site delivery or owner acceptance. Preserve the existing [website contact draft PR #805](https://github.com/JMisJustMe/JM-cading-lab/pull/805); do not deploy/merge from this guide.

Official documentation:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
