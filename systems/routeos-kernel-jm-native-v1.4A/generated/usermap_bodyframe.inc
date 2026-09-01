/* GENERATED USERMAPROUTE + BODYFRAMEINSTALL v1.4A SOURCE 50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14. */
#define JM_PROTECTIONROUTE_PAGE_USER_FLAG 0x4ULL
#define JM_PROTECTIONROUTE_PAGE_SIZE 4096ULL
#define JM_PROTECTIONROUTE_USER1_CODE 0x02000000ULL
#define JM_PROTECTIONROUTE_USER1_STACK_PAGE 0x02001000ULL
#define JM_PROTECTIONROUTE_USER1_STACK_TOP 0x02002000ULL
#define JM_PROTECTIONROUTE_USER2_CODE 0x02004000ULL
#define JM_PROTECTIONROUTE_USER2_STACK_PAGE 0x02005000ULL
#define JM_PROTECTIONROUTE_USER2_STACK_TOP 0x02006000ULL
#define JM_PROTECTIONROUTE_USER_DATA_SELECTOR 0x1BU
#define JM_PROTECTIONROUTE_USER_CODE_SELECTOR 0x23U
#define JM_PROTECTIONROUTE_USER_RFLAGS 0x202ULL
#define JM_PROTECTIONROUTE_BODY_COUNT 2U

_Static_assert(JM_USERBOUNDARY_PAGE_USER_FLAG == JM_PROTECTIONROUTE_PAGE_USER_FLAG, "ProtectionRoute user-page flag drift");
_Static_assert(JM_USERBOUNDARY_PAGE_SIZE == JM_PROTECTIONROUTE_PAGE_SIZE, "ProtectionRoute user-page size drift");
_Static_assert(JM_BODYREGISTRY_BODY_COUNT == JM_PROTECTIONROUTE_BODY_COUNT, "ProtectionRoute body count drift");
_Static_assert(USER1_CODE == JM_PROTECTIONROUTE_USER1_CODE, "ProtectionRoute body 1 code drift");
_Static_assert(USER2_CODE == JM_PROTECTIONROUTE_USER2_CODE, "ProtectionRoute body 2 code drift");
_Static_assert(USER_DATA_SELECTOR == JM_PROTECTIONROUTE_USER_DATA_SELECTOR, "ProtectionRoute user data selector drift");
_Static_assert(USER_CODE_SELECTOR == JM_PROTECTIONROUTE_USER_CODE_SELECTOR, "ProtectionRoute user code selector drift");

const char jm_generated_usermaproute_source[] =
  "[JM] USERMAPROUTE GENERATED v1.4A SOURCE 50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14 ACTIVE";
const char jm_generated_bodyframeinstall_source[] =
  "[JM] BODYFRAMEINSTALL GENERATED v1.4A SOURCE 50a669f100d71ff9c8b87218c12603b663129633469a1952198fa72a69b53a14 ACTIVE";

static void jm_generated_usermaproute_mark(uint64_t address) {
  size_t pde = (size_t)(address >> 21);
  size_t pte = (size_t)(address >> 12);
  boot_pml4[0] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
  boot_pdpt[0] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
  boot_pd[pde] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
  boot_pts[pte] |= JM_PROTECTIONROUTE_PAGE_USER_FLAG;
}

static void jm_generated_usermaproute_install(void) {
  static bool announced;
  jm_userboundary_announce();
  if (!announced) {
    serial_write(jm_generated_usermaproute_source);
    serial_write("\n");
    announced = true;
  }
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER1_CODE);
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER1_STACK_PAGE);
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER2_CODE);
  jm_generated_usermaproute_mark(JM_PROTECTIONROUTE_USER2_STACK_PAGE);
  routeos_reload_cr3();
}

static void jm_generated_bodyframeinstall(void) {
  static bool announced;
  jm_bodyregistry_announce();
  if (!announced) {
    serial_write(jm_generated_bodyframeinstall_source);
    serial_write("\n");
    announced = true;
  }
  size_t blob_size = (size_t)(routeos_user_blob_end - routeos_user_blob_start);
  jm_memcpy((void *)JM_PROTECTIONROUTE_USER1_CODE, routeos_user_blob_start, blob_size);
  jm_memset((void *)JM_PROTECTIONROUTE_USER1_STACK_PAGE, 0, JM_PROTECTIONROUTE_PAGE_SIZE);
  jm_memcpy((void *)JM_PROTECTIONROUTE_USER2_CODE, routeos_user_blob_start, blob_size);
  jm_memset((void *)JM_PROTECTIONROUTE_USER2_STACK_PAGE, 0, JM_PROTECTIONROUTE_PAGE_SIZE);

  jm_memset(bodies, 0, sizeof(bodies));
  bodies[0].id = 1;
  bodies[0].state = BODY_READY;
  bodies[0].frame.r12 = 1;
  bodies[0].frame.rip = JM_PROTECTIONROUTE_USER1_CODE;
  bodies[0].frame.cs = JM_PROTECTIONROUTE_USER_CODE_SELECTOR;
  bodies[0].frame.rflags = JM_PROTECTIONROUTE_USER_RFLAGS;
  bodies[0].frame.rsp = JM_PROTECTIONROUTE_USER1_STACK_TOP;
  bodies[0].frame.ss = JM_PROTECTIONROUTE_USER_DATA_SELECTOR;
  bodies[1].id = 2;
  bodies[1].state = BODY_READY;
  bodies[1].frame.r12 = 2;
  bodies[1].frame.rip = JM_PROTECTIONROUTE_USER2_CODE;
  bodies[1].frame.cs = JM_PROTECTIONROUTE_USER_CODE_SELECTOR;
  bodies[1].frame.rflags = JM_PROTECTIONROUTE_USER_RFLAGS;
  bodies[1].frame.rsp = JM_PROTECTIONROUTE_USER2_STACK_TOP;
  bodies[1].frame.ss = JM_PROTECTIONROUTE_USER_DATA_SELECTOR;
}

static void jm_generated_protectionroute_user_install(void) {
  jm_generated_usermaproute_install();
  jm_generated_bodyframeinstall();
}

#define user_boundary_install jm_generated_protectionroute_user_install
/* END GENERATED USERMAPROUTE + BODYFRAMEINSTALL. */
