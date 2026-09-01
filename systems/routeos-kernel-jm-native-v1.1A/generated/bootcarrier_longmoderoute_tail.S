/* GENERATED BOOT ROUTE STORAGE v1.1A SOURCE b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638. */
.section .rodata
.align 8
boot_gdt:
  .quad 0x0000000000000000
  .quad 0x00AF9A000000FFFF
  .quad 0x00AF92000000FFFF
boot_gdt_end:
boot_gdt_ptr:
  .word boot_gdt_end - boot_gdt - 1
  .quad boot_gdt

.section .bss
.align 16
boot_magic: .skip 4
boot_info:  .skip 4
.align 4096
.global boot_pml4
boot_pml4: .skip 4096
.global boot_pdpt
boot_pdpt: .skip 4096
.global boot_pd
boot_pd: .skip 4096
.global boot_pts
boot_pts: .skip (4096 * 32)
.align 16
boot_stack: .skip 32768
boot_stack_top:
/* END GENERATED BOOT ROUTE STORAGE. */
