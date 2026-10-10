# JM × REA — Powered Evidence Contact v0.2

**State:** original JM executable contact PASS, genuine upstream REA static-JavaScript evidence and REA validation PASS, tested in isolated GitHub Actions. This is an **experimental successor**, not a replacement for v0.1, JM32-1DA, JM TraceBox, JM Target Bridge, or the hosted Build Mesh.

## Executed chain (actual code, not names)

1. On an ephemeral runner, REA 6.1.0 statically inspected PUBLIC JM JavaScript source in coding-estate/integration and emitted its original Evidence record.
2. The single record was wrapped into a bundle without modifying the record itself; REA's own evidence-import accepted it.
3. The preserved v0.1 jm_rea_evidence_contact.py produced a bounded metadata-only candidate with unverified-source labels.
4. The new jm_rea_powered_contact.mjs executed the EXISTING JM Python and Node sovereign agent runtimes and asserted byte-identical core results.
5. It executed EXISTING coding-estate/integration/router-core.mjs with all 100 registered Estate bodies, including TraceBox, Ding and source-ledger route identities.
6. It executed EXISTING coding-estate/everybody/compiler-core.mjs with the original federated JM registry, compiled a source-ledger portable program to JM IR, executed assertions over imported evidence counts, and returned a tightly scoped portable-runtime Ding.
7. Format and operation labels now influence the real JM routing query: a synthetic APK label selects Android-intent words; actual REA JavaScript operation selects JavaScript words. External labels remain unverified until source contact.

**Current-64 distinction:** the JM sovereign-agent activation policy selects 12 active ROUTE identities and reports 52 available. It does NOT spawn 12 separate executables. The distinct 100-body Estate Router registry is not a second census of Current-64 identities.

## Direct invocation

Inside a checkout of the current JM repository (Python 3, Node 22+):

    node agent-runtime/host-adapters/rea-evidence-contact-v0_1/jm_rea_powered_contact.mjs /absolute/path/to/REA-Evidence-BUNDLE.json --output /absolute/path/to/NEW-JM-receipt.json

Omit --output for printed JSON. Use --query to override the inferred JM route intent. Both input and output are local. The receipt will not overwrite an existing file. This adapter does not run unknown APKs, native binaries or user-supplied scripts. It reads only metadata; raw/normalized reverse-engineering output is not copied into the final JM receipt.

The REA analyze-javascript-application --json operation outputs ONE Evidence object, not a bundle. See the exact aggregation + upstream validation commands in .github/workflows/jm-rea-upstream-probe.yml before feeding its output into the JM adapter. Upstream REA is optional for consuming an existing evidence bundle.

## Actual CI receipts

- First native JM-Python/Node/100-body/EveryBody integration: https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38014590728
- First authentic REA static inspection, REA-validated Evidence and JM return: https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38014809973
- Latest original JM runtime and format-driven routing tests: https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38014957792
- Latest genuine REA static-to-JM return: https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38014957785

Current proven checks: JM Current-64 and coding activation validators PASS; JM host adapter conformance PASS; Python/Node portable runtime parity PASS; JM Estate Router 12/12 checks PASS; JM EveryBody native registry selftest PASS; metadata importer 11/11 PASS; combined runtime route and negative-boundary tests 5/5 PASS; real REA 6.1.0 JS static analysis PASS; REA evidence-import PASS; authentic REA Evidence into JM executed original components PASS.

## Precise holds (NO CROWN)

- REA's own CI validator passed on the real specimen, but any generic user-supplied bundle is unverified until independently authenticated. The JM receipt deliberately does not borrow proof automatically.
- REA's full structural and semantic JS graph is NOT yet imported into the JM route. Only source identity, evidence labels, source hash, record counts, safe operation/format-derived intent, and execution receipts pass to JM.
- This adapter compiles a JM portable source-ledger program, NOT a reconstructed application.
- Android APK / native decompilation: untested in this integration. Owner-device phone or laptop app execution: untested.
- Current host proof is GitHub Actions, NOT a physical owner-device Ding.
- Build Mesh mutation, JM Target Bridge recipient handoff, FLAZ promotion, protected build overwrite and merge to main have not occurred.
- Raw REA application graph was NOT uploaded to GitHub artifacts. CI logs expose only its schema shape and scoped success. Public REA source folder was the specimen.

SOURCE > SIGNAL > JM ROUTING > JM PORTABLE EXECUTION > RETURNED TRACE. Independent identities remain separate.