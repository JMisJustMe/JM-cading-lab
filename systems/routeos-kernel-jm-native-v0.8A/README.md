# RouteOS Kernel JM-Native v0.8A — DescriptorBody + InterruptRoute

This version begins from the frozen v0.7A IgnitionBody anchor:

`313a66c461a55c7aebe24807254d8ef263101661`

It generates two coupled C-level kernel offices from JM source:

- **DescriptorBody** — GDT entries, TSS storage and descriptor, ring-0 interrupt stack, IDT layout and three live gates.
- **InterruptRoute** — PIC remap/unmask sequence and PIT channel-0 timing route.

The assembly carriers remain explicit and outside this claim:

- `routeos_load_gdt`;
- `routeos_load_tr`;
- `routeos_isr_ud`;
- `routeos_isr_timer`;
- `routeos_isr_syscall`.

## Source authority

`source/descriptor_interrupt.jmroute`

Source SHA-256:

`680ba2c31be8dfa7b8ebde7ea518ca385c7faa3906f5ac8af8ecb7c52c4165ea`

Generated office SHA-256:

`c16d6247cb881128094a78e64b280a2424b5960790ca2a564e73e864f0564545`

Integrated source preview SHA-256:

`0db926e655f50c851ded998006916b2ccbc483114625d647631c1cc7e9f6d409`

## Required machine proof

The QEMU gate must prove the order:

`IgnitionBody → authority → MemoryBody → DescriptorBody → InterruptRoute → user execution → scheduler/permission → fault/recovery`.

The inherited complete route must remain green. No claim is made yet for assembly ISR stubs, page-table construction or user-body construction.
