# JM × REA v0.5 — Native Route Consequence Contact

**Stage:** protected v0.4 descendant on the same experimental branch and draft PR #356; original source bodies stay in their canonical locations. No merge or deployment.

## Recovered and actually executed JM coding bodies

The owner-authored `coding-estate/sovereign-ten/direct/route-proof-native.mjs` supplies original **RouteScript, RouteVM, RouteOS and TraceBoxRuntime**. Original `coding-estate/sovereign-ten/direct/language-native.mjs` supplies native **JM32** policy. The route inputs come from original `native-corpus.mjs` plus purpose-built test routes. These are original public Sovereign Ten implementations, not a claim that the full private JM32-1DA v2.2.1 compiler was executed.

## New state/effect comparison

`jm_rea_route_consequence_v0_5.mjs` is an independent graph evaluator that consumes JM's actual lowered RouteScript graph, but does not call JM RouteScript.run, applyAction or evaluate. It handles state assignments, explicit failure, branch predicates, route fallthrough, missing services, normal and recovery edges, and bounded loop execution.

`jm_rea_route_verify_v0_5.mjs` runs the **original RouteScript**, **original RouteVM bytecode compiler/verifier/executor**, **original RouteOS service host**, and independent interpreter independently for each of **120 route scenarios** in seven families. It compares final state, transition count, normalized trace order, and externally observable service calls. JM TraceBoxRuntime captures the per-case result. Native JM32 preserves a non-promotable scoped proof verdict.

## Verified test receipts

- [120/120 original JM route versus independent consequence checks, six verification tests PASS](https://github.com/JMisJustMe/JM-cading-lab/actions/runs/38170445147)
- Original bytecode tampering triggers `RVM_BAD_CHECKSUM`; runaway loops trigger `RS_ROUTE_LOOP`; invalid route destinations and service registration mismatches also hold.
- Deliberately mutated reconstructed state is detected as divergence; this is a negative test of the comparator.
- `.github/workflows/jm-rea-route-consequence-v0_5.yml` separately runs pinned REA 6.1.0 against the original public Sovereign Ten source directory, checks its semantic module recognition and validates its Evidence with REA's own importer before replaying the original JM bodies.

## Invocation

From the repository root (Node 22+):

```sh
node --test agent-runtime/host-adapters/rea-evidence-contact-v0_1/test_jm_rea_route_verify_v0_5.mjs
```

The upstream full REA inspection is separately recorded by GitHub Actions; the 120-case test itself is offline and requires no REA installation.

## Precise HOLD

- The independent interpreter starts from **JM's own parsed/lowered RouteScript graph**. This verifies execution consequence equivalence for covered routes, not independent source parsing or full-language equivalence.
- The RouteVM body runs original verified bytecode; its execution delegates to RouteScript, so VM-versus-RouteScript equivalence by itself would not be independent. The separate interpreter supplies the additional comparison.
- No live phone/physical owner-device contact, third-party application reconstruction, complete private JM32-1DA v2.2.1 compiler execution, or cross-device release Ding.
- REA's static graph observations identify source relationships; they do not independently establish runtime causality or general equivalence.

**Keeper:** run the code; scope the claim; preserve current JM source authority; promote only after recipient/device contact.