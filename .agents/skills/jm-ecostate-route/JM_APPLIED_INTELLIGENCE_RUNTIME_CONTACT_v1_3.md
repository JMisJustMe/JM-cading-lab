# JM Applied Intelligence — knowledge-to-sovereign runtime contact v1.3

## Existing bodies, not replacements

- JM Knowledge Intake: untrusted source text → source-indexed HELD candidate, SHA-256 integrity.
- JM Knowledge Assurance: replay *originals* and reject altered evidence.
- JM Knowledge Query: deterministic, source-diverse retrieval plus distinct-document coverage.
- JM Sovereign Agent Runtime: existing Python/Node route-selection parity through `jm_skill_gate.py`.

## How to execute

From a complete checkout of this GitHub branch, after creating a HELD candidate through the existing Intake:

```sh
python3 .agents/skills/jm-ecostate-route/jm_knowledge_query.py \
  --candidate /path/to/held-candidate \
  --source /path/to/ORIGINAL.md \
  --query 'agent runtime source evidence' \
  --route-existing \
  --surface jm-knowledge-query \
  --receipt /path/outside-candidate/route.json
```

With `--route-existing`, the query only contacts the existing JM runtime **after** original-source replay passes and at least one relevant excerpt exists. The runtime receives the *question*, never the raw source quotation. An unknown question returns `NO_SOURCE_MATCH_NO_ROUTE`. Source or manifest tampering fails closed.

The receipt explicitly retains `source_integrity: PASS_REPLAY`, distinct-document coverage, a bounded `existing_jm_route` with Python/Node parity receipt hash and candidate selection, and `agent_executed: false`. Neither candidate selection nor retrieved source establishes current-head authority, author approval, semantic truth or successful recipient process execution.

## Build Mesh contact, separate jurisdiction

The hosted JM Build Mesh MCP was contacted using `prepare_operation_gate` for target `JM Knowledge Query v0.5` and returned operation `JMOP-bccddb1ed998bf0a032f1280`, schema `JM.BuildMesh.OperationGate/0.7`, **PLAN_ONLY**, `mutation_performed=false`. Its current-hosted authority is `SNAPSHOT_ONLY`. This operation identifies the *intended* recipient integration and verification route; the actual GitHub changes are accomplished by the authorized GitHub connector and GitHub CI, not by Build Mesh.

**No automatic deployment, live Build Mesh writeback, arbitrary coding-body modification or main-branch promotion is claimed.** Existing parent PR #372 remains draft until its separate authority review.

## Verification and rollback

Run `python3 -m unittest discover -s .agents/skills/jm-ecostate-route/tests -p 'test_*.py'` from repository root. Tests include actual runtime parity and source-replayed routing, zero-match skipping, changed-original refusal, inflated claim rejection and receipt readback.

Rollback: abandon this child PR or revert the query and integration-test commits. No changes are required to original sovereign Python/Node runtimes, original JM AI Lab, protected ancestors, or main.

SOURCE → SIGNAL → CONTACT FIELD → ROUTE PRESSURE → STATE CHANGE → DING → TRACE → RECOVERY → OUTPUT
