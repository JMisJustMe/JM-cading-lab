/* GENERATED USERBOUNDARY. EDIT source/bodyregistry_userboundary.jmroute, NOT THIS FILE. */
#define JM_USERBOUNDARY_VERSION "v0.9A"
#define JM_USERBOUNDARY_SOURCE_SHA256 "c84db3d5aaad07e90b45d4ac84216cd9c60c0fbc22d25a00caeccb6354bda99f"
#define JM_USERBOUNDARY_PAGE_USER_FLAG 0x4
#define JM_USERBOUNDARY_PAGE_SIZE 4096

static void jm_userboundary_announce(void) {
  static bool announced;
  if (!announced) {
    serial_write("[JM] USERBOUNDARY GENERATED "); serial_write(JM_USERBOUNDARY_VERSION);
    serial_write(" SOURCE "); serial_write(JM_USERBOUNDARY_SOURCE_SHA256); serial_write(" ACTIVE\n");
    announced = true;
  }
}

static void mark_user_page(uint64_t address) {
  size_t pde = (size_t)(address >> 21);
  size_t pte = (size_t)(address >> 12);
  boot_pml4[0] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
  boot_pdpt[0] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
  boot_pd[pde] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
  boot_pts[pte] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
}
static void user_boundary_install(void) {
  jm_bodyregistry_announce();
  jm_userboundary_announce();
  mark_user_page(USER1_CODE);
  mark_user_page(USER1_STACK_PAGE);
  mark_user_page(USER2_CODE);
  mark_user_page(USER2_STACK_PAGE);
  routeos_reload_cr3();

  size_t blob_size = (size_t)(routeos_user_blob_end - routeos_user_blob_start);
  jm_memcpy((void *)USER1_CODE, routeos_user_blob_start, blob_size);
  jm_memset((void *)USER1_STACK_PAGE, 0, 4096);
  jm_memcpy((void *)USER2_CODE, routeos_user_blob_start, blob_size);
  jm_memset((void *)USER2_STACK_PAGE, 0, 4096);

  jm_memset(bodies, 0, sizeof(bodies));
  bodies[0].id = 1; bodies[0].state = BODY_READY;
  bodies[0].frame.r12 = 1;
  bodies[0].frame.rip = USER1_CODE;
  bodies[0].frame.cs = USER_CODE_SELECTOR;
  bodies[0].frame.rflags = 0x202;
  bodies[0].frame.rsp = USER1_STACK_TOP;
  bodies[0].frame.ss = USER_DATA_SELECTOR;
  bodies[1].id = 2; bodies[1].state = BODY_READY;
  bodies[1].frame.r12 = 2;
  bodies[1].frame.rip = USER2_CODE;
  bodies[1].frame.cs = USER_CODE_SELECTOR;
  bodies[1].frame.rflags = 0x202;
  bodies[1].frame.rsp = USER2_STACK_TOP;
  bodies[1].frame.ss = USER_DATA_SELECTOR;
}
