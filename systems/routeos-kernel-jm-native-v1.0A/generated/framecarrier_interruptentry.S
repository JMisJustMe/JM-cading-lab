/* GENERATED FRAMECARRIER + INTERRUPTENTRY v1.0A SOURCE 50d810e82c54655df58936e17c4d0f67eee026d10de6c6a82db422fef40f1914. */
/* Proof parent: a05b26b3901460cfa5623cbb3063d961a9952214; machine parent: dfa52b8e42f2511eeb3082f14fc2eb0584843e27. */

.macro JM_PUSH_FRAME_REGS
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

.macro JM_POP_FRAME_REGS
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

/* Ring-0 serial receipt helper. All caller registers are either already saved
 * by the ISR carrier or replaced from the target frame before CPL3 entry. */
.type jm_generated_frame_serial_emit,@function
jm_generated_frame_serial_emit:
  cld
.Ljm_frame_serial_next:
  movb (%rsi), %r8b
  testb %r8b, %r8b
  jz .Ljm_frame_serial_done
.Ljm_frame_serial_wait:
  movw $0x3fd, %dx
  inb %dx, %al
  testb $0x20, %al
  jz .Ljm_frame_serial_wait
  movw $0x3f8, %dx
  movb %r8b, %al
  outb %al, %dx
  incq %rsi
  jmp .Ljm_frame_serial_next
.Ljm_frame_serial_done:
  ret

.macro JM_INTERRUPT_ENTRY name, vector
.global \name
\name:
  pushq $0
  pushq $\vector
  JM_PUSH_FRAME_REGS
  cmpb $0, jm_generated_interruptentry_seen(%rip)
  jne 1f
  movb $1, jm_generated_interruptentry_seen(%rip)
  leaq jm_generated_interruptentry_marker(%rip), %rsi
  call jm_generated_frame_serial_emit
1:
  movq %rsp, %rdi
  call routeos_interrupt_dispatch
  movq %rax, %rsp
  JM_POP_FRAME_REGS
  addq $16, %rsp
  iretq
.endm

JM_INTERRUPT_ENTRY routeos_isr_ud, 6
JM_INTERRUPT_ENTRY routeos_isr_timer, 32
JM_INTERRUPT_ENTRY routeos_isr_syscall, 128

.global routeos_enter_frame
.type routeos_enter_frame,@function
routeos_enter_frame:
  movq %rdi, %r13
  leaq jm_generated_framecarrier_marker(%rip), %rsi
  call jm_generated_frame_serial_emit
  movq %r13, %rsp
  JM_POP_FRAME_REGS
  addq $16, %rsp
  iretq

.section .rodata
.align 8
jm_generated_framecarrier_marker:
  .asciz "[JM] FRAMECARRIER GENERATED v1.0A SOURCE 50d810e82c54655df58936e17c4d0f67eee026d10de6c6a82db422fef40f1914 ACTIVE\n"
jm_generated_interruptentry_marker:
  .asciz "[JM] INTERRUPTENTRY GENERATED v1.0A SOURCE 50d810e82c54655df58936e17c4d0f67eee026d10de6c6a82db422fef40f1914 ACTIVE\n"

.section .bss
.align 1
jm_generated_interruptentry_seen:
  .skip 1

.section .text
/* END GENERATED FRAMECARRIER + INTERRUPTENTRY. */
