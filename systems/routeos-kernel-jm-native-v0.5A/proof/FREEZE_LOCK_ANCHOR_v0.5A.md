# RouteOS Kernel JM-Native v0.5A — Freeze, Lock & Anchor

**Frozen:** 30 July 2026  
**Status:** `JM_GENERATED_MEMORYBODY DING: PASS`  
**Repository:** `JMisJustMe/JM-cading-lab`  
**PR:** `#56`  
**Branch:** `agent/routeos-kernel-jm-native-memorybody-v0-5a`  
**Proven branch head:** `3cd46fdfa825391c99f0999bb4939231e03ad619`  
**Frozen v0.4A anchor:** `52706adf66b5060b3aec17f21982d9cf5eddc23d`

## Frozen claim

RouteOS Kernel JM-Native v0.5A proves three stacked JM-generated operational kernel offices.

1. PermissionGate governs live CPL3 syscall dispatch.
2. RouteScheduler governs live body selection, state handoff, run accounting and no-runnable hold.
3. MemoryBody governs the kernel-owned heap shape, free/used ownership map, first-free allocation, exhaustion return, exact-block release and double-release failure.

The machine body is reconstructed from the exact v0.1A source carrier, receives the frozen v0.2A authority, then receives the generated PermissionGate, RouteScheduler and MemoryBody offices in lineage order. It compiles, links, packages and boots under QEMU x86-64 TCG.

## Runtime proof

```text
[JM] JM_NATIVE AUTHORITY v0.2A SOURCE 0f8d44080dc6adfa855996b76efe7f538284643ead8170599809d1e0dbc10371 PARENT 54f67566036316b25515fb53fa98f06769d3850d
[JM] MEMORYBODY GENERATED v0.5A SOURCE 847e3d7266a5873d099c0b3403df5e7dd6fea3f8e09ab1092bc28178083fcbe8 ACTIVE
[JM] MEMORY INITIALISED: ALLOCATE/RELEASE PASS
[JM] ROUTESCHEDULER GENERATED v0.4A SOURCE 13d2d2cc90d338cd7a1177caa150dd16f3ec2aa32d0f0fb5c1959e11898b632c ACTIVE
[JM] PERMISSIONGATE GENERATED v0.3A SOURCE 2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2 ACTIVE
```

The same trace preserved both CPL3 bodies, PIT scheduling, PermissionGate returns, deliberate User Body 2 invalid-opcode fault, FaultHold, RecoveryBody and safe User Body 1 continuation.

## Machine receipt

- Workflow run: `30579722980`
- Job: `90996662705`
- Tested commit: `3cd46fdfa825391c99f0999bb4939231e03ad619`
- MemoryBody JM source SHA-256: `847e3d7266a5873d099c0b3403df5e7dd6fea3f8e09ab1092bc28178083fcbe8`
- Generated MemoryBody office SHA-256: `f153310d4c66dd71e57ba214aa34d60a366c442e9d74340d2309e9742b057260`
- RouteScheduler JM source SHA-256: `13d2d2cc90d338cd7a1177caa150dd16f3ec2aa32d0f0fb5c1959e11898b632c`
- Generated RouteScheduler office SHA-256: `dd64f880f99bf5bf61e14a51d7e5cd88de1a1859b9bf183ea35ad2b6547163d3`
- PermissionGate JM source SHA-256: `2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2`
- Generated PermissionGate office SHA-256: `ea0506b13272e0c4f925a93a153a181d552d285bd41467eb43aadebafce5ae93`
- Integrated kernel source SHA-256: `eb88a738abec000976d884b14965a5831e4d5f052e462b60dffd6d12c13490b3`
- Integrated ELF SHA-256: `76d76a5641b36f7b2dd76ada59bf0756d73158e7f18717c13e5e5e737ba98b49`
- Integrated ISO SHA-256: `cb5bb5d17ae5a12f477d786fd34f04d1f968cb1f7115097b1cfdf3c403730cad`
- Full QEMU trace SHA-256: `e89c1682804a0072950b7c20099380d5832aa8b275e37f977c35ef0ccdc8d6e4`
- Workflow artifact digest: `1ee5e07fcccb8f6ea4d7eed4c489ae8ef357f41ea065214f7dc9ed9dc4d5b842`
- Workflow artifact size: `3,285,194 bytes`

## Six-gate agreement

The tested head passed:

- RouteOS Kernel Hard-Body Proof;
- RouteOS JM-Native Source Authority;
- RouteOS JM-Native Boot Integration;
- RouteOS JM-Generated PermissionGate;
- RouteOS JM-Generated RouteScheduler;
- RouteOS JM-Generated MemoryBody.

## Lock

This proof state is closed.

- Do not reopen, silently revise, overwrite or weaken this v0.5A claim.
- Do not backdate later generated offices into this version.
- A failure in a later version does not revoke this bounded PASS.
- The PR remains draft and unmerged unless an explicit instruction changes that state.

## Honest boundary

This proves **three stacked JM-generated operational kernel offices**. FaultHold, RecoveryBody, IgnitionBody and the assembly floor remain carrier-owned at this stage.

## Next-lane separation

The next version must begin from this frozen anchor. The strongest next target is FaultHold + RecoveryBody operational generation, because those offices already possess a bounded deliberate-fault machine test.

> v0.3A governed the boundary. v0.4A governed the handoff. v0.5A governed ownership and return.
