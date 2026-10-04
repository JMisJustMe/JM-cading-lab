# JM Codex / Repository-Agent Adapter v0.1

Thin wrapper over the existing JM sovereign runtime.

It does not create another agent and it does not grant a repository host source authority.

Run:

```bash
python3 agent-runtime/host-adapters/codex-repository-agent/jm_codex_repository_adapter.py --query "coding runtime"
```

The envelope binds the repository instruction carriers by SHA-256 to the same portable runtime core and returns the bounded route candidates plus the host's required operating actions.

Current proof boundary: **FUNCTION** for the wrapper. Direct Codex-host contact remains **OPEN**.
