# JM Scoped Memory Contact v0.1 — additive host sidecar

**Status:** Candidate, not a new JM sovereign body; no native-device/cloud Ding.

This adds a bounded cross-harness, workspace-scoped note carrier **alongside** the already-established JM Sovereign Agent Runtime. It does not replace or alter `agent-runtime/jm_agent_runtime.py`, the Node counterpart, the nine Host Adapter Registry identities, or their proof levels.

## Actual contact path

1. Execute the existing **exact** `python3 agent-runtime/jm_agent_runtime.py --core-only --query 'coding runtime'` to obtain the canonical JM session capsule.
2. A trusted host creates `HostScope(authenticated_owner_id, resolved_working_directory)`, not from model-generated tool parameters.
3. Pass the original core capsule into `ScopedMemory(root, scope, core, harness='codex')` and call `await memory.write('project_route', '...')`.
4. Another harness using the same **trusted owner + workspace** can read that note; a different owner/workspace cannot.
5. Changing account/workspace revokes pending leases; checksum/source drift holds rather than silently rebuilding memory. The file is atomically replaced on successful commits and read back across instances.

## Tests

```sh
python3 -m unittest discover -s agent-runtime/host-adapters/scoped_memory -p 'test_*.py' -v
python3 agent-runtime/host-adapters/jm_host_adapter_conformance.py --all --run-local
```

The new test suite **runs the exact existing Python sovereign core** in its `setUpClass`; it skips rather than claiming original-core contact if that repository carrier is missing. GitHub CI runs the tests against the actual checkout and original Node/Python parity workflow remains in place. Testing includes: cross-harness readback, create/update conflict and digest chain, owner/workspace separation, account-switch and ABA stale-operation rejection, read-switch rejection, persisted-file tampering, canonical-source drift, slug/size validation and proof-level honesty.

## Imported *idea*, not donor code

Cindy's documented workdir-scoped cross-agent memory and the `withStore` pre/post account scope guards were examined:
- https://github.com/makecindy/cindy/blob/main/apps/desktop/help-knowledge/memory.md
- https://github.com/makecindy/cindy/blob/main/packages/lizi-mcps/src/memory/_shared.ts

JM's implementation is new Python standard-library code. Cindy code was **not copied**, vendored or installed. No external software dependencies.

## Bounded proof and safety

- Trusted host binding remains a requirement; an arbitrary tool caller supplying their own owner ID would **not** be authenticated.
- Local non-secret notes only; this is not an encrypted secrets vault or multi-user server.
- Single-process host scope lock and atomic file replacement. **Simultaneous independent processes**, remote filesystem locking, OS reboot/owner-phone evidence, live Claude/Codex host wiring and cross-device memory sync remain OPEN. Two harness names in tests are local mock host identities, **not** live provider sessions.
- SHA-256 checksums detect accidental/casual editing, **not malicious tampering** by an attacker who can rewrite both payload and digest.
- No write to production owner memory, cloud, private archives or published app. No adapter registry proof-level promotion.
- Existing original JM sources remain exact and recoverable; remove `scoped_memory/` to roll back this entirely additive experiment.

**No Ding, no claim · Recover before rebuild · Integration ≠ replacement · CHANGE THE PLUG, NOT THE BODY.**
