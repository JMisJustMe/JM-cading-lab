# JM CP12 — Original JudgeMaker × Converged CP11 Native Returns

**New prospective work route:** manifest `registry/build-routes/JM_CP12_KO_CONVERGED_JUDGEMAKER_BUILD_ROUTE_MANIFEST_v0.1.json` committed and PR #463 registered before executable changes.

## Inheritance, not substitution
- Parent: CP11 convergence PR #461, exact native green head `43898a42847d1e1c173f879d3e10ec80df62654d`.
- Donor: independently recovered CP12 original JudgeMaker from PR #458, exact frozen v1.0 HTML SHA-256 `f0dbce602b239e84c415350d16675127b27d771842b5cd12819432fee874dde6`.
- Original CP12 PR #458 remains unchanged; its native JudgeMaker adjudication workflow passed, but its generic build-entry gate failed because there was no same-PR prospective route manifest. This descendant corrects only its **own** prospective route; it does not backdate #458.
- The JudgeMaker's actual `selfTests`, `metaJudge`, `judge` functions run in isolated Node VM. The adapter supplies real Godot before/after state, sourced only from newly executed inherited native tests.
- Three distinct actions: AEGIS, TRIAGE, COUNTER. Eighteen adversarial negative cases must remain NOT_QUALIFIED/INSUFFICIENT_EVIDENCE.
- No rewriting the original JudgeMaker algorithm, reimplementing KO language runtimes, replacing Godot gameplay or modifying main.

## Proof ceiling
If CI passes, this establishes original JudgeMaker **Node execution** adjudicating three actual native **Godot Linux** KO outcomes, with typed/source-sealed transport and falsifying negative tests. It **does not** prove JudgeMaker running inside Android, physically tested Fold gameplay, remote sender authentication, production cloud, historic Kocodifying original, or all Current-64 connected.

## Recovery
1. Recover PR #461 exact parent, original PR #458 donor SHA and this prospective manifest.
2. Run `node coding-estate/integration/codegornization-cp11/prepare-native.mjs` before native test.
3. Run native CP11 live and converged tests in Godot 4.5.2 to emit true evidence, then `node coding-estate/integration/codegornization-cp11/verify-converged-return.mjs`.
4. Run `node coding-estate/integration/codegornization-cp12-converged/adjudicate-converged-native.mjs`.
5. Read back independent CI artifact receipts, compare exact hashes, keep a HOLD for any remaining untested layer.

No Ding, no claim. Mesh ≠ Merge. Integration ≠ Replacement.
