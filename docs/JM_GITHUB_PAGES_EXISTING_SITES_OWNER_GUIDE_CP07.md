# JM GitHub Pages — existing-site owner operating guide (CP07–CP10)

**Source authority:** existing JMisJustMe/JM-cading-lab (public). No new site, migrated keeper, merged house, DNS change, public deployment or owner-device interaction is authorised by this guide.

## 3 · Use the Pages site already running

- GitHub Pages project entrance: https://jmisjustme.github.io/JM-cading-lab/
- Repository Pages settings (owner sign-in): https://github.com/JMisJustMe/JM-cading-lab/settings/pages
- Existing automated deploy workflow: .github/workflows/deploy-pages.yml
- Workflow runs: https://github.com/JMisJustMe/JM-cading-lab/actions/workflows/deploy-pages.yml
- **Important:** The existing deploy workflow publishes after a push to `main`. Publishing changes still require owner approval. Work in a review branch first.
- For a separate *public-safe* standalone HTML creation, place an `index.html` plus its assets under a distinct, purpose-specific path such as `demos/creation-name/`. This is an example, not a request to create a new original body.
- GitHub Pages project URL has a `/JM-cading-lab/` prefix; Cloudflare Pages' separate origin does not. Prefer relative asset links rather than blindly writing `/assets/...`.
- Keep each original's source authority, canonical keeper and identity. A public browser carrier is not necessarily the original body.
- Recover the distinct existing `estate-publication/apps-tools-games/apps-tools/jmisjustme-github-pages-v1.15.0/` donor before changing that lineage.

## 4 · Publication boundary and limits

- GitHub Pages is static hosting. Browser HTML/CSS/JS are supported; server-side Python, Ruby, PHP and persistent private databases need a separate server/API.
- GitHub's published-site maximum is **1 GB**; source repository **recommended** limit 1 GB; bandwidth **soft** limit 100 GB/month; deployment timeout 10 minutes. Custom Actions deployment avoids the default 10-builds/hour limit for branch-based builds.
- Pages is **publicly reachable**, even when a paid plan permits publishing from a private repo. **Excluding files from Pages does not make them private if the source repository itself is public.**
- GitHub disallows Pages as the primary free host for online business/e-commerce/commercial SaaS and discourages sensitive transactions.
- Existing workflow already excludes `family-gifts/`. CP07 proposes additionally excluding `.github/` from the staged website and enforcing route, credential-like filename, symlink and size gates *before* upload. Those gates only inspect staged **paths and sizes**, not the confidentiality or licensing of content.
- Protect private originals upstream in private custody. Never include credentials, tokens, unpublished family gifts or private repositories in a Pages branch, Actions artifact or browser build.
- No automated merger, removal, overwrite, DNS change or public deployment is implied.

## 5 · Independent sites working together

| Existing entrance | Current role | Keep distinct |
| --- | --- | --- |
| https://rukquss.com/ | Commercial/business gateway | No checkout or sensitive transaction delegated to GitHub Pages |
| https://jmisjustme.github.io/JM-cading-lab/ | GitHub Pages: public Estate, demos, documentation, static proof carriers | Remains its own project-host root |
| https://jmisjustme-estate.pages.dev/ | Cloudflare Pages: related public Estate and Cloudflare-specific runtime functionality | Cloudflare return-route script is an intentional host-specific difference |

The three entrances already cross-link. Do not interpret similar pages as identical publication source or merge their roles. CP08 checks five paired public routes: home, Access Mesh, Games & Beyond, Coding Workshop, API House. On 17 November 2026 GroundZeroJM confirmed all 10 HTTP 200, **2 byte-identical pairs** and **3 pairs identical after removing one exact Cloudflare-only `estate-return-route.js` script**. This is not browser interaction, source-proven host synchronization or physical device proof.

## CP09 · No overlapping publishers

The existing full Estate workflow and original PUKA owner-recovery workflow publish to **one GitHub Pages environment**. Previously their concurrency group names differed, so they could publish in parallel or cancel competing work.

This draft proposes **one shared workflow-level group**: `jm-pages-publication`, `queue: max`, `cancel-in-progress: false`. Workflows wait instead of interrupting an active release; the entire primary deploy **and its three existing downstream published-body proof jobs** hold the lane until they finish. GitHub documents an upper bound of **100 pending** with `queue: max`, and FIFO by time of joining the queue, not necessarily dispatch order. This is a real trade-off: bursts of commits can create an old-commit release backlog, so queue pressure and live-head freshness remain a production monitoring gate.

The **PUKA owner-recovery workflow keeps its original separate source and steps**, but becomes `workflow_dispatch` only. Normal main-branch changes already trigger the canonical workflow, removing the redundant automatic second publisher. A human-triggered emergency recovery remains available, with the same publication guards and shared queue.

Static source fixtures: `verify_pages_publication_lane_cp09.py`, 8 negative/positive tests. This is not a concurrent live deployment simulation.

## CP10 · Public-source admission, separate from Pages

The repository itself is public. A Pages exclusion is **not** confidentiality protection for a file still tracked by public Git. A read-only HEAD request found an existing `family-gifts/` source path reachable via public raw GitHub, though its Pages URL is 404. Its historical origin/keeper/privacy classification must be reconciled independently before any private-custody or history repair.

The separate CP10 *pull-request-only, read-only* source-admission gate compares proposed PR head with base, then checks **added, modified and type-changed** paths for sensitive directory names, credential-like filenames and private-key extensions. It also scans **newly added text diff lines** for a bounded set of high-confidence credential shapes and reports **categories only, never matching values**. **It does not remove or re-author historical files, search old exposures, examine binary secrets comprehensively, protect branches without a required-check rule, or replace GitHub secret scanning.**

```sh
# Repository with both PR commits fetched:
python3 governance/estate-integration/verify_public_source_admission_cp10.py --base <40-character-base-SHA> --head <40-character-PR-head-SHA>
```

CP09 and CP10 remain draft additions; neither becomes an enforceable production gate until reviewed, authorised, merged and, for CP10, required check enforcement is configured where appropriate. Existing source exposure must be separately assessed and remediated through verified private custody and owner approval.

## Operator checks (read-only before merging)

```sh
python3 governance/estate-integration/verify_pages_stage_cp07.py --self-test
python3 governance/estate-integration/verify_pages_host_parity_cp08.py --self-test
python3 governance/estate-integration/verify_pages_host_parity_cp08.py
python3 governance/estate-integration/verify_pages_publication_lane_cp09.py --self-test
python3 governance/estate-integration/verify_pages_publication_lane_cp09.py
python3 governance/estate-integration/verify_public_source_admission_cp10.py --self-test
```

The stage gate is run by `.github/workflows/deploy-pages.yml` **after** staging and **before** Pages artifact upload *if this draft change is approved and merged*. To check a constructed stage locally without publishing:

```sh
python3 governance/estate-integration/verify_pages_stage_cp07.py --stage _public_site
```

**Closeout boundary:** CP07's earlier PR-only Linux build checked the proposed staging scope successfully; subsequent CP09–CP10 changes require their own exact-head CI verification. No draft checks constitute merged deployment, live new-site delivery, public-repository secrecy or owner device acceptance. Preserve the existing [website contact draft PR #805](https://github.com/JMisJustMe/JM-cading-lab/pull/805); do not deploy/merge from this guide.

Official documentation:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
