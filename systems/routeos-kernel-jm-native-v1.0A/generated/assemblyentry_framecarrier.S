/* GENERATED ASSEMBLYENTRY + FRAMECARRIER. EDIT source/assemblyentry_framecarrier.jmroute, NOT THIS FILE. */
.section .text
.code64
.extern routeos_interrupt_dispatch

.macro JM_FRAME_SAVE
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

.macro JM_FRAME_RESTORE
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
  addq $16, %rsp
  iretq
.endm

.globl routeos_isr_ud
.type routeos_isr_ud, @function
routeos_isr_ud:
  pushq $0
  pushq $6
  JM_FRAME_SAVE
  movq %rsp, %rdi
  call routeos_interrupt_dispatch
  movq %rax, %rsp
  JM_FRAME_RESTORE
.size routeos_isr_ud, .-routeos_isr_ud
.globl routeos_isr_timer
.type routeos_isr_timer, @function
routeos_isr_timer:
  pushq $0
  pushq $32
  JM_FRAME_SAVE
  movq %rsp, %rdi
  call routeos_interrupt_dispatch
  movq %rax, %rsp
  JM_FRAME_RESTORE
.size routeos_isr_timer, .-routeos_isr_timer
.globl routeos_isr_syscall
.type routeos_isr_syscall, @function
routeos_isr_syscall:
  pushq $0
  pushq $128
  JM_FRAME_SAVE
  movq %rsp, %rdi
  call routeos_interrupt_dispatch
  movq %rax, %rsp
  JM_FRAME_RESTORE
.size routeos_isr_syscall, .-routeos_isr_syscall
.globl routeos_enter_frame
.type routeos_enter_frame, @function
routeos_enter_frame:
  movq %rdi, %rsp
  JM_FRAME_RESTORE
.size routeos_enter_frame, .-routeos_enter_frame

.p2align 3
.globl jm_assemblyentry_framecarrier_identity
.type jm_assemblyentry_framecarrier_identity, @object
jm_assemblyentry_framecarrier_identity:
  .asciz "[JM] ASSEMBLYENTRY FRAMECARRIER GENERATED v1.0A SOURCE 7a2dd8c8c6a4f49cbce92fa72e7f0790c0eb187460442cdedd302f72653134a4 ACTIVE"
.size jm_assemblyentry_framecarrier_identity, .-jm_assemblyentry_framecarrier_identity
