# JM ECOSTATE — GONG CP03 GitHub adoption pilot
**Status:** Read-only, advisory; protected GONG CP01 / CP02 and DONG v0.6R remain byte-identical and are NOT copied to this public repository. Author: JM / Theodore Benjamin Scott.

This is an **additive pilot** for `JMisJustMe/JM-cading-lab`, not a change to any game, app, deployment, release or physical Fold proof. It produces a scoped risk receipt on PRs affecting existing HTML/JS/CSS and other recognized code. It intentionally does not import an estate-wide reliable device-evidence registry (not yet available), and never marks Fold PASS or claims all code is automatically compatible.

## How it works
1. Checkout PR with full git history and read-only token; run Node 22 built-in tests.
2. Compare *actual committed file bytes* between PR base/head; classify changed sensitive scopes with a conservative public-safe projection of GONG CP02's risk vocabulary (not the private CP02 engine).
3. Preserve JSON and Markdown artifact; show change-scope advice in workflow summary.
4. Leave current CI, branch protection, owner approval and deployment rails intact.

Recommendations are `HOLD_TRIAGE`, `DIRECT_CHANGED_SCOPE`, `LOCAL_CHECK`, `INHERITED_UNCHANGED`, or `NO_APPLICABLE_CODE_CHANGE`. These are **test recommendations, not pass claims**. New/deleted files, unknown code languages and untrusted symlinks escalate; JS changes with touch/file/permission/storage/network concerns ask for direct scoped checks. CSS changes ask for local automation, *not automatic repeated Fold tests.*

## Local use
```
node --test tools/gong/tests/gong_cp03.test.js
node tools/gong/gong_ci_cp03.js --base <base-commit-sha> --head <head-commit-sha> --json gong-receipts/receipt.json --markdown gong-receipts/summary.md
```
The script reads commits, never edits source files, never writes the repository unless explicitly asked to create output receipts. No private accounts, device reports, or secrets are accessed. No external npm packages. Tests create isolated temporary Git repositories.

**Limits:** This public projection is heuristic and cannot establish JS semantic equivalence, inspect dynamically fetched remote code, detect all generated dependencies, prove Fold hardware behaviour, or automatically invent eligible families. An owner-proven family-to-device registry and tested scope bindings are future, independent gates. Unknown or material differences remain honest HOLDs. No automatic enforcement or merger.

**Law:** DING earns claim · COLD DING earns durability · DONG routes eligible evidence · GONG governs when additional tests are warranted. MESH ≠ MERGE.