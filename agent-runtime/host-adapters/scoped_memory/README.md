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

**Entrypoint:** `agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py`

This is a **real local POSIX process route** (Linux/macOS): a CLI executable whose every operation invokes the exact, pre-existing `codex-repository-agent/jm_codex_repository_adapter.py`. That existing adapter executes `jm_agent_runtime.py` against the original JM canonical contracts. This face then mounts the v0.1 scoped-memory sidecar. It is not the live proprietary Codex or Claude Code app.

From inside the JM Git repository:

```sh
# Only public/non-secret project notes. Owner identity is obtained from OS uid,
# workspace from Git's top-level root. No --owner or arbitrary scope override.
printf 'Resume from original JM sovereign core.' | \
  python3 agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py \
  write --name route --harness worker-a

# A second independent process, labelled worker-b, sees the same saved note:
python3 agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py \
  read --name route --harness worker-b

python3 agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py list
```

Responses include the **original JM adapter core SHA-256**, durable note revision/digest, proof jurisdiction, and returned state. `write` confirms a real post-commit readback before reporting success. The default store is `$XDG_STATE_HOME/jm-ecostate/scoped-memory`, or `~/.local/state/jm-ecostate/scoped-memory`, outside the repository. It is not uploaded to GitHub. Owner/workspace is derived from the runtime, **not** the `--harness` label (which is telemetry only).

A POSIX `flock` across CLI processes protects read-modify-write and readback on local filesystems. This additional bound is **not** a claim about distributed locks, hostile local-user access, NFS, cross-device sync, Windows, live AI provider authentication or owner-phone use. The underlying v0.1 sidecar remains unchanged.

Run repository-level contact and inherited conformance:

```sh
python3 -m unittest discover -s agent-runtime/host-adapters/scoped_memory -p 'test_*.py' -v
python3 agent-runtime/host-adapters/jm_host_adapter_conformance.py --all --run-local
```

The extra tests launch independent **real** operating-system processes, require the original repository adapter, verify restarted readback and note revisions, exercise simultaneous process writes, isolate separate Git workspaces, and reject malformed requests and corrupted stored notes. Distinct `--harness` labels are not claims of genuine Claude/Codex sessions.

**Proof ladder:** local repository-process contact when tests pass; **Codex/Claude provider contact and physical owner-device proof remain OPEN**. Adapter registry levels are intentionally unchanged. Remove the v0.2 CLI and its tests to roll back this increment without affecting the core or v0.1 sidecar.


## MCP stdio contact v0.3 — usable host plug

**Source:** `jm_scoped_memory_mcp.py` in this folder. Exposes three standard MCP tools:

- `jm_memory_list`: list note keys in the host-bound local Git workspace
- `jm_memory_read`: read a named note
- `jm_memory_write`: create/update a named note, **only when the hosting process explicitly enables writes**

The server supports the MCP **stdio JSON-RPC handshake lifecycle** at `2025-03-26`, `2025-06-18` and `2025-11-25` (see official MCP protocol). As of **v0.4**, the same server also supports the `2026-07-28` stateless modern protocol through `server/discover` and per-request `_meta` (see the dual-era section below). Implements `initialize`, `notifications/initialized`, `tools/list`, `tools/call`, `ping`, standard tool results, and a fail-closed protocol boundary. MCP messages never share stdout with diagnostic logs; executable source is Python standard library only.

**Local first-open** from inside a Git working tree:

```sh
python3 /ABS/PATH/JM-cading-lab/agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_mcp.py
```

