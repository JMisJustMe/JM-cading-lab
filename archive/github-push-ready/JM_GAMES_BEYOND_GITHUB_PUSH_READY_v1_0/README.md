# JM Games&Beyond — GitHub Deploy Push Pack v0.9

## Status

This is a repo-ready static deploy pack assembled from the bodies physically accessible in the current ChatGPT runtime.

**Ding:** GitHub-ready package exists.  
**No Ding:** This environment has not pushed to GitHub, because no authenticated GitHub connector/CLI session is available here.

## Open routes

- Root: `index.html`
- Games&Beyond: `games-beyond/index.html`
- Primary current open body: `games-beyond/TAP_THIS_JM_GAMES_MINTED_BODY_v0_8.html`
- Source vault: `source-vault/`
- Receipts and docs: `docs/`, `receipts/`

## Push route

```bash
git clone https://github.com/<OWNER>/<REPO>.git
cd <REPO>
git checkout -b games-beyond-deploy-v0-9
rsync -av --delete /path/to/JM_GAMES_BEYOND_GITHUB_DEPLOY_PUSH_PACK_v0_9/ ./
git add .
git commit -m "Mount Games&Beyond deploy push pack v0.9"
git push -u origin games-beyond-deploy-v0-9
```

Then open a PR, or merge that branch into main after checking the live GitHub Pages route.

## GitHub Pages

This pack includes `.github/workflows/pages.yml`.

In GitHub:
Settings → Pages → Source: GitHub Actions.

## Boundary

This package contains all **local runtime-accessible** artifacts in this session. It also includes a pointer ledger for stronger File Library bodies that must be materialized as actual files before public deployment can honestly claim them as mounted.


## v1.0 Search + Push Status
See `SEARCH_AND_PUSH_STATUS_v1_0.md`. This package is push-ready, but this chat did not have authenticated GitHub write access, so no remote push is claimed.
