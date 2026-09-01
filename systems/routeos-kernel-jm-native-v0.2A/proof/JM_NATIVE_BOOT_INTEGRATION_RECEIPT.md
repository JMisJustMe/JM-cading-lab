# RouteOS Kernel JM-Native v0.2A — Boot Integration Receipt

## Final result

**JM_NATIVE_BOOT_INTEGRATION DING: PASS**

The generated JM authority was compiled into the real RouteOS v0.1A kernel carrier, booted through GRUB Multiboot2 under QEMU x86-64 TCG, emitted its exact source identity from kernel space, and preserved the inherited hard-body proof chain.

## Proven lineage

- Frozen machine-proof parent: `54f67566036316b25515fb53fa98f06769d3850d`
- Integration commit tested: `0fcb74bf1a959f3020b80511dde01cd67523fc6e`
- Workflow run: `30571433047`
- Workflow job: `90968874007`
- Authority version: `v0.2A`
- Authority source SHA-256: `0f8d44080dc6adfa855996b76efe7f538284643ead8170599809d1e0dbc10371`

## Machine-emitted identity

```text
[JM] JM_NATIVE AUTHORITY v0.2A SOURCE 0f8d44080dc6adfa855996b76efe7f538284643ead8170599809d1e0dbc10371 PARENT 54f67566036316b25515fb53fa98f06769d3850d
```

The identity appeared once, at kernel ignition, before the existing `JM BOOT IMAGE LOADED` receipt.

## Authority-governed machine values

The generated header governed:

- COM1 / SerialRoute port;
- PermissionGate vector;
- FaultHold vector;
- RouteScheduler trace cadence;
- RouteScheduler execution-body count.

Compile-time assertions held the generated values to the proven v0.1A compatibility boundary.

## Inherited chain preserved

The integrated machine run retained:

`GRUB Multiboot2 ISO → x86-64 kernel entry → kernel memory → GDT/TSS/IDT → PIT timer → RouteScheduler → two CPL3 user bodies → int 0x80 PermissionGate → serial route → deliberate invalid opcode → FaultHold → RecoveryBody → safe User Body 1 continuation`

The permanent verifier required the inherited PermissionGate, timer, FaultHold and RecoveryBody markers in the same QEMU trace.

## Frozen receipt hashes

- Integrated kernel source before patch: `1b4c4fa217112d549e31b248060c9d62d06c4fdc7b209b6e0f67d4d6477f875f`
- Integrated kernel source after patch: `3beed2e0545d40a3fb5c13bd9c8907f261ab4457edf018a94e9d2bbcb6282cb6`
- Generated authority header: `ef4b1ab8cf06bd42e9e0c7bdd000c098a66f896359a0c1c33401d3a81ff368bd`
- Integrated ELF: `490e62e90a053f3c632fbb661347e638a22f39533caa5a5227ea1b3c53815a68`
- Integrated ISO: `cb9a3ec09dad8f1cec65d14cffd5922846affb2f8896ad9a115faca0024241ab`
- Full QEMU trace: `f12d1d19e5c5af39fdfae6cbce782a7c5a1fd0edbeb6c7ab5381d49af410b322`
- Full workflow artifact digest: `6f8203e12e3973f93cd155650e2b7450ff96c29a5f592ed70aa1649a7c94ca89`

## Claim boundary

This establishes a **boot-integrated JM-native authority**: JM source is deterministically lowered, compiled into the running kernel, governs selected machine values and identifies itself in the machine trace.

It does **not** yet establish a wholly JM-generated kernel. The main operational C and assembly implementations remain inherited from the frozen v0.1A carrier. The next honest construction gate is to generate and replace one complete operational kernel office from JM source, then rerun the same machine proof.
