/* GENERATED ORCHESTRATIONROUTE v1.9A SOURCE 46aa34e7ac97ebdc6d128c727c0901b890129a988fc549de005ad7c69b689507. */
#define JM_ORCHESTRATIONROUTE_VERSION "v1.9A"
#define JM_ORCHESTRATIONROUTE_SOURCE_SHA256 "46aa34e7ac97ebdc6d128c727c0901b890129a988fc549de005ad7c69b689507"
#define JM_IGNITIONBODY_VERSION "v0.7A"
#define JM_IGNITIONBODY_SOURCE_SHA256 "e038b1549e6831de566ef2180a1b83a5c2071aa2b3951bb415e3c1002e4d0c22"
#define JM_IGNITIONBODY_PROOF_PARENT "3510c192320e40b5490681c6fc8d3a92ba13a3d6"
#define JM_IGNITIONBODY_MACHINE_PARENT "f59980059d5e64def7a7893e7ded4a18078d80a3"
#define JM_IGNITIONBODY_MULTIBOOT_MAGIC 0x36D76289U
#define JM_IGNITIONBODY_FIRST_BODY_INDEX 0

const char jm_generated_orchestrationroute_source[] =
  "[JM] ORCHESTRATIONROUTE GENERATED v1.9A SOURCE 46aa34e7ac97ebdc6d128c727c0901b890129a988fc549de005ad7c69b689507 ACTIVE";

__attribute__((noreturn, noinline, used)) static void jm_generated_ignitionbody(uint32_t magic, uint32_t mb_info) {
  (void)mb_info;
  serial_init();
  jm_generated_contractroute_announce();
  jm_generated_primitiveroute_announce();
  jm_generated_entryroute_announce();
  serial_write(jm_generated_orchestrationroute_source);
  serial_write("\n");
  serial_write("[JM] IGNITIONBODY GENERATED ");
  serial_write(JM_IGNITIONBODY_VERSION);
  serial_write(" SOURCE ");
  serial_write(JM_IGNITIONBODY_SOURCE_SHA256);
  serial_write(" ACTIVE\n");
  serial_write("[JM] JM_NATIVE AUTHORITY ");
  serial_write(JM_ROUTEOS_AUTHORITY_VERSION);
  serial_write(" SOURCE ");
  serial_write(JM_ROUTEOS_SOURCE_SHA256);
  serial_write(" PARENT ");
  serial_write(JM_ROUTEOS_PROOF_PARENT);
  serial_write("\n");
  receipt("JM BOOT IMAGE LOADED");
  if (magic != JM_IGNITIONBODY_MULTIBOOT_MAGIC) receipt("BOOTROUTE HOLD: MULTIBOOT2 MAGIC MISMATCH");
  receipt("ROUTEOS KERNEL ENTRY");
  receipt("PRIVILEGED EXECUTION ACTIVE");
  void *probe = memory_allocate();
  if (probe && memory_release(probe)) receipt("MEMORY INITIALISED: ALLOCATE/RELEASE PASS");
  else receipt("MEMORY HOLD");
  gdt_install();
  idt_install();
  user_boundary_install();
  pic_pit_install();
  receipt("INTERRUPT ROUTE ACTIVE");
  receipt("BODYREGISTRY: TWO USER BODIES REGISTERED");
  receipt("PERMISSIONGATE: INT 0x80 CONTROLLED ENTRY ACTIVE");
  receipt("DEVICE OUTPUT: JM-CONTROLLED SERIAL ACTIVE");
  receipt("ROUTESCHEDULER: ENTERING USER BODY 1");
  current_body = JM_IGNITIONBODY_FIRST_BODY_INDEX;
  bodies[JM_IGNITIONBODY_FIRST_BODY_INDEX].state = BODY_RUNNING;
  routeos_enter_frame(&bodies[JM_IGNITIONBODY_FIRST_BODY_INDEX].frame);
  for (;;) { __asm__ volatile("cli; hlt"); }
}
/* END GENERATED ORCHESTRATIONROUTE. */
