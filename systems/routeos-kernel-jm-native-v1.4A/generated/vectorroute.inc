/* GENERATED VECTORROUTE v1.4A SOURCE 50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14. */
#define JM_PROTECTIONROUTE_KERNEL_CODE_SELECTOR 0x08U
#define JM_PROTECTIONROUTE_IDT_SIZE 256U
#define JM_PROTECTIONROUTE_FAULT_VECTOR 6U
#define JM_PROTECTIONROUTE_TIMER_VECTOR 32U
#define JM_PROTECTIONROUTE_SYSCALL_VECTOR 0x80U
#define JM_PROTECTIONROUTE_KERNEL_GATE_ATTR 0x8EU
#define JM_PROTECTIONROUTE_USER_GATE_ATTR 0xEEU

_Static_assert(IDT_SIZE == JM_PROTECTIONROUTE_IDT_SIZE, "ProtectionRoute IDT size drift");
_Static_assert(JM_FAULT_FAULTHOLD_VECTOR == JM_PROTECTIONROUTE_FAULT_VECTOR, "ProtectionRoute fault vector drift");
_Static_assert(JM_GATE_PERMISSIONGATE_VECTOR == JM_PROTECTIONROUTE_SYSCALL_VECTOR, "ProtectionRoute syscall vector drift");

const char jm_generated_vectorroute_source[] =
  "[JM] VECTORROUTE GENERATED v1.4A SOURCE 50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14 ACTIVE";

static void jm_generated_vectorroute_set(uint8_t vector, void (*handler)(void), uint8_t attr) {
  uint64_t p = (uint64_t)handler;
  idt[vector].offset_low = (uint16_t)p;
  idt[vector].selector = JM_PROTECTIONROUTE_KERNEL_CODE_SELECTOR;
  idt[vector].ist = 0;
  idt[vector].type_attr = attr;
  idt[vector].offset_mid = (uint16_t)(p >> 16);
  idt[vector].offset_high = (uint32_t)(p >> 32);
  idt[vector].zero = 0;
}

static void jm_generated_vectorroute_install(void) {
  static bool announced;
  jm_descriptorbody_announce();
  if (!announced) {
    serial_write(jm_generated_vectorroute_source);
    serial_write("\n");
    announced = true;
  }
  jm_memset(idt, 0, sizeof(idt));
  jm_generated_vectorroute_set(JM_PROTECTIONROUTE_FAULT_VECTOR, routeos_isr_ud, JM_PROTECTIONROUTE_KERNEL_GATE_ATTR);
  jm_generated_vectorroute_set(JM_PROTECTIONROUTE_TIMER_VECTOR, routeos_isr_timer, JM_PROTECTIONROUTE_KERNEL_GATE_ATTR);
  jm_generated_vectorroute_set(JM_PROTECTIONROUTE_SYSCALL_VECTOR, routeos_isr_syscall, JM_PROTECTIONROUTE_USER_GATE_ATTR);
  struct idtr ptr = { .limit = sizeof(idt) - 1U, .base = (uint64_t)idt };
  __asm__ volatile("lidt %0" : : "m"(ptr));
}

#define idt_install jm_generated_vectorroute_install
/* END GENERATED VECTORROUTE. */
