# FREEZE LOCK ANCHOR — RouteOS JM-Native Kernel v1.0A

## Crown

**FrameCarrier + InterruptEntry — DING PASS**

This lock freezes the machine-proven v1.0A body recovered from the crashed kernel-recovery room. It does not rebuild, rename or silently replace that body.

## Authority chain

- v0.9A frozen parent: `a05b26b3901460cfa5623cbb3063d961a9952214`
- v0.9A machine parent: `dfa52b8e42f2511eeb3082f14fc2eb0584843e27`
- v1.0A machine-tested source head: `13a938d14afc2e3a31073c174291533c5f95a1aa`
- Draft PR: `#63`
- Proof run: `30592988658`
- Decisive job: `91039091870`
- Receipt artifact ID: `8779037867`
- Receipt artifact: `routeos-v1.0A-framecarrier-interruptentry-receipt.zip`
- Artifact checksum audit: `22/22 PASS`
- Tested-head workflow result: `11/11 PASS`

## Frozen source identity

- Source: `systems/routeos-kernel-jm-native-v1.0A/source/framecarrier_interruptentry.jmroute`
- Source SHA-256: `50d69fff36da19ef9073b54e87727696fb8181efa49f4d0a724100c96983e6a9`
- Compiler identity: `[JM] FRAMECARRIERC v1.0A SOURCE 50d69fff36da19ef9073b54e87727696fb8181efa49f4d0a724100c96983e6a9 ACTIVE`
- Generated include SHA-256: `b752b49c044a8022d76fc9f656464266dda522375d428d12bc011e87f6de4161`
- Linked ELF SHA-256: `f8572bf42cd314912671cf405f628a3e7bc7dc54dec990727fd0119717dcdd16`
- QEMU trace SHA-256: `13b5e9d2e66577e0e833662a3e42f9ed8ddd56ca1d328ecaebbdfea62681fa1f`

## Frozen operational body

`IgnitionBody → MemoryBody → DescriptorBody → BodyRegistry → UserBoundary → InterruptRoute → RouteScheduler → PermissionGate → FaultHold → RecoveryBody → FrameCarrier → InterruptEntry`

The generated body carries the inherited 22-qword CPU frame, enters through generated `#UD`, timer and syscall carriers, dispatches into the proven kernel route, restores the returned frame, crosses `iretq`, contains the faulting user body and preserves safe-body continuation.

## Locks

1. The v1.0A source and generated outputs above are the authoritative FrameCarrier/InterruptEntry body.
2. A parallel or later branch does not replace this crown merely by sharing the version name.
3. Changes to register order, frame order, vector policy, symbol identity or return route require a new version and new machine proof.
4. A documentation-only freeze child may preserve this proof, but it may not rewrite the hashes of the machine-tested source head.
5. PR `#63` remains draft and unmerged unless merging is chosen separately.
6. The failed duplicate PR `#65` is non-authoritative and must not supersede this recovered line.

## Claim boundary

Frozen as proven: generated executable FrameCarrier restoration and generated InterruptEntry carriers for `#UD`, PIT timer and `int 0x80`, running inside the full inherited RouteOS kernel proof.

Not frozen as proven: generated early boot, generated long-mode setup, generated page-table construction, generated user-code bytes, all exception families, removal of every handwritten assembly seam, or a wholly generated kernel.

## Anchor branch

`anchor/routeos-kernel-jm-native-v1-0a-framecarrier-interruptentry-ding-pass`

Any continuation begins from this locked body or explicitly declares why it diverges.
