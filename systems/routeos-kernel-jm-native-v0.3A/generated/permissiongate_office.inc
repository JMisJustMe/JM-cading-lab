/* GENERATED OPERATIONAL OFFICE. EDIT source/permissiongate.jmroute, NOT THIS FILE. */
#define JM_PERMISSIONGATE_VERSION "v0.3A"
#define JM_PERMISSIONGATE_SOURCE_SHA256 "2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2"
#define JM_PERMISSIONGATE_PROOF_PARENT "f76343108422109e8aa939d785d0d88bdba61f08"
#define JM_PERMISSIONGATE_MACHINE_PARENT "0fcb74bf1a959f3020b80511dde01cd67523fc6e"
#define JM_PERMISSIONGATE_VECTOR 0x80
#define JM_PERMISSIONGATE_CALL_TRACE_READ 1
#define JM_PERMISSIONGATE_CALL_YIELD 2

_Static_assert(JM_PERMISSIONGATE_VECTOR == JM_GATE_PERMISSIONGATE_VECTOR, "generated PermissionGate vector mismatch");

static struct cpu_frame *jm_generated_permissiongate(struct cpu_frame *frame) {
  static bool jm_permissiongate_announced;
  save_current(frame);
  struct body *active = current_body >= 0 ? &bodies[current_body] : NULL;
  if (!active) return select_next();
  if (!jm_permissiongate_announced) {
    serial_write("[JM] PERMISSIONGATE GENERATED ");
    serial_write(JM_PERMISSIONGATE_VERSION);
    serial_write(" SOURCE ");
    serial_write(JM_PERMISSIONGATE_SOURCE_SHA256);
    serial_write(" ACTIVE\n");
    jm_permissiongate_announced = true;
  }
  if (active->frame.rax == JM_PERMISSIONGATE_CALL_TRACE_READ) {
    serial_write("[JM] USER BODY "); serial_u64(active->id);
    serial_write(" -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS -> KERNEL TRACE RETURN\n");
    active->frame.rax = ticks;
    active->state = BODY_READY;
    return &active->frame;
  }
  if (active->frame.rax == JM_PERMISSIONGATE_CALL_YIELD) {
    active->state = BODY_READY;
    return select_next();
  }
  receipt("PERMISSIONGATE DENY: UNKNOWN SYSTEM CALL");
  active->frame.rax = (uint64_t)-1;
  active->state = BODY_READY;
  return &active->frame;
}
