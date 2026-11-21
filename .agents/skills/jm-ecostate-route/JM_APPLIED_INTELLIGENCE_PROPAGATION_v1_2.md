# JM Applied Intelligence — Source-diversity propagation v1.2

**Disposition:** proposed recipient-body improvement on a child branch of the existing draft Knowledge Contact PR #372. Not merged, installed, or deployed.

## Exact recipients

- `jm_knowledge_intake.py`: inherit JM AI Lab SD1's **distinct original source first** selection; preserve lexical scoring, then backfill repeated passages in original ranked order.
- `jm_knowledge_query.py`: return `source_coverage` with passages, distinct source document IDs, per-document counts, and a clear **corroboration NOT ESTABLISHED** boundary.
- `tests/test_source_diversity_propagation.py`: exercise actual intake, provenance replay, retrieval selection, count integrity, single-hit/zero-hit, and altered-source rejection.

Original source and assurance logic are inherited from draft PR #372. The v1.1 native recovery kit contains proof, reversible patches, verified receipts and preserved ancestors.

## Scoped test

From the repository root:

```sh
python3 -m unittest discover -s .agents/skills/jm-ecostate-route/tests -p 'test_*.py'
```

Expected focused fixture: 4 excerpts, **A/B/A/A**, **two** distinct source documents (A=3, B=1). This is not a claim of independent factual corroboration. Run native full-suite and CI before merging.

## Promotion and recovery

**No automatic promotion:** remain draft pending full branch CI, review, confirmation of the current authority, and recipient-specific acceptance.

**Rollback:** abandon this child branch or revert its two Python file commits. Neither the PR #372 parent branch nor `main` was changed as part of this propagation.

**Scope:** repo source improvements only. No runtime deployment, Android verification, neural model training, broad host writeback or agent-authorized external mutation is claimed.

RECOVER → INHERIT → IMPROVE → TEST → COMPARE → DING → TRACE → RECOVERY → OUTPUT.
