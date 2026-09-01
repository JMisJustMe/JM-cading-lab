/* GENERATED DESCRIPTORINSTALL v1.4A SOURCE 50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14. */
#define JM_PROTECTIONROUTE_VERSION "v1.4A"
#define JM_PROTECTIONROUTE_SOURCE_SHA256 "50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14"
#define JM_PROTECTIONROUTE_GDT_ENTRIES 7U
#define JM_PROTECTIONROUTE_INTERRUPT_STACK_BYTES 32768U
#define JM_PROTECTIONROUTE_TSS_SELECTOR 0x28U
#define JM_PROTECTIONROUTE_TSS_ACCESS 0x89U

_Static_assert(JM_DESCRIPTORBODY_GDT_ENTRIES == JM_PROTECTIONROUTE_GDT_ENTRIES, "ProtectionRoute GDT entry drift");
_Static_assert(JM_DESCRIPTORBODY_INTERRUPT_STACK_BYTES == JM_PROTECTIONROUTE_INTERRUPT_STACK_BYTES, "ProtectionRoute interrupt stack drift");
_Static_assert(JM_DESCRIPTORBODY_TSS_SELECTOR == JM_PROTECTIONROUTE_TSS_SELECTOR, "ProtectionRoute TSS selector drift");
_Static_assert(JM_DESCRIPTORBODY_TSS_ACCESS == JM_PROTECTIONROUTE_TSS_ACCESS, "ProtectionRoute TSS access drift");

const char jm_generated_descriptorinstall_source[] =
  "[JM] DESCRIPTORINSTALL GENERATED v1.4A SOURCE 50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14 ACTIVE";

static void jm_generated_descriptorinstall(void) {
  static bool announced;
  jm_descriptorbody_announce();
  if (!announced) {
    serial_write(jm_generated_descriptorinstall_source);
    serial_write("\n");
    announced = true;
  }
  jm_memset(gdt, 0, sizeof(gdt));
  gdt[1] = 0x00AF9A000000FFFFULL;
  gdt[2] = 0x00AF92000000FFFFULL;
  gdt[3] = 0x00AFF2000000FFFFULL;
  gdt[4] = 0x00AFFA000000FFFFULL;
  jm_memset(&tss, 0, sizeof(tss));
  tss.rsp0 = (uint64_t)(interrupt_stack + sizeof(interrupt_stack));
  tss.iomap_base = sizeof(tss);
  uint64_t base = (uint64_t)&tss;
  uint64_t limit = sizeof(tss) - 1U;
  uint64_t low = 0;
  low |= limit & 0xFFFFULL;
  low |= (base & 0xFFFFFFULL) << 16;
  low |= ((uint64_t)JM_PROTECTIONROUTE_TSS_ACCESS) << 40;
  low |= ((limit >> 16) & 0xFULL) << 48;
  low |= ((base >> 24) & 0xFFULL) << 56;
  gdt[5] = low;
  gdt[6] = base >> 32;
  struct gdtr ptr = { .limit = sizeof(gdt) - 1U, .base = (uint64_t)gdt };
  routeos_load_gdt(&ptr);
  routeos_load_tr(JM_PROTECTIONROUTE_TSS_SELECTOR);
}

#define gdt_install jm_generated_descriptorinstall
/* END GENERATED DESCRIPTORINSTALL. */
