/* GENERATED OPERATIONAL OFFICE. EDIT source/faulthold_recoverybody.jmroute, NOT THIS FILE. */
#define JM_FAULTRECOVERY_VERSION "v0.6A"
#define JM_FAULTRECOVERY_SOURCE_SHA256 "2bbcf026b977de46e10ea9d8a337b96a901e69bd6514880fb32fb8d79dedfd00"
#define JM_FAULTRECOVERY_PROOF_PARENT "8b891d1f4bcdf904791588f5bb46adc31908b9d4"
#define JM_FAULTRECOVERY_MACHINE_PARENT "3cd46fdfa825391c99f0999bb4939231e03ad619"
#define JM_FAULTHOLD_VECTOR 6

_Static_assert(JM_FAULTHOLD_VECTOR == JM_FAULT_FAULTHOLD_VECTOR, "generated FaultHold vector mismatch");

static struct cpu_frame *jm_generated_recoverybody(void) {
  static bool jm_recoverybody_announced;
  if (!jm_recoverybody_announced) {
    serial_write("[JM] RECOVERYBODY GENERATED ");
    serial_write(JM_FAULTRECOVERY_VERSION);
    serial_write(" SOURCE ");
    serial_write(JM_FAULTRECOVERY_SOURCE_SHA256);
    serial_write(" SELECT SAFE NEXT\n");
    jm_recoverybody_announced = true;
  }
  receipt("RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES");
  return select_next();
}

static struct cpu_frame *jm_generated_faulthold(struct cpu_frame *frame) {
  static bool jm_faulthold_announced;
  save_current(frame);
  if (!jm_faulthold_announced) {
    serial_write("[JM] FAULTHOLD GENERATED ");
    serial_write(JM_FAULTRECOVERY_VERSION);
    serial_write(" SOURCE ");
    serial_write(JM_FAULTRECOVERY_SOURCE_SHA256);
    serial_write(" ACTIVE\n");
    jm_faulthold_announced = true;
  }
  if (current_body >= 0) {
    serial_write("[JM] FAULTHOLD: USER BODY "); serial_u64(bodies[current_body].id);
    serial_write(" INVALID OPCODE CAUGHT\n");
    bodies[current_body].state = BODY_BLOCKED;
  }
  return jm_generated_recoverybody();
}

static struct cpu_frame *jm_generated_unhandled_fault(struct cpu_frame *frame) {
  receipt("FAULTHOLD: UNHANDLED VECTOR");
  return frame;
}
