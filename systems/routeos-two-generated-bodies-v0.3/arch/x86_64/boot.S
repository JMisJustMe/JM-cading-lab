/* RouteOS x86-64 Multiboot2 entry and controlled-entry stubs. */
.set MB2_MAGIC, 0xE85250D6
.set MB2_ARCH, 0
.set MB2_HEADER_LEN, mb2_header_end - mb2_header
.set MB2_CHECKSUM, -(MB2_MAGIC + MB2_ARCH + MB2_HEADER_LEN)

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
  movl $boot_pml4, %edi
  xorl %eax, %eax
  movl $((4096 * 35) / 4), %ecx
  rep stosl
  movl $(boot_pdpt + 0x3), boot_pml4
  movl $(boot_pd + 0x3), boot_pdpt
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
  movl %cr4, %eax
  orl $(1 << 5), %eax
  movl %eax, %cr4
  movl $0xC0000080, %ecx
  rdmsr
  orl $(1 << 8), %eax
  wrmsr
  movl $boot_pml4, %eax
  movl %eax, %cr3
  movl %cr0, %eax
  orl $(1 << 31), %eax
  movl %eax, %cr0
  lgdt boot_gdt_ptr
  ljmp $0x08, $long_mode_entry

.code64
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

.global routeos_load_gdt
routeos_load_gdt:
  lgdt (%rdi)
  movw $0x10, %ax
  movw %ax, %ds
  movw %ax, %es
  movw %ax, %ss
  pushq $0x08
  leaq 4f(%rip), %rax
  pushq %rax
  lretq
4:
  ret

.global routeos_load_tr
routeos_load_tr:
  movw %di, %ax
  ltr %ax
  ret

.global routeos_reload_cr3
routeos_reload_cr3:
  movq %cr3, %rax
  movq %rax, %cr3
  ret

.macro PUSH_REGS
  pushq %rax
  pushq %rbx
  pushq %rcx
  pushq %rdx
  pushq %rbp
  pushq %rdi
  pushq %rsi
  pushq %r8
  pushq %r9
  pushq %r10
  pushq %r11
  pushq %r12
  pushq %r13
  pushq %r14
  pushq %r15
.endm

.macro POP_REGS
  popq %r15
  popq %r14
  popq %r13
  popq %r12
  popq %r11
  popq %r10
  popq %r9
  popq %r8
  popq %rsi
  popq %rdi
  popq %rbp
  popq %rdx
  popq %rcx
  popq %rbx
  popq %rax
.endm

.macro ROUTEOS_ISR name, vector
.global \name
\name:
  pushq $0
  pushq $\vector
  PUSH_REGS
  movq %rsp, %rdi
  call routeos_interrupt_dispatch
  movq %rax, %rsp
  POP_REGS
  addq $16, %rsp
  iretq
.endm

ROUTEOS_ISR routeos_isr_ud, 6
ROUTEOS_ISR routeos_isr_timer, 32
ROUTEOS_ISR routeos_isr_syscall, 128

.global routeos_enter_frame
routeos_enter_frame:
  movq %rdi, %rsp
  POP_REGS
  addq $16, %rsp
  iretq

/* Both CPL3 bodies are generated from distinct .jm.cading sources. */

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
