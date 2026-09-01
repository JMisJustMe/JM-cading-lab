# RouteOS Kernel JM-Native v1.3A — SerialRoute

Status: **FROZEN — DING pending frozen-head revalidation**

Frozen parent: `5ccde5f1c8f1692cbffcc87595fecddf7b25b349`

Machine-tested construction head: `10ee0efd49370901056a5aaa92bb38d2dc487bbe`

This version moves the bounded COM1 serial lifecycle from the remaining handwritten kernel C seam into deterministic JM-generated C while preserving the complete frozen v1.2A body.

## Generated office

- **SerialRoute** — polling UART setup, transmit-ready waiting, CRLF normalization, unsigned decimal formatting, receipt framing and a live generated source-identity emission.

## Construction machine result

- Complete workflow lineage: **14/14 PASS**
- GitHub Actions run: `30676813931`
- Decisive job: `91305701078`
- Artifact ID: `8810763647`
- Machine exit: `0`
- Artifact checksum ledger: **23/23 PASS**
- Safe Body 1 continuations after recovery: `116,479`

## Frozen hashes

- JM source: `7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190`
- generated SerialRoute office: `7c0a1b5ef42702a035832e9e375444206bb559d031c4810f316b54d9883aff14`
- generated record: `f54dd057ee56c88603083617f8b76b09065d5671412912740def643a096eda06`
- integrated kernel C: `cbf672e44025a04ef77732d90fc075020cd591c98568386c80838b55ccf8e103`
- linked ELF: `a184c20bec51734238f1172d0ec8627a2ffcfbed228cc624076e944328593b4e`
- bootable ISO: `e102ca5f664630ec7a5be1838853289bf40a5564634cf0258516942dc5bce437`
- QEMU trace: `751fbe86b1a4bf5dbaa023659dcd66ad6b2bd0f1aa4afdc0c8e3d8c2ebf8d3cb`
- construction artifact digest: `sha256:7d77fb52ed274bfd7586a811da1d804aaeb21742cc5558086c6c376a29c05192`

## Operational route

`ImageCarrier → BootCarrier → PageRoute → LongModeRoute → PrivilegeLoader → IgnitionBody → MemoryBody → DescriptorBody → BodyRegistry → UserBoundary → InterruptRoute → RouteScheduler → FrameCarrier → InterruptEntry → UserProgram Body 1 / Body 2 → PermissionGate → SerialRoute → FaultHold → RecoveryBody → safe Body 1 continuation`

## Explicitly outside this crown

- general device-driver generation;
- arbitrary UART hardware support;
- interrupt-driven or buffered serial I/O;
- concurrency-safe logging;
- filesystems, storage or networking;
- every CPU exception family;
- removal of every handwritten carrier;
- a general-purpose or wholly JM-generated operating system.

## Provenance rule

The failed OneBody and chunk-carrier attempts are retained as readable provenance but are not executable authority. The successful v1.3A route uses ordinary checked-in source, compiler, generated output, integration and enforcement files.

The final DING requires this freeze head to pass all fourteen workflows again and the permanent anchor to point to that exact commit. PR `#69` remains draft and unmerged.