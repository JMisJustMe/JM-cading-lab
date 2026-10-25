# JM KO CP11 — converged live source→native→source return

**Candidate only.** Child of green live-action draft PR #455 head `7039ce413fb505a971ee5a31b5b9e325e85a601b`, separately inheriting the demonstrated return/owner-trace capability from distinct round-trip draft PR #453 head `f87e2d53e2fc3a3663be1512d56fe399fb82975e`. Preserves exact CP10 and all ancestors.

## What changed
- Keeps the original `CP11Recipient.gd`, its live 4-row JMLogic-derived policy, native three-action AEGIS/TRIAGE/COUNTER, input and recovery mechanisms unchanged.
- Additive `CP11ConvergedRecipient.gd` subclass and new scene offer KO TRACE during battle: independent KO donor identities, current live policy choice, actual native target/energy return, source fingerprint, and no false "qualified by JudgeMaker" claim.
- `prepare-native.mjs` changes only the final main scene to the new subclass; the original CP11 live scene remains available and tested.
- New native test executes real Godot gameplay for all three actions and writes actual exported native return evidence.
- New reverse verifier consumes exported native facts, checks source seals/state changes/tampering, executes actual current Kocodifying, Codifying, JMLogic source in a reverse KO route and emits attributable proof.
- Existing full native, signed APK, controls and inherited tests run alongside new tests.

## Actual boundaries
Source KO executors run in Node before/after native game contact; Android uses a source-compiled sealed decision table and native GDScript, **not** original JavaScript KO interpretation on device. Source-fingerprint integrity is **not** sender authentication. Godot Linux headless tests and a signed CI APK candidate do not establish physical Fold contact, owner acceptance, authenticated cloud or production release.

## Independent next body
The real original JudgeMaker CP12 PR #458 already exists. Do not duplicate it or claim JudgeMaker is running inside this candidate; reconcile as a separate follow-on descendant after CI succeeds.
