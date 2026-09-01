/* GENERATED OPERATIONAL OFFICE. EDIT source/routescheduler.jmroute, NOT THIS FILE. */
#define JM_ROUTESCHEDULER_VERSION "v0.4A"
#define JM_ROUTESCHEDULER_SOURCE_SHA256 "13d2d2cc90d338cd7a1177caa150dd16f3ec2aa32d0f0fb5c1959e11898b632c"
#define JM_ROUTESCHEDULER_PROOF_PARENT "2e814746c846fc5aeb45bee7bb03338d7c9a0896"
#define JM_ROUTESCHEDULER_MACHINE_PARENT "bb31256906b3db76a78993367ce0d38cb7418153"
#define JM_ROUTESCHEDULER_BODY_COUNT 2

_Static_assert(JM_ROUTESCHEDULER_BODY_COUNT == JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES, "generated scheduler body count mismatch");

static struct cpu_frame *select_next(void) {
  static bool jm_routescheduler_announced;
  if (!jm_routescheduler_announced) {
    serial_write("[JM] ROUTESCHEDULER GENERATED ");
    serial_write(JM_ROUTESCHEDULER_VERSION);
    serial_write(" SOURCE ");
    serial_write(JM_ROUTESCHEDULER_SOURCE_SHA256);
    serial_write(" ACTIVE\n");
    jm_routescheduler_announced = true;
  }
  for (size_t attempt = 0; attempt < JM_ROUTESCHEDULER_BODY_COUNT; ++attempt) {
    int candidate = (current_body + 1 + (int)attempt) % JM_ROUTESCHEDULER_BODY_COUNT;
    if (bodies[candidate].state != BODY_BLOCKED) {
      current_body = candidate;
      bodies[candidate].state = BODY_RUNNING;
      bodies[candidate].runs++;
      return &bodies[candidate].frame;
    }
  }
  receipt("FAULTHOLD: NO RUNNABLE BODY");
  for (;;) { __asm__ volatile("cli; hlt"); }
}

static void save_current(struct cpu_frame *frame) {
  if (current_body >= 0 && bodies[current_body].state != BODY_BLOCKED) {
    jm_memcpy(&bodies[current_body].frame, frame, sizeof(*frame));
    bodies[current_body].state = BODY_READY;
  }
}
