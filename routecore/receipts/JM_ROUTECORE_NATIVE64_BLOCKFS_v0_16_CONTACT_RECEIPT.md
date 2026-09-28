# JM RouteCore Native64 — BlockFS Growth Contact Receipt v0.16

**Date:** 2026-09-28  
**State:** DING EARNED · BLOCKFS v2 ALLOCATION/UNLINK/REUSE PASS · TWO-BOOT PERSISTENCE PASS  
**Parent:** JM RouteCore Storage Carrier Independence FLAZ v1.0 / Native64 virtio-blk v0.15 runtime body  
**Contact branch:** `routecore-blockfs-v0-16-contact`  
**Successful contact head before receipt:** `5ce3ed43793b91c1806aa8e062429f2ddc314156`  
**Successful Actions run:** `36487024008`  
**Successful job:** `109146282026`

## Governing advance

The lower storage boundary is intentionally unchanged:

`Ring-3 → VFS → BlockFS v2 → 4-line write-back cache → generic block device → proved legacy virtio-blk carrier → persistent data image`

v0.16 advances the filesystem body above that already-proved carrier boundary.

The old bounded single-file BlockFS v1 shape is replaced by a persistent BlockFS v2 body with:

- 8 persistent node slots;
- 32-block allocation bitmap;
- root `/blk`;
- hierarchical path traversal;
- runtime directory creation;
- multiple one-block files;
- unlink/free;
- exact lowest-free node and data-block reuse;
- raw backing verification independent of the cache;
- cache invalidation followed by Ring-3 reread;
- a separate read-only existing-mount verification path on boot 2.

## Construction court

Fresh Actions construction returned:

- **237 / 237 PASS**
- deterministic rebuild: **PASS**
- boot image SHA-256: `b5aa24e0c620f9f038aa6aa49ced91cf56bc9726aa1bb431f41b8e68b33b723e`
- zeroed data seed SHA-256: `30e14955ebf1352266dc2ff8067e68104607e750abb9d3b36582b8af909fcb58`
- kernel ELF SHA-256: `68ac45775155e3d95caccc1c1cced77849a6b9316dda73b0cb13e076b978c20b`

Deterministic pre-contact package:

- `JM_ROUTECORE_NATIVE64_BLOCKFS_v0_16.zip`
- SHA-256: `8471770309b41ffc764a4c85913e5bc8218b82513870dcaa4ad260a564b4926a`
- bytes: `148108`

The bounded descendant transform is carried by:

- raw v0.16 patch SHA-256: `4a73b2e9414dd799939747959ae72154d73c2a9085bd74de7226e57e181af92c`
- Base64 patch carrier SHA-256: `99c6a14d33d369c47f76be1b0e365f66df5141ee33f10e2e10f8ccf5c2f7a422`

The successful workflow reconstructed the exact earlier RouteCore lineage, rebuilt the proved v0.15 body, verified the v0.16 patch hash, applied the descendant, and then built/runtime-tested the result.

## Runtime court — boot 1

Boot 1 returned the fresh lifecycle, including:

- `JM_BLOCKFS_FORMATTED_NEW`
- `JM_BLOCKFS_V2_DIR_CREATED_T1`
- `JM_BLOCKFS_V2_CREATE_A_T1`
- `JM_BLOCKFS_V2_CREATE_B_T1`
- `JM_BLOCKFS_V2_UNLINK_A_T1`
- `JM_BLOCKFS_V2_CREATE_C_T1`
- `JM_BLOCKFS_V2_REUSE_VERIFIED_T1`
- `JM_BLOCKFS_WRITE_T1`
- `JM_BLOCK_CACHE_SYNC_T1`
- `JM_BLOCKFS_V2_RAW_BACKING_VERIFIED_T1`
- `JM_BLOCK_CACHE_INVALIDATE_T1`
- `JM_BLOCKFS_V2_USER_B_VERIFIED_T1`
- `JM_BLOCKFS_V2_USER_C_VERIFIED_T1`
- `JM_BLOCKFS_V2_FRESH_LIFECYCLE_VERIFIED_T1`
- normal process exit/reclaim and survivor return.

Runtime verifier:

- required markers: **28 / 28 present**
- ordered route: **20 / 20**
- result: **PASS**

Boot 1 serial SHA-256:

`b7337fa58a458223ceff35130f94393ae3c956607974b1fb9b27d1aaaf4e7328`

## Exact free/reuse proof

The lifecycle was intentionally pressure-tested rather than merely creating two permanent files.

Fresh boot created:

- `/blk/docs/a.txt`
- `/blk/docs/b.txt`

A was then unlinked. C was created afterward:

- `/blk/docs/c.txt`

The v0.16 reuse gate required C to receive **the exact node slot and data block freed by A**.

Returned marker:

`JM_BLOCKFS_V2_REUSE_VERIFIED_T1`

