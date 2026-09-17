# RouteOS Kernel JM-Native v0.4A — Freeze, Lock & Anchor

**Frozen:** 30 July 2026  
**Status:** `JM_GENERATED_ROUTESCHEDULER DING: PASS`  
**Repository:** `JMisJustMe/JM-cading-lab`  
**PR:** `#55`  
**Branch:** `agent/routeos-kernel-jm-native-routescheduler-v0-4a`  
**Proven branch head:** `ba60cc66c1cfa622971301af7b84f35f5ad570c9`  
**Frozen v0.3A anchor:** `2e814746c846fc5aeb45bee7bb03338d7c9a0896`

## Frozen claim

RouteOS Kernel JM-Native v0.4A proves two stacked JM-generated operational kernel offices.

1. PermissionGate remains defined in JM source, generated as C and used for live CPL3 syscall dispatch.
2. RouteScheduler is defined in JM source, generated as C and used for live body selection, blocked-body exclusion, state handoff, frame preservation, run accounting and no-runnable hold.

The v0.4A machine body is reconstructed from the exact v0.1A source carrier, receives the frozen v0.2A authority, receives the frozen v0.3A PermissionGate, then replaces the handwritten RouteScheduler office. It compiles, links, packages and boots under QEMU x86-64 TCG.

## Runtime order

```text
[JM] ROUTESCHEDULER: ENTERING USER BODY 1
[JM] ROUTESCHEDULER GENERATED v0.4A SOURCE 13d2d2cc90d338cd7a1177caa150dd16f3ec2aa32d0f0fb5c1959e11898b632c ACTIVE
[JM] PERMISSIONGATE GENERATED v0.3A SOURCE 2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2 ACTIVE
[JM] USER BODY 2 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN
[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN
```

The same trace preserved PIT scheduling, deliberate User Body 2 invalid-opcode fault, FaultHold, RecoveryBody and safe User Body 1 continuation.

## Machine receipt

- Workflow run: `30578979211`
- Job: `90994164922`
- Tested commit: `ba60cc66c1cfa622971301af7b84f35f5ad570c9`
- RouteScheduler JM source SHA-256: `13d2d2cc90d338cd7a1177caa150dd16f3ec2aa32d0f0fb5c1959e11898b632c`
- Generated RouteScheduler office SHA-256: `dd64f880f99bf5bf61e14a51d7e5cd88de1a1859b9bf183ea35ad2b6547163d3`
- PermissionGate JM source SHA-256: `2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2`
- Generated PermissionGate office SHA-256: `ea0506b13272e0c4f925a93a153a181d552d285bd41467eb43aadebafce5ae93`
- Integrated kernel source SHA-256: `7ed4ae9fc829005030820e70587e20ecc653831d58b9dd33b34f8cd309bd3963`
- Integrated ELF SHA-256: `b641d42a3cf1c4c27a1ba4a8b5ab0b289ff460d4b8bea9409e137cc2215e6688`
- Integrated ISO SHA-256: `c89b352ec88400237b5284846b47cfe40eab73419f2d25367fa1629eab727760`
- Full QEMU trace SHA-256: `376298c0f5541597d8e280a877de9366ba7cb4d55ab17369ebabc66c5061f0e6`
- Workflow artifact digest: `7b8be0ba772c97f85ac80d5aa3ee8191b5903f6ed4cbf44f69096ea512bcd812`
- Workflow artifact size: `3,274,301 bytes`

## Five-gate agreement

The tested head passed:

- RouteOS Kernel Hard-Body Proof;
- RouteOS JM-Native Source Authority;
- RouteOS JM-Native Boot Integration;
- RouteOS JM-Generated PermissionGate;
- RouteOS JM-Generated RouteScheduler.

## Lock

This proof state is closed.

- Do not reopen, silently revise, overwrite or weaken this v0.4A claim.
- Do not backdate later generated offices into this version.
- A failure in a later version does not revoke this bounded PASS.
- The PR remains draft and unmerged unless an explicit instruction changes that state.

## Honest boundary

This proves **two stacked JM-generated operational kernel offices**. MemoryBody, FaultHold, RecoveryBody, IgnitionBody and the assembly floor remain carrier-owned at this stage.

## Next-lane separation

The next version must begin from this frozen anchor. The next operational target is MemoryBody: allocation, release, ownership state and memory receipt generation, followed by the same full-machine route.

> v0.3A made the boundary obey JM. v0.4A made the handoff obey JM too.
