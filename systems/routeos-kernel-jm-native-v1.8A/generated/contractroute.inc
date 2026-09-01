/* GENERATED KERNELCONTRACTROUTE v1.8A SOURCE 853d8ecbdacb06fd080a7d0c74ca63942324b44d826755e57ab61e3c4293c1ad. */
#define JM_KERNELCONTRACTROUTE_VERSION "v1.8A"
#define JM_KERNELCONTRACTROUTE_SOURCE_SHA256 "853d8ecbdacb06fd080a7d0c74ca63942324b44d826755e57ab61e3c4293c1ad"
#define COM1 JM_DEVICE_SERIALROUTE_PORT
#define IDT_SIZE 256
#define USER1_CODE 0x02000000ULL
#define USER1_STACK_PAGE 0x02001000ULL
#define USER1_STACK_TOP 0x02002000ULL
#define USER2_CODE 0x02004000ULL
#define USER2_STACK_PAGE 0x02005000ULL
#define USER2_STACK_TOP 0x02006000ULL
#define USER_DATA_SELECTOR 0x1B
#define USER_CODE_SELECTOR 0x23
#define TSS_SELECTOR 0x28
#define SYS_TRACE_READ 1
#define SYS_YIELD 2

void jm_generated_serialroute_write(const char *s);

extern uint64_t boot_pml4[];
extern uint64_t boot_pdpt[];
extern uint64_t boot_pd[];
extern uint64_t boot_pts[];
extern uint8_t routeos_user_blob_start[];
extern uint8_t routeos_user_blob_end[];
extern void routeos_isr_ud(void);
extern void routeos_isr_timer(void);
extern void routeos_isr_syscall(void);
extern void routeos_load_gdt(const void *ptr);
extern void routeos_load_tr(uint16_t selector);
extern void routeos_reload_cr3(void);
extern __attribute__((noreturn)) void routeos_enter_frame(void *frame);

static void jm_generated_contractroute_announce(void) __attribute__((noinline, used));
const char jm_generated_contractroute_source[] =
  "[JM] KERNELCONTRACTROUTE GENERATED v1.8A SOURCE 853d8ecbdacb06fd080a7d0c74ca63942324b44d826755e57ab61e3c4293c1ad ACTIVE";
static void jm_generated_contractroute_announce(void) {
  static bool announced;
  if (!announced) { jm_generated_serialroute_write(jm_generated_contractroute_source); jm_generated_serialroute_write("\n"); announced = true; }
}
/* END GENERATED KERNELCONTRACTROUTE. */
