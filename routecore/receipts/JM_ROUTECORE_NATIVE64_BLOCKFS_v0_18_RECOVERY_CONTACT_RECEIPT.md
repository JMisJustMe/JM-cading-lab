# JM RouteCore Native64 — BlockFS Bounded Crash / Rollback Recovery Contact Receipt v0.18

**Date:** 2026-09-29  
**State:** DING EARNED · BLOCKFS v4 BOUNDED CRASH / ROLLBACK RECOVERY PASS  
**Parent:** JM RouteCore Native64 BlockFS Multi-Block & Deeper-Path Contact v0.17  
**Parent main:** `acd2dbcc02d6614cbe5bc2eeff7714f4e1b62299`  
**Contact branch:** `routecore-blockfs-v0-18-crash-recovery-contact`  
**Successful contact head before receipt:** `1d533933fcb242d5c3e004bda57d5b5a312212d8`  
**Successful Actions run:** `36503335581` (run #2)  
**Successful job:** `109199031083`

## Governing advance

The already-proved lower route remains unchanged:

`Ring-3 → VFS → BlockFS v4 → write-back cache → generic block device → proved legacy/transitional virtio-blk carrier → persistent data image`

v0.18 advances **recovery semantics above that carrier boundary**.

The crown question was no longer whether a multi-block file could persist. v0.17 already returned that. The new pressure was:

`valid committed state → staged replacement → durable PREPARED recovery state → deliberate abrupt QEMU kill → reboot detection → bounded rollback → prior valid state returned`

This is a bounded deterministic rollback proof. It is **not** a claim of a production journal or arbitrary power-loss recovery.

## Descendant custody

The recovered v0.18 descendant carrier is preserved as four repository Base64 parts under:

`routecore/blockfs-v0-18/package/`

Normalized combined Base64 SHA-256:

`0a8ef7c5d3e7bd5181f52cd776302e64ace57f32ccbd6c2b5ca7df7a0047d738`

Decoded raw patch SHA-256:

`d809a6436f992cef9f34cd35167c3d4896eef9bf6421d4e1c471f822b16c2826`

The successful workflow reconstructs the exact v0.13 → v0.14 → v0.15 → v0.16 → v0.17 lineage, proves the v0.16 parent at 237/237 and the v0.17 parent at 245/245, then applies this v0.18 descendant.

## Construction court

Successful GitHub Actions construction returned:

- **265 / 265 PASS**
- deterministic same-host rebuild: **PASS**
- Actions boot image SHA-256: `ed4f860521c1f80e2c49aa8ce522ab5ef202159e7cc967ba9f08af1bc9ed6cc5`
- Actions kernel ELF SHA-256: `c40513d4ec816d3d4b246178f4f36f5e2c2499b9fa066ac738d375e40dda3eb6`
- zeroed data seed SHA-256: `30e14955ebf1352266dc2ff8067e68104607e750abb9d3b36582b8af909fcb58`

Deterministic pre-contact package:

- `JM_ROUTECORE_NATIVE64_BLOCKFS_v0_18.zip`
- SHA-256: `88720f707c7302e6754f42ca0d36c5067a898c2b42982c86f84b7481d305568d`
- bytes: `174109`

Compiler-derived disk/ELF hashes are recorded from the successful Actions host rather than prescribed from another host. Same-host deterministic rebuild remains mandatory.

## BlockFS v4 bounded recovery body

v0.18 preserves the v0.17 persistent tree and multi-block file body while adding a dedicated recovery-journal region and a staged replacement route.

The committed `/blk/docs/archive/long.bin` remains authoritative while a different 1200-byte replacement body is staged into a separate three-block extent.

The recovery route requires:

1. the old committed multi-block body to remain valid;
2. the replacement data to reach its staging extent;
3. write/flush return through the proved virtio-blk carrier;
4. the staging allocation state and PREPARED journal to become persistent;
5. the prepared raw state to be independently inspectable;
6. only then may the crash-point marker return;
7. the host abruptly kills QEMU at that returned marker;
8. the next boot must detect the PREPARED recovery record before normal use;
9. rollback must remove the staging state and clear the journal;
10. the old B, C, and 1200-byte long body must return through Ring-3;
11. the final raw carrier must equal the exact pre-crash baseline image.

## Runtime court — baseline

Fresh boot returned the existing v0.16/v0.17 filesystem lifecycle under BlockFS v4.

Runtime verifier:

- result: **PASS**
- required markers: **33**
- ordered route: **22**

Independent raw inspection:

- result: `PASS — raw BlockFS v4 clean region`
- pre-crash baseline data-carrier SHA-256:
  `ed992970d22fa50af13223fd45455c00cb9525e63c350e90ab6a548840e41ee2`

Boot 1 serial SHA-256:

`d9ef4cccb4ca7a438265d015808a413a927ecd3642d0ecac0ea304890b5222fe`

## Runtime court — deliberate interrupted mutation

The second boot mounted the existing filesystem, verified the surviving v0.17 bodies, staged the replacement, returned write + flush contact, and then returned:

- `JM_BLOCKFS_V4_TX_PREPARED_CRASH_POINT`

Only after that marker did the host issue abrupt `SIGKILL` to QEMU.

Runtime verifier:

- result: **PASS**
- required markers: **17**
- ordered route: **11**
- normal process-exit markers: **forbidden / absent**
- recovery-complete markers: **forbidden / absent**

Independent inspection of the killed carrier returned:

- result: `PASS — raw BlockFS v4 prepared region`
- prepared/crashed data-carrier SHA-256:
  `cbe9ad5617e0bc351f9c234d73202bad4de4b46ba12a59f818fa44a7ae42f594`

This differs from the baseline, proving the interruption court did not merely reboot an untouched image.

Boot 2 crash log SHA-256:

`f36f93226c1b3c4eac48406a5a8a2cfa918d72a49d6d1ebddb2e982d7be9b362`

## Runtime court — reboot recovery

The third boot returned recovery before normal filesystem use:

- `JM_BLOCKFS_V4_RECOVERY_DETECTED`
- carrier write contact
- carrier flush contact
- `JM_BLOCKFS_V4_ROLLBACK_COMPLETED`
- `JM_BLOCKFS_MOUNT_EXISTING`
- `JM_BLOCKFS_V3_EXISTING_PERSISTENCE_VERIFIED_T1`
- `JM_BLOCKFS_V4_PRIOR_STATE_VERIFIED_T1`
- `JM_BLOCKFS_V4_RECOVERY_VERIFIED_T1`
- `JM_PROCESS_EXIT_SURVIVOR_T0`

Runtime verifier:

- result: **PASS**
- required markers: **21**
- ordered route: **14**

Independent raw inspection after recovery returned:

- result: `PASS — raw BlockFS v4 clean region`
- recovered data-carrier SHA-256:
  `ed992970d22fa50af13223fd45455c00cb9525e63c350e90ab6a548840e41ee2`

That recovered hash is **byte-identical to the pre-crash baseline**.

Boot 3 recovery log SHA-256:

`97a041955e179c4402a269fbc71076be57b521ea1316dc3ae2401bcceb226be1`

## Actions custody

Successful artifact:

- name: `jm-routecore-blockfs-v0-18-crash-recovery-contact`
- artifact ID: `11006151041`
- size: `698146` bytes
- digest: `sha256:3a10000eaeefbb2dcacabfffa8d1bcc9a4aff687168b9b77c6f3f802a47431e2`
- run: `36503335581`
- job: `109199031083`

The artifact contains the recovered lineage, v0.18 descendant carrier, transformed source, construction proof, deterministic package, baseline/crash/recovery serial evidence, raw carrier states and hashes.

## Correction trace

Contact failures remain visible:

1. **Run 36503205304:** exact lineage recovery, v0.18 patch application, **265/265 construction PASS**, and deterministic package creation all passed. The workflow wrapper then failed before runtime because it searched only for newly named recovery runners. The v0.18 descendant had intentionally upgraded the inherited `RUN_PERSISTENCE_LINUX.sh` into the crash/recovery court. This was a harness naming miss, not a filesystem/runtime failure.
2. The wrapper was corrected to route through the existing upgraded runner. No runtime marker, crash condition, rollback condition, raw-state condition, or hash-equality crown gate was weakened.
3. **Run 36503335581:** exact recovery, 265/265 construction, deterministic package, baseline court, deliberate prepared-state SIGKILL, raw prepared-state inspection, reboot recovery, prior-state Ring-3 verification, exact raw-image restoration, and artifact upload all **PASS**.

## Earned conclusion

**PASS:** at the stated QEMU legacy/transitional virtio-blk scope, RouteCore BlockFS v4 can preserve a valid committed multi-block filesystem state while preparing a separate replacement, expose a durable PREPARED state, be deliberately killed before commit, detect that interrupted mutation on reboot, roll the staged state back, return the prior B/C/long bodies through Ring-3, and restore the persistent carrier to the exact byte-for-byte pre-crash baseline.

**DING EARNED at the declared bounded rollback-recovery scope.**

## Explicitly not claimed

This receipt does **not** claim:

- arbitrary crash-point coverage;
- arbitrary journal replay / forward commit recovery;
- general ACID transactions;
- hardware power-loss atomicity;
- fragmented/non-contiguous allocation;
- concurrent filesystem mutation;
- production-grade filesystem completeness;
- NVMe contact;
- modern virtio PCI capability transport;
- physical-owner-device storage contact.

## Forward frontier

The filesystem frontier has moved again.

The strongest next pressure is no longer simply “does interrupted mutation get noticed?”

It does at this bounded prepared-state gate.

Next useful directions are:

`one bounded rollback point → multiple interruption points / phase matrix → commit-vs-rollback semantics → corruption/torn-record discrimination → stronger recovery policy`

or, as a separate transport frontier:

`proved filesystem body → NVMe / modern virtio / physical-owner-device contact`

These are advancement choices, not completion debt for v0.18.

## Keeper

> THE CRASH IS PART OF THE ROUTE.  
> PREPARED IS NOT COMMITTED.  
> RETURNING AFTER INTERRUPTION IS NOT ENOUGH; THE PRIOR VALID STATE MUST RETURN.  
> BASELINE → PREPARED → KILL → RECOVERY → BASELINE.  
> NO RETURNED RECOVERY, NO DING.  
> THE RECOVERY RETURNED.

**DING EARNED · v0.18 CONTACT CLOSED AT DECLARED RUNTIME SCOPE.**