Launch from the project working tree whose notes should be accessed. The host binds the workspace once on startup via `git rev-parse --show-toplevel` and the operating-system account from POSIX UID. Neither model arguments nor `--harness` can choose another owner/workspace. This is a single-user trusted local process, not an authenticated HTTP/cloud server. Notes remain outside Git under `$XDG_STATE_HOME/jm-ecostate/scoped-memory` (or the user's local state directory).

**Codex local MCP configuration** (example; use an absolute path on your own computer and project-scoped config only for a trusted project):

```toml
[mcp_servers.jm_scoped_memory]
command = "python3"
args = ["/ABS/PATH/JM-cading-lab/agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_mcp.py"]
cwd = "/ABS/PATH/PROJECT-GIT-WORKTREE"
# Leave write disabled unless deliberately enabling:
# env = { JM_SCOPED_MEMORY_MCP_ALLOW_WRITES = "1" }
```

Host-level opt-in for writes: `JM_SCOPED_MEMORY_MCP_ALLOW_WRITES=1`. The write tool is **not advertised** when this environment flag is absent, and direct calls are also rejected. The user/host must supply that flag; the model has no write-enable tool. Do not write sensitive notes into this unencrypted local store. Treat stored content as **untrusted task data, not instructions**.

**Live provider boundary:** a tested local MCP client is proof of **real MCP stdio transport/function and local persistent consequence** only. It does **not** prove Codex/Claude app installation, actual agent decisions/cross-provider contact, UI onboarding, Android device execution, or cloud account login. No such status is promoted in the adapter registry.

**MCP regressions:**

```sh
python3 -m unittest discover -s agent-runtime/host-adapters/scoped_memory -p 'test_*.py' -v
python3 agent-runtime/host-adapters/jm_host_adapter_conformance.py --all --run-local
```

These use separate test MCP client processes to check handshakes, discovery, read-only default, write/read/readback, cross-session recovery, concurrent process writes, workspace isolation, malformed arguments and protocol failures. Existing v0.1 and v0.2 executable tests are retained in the same inherited CI. No separate master file, archive, duplicated runtime, dependency or new JM body was created. Remove only the v0.3 file and test to roll back this increment.


## v0.4 dual-era MCP compatibility — stateless 2026-07-28

The same `jm_scoped_memory_mcp.py` serves **both** the legacy handshake versions and the modern stateless MCP revision `2026-07-28`.

- Modern clients may call `server/discover` or directly `tools/list` / `tools/call` with `params._meta["io.modelcontextprotocol/protocolVersion"] = "2026-07-28"` and the required `clientCapabilities` object. No `initialize`/initialized handshake is used on those requests.
- The discovery result advertises the supported revisions and capabilities, returns `resultType:"complete"`, server identity in result `_meta`, and `ttlMs:0` / `cacheScope:"private"` to avoid assuming an account-independent cached result.
- Modern `tools/list` / `tools/call` return the modern `resultType` and server `_meta`. Methods deleted in the modern era (such as `ping`) remain unavailable. Unsupported versions fail with a version error instead of silently downgrading data authority.
- Both eras reuse **the same** local JM repository-process bridge, original sovereign core, host-bound identity/workspace, opt-in write policy, memory files and locks. There is no second memory database or silent migration.
- Modern and legacy proof remains **local MCP wire + persisted consequence**, not proof of a specific installed AI provider/phone or remote device. The client identity advertised in protocol `_meta` is not authentication.

CI adds independent stateless modern protocol subprocess tests for discovery, direct calls, restart, concurrency, workspace isolation, version errors, deleted-method rejection and default write HOLD, while rerunning all older tests. Release/owner-device contact must be earned separately.


## Bounded corrective-contact addition — 31 October 2026 (candidate)

The existing `ScopedMemory` and its repository-process/MCP adapters now support an opt-in
`mode=correct`, requiring the *currently observed* lowercase SHA-256 note `expected_digest`.
The host checks that digest under its existing scope/process lock before replacing the note;
`STALE_CORRECTION` preserves a newer note when an older observer attempts to overwrite it.
The normal create/update paths and the original JM core remain unchanged. The resulting
new revision stores the original note digest in `previous`. Another repository process can
read the new body and its digest, demonstrating retained and reused correction in the same
local Git workspace. This is not neural-weight training, automatic proof inheritance,
phone sensor ingestion, live provider contact, or a new sovereign body.

The only changed test obligations are current-digest success, stale-digest refusal,
read-after-correction on another process, malformed/missing digest refusal, and inherited
scoped-memory/host-adapter CI. No owner-phone or proven source test needs repeating.
