/* GENERATED BOOTCARRIER + PAGEROUTE + LONGMODEROUTE + PRIVILEGELOADER v1.1A SOURCE b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638. */
/* Proof parent: 276e9ebaa030ca3fe9eec5365d4190cd4a6a2a96; machine parent: 276e9ebaa030ca3fe9eec5365d4190cd4a6a2a96. */
.set MB2_MAGIC, 0xe85250d6
.set MB2_ARCH, 0
.set MB2_HEADER_LEN, mb2_header_end - mb2_header
.set MB2_CHECKSUM, -(MB2_MAGIC + MB2_ARCH + MB2_HEADER_LEN)
.set JM_BOOT_PAGE_SIZE, 4096
.set JM_BOOT_PT_COUNT, 32
.set JM_BOOT_LEAF_COUNT, 16384
.set JM_BOOT_MAPPED_BYTES, 67108864

.section .multiboot,"a"
.align 8
mb2_header:
  .long MB2_MAGIC
  .long MB2_ARCH
  .long MB2_HEADER_LEN
  .long MB2_CHECKSUM
  .short 0
  .short 0
  .long 8
mb2_header_end:

.section .text
.code32
.global _start
.type _start,@function
_start:
  cli
  movl %eax, boot_magic
  movl %ebx, boot_info
  movl $boot_stack_top, %esp

  /* PageRoute: clear exactly 35 page-table pages. */
  movl $boot_pml4, %edi
  xorl %eax, %eax
  movl $35840, %ecx
  rep stosl

  /* PageRoute: PML4[0] -> PDPT, PDPT[0] -> PD. */
  movl $(boot_pdpt + 0x3), boot_pml4
  movl $(boot_pd + 0x3), boot_pdpt

  /* PageRoute: 32 PT pages identity-map 64 MiB. */
  xorl %ecx, %ecx
1:
  movl %ecx, %eax
  shll $12, %eax
  addl $boot_pts, %eax
  orl $0x3, %eax
  movl %eax, boot_pd(,%ecx,8)
  incl %ecx
  cmpl $32, %ecx
  jne 1b

  xorl %ecx, %ecx
2:
  movl %ecx, %eax
  shll $12, %eax
  orl $0x3, %eax
  movl %eax, boot_pts(,%ecx,8)
  incl %ecx
  cmpl $16384, %ecx
  jne 2b

  /* LongModeRoute: PAE -> EFER.LME -> CR3 -> CR0.PG. */
  movl %cr4, %eax
  orl $(1 << 5), %eax
  movl %eax, %cr4

  movl $0xc0000080, %ecx
  rdmsr
  orl $(1 << 8), %eax
  wrmsr

  movl $boot_pml4, %eax
  movl %eax, %cr3

  movl %cr0, %eax
  orl $(1 << 31), %eax
  movl %eax, %cr0

  lgdt boot_gdt_ptr
  ljmp $0x8, $long_mode_entry

.code64
.type long_mode_entry,@function
long_mode_entry:
  movw $0x10, %ax
  movw %ax, %ds
  movw %ax, %es
  movw %ax, %ss
  xorw %ax, %ax
  movw %ax, %fs
  movw %ax, %gs
  movq $boot_stack_top, %rsp
  xorq %rbp, %rbp
  movl boot_magic(%rip), %edi
  movl boot_info(%rip), %esi
  call routeos_kernel_entry
3:
  cli
  hlt
  jmp 3b

/* PrivilegeLoader: live descriptor/task/page-root helper carriers. */
.global routeos_load_gdt
.type routeos_load_gdt,@function
routeos_load_gdt:
  lgdt (%rdi)
  movw $0x10, %ax
  movw %ax, %ds
  movw %ax, %es
  movw %ax, %ss
  pushq $0x8
  leaq 4f(%rip), %rax
  pushq %rax
  lretq
4:
  ret

.global routeos_load_tr
.type routeos_load_tr,@function
routeos_load_tr:
  movw %di, %ax
  ltr %ax
  ret

.global routeos_reload_cr3
.type routeos_reload_cr3,@function
routeos_reload_cr3:
  movq %cr3, %rax
  movq %rax, %cr3
  ret

.section .rodata
.align 8
.global jm_generated_bootroute_source
jm_generated_bootroute_source:
  .asciz "[JM] BOOTROUTE GENERATED v1.1A SOURCE b02be640fe482dc36633084e0e4601533ea3ed3b38892d723ab37f2bfc98a638 ACTIVE"

.section .text
/* END GENERATED BOOT ROUTE HEAD. */
