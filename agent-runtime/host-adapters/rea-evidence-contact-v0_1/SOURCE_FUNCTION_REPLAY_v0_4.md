# JM × REA v0.4 — REA-anchored source reconstruction and differential behaviour replay

**Experimental current descendant:** the existing v0.1 evidence importer, v0.2 JM runtime chain and v0.3 native JM32/TraceBox graph contact remain untouched. Source authorities are inherited, not replaced.

## What is now executable

1. Real REA 6.1.0 static inspection identifies four original exported JM Estate Router functions by **exact name, module_path, line and REA semantic node identity**.
2. The existing original JM `coding-estate/integration/router-core.mjs` is imported and executed. Four independent source-guided implementations are executed against the same fixtures: `normalise`, `scoreBody`, `planEstateRoute`, and `compatibilityBetween`.
3. The exact JM 100-body Estate Router registry is loaded without mutation for full routing and scoring comparison. This is not an imitation registry.
4. Existing native JM TraceBoxRuntime records each original-vs-reconstruction comparison and checks replay counts; existing Sovereign Ten JM32 policy prohibits promotion without owner/device contact.
5. The comparison explicitly FAILS when reconstructed output differs, or when REA identifies a wrong/missing source function. A deliberately faulty function is part of the negative suite.

## Proved on 10 October 2026

**416 / 416** original-versus-independent function cases matched in an Actions run that used genuine, non-synthetic REA Evidence: zero mismatches; **416 native JM TraceBox events**. Four REA function anchors were verified at JM source lines 4, 50, 104, and 155. The real REA graph contained 2 statically resolved call links to `normalise` and 1 to `scoreBody`; the other two functions had no incoming links in that specific graph.

**Proof receipt:** https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38018346991

**Negative/unit suite:** `.github/workflows/jm-rea-powered-contact.yml` runs wrong-anchor, intentional reconstruction drift, input hash mismatch and overwrite refusal tests.

## Repeat the experiment yourself

Take an REA Evidence JSON file that was produced from the original public JM `coding-estate/integration` JavaScript directory (the upstream workflow creates such a file). For a temporary personal copy of your file, in a current JM checkout with Node.js 22+ run:

```bash
node agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_function_replay_cli.mjs \
  --rea /absolute/path/to/REA-evidence.json \
  --output /absolute/path/to/NEW-replay-receipt.json
```

To lock the input use `--expect-input-sha256 HEX`. The output is created only once; existing receipts aren't overwritten. Source input and original JM code are never modified. Input cap is 16 MB. The result contains source SHA-256 and the exact REA input SHA-256.

## Essential limits

- This is **source-guided reconstruction**, not decompilation or a claim that REA recreated the original code unaided.
- Fixture equivalence proves the 416 tested input/output contacts. It does not prove mathematical equivalence for all possible inputs, application-level behavior, or semantic equivalence of every JM body.
- REA static graph source identity and an external REA Evidence validator's own run are separate from original JS behaviour actually executed here.
- The `rea_self_validation_attached=false` field avoids automatic integrity transfer to an arbitrary offline JSON.
- This native Sovereign Ten JM32 policy execution is **not** the private JM32-1DA v2.2.1 compiler, and physical Android/device or native binary parity is untested.
- This is a draft experimental branch only; no merge, deployment or replacement of production heads.

**Next recipient gates:** real REA feature-level return trace beyond source correspondence; comparison of route state / effects on a concrete game or app; full JM32-1DA compiler contact only when its exact current source and runtime are available.