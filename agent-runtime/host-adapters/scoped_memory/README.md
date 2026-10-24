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


## Repository-process contact v0.2 (additive host entrypoint)

**Entrypoint:** \`agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py\`

This is a **real local POSIX process route** (Linux/macOS): a CLI executable whose every operation invokes the exact, pre-existing \`codex-repository-agent/jm_codex_repository_adapter.py\`. That existing adapter executes \`jm_agent_runtime.py\` against the original JM canonical contracts. This face then mounts the v0.1 scoped-memory sidecar. It is not the live proprietary Codex or Claude Code app.

From inside the JM Git repository:

\`\`\`sh
# Only public/non-secret project notes. Owner identity is obtained from OS uid,
# workspace from Git's top-level root. No --owner or arbitrary scope override.
printf 'Resume from original JM sovereign core.' | \
  python3 agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py \
  write --name route --harness worker-a

# A second independent process, labelled worker-b, sees the same saved note:
python3 agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py \
  read --name route --harness worker-b

python3 agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py list
\`\`\`

Responses include the **original JM adapter core SHA-256**, durable note revision/digest, proof jurisdiction, and returned state. \`write\` confirms a real post-commit readback before reporting success. The default store is \`$XDG_STATE_HOME/jm-ecostate/scoped-memory\`, or \`~/.local/state/jm-ecostate/scoped-memory\`, outside the repository. It is not uploaded to GitHub. Owner/workspace is derived from the runtime, **not** the \`--harness\` label (which is telemetry only).

A POSIX \`flock\` across CLI processes protects read-modify-write and readback on local filesystems. This additional bound is **not** a claim about distributed locks, hostile local-user access, NFS, cross-device sync, Windows, live AI provider authentication or owner-phone use. The underlying v0.1 sidecar remains unchanged.

Run repository-level contact and inherited conformance:

\`\`\`sh
python3 -m unittest discover -s agent-runtime/host-adapters/scoped_memory -p 'test_*.py' -v
python3 agent-runtime/host-adapters/jm_host_adapter_conformance.py --all --run-local
\`\`\`

The extra tests launch independent **real** operating-system processes, require the original repository adapter, verify restarted readback and note revisions, exercise simultaneous process writes, isolate separate Git workspaces, and reject malformed requests and corrupted stored notes. Distinct \`--harness\` labels are not claims of genuine Claude/Codex sessions.

**Proof ladder:** local repository-process contact when tests pass; **Codex/Claude provider contact and physical owner-device proof remain OPEN**. Adapter registry levels are intentionally unchanged. Remove the v0.2 CLI and its tests to roll back this increment without affecting the core or v0.1 sidecar.