Independent raw-carrier inspection confirmed the final allocation shape:

- docs node: **1**
- c.txt node: **2**
- c.txt data block: **3**
- b.txt node: **3**
- b.txt data block: **4**
- allocation bitmap: `0x0000001f`
- A absent
- no duplicate live data blocks.

Surviving exact payloads:

- `JM BLOCKFS FILE B`
- `JM BLOCKFS FILE C`

## Independent raw-carrier court

After boot 1:

- `PASS — raw BlockFS v2 persistent region`
- superblock: `magic=JM_BLOCKFS version=2 blocks=32 nodes=8 data_start=3`
- persistent carrier SHA-256: `44f2bea74e23fa1d6c9b3daa1a5f9f9390a64c3e98936e5c570728e08bd302eb`

This inspection reads the raw data image independently of the guest cache and Ring-3 file route.

## Runtime persistence — boot 2

The same persistent data carrier was booted again.

Boot 2 returned:

- `JM_BLOCKFS_MOUNT_EXISTING`
- `JM_BLOCKFS_OPEN_T1`
- `JM_BLOCKFS_READ_T1`
- `JM_BLOCKFS_V2_USER_B_VERIFIED_T1`
- `JM_BLOCKFS_V2_USER_C_VERIFIED_T1`
- `JM_BLOCKFS_V2_EXISTING_PERSISTENCE_VERIFIED_T1`
- normal process exit/reclaim and survivor return.

The verifier explicitly rejected fresh-lifecycle mutation markers on boot 2. In particular, boot 2 contained no:

- format marker;
- directory-create marker;
- A/B/C create marker;
- A unlink marker;
- reuse marker;
- BlockFS write marker.

Runtime verifier:

- required markers: **16 / 16 present**
- ordered route: **13 / 13**
- mutation markers: **absent**
- result: **PASS**

Boot 2 serial SHA-256:

`d4cf324b20bec3ac7ddafa55906225a3d5288147d43d261646a30897fc2ed311`

## Read-only reboot proof

The raw carrier after boot 1:

`44f2bea74e23fa1d6c9b3daa1a5f9f9390a64c3e98936e5c570728e08bd302eb`

The raw carrier after boot 2:

`44f2bea74e23fa1d6c9b3daa1a5f9f9390a64c3e98936e5c570728e08bd302eb`

**Byte-identical.**

Therefore the second boot did not merely remount successfully; its existing-files verification route left the persistent BlockFS carrier unchanged at raw-byte level.

## Actions custody

Successful artifact:

- name: `jm-routecore-blockfs-v0-16-contact`
- artifact ID: `10999922575`
- artifact size: `503631` bytes
- artifact ZIP digest: `sha256:f96224aaba87c1ab86899ea86ed19b230e849467a58762cd6176061336c9cc76`
- run: `36487024008`
- job: `109146282026`

The artifact contains the recovery lineage, v0.16 patch, transformed source body, construction proof, deterministic package, boot/data images, both serial logs, raw-carrier hashes, and final persistent carrier.

## Earned conclusion

**PASS:** at the stated QEMU legacy/transitional virtio-blk scope, RouteCore now has a persistent BlockFS v2 body that can traverse a directory path, allocate multiple persistent file objects, delete one, free its resources, reuse the exact freed node and data block for a later file, synchronize through the generic storage route, survive cache invalidation, return exact surviving contents to Ring-3, reboot, mount the existing filesystem, and return the same surviving files again without rewriting the filesystem on boot 2.

This is a filesystem-body advance, not another carrier demo.

**DING EARNED at the stated scope.**

## Explicitly not claimed

This receipt does **not** claim:

- multi-block files;
- arbitrary-depth directory trees;
- journaling or transactional metadata;
- crash/power-loss recovery;
- concurrent filesystem mutation;
- permissions beyond the bounded existing owner/path semantics;
- production-grade filesystem completeness;
- physical-owner-device storage contact;
- NVMe contact;
- modern virtio PCI capability transport;
- hardware power-loss durability.

## Forward frontier

The strongest next filesystem pressure is:

`one-block objects → multi-block file allocation → deeper nested paths → delete/reuse across extents → reboot persistence → bounded crash/recovery semantics`

NVMe and physical-device contact remain separate carrier gates and are not required to reopen this filesystem result.

## Keeper

> THE CARRIER IS CLOSED ENOUGH TO ADVANCE THE BODY ABOVE IT.  
> ALLOCATION RETURNED THROUGH PERSISTENT METADATA.  
> DELETE FREED. REUSE RETURNED.  
> REBOOT READ WHAT THE FIRST BOOT LEFT.  
> NO DING WITHOUT THE RETURN; THE RETURN IS PRESENT.

**DING EARNED · v0.16 CONTACT CLOSED AT DECLARED RUNTIME SCOPE.**
