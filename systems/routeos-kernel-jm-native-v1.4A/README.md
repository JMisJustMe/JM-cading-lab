# RouteOS Kernel JM-Native v1.4A — ProtectionRoute

Status: **CONSTRUCTION**

Frozen parent: `e6f037ac3f3d42c4b56218307b5f738f0c6a4b70`

This version targets the largest coherent remaining privileged C boundary after SerialRoute: descriptor installation, vector-table installation, interrupt-controller/timer programming, user-page permission mutation and initial user-body frame construction.

## Candidate generated offices

- **DescriptorInstall** — GDT entries, TSS descriptor, ring-0 interrupt stack and GDTR/TR activation.
- **VectorRoute** — IDT entry encoding and installation for invalid opcode, PIT timer and controlled `int 0x80`.
- **InterruptController** — PIC remap/mask preservation and PIT channel-0 programming.
- **UserMapRoute** — user permission propagation across the frozen page-table hierarchy and CR3 reload.
- **BodyFrameInstall** — user image copy, stack clearing and initial CPU-frame construction for both bodies.

## Construction boundary

The body must preserve every frozen v1.3A office and the complete operational route. No DING is valid without a linked ELF, bootable image, QEMU proof, artifact checksum audit, permanent anchor and frozen-head revalidation.
