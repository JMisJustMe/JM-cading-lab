# RouteOS Kernel JM-Native v0.3A — Freeze, Lock & Anchor

**Frozen:** 30 July 2026  
**Status:** `JM_GENERATED_PERMISSIONGATE DING: PASS`  
**Repository:** `JMisJustMe/JM-cading-lab`  
**PR:** `#54`  
**Branch:** `agent/routeos-kernel-jm-native-permissiongate-v0-3a`  
**Proven branch head:** `bb31256906b3db76a78993367ce0d38cb7418153`  
**Frozen v0.2A anchor:** `f76343108422109e8aa939d785d0d88bdba61f08`

## Frozen claim

RouteOS Kernel JM-Native v0.3A proves that the complete PermissionGate syscall-dispatch office is defined in JM source, deterministically generated as C, substituted for the handwritten v0.1A PermissionGate block, compiled into the real kernel, executed by CPL3 user bodies under QEMU, and preserved through the inherited hard-body route.

The generated office governs:

- TRACE_READ call number, permission route, receipt and tick return;
- YIELD call number and scheduler continuation;
- unknown-call denial, return value and same-body continuation;
- its own runtime source-identity receipt.

The running kernel emitted the generated-office marker before the first PermissionGate return, then preserved PIT scheduling, two user bodies, deliberate invalid-opcode fault, FaultHold, RecoveryBody and safe-body continuation.

## Machine receipt

- Workflow run: `30578052806`
- Job: `90991136217`
- PermissionGate JM source SHA-256: `2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2`
- Generated office SHA-256: `ea0506b13272e0c4f925a93a153a181d552d285bd41467eb43aadebafce5ae93`
- Integrated kernel source SHA-256: `8d20c7eb32cc2097bb71e5107cc6733c6281254507726c52772aa7813b17c65e`
- Integrated ELF SHA-256: `08e973fd09cf7a659a999d95591e29bc438a5a45b12aba0a912af6095863695b`
- Integrated ISO SHA-256: `bf3b9ddcd6f9fb4c1405178ee041fce93ee8c10dfa2db30e360a1659f4369df7`
- Full QEMU trace SHA-256: `5ef2882ea6ee8fc29b91da1bda14db97a873ed2b83bbfe4be20b8a6a7a0c252f`
- Workflow artifact digest: `a687b86b08b80b8b49d4793366f42b4e2107f459ebc0e888d0f9b4eeeaa15345`
- Workflow artifact size: `3,266,865 bytes`

## Runtime proof

```text
[JM] PERMISSIONGATE GENERATED v0.3A SOURCE 2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2 ACTIVE
[JM] USER BODY 2 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN
```

## Lock

This proof state is closed.

- Do not reopen, silently revise, overwrite or weaken this v0.3A claim.
- Do not backdate later generated offices into this version.
- A later failure does not revoke this bounded PASS.
- The PR remains draft and unmerged unless an explicit instruction changes that state.

## Honest boundary

This proves **one JM-generated operational kernel office**. PermissionGate is generated; most scheduler, memory, fault, ignition and assembly behaviour still comes from the frozen carrier.

## Next-lane separation

The next branch must begin from this anchor as a new version. The next target is RouteScheduler operational generation: body selection, state handoff, run accounting and no-runnable hold, followed by the full machine proof.

> v0.2A put JM authority into the kernel. v0.3A made one kernel office obey JM-generated behaviour.
