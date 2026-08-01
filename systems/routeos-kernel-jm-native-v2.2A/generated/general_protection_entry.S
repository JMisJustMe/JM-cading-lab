/* GENERATED GENERALPROTECTIONENTRY v2.2A SOURCE 5e1b9bc86f68a2a36ffd1f07668f6aa2e288ffbaa9c0867051b4b00a619e3d46. */
.section .text
.global routeos_isr_gp
.type routeos_isr_gp,@function
routeos_isr_gp:
  /* #GP has already pushed its hardware error code. Add only the vector. */
  pushq $13
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
  movq %rsp, %rdi
  call routeos_interrupt_dispatch
  movq %rax, %rsp
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
.size routeos_isr_gp, .-routeos_isr_gp
/* END GENERATED GENERALPROTECTIONENTRY. */
