/* GENERATED OPERATIONAL OFFICES. EDIT source/descriptor_interrupt.jmroute, NOT THIS FILE. */
#define JM_DESCRIPTORINTERRUPT_VERSION "v0.8A"
#define JM_DESCRIPTORINTERRUPT_SOURCE_SHA256 "680ba2c31be8dfa7b8ebde7ea518ca385c7faa3906f5ac8af8ecb7c52c4165ea"
#define JM_DESCRIPTORINTERRUPT_PROOF_PARENT "313a66c461a55c7aebe24807254d8ef263101661"
#define JM_DESCRIPTORINTERRUPT_MACHINE_PARENT "8d9749a32171542f849976f8ec6bac50f11daf15"
#define JM_DESCRIPTORBODY_GDT_ENTRIES 7
#define JM_DESCRIPTORBODY_INTERRUPT_STACK_BYTES 32768
#define JM_DESCRIPTORBODY_IDT_SIZE 256
#define JM_DESCRIPTORBODY_TSS_SELECTOR 0x28
#define JM_DESCRIPTORBODY_TSS_ACCESS 0x89
#define JM_INTERRUPTROUTE_PIT_DIVISOR 11931

_Static_assert(JM_DESCRIPTORBODY_IDT_SIZE == IDT_SIZE, "generated IDT size mismatch");
_Static_assert(JM_DESCRIPTORBODY_TSS_SELECTOR == TSS_SELECTOR, "generated TSS selector mismatch");

struct __attribute__((packed)) gdtr { uint16_t limit; uint64_t base; };
struct __attribute__((packed)) tss64 {
  uint32_t reserved0; uint64_t rsp0, rsp1, rsp2; uint64_t reserved1;
  uint64_t ist1, ist2, ist3, ist4, ist5, ist6, ist7; uint64_t reserved2;
  uint16_t reserved3; uint16_t iomap_base;
};
static uint64_t gdt[JM_DESCRIPTORBODY_GDT_ENTRIES] __attribute__((aligned(16)));
static struct tss64 tss;
static uint8_t interrupt_stack[JM_DESCRIPTORBODY_INTERRUPT_STACK_BYTES] __attribute__((aligned(16)));

struct __attribute__((packed)) idt_entry {
  uint16_t offset_low; uint16_t selector; uint8_t ist; uint8_t type_attr;
  uint16_t offset_mid; uint32_t offset_high; uint32_t zero;
};
struct __attribute__((packed)) idtr { uint16_t limit; uint64_t base; };
static struct idt_entry idt[JM_DESCRIPTORBODY_IDT_SIZE] __attribute__((aligned(16)));

static void jm_descriptorbody_announce(void) {
  static bool announced;
  if (!announced) {
    serial_write("[JM] DESCRIPTORBODY GENERATED "); serial_write(JM_DESCRIPTORINTERRUPT_VERSION);
    serial_write(" SOURCE "); serial_write(JM_DESCRIPTORINTERRUPT_SOURCE_SHA256); serial_write(" ACTIVE\n");
    announced = true;
  }
}

static void gdt_install(void) {
  jm_descriptorbody_announce();
  jm_memset(gdt, 0, sizeof(gdt));
  gdt[1] = 0x00AF9A000000FFFFULL;
  gdt[2] = 0x00AF92000000FFFFULL;
  gdt[3] = 0x00AFF2000000FFFFULL;
  gdt[4] = 0x00AFFA000000FFFFULL;
  jm_memset(&tss, 0, sizeof(tss));
  tss.rsp0 = (uint64_t)(interrupt_stack + sizeof(interrupt_stack));
  tss.iomap_base = sizeof(tss);
  uint64_t base = (uint64_t)&tss; uint64_t limit = sizeof(tss) - 1; uint64_t low = 0;
  low |= (limit & 0xFFFFULL); low |= (base & 0xFFFFFFULL) << 16;
  low |= ((uint64_t)JM_DESCRIPTORBODY_TSS_ACCESS) << 40;
  low |= ((limit >> 16) & 0xFULL) << 48; low |= ((base >> 24) & 0xFFULL) << 56;
  gdt[5] = low; gdt[6] = base >> 32;
  struct gdtr ptr = { .limit = sizeof(gdt) - 1, .base = (uint64_t)gdt };
  routeos_load_gdt(&ptr); routeos_load_tr(JM_DESCRIPTORBODY_TSS_SELECTOR);
}

static void idt_set(uint8_t vector, void (*handler)(void), uint8_t attr) {
  uint64_t p = (uint64_t)handler;
  idt[vector].offset_low = (uint16_t)p; idt[vector].selector = 0x08; idt[vector].ist = 0;
  idt[vector].type_attr = attr; idt[vector].offset_mid = (uint16_t)(p >> 16);
  idt[vector].offset_high = (uint32_t)(p >> 32); idt[vector].zero = 0;
}
static void idt_install(void) {
  jm_descriptorbody_announce(); jm_memset(idt, 0, sizeof(idt));
  idt_set(JM_FAULT_FAULTHOLD_VECTOR, routeos_isr_ud, 0x8E);
  idt_set(32, routeos_isr_timer, 0x8E);
  idt_set(JM_GATE_PERMISSIONGATE_VECTOR, routeos_isr_syscall, 0xEE);
  struct idtr ptr = { .limit = sizeof(idt) - 1, .base = (uint64_t)idt };
  __asm__ volatile("lidt %0" : : "m"(ptr));
}

static void jm_interruptroute_announce(void) {
  static bool announced;
  if (!announced) {
    serial_write("[JM] INTERRUPTROUTE GENERATED "); serial_write(JM_DESCRIPTORINTERRUPT_VERSION);
    serial_write(" SOURCE "); serial_write(JM_DESCRIPTORINTERRUPT_SOURCE_SHA256); serial_write(" ACTIVE\n");
    announced = true;
  }
}
static void pic_pit_install(void) {
  jm_interruptroute_announce();
  uint8_t a1 = inb(0x21), a2 = inb(0xA1);
  outb(0x20, 0x11); io_wait(); outb(0xA0, 0x11); io_wait();
  outb(0x21, 0x20); io_wait(); outb(0xA1, 0x28); io_wait();
  outb(0x21, 0x04); io_wait(); outb(0xA1, 0x02); io_wait();
  outb(0x21, 0x01); io_wait(); outb(0xA1, 0x01); io_wait();
  outb(0x21, (uint8_t)(a1 & ~1U)); outb(0xA1, a2);
  outb(0x43, 0x36);
  outb(0x40, JM_INTERRUPTROUTE_PIT_DIVISOR & 0xFF);
  outb(0x40, JM_INTERRUPTROUTE_PIT_DIVISOR >> 8);
}
