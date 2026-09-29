# JM RouteCore Native64 — BlockFS Interrupted Recovery Re-entry Contact Receipt v0.20

**Date:** 2026-09-29  
**State:** DING EARNED · BLOCKFS v0.20 INTERRUPTED-RECOVERY RE-ENTRY PASS  
**Parent:** JM RouteCore Native64 BlockFS Phase-Aware Recovery Matrix Contact v0.19  
**Parent PR:** #262  
**Contact branch:** `routecore-blockfs-v0-20-recovery-reentry-contact`  
**Successful contact head:** `b1ffc30136e20716c52a441f8261869ee39d4ec4`  
**Successful Actions run:** `36510188647` (run #5)  
**Successful job:** `109220366813`

## Governing advance

v0.19 proved phase-aware rollback/forward recovery and torn-journal rejection.

v0.20 asks the next question:

`recovery started → recovery itself is interrupted → reboot → recovery must safely re-enter from the durable shape already reached`

The BlockFS on-disk version remains **v5**. v0.20 advances the RouteCore recovery proof body, not the disk-format number.

## Exact-parent custody

The v0.20 descendant was generated against the exact proved v0.19 Actions work body.

Raw descendant patch SHA-256:

`b4df7eb528945cc430018b4258a7e1bfc34e6b685ee0e344e812a2a1308b4ec5`

Normalized Base64 carrier SHA-256:

`d2bd78220aea96d66869250e26cc473f18dfde1cf15e18f79b48956fe2a0ddcf`

The successful workflow recovered Actions run `36507274226`, verified v0.19 **265/265 PASS**, then applied the exact-parent v0.20 descendant.

## Construction court

GitHub Actions returned:

- **272 / 272 PASS**
- deterministic same-host rebuild: **PASS**
- Actions boot image SHA-256:
  `7bd7b01c9d6c8d7833856bff9d87dd5894315724a91de0dbf4c33a6a2518d578`
- Actions kernel ELF SHA-256:
  `0fc4ba7cb885a759f18bffba77ccd19fa074a187f837d98bb81001b92cf8e186`

A local exact-parent replay independently returned **272/272 PASS** with deterministic same-host rebuild. Its binary hashes differ from Actions because the build toolchain/environment differs; byte identity across different compilers/binutils is not claimed or required.

## Recovery re-entry court

One clean baseline was used:

`2e8d24dfbfb7a6ea6c95a12912463a1e1df18a67fb131969487be50eb95b11d5`

### Court A — rollback interrupted after durable shadow zero

The transaction first reached the ordinary v0.19 DATA_READY rollback crash state.

The recovery boot then:

- detected rollback recovery;
- durably zeroed the staged shadow extent;
- durably consumed the one-shot re-entry injection;
- returned marker `JM_BLOCKFS_V5_REENTRY_ROLLBACK_AFTER_SHADOW_ZERO`;
- was deliberately terminated.

The interrupted-recovery carrier SHA-256 was:

`e724ec2404da30156ddf38b76993bbf28d1d195e3d0e4680f7459baed59adb1f`

On the next boot, ordinary recovery re-entered and completed.

Final rollback carrier SHA-256:

`2e8d24dfbfb7a6ea6c95a12912463a1e1df18a67fb131969487be50eb95b11d5`

The final carrier is **byte-identical to the original clean baseline**. A further clean reboot did not mutate it.

### Court B — forward recovery interrupted after durable metadata switch

The transaction first reached COMMITTING.

The recovery boot then:

- detected forward recovery;
- durably switched the node table + bitmap to the new extent;
- durably consumed the one-shot re-entry injection;
- returned marker `JM_BLOCKFS_V5_REENTRY_COMMIT_AFTER_META_SWITCH`;
- was deliberately terminated.

The interrupted-recovery carrier SHA-256 was:

`8f96a3f084db6384a554d5f3d78e41d5d3c6c21fc9d0f8016f71faa5e48846db`

On the next boot, recovery re-entered through the already-switched **new-shape** branch and completed.

Final committed carrier SHA-256:

`8437b936c66499a919aa6eaaf77e84d38fddfd1fd34dffbc54bfeb65ede26bac`

A further clean reboot did not mutate it.

### Court C — forward recovery interrupted after durable old-extent zero

A fresh copy of the same baseline again reached COMMITTING.

The recovery boot then:

- switched metadata to the new extent;
- durably zeroed the old extent;
- durably consumed the one-shot re-entry injection;
- returned marker `JM_BLOCKFS_V5_REENTRY_COMMIT_AFTER_OLD_ZERO`;
- was deliberately terminated.

The interrupted-recovery carrier SHA-256 was:

`6ca748a7993a0e322c6502ea096c79556f6c1370c96f17a53f161471f69c9d1d`

On the next boot, recovery re-entered safely through the new-shape branch and completed.

Final committed carrier SHA-256:

`8437b936c66499a919aa6eaaf77e84d38fddfd1fd34dffbc54bfeb65ede26bac`

This is **byte-identical to Court B's final carrier**. A further clean reboot did not mutate it.

## One-shot harness law

Each artificial re-entry hook clears its journal injection code and syncs that cleared state **before** the deliberate halt.

Therefore the next boot does not repeatedly hit the test hook. It executes ordinary recovery logic from the durable filesystem/journal shape actually left behind.

## Correction trace

The first PR-triggered run, `36510090333`, recovered v0.19 and applied the v0.20 patch successfully. It also returned **272/272 PASS**.

That run was stopped by an invalid harness gate: it required the Actions-produced boot image and ELF to have the same SHA-256 values as a local build produced under a different compiler/binutils environment.

The failure was correctly classified as:

`CROSS-TOOLCHAIN BYTE HASH != SAME-HOST DETERMINISM`

The gate was corrected without weakening construction proof:

- exact-parent patch hashes remain fixed;
- 272/272 construction checks remain fixed;
- same-host deterministic rebuild remains mandatory;
- Actions records its own boot/ELF hashes;
- runtime QEMU contact remains mandatory.

Run `36510188647` then passed the full construction + runtime court.

## Actions custody

Successful artifact:

- name: `jm-routecore-blockfs-v0-20-recovery-reentry-contact`
- artifact ID: `11008907501`
- size: `1,214,783` bytes
- digest:
  `sha256:33a5729abc64310be1764725c67295ffb06ecaaafd59bf22b756d902224e578b`
- run: `36510188647`
- job: `109220366813`

## Earned conclusion

**PASS:** at the existing QEMU legacy/transitional virtio-blk scope, RouteCore BlockFS recovery can itself be interrupted at three durable recovery boundaries and then safely re-enter on the next boot:

- rollback after durable shadow zero returns the exact previous committed carrier;
- forward recovery after durable metadata switch resumes from the new metadata shape;
- forward recovery after durable old-extent zero resumes from the same new shape;
- both forward paths converge byte-identically;
- recovered carriers remain stable across one additional clean reboot.

**DING EARNED at the declared interrupted-recovery re-entry scope.**

## Explicitly not claimed

This receipt does **not** claim:

- exhaustive interruption after every individual sector write;
- general ACID transactions;
- concurrent filesystem mutation;
- arbitrary journal length / transaction count;
- hardware power-loss atomicity;
- fragmented/non-contiguous allocation;
- production-grade filesystem completeness;
- NVMe contact;
- modern virtio PCI capability transport;
- physical-owner-device storage contact.

## Forward frontier

The strongest next filesystem advance is now:

`contiguous extents → fragmented/non-contiguous allocation → free-space pressure → reuse under fragmentation → persistence/recovery over fragmented files`

Separate transport frontiers remain:

`NVMe / modern virtio / physical owner-device contact`

## Keeper

> RECOVERY IS NOT COMPLETE BECAUSE IT STARTED.  
> A SECOND INTERRUPTION MUST RETURN TO A VALID DURABLE SHAPE.  
> RE-ENTRY MUST FOLLOW THAT SHAPE, NOT ASSUME THE ORIGINAL ONE.  
> ONE-SHOT TEST PRESSURE MUST NOT BECOME THE THING BEING TESTED.  
> CONVERGENCE MUST RETURN IN BYTES, NOT INTENT.  
> NO RETURNED RE-ENTRY MATRIX, NO DING.  
> THE MATRIX RETURNED.

**DING EARNED · v0.20 CONTACT CLOSED AT DECLARED RUNTIME SCOPE.**
