# JM Sovereign Agent Portable Runtime v0.1

This is the host-neutral running bootstrap beneath the JM sovereign agent.

It does **not** replace the model, Build Mesh, Estate authority, AGENTS.md, current project heads, the Current-64 Coding Estate, or any host. It loads their portable contracts and emits a deterministic session/routing capsule.

## Historical lineage recovered

This runtime follows the already-established JM hosted-body law:

**BODY / SOURCE IDENTITY ↔ ADAPTER / CAPABILITY NEGOTIATION ↔ HOST MANIFESTATION → CONTACT → FUNCTION PROOF → IDENTITY PROOF**

It also reuses the multi-host principle proved by the AIRBORNE line and the thin-host precedent of the JM ChatGPT Host Adapter. No historical donor is rewritten.

## Implementations

- Python: `python3 agent-runtime/jm_agent_runtime.py`
- Node: `node agent-runtime/jm-agent-runtime.mjs`

Examples:

```bash
python3 agent-runtime/jm_agent_runtime.py --query "music release"
node agent-runtime/jm-agent-runtime.mjs --query "music release"

python3 agent-runtime/jm_agent_runtime.py --core-only --query "coding runtime"
node agent-runtime/jm-agent-runtime.mjs --core-only --query "coding runtime"
```

The `--core-only` output must be byte-identical across the independent implementations.

## Universal host plug test

Every host wrapper is judged by the same standard:

`python3 agent-runtime/host-adapters/jm_host_adapter_conformance.py --all --run-local`

The tester checks identity, portable-contract load, capability negotiation, authority preservation, routing meaning, host contact, returned consequence, recovery/re-entry and owner/device contact where applicable.

**CHANGE THE PLUG, NOT THE BODY.**

## Proof boundary

A parity PASS proves that the same owned contracts can be loaded and routed through independent Node and Python host adapters. It does **not** prove an uncontacted model, device, cloud host, inline UI, owner interaction or release route.
