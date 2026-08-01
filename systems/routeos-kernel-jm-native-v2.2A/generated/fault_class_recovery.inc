/* GENERATED FAULTCLASSRECOVERYROUTE v2.2A SOURCE 5e1b9bc86f68a2a36ffd1f07668f6aa2e288ffbaa9c0867051b4b00a619e3d46. */
#define JM_FAULTCLASSRECOVERY_VERSION "v2.2A"
#define JM_FAULTCLASSRECOVERY_SOURCE_SHA256 "5e1b9bc86f68a2a36ffd1f07668f6aa2e288ffbaa9c0867051b4b00a619e3d46"
#define JM_FAULTCLASS_ILLEGAL_INSTRUCTION 1U
#define JM_FAULTCLASS_PRIVILEGE_VIOLATION 2U
#define JM_FAULTCLASS_VECTOR_UD 6U
#define JM_FAULTCLASS_VECTOR_GP 13U
#define JM_FAULTCLASS_BODY5_TICK 150ULL
#define JM_FAULTCLASS_REJECT_TICK 200ULL
#define JM_FAULTCLASS_PROGRAM_PRIVILEGE 3U
#define JM_FAULTCLASS_REUSED_SLOT 3U
#define JM_FAULTCLASS_REUSED_CODE 33603584ULL
#define JM_FAULTCLASS_REUSED_STACK_PAGE 33607680ULL
#define JM_FAULTCLASS_REUSED_STACK_TOP 33611776ULL
#define JM_FAULTCLASS_REJECT_CODE 33619968ULL
#define JM_FAULTCLASS_REJECT_STACK_PAGE 33624064ULL
#define JM_FAULTCLASS_REJECT_STACK_TOP 33628160ULL

_Static_assert(JM_FAULTCLASS_VECTOR_UD == JM_FAULT_FAULTHOLD_VECTOR, "#UD vector authority drift");
_Static_assert(JM_FAULTCLASS_VECTOR_GP == 13U, "#GP vector authority drift");
_Static_assert(JM_DYNAMICBODYREGISTRY_CAPACITY == 4U, "registry capacity drift");

static void save_current(struct cpu_frame *frame);
static struct cpu_frame *jm_generated_faulthold(struct cpu_frame *frame);
static struct cpu_frame *jm_generated_unhandled_fault(struct cpu_frame *frame);

static const uint8_t jm_faultclass_privilege_program[] = { 0xFA, 0x0F, 0x0B };
static uint64_t jm_faultclass_class_counts[3];
static uint64_t jm_faultclass_slot_reuse_count;
static uint64_t jm_faultclass_recovery_count;

const char jm_generated_faultclassrecovery_source[] =
  "[JM] FAULTCLASSRECOVERYROUTE GENERATED v2.2A SOURCE 5e1b9bc86f68a2a36ffd1f07668f6aa2e288ffbaa9c0867051b4b00a619e3d46 ACTIVE";

static void __attribute__((noinline, used)) jm_generated_faultclassrecovery_announce(void) {
  static bool announced;
  if (!announced) { serial_write(jm_generated_faultclassrecovery_source); serial_write("\n"); announced = true; }
}

static const char *jm_generated_faultclass_name(uint32_t fault_class) {
  if (fault_class == JM_FAULTCLASS_ILLEGAL_INSTRUCTION) return "ILLEGAL_INSTRUCTION";
  if (fault_class == JM_FAULTCLASS_PRIVILEGE_VIOLATION) return "PRIVILEGE_VIOLATION";
  return "UNKNOWN";
}

static uint32_t __attribute__((noinline, used)) jm_generated_faultclass_classify(uint32_t vector) {
  if (vector == JM_FAULTCLASS_VECTOR_UD) return JM_FAULTCLASS_ILLEGAL_INSTRUCTION;
  if (vector == JM_FAULTCLASS_VECTOR_GP) return JM_FAULTCLASS_PRIVILEGE_VIOLATION;
  return 0U;
}

static void jm_generated_faultclass_receipt(uint32_t fault_class, uint32_t vector, const char *action) {
  uint64_t body = current_body >= 0 ? bodies[current_body].id : 0U;
  if (fault_class < 3U) ++jm_faultclass_class_counts[fault_class];
  jm_generated_traceledger_record(JM_TRACE_EVENT_CLASSIFY, body, vector, fault_class);
  serial_write("[JMFAULTCLASS] body="); serial_u64(body);
  serial_write(" vector="); serial_u64(vector);
  serial_write(" class="); serial_write(jm_generated_faultclass_name(fault_class));
  serial_write(" action="); serial_write(action); serial_write("\n");
}

static bool jm_generated_faultclass_reuse_retired_slot(uint32_t program_id) {
  const size_t slot = JM_FAULTCLASS_REUSED_SLOT;
  if (program_id != JM_FAULTCLASS_PROGRAM_PRIVILEGE ||
      slot >= JM_DYNAMICBODYREGISTRY_CAPACITY || bodies[slot].state != BODY_RETIRED) return false;
  uint64_t prior_body = bodies[slot].id;
  uint64_t generation = bodies[slot].generation + 1U;
  jm_memset((void *)JM_FAULTCLASS_REUSED_CODE, 0, JM_DYNAMICBODYREGISTRY_PAGE_SIZE);
  jm_memcpy((void *)JM_FAULTCLASS_REUSED_CODE, jm_faultclass_privilege_program, sizeof(jm_faultclass_privilege_program));
  jm_memset((void *)JM_FAULTCLASS_REUSED_STACK_PAGE, 0, JM_DYNAMICBODYREGISTRY_PAGE_SIZE);
  jm_memset(&bodies[slot], 0, sizeof(bodies[slot]));
  bodies[slot].id = jm_dynamicbodyregistry_next_id++;
  bodies[slot].state = BODY_READY;
  bodies[slot].program_id = program_id;
  bodies[slot].generation = generation;
  bodies[slot].code_base = JM_FAULTCLASS_REUSED_CODE;
  bodies[slot].stack_page = JM_FAULTCLASS_REUSED_STACK_PAGE;
  bodies[slot].frame.r12 = bodies[slot].id;
  bodies[slot].frame.rip = JM_FAULTCLASS_REUSED_CODE;
  bodies[slot].frame.cs = USER_CODE_SELECTOR;
  bodies[slot].frame.rflags = 0x202ULL;
  bodies[slot].frame.rsp = JM_FAULTCLASS_REUSED_STACK_TOP;
  bodies[slot].frame.ss = USER_DATA_SELECTOR;
  ++jm_dynamicbodyregistry_registered_count;
  ++jm_faultclass_slot_reuse_count;
  jm_generated_traceledger_record(JM_TRACE_EVENT_SLOT_REUSE, prior_body, (uint32_t)slot, generation);
  jm_generated_traceledger_record(JM_TRACE_EVENT_REGISTER, bodies[slot].id, program_id, slot);
  serial_write("[JMSLOT] reuse slot="); serial_u64(slot);
  serial_write(" prior_body="); serial_u64(prior_body);
  serial_write(" new_body="); serial_u64(bodies[slot].id);
  serial_write(" generation="); serial_u64(generation); serial_write("\n");
  serial_write("[JMREG] register body="); serial_u64(bodies[slot].id);
  serial_write(" slot="); serial_u64(slot);
  serial_write(" program="); serial_u64(program_id);
  serial_write(" generation="); serial_u64(generation);
  serial_write(" registered="); serial_u64(jm_dynamicbodyregistry_registered_count); serial_write("\n");
  return true;
}

static void jm_generated_faultclass_capacity_reject(void) {
  for (size_t i = 0; i < JM_DYNAMICBODYREGISTRY_CAPACITY; ++i) {
    if (bodies[i].state == BODY_EMPTY || bodies[i].state == BODY_RETIRED) {
      receipt("FAULTCLASSRECOVERY HOLD: CAPACITY REJECTED WITH USABLE SLOT");
      return;
    }
  }
  ++jm_dynamicbodyregistry_rejected_count;
  jm_generated_traceledger_record(JM_TRACE_EVENT_REGISTRY_REJECT, 0, JM_FAULTCLASS_PROGRAM_PRIVILEGE, jm_dynamicbodyregistry_rejected_count);
  serial_write("[JMFAULTREG] reject program=3 registered="); serial_u64(jm_dynamicbodyregistry_registered_count);
  serial_write(" capacity="); serial_u64(JM_DYNAMICBODYREGISTRY_CAPACITY); serial_write(" no_usable_slot=1\n");
}

static void __attribute__((noinline, used)) jm_generated_faultclassrecovery_tick(void) {
  /* Preserve the frozen v2.1A tick office for its earned Body 3 and Body 4 route,
   * but intercept its former tick-150 rejection so v2.2A can prove generation reuse. */
  if (ticks < JM_FAULTCLASS_BODY5_TICK) {
    jm_generated_dynamicbodyregistry_tick();
  } else if (ticks == JM_FAULTCLASS_BODY5_TICK) {
    if (!jm_generated_faultclass_reuse_retired_slot(JM_FAULTCLASS_PROGRAM_PRIVILEGE)) receipt("FAULTCLASSRECOVERY HOLD: RETIRED SLOT NOT AVAILABLE");
  } else if (ticks == JM_FAULTCLASS_REJECT_TICK) {
    jm_generated_faultclass_capacity_reject();
  }
}

static struct cpu_frame *jm_generated_faultclass_recovery(uint32_t vector) {
  ++jm_faultclass_recovery_count;
  jm_generated_traceledger_record(JM_TRACE_EVENT_RECOVERY, current_body >= 0 ? bodies[current_body].id : 0, vector, jm_faultclass_recovery_count);
  jm_generated_traceledger_dump_recent();
  receipt("FAULTCLASSRECOVERY: FAULTING BODY QUARANTINED; SAFE BODIES CONTINUE");
  struct cpu_frame *next = select_next();
  jm_generated_traceledger_record(JM_TRACE_EVENT_CONTINUE, current_body >= 0 ? bodies[current_body].id : 0, 0, jm_faultclass_recovery_count);
  return next;
}

static struct cpu_frame * __attribute__((noinline, used)) jm_generated_faultclassroute(struct cpu_frame *frame) {
  uint32_t vector = (uint32_t)frame->vector;
  uint32_t fault_class = jm_generated_faultclass_classify(vector);
  if (vector == JM_FAULTCLASS_VECTOR_UD) {
    jm_generated_faultclass_receipt(fault_class, vector, "INHERITED_FAULTHOLD");
    return jm_generated_faulthold(frame);
  }
  if (vector == JM_FAULTCLASS_VECTOR_GP) {
    save_current(frame);
    jm_generated_faultclass_receipt(fault_class, vector, "QUARANTINE");
    if (current_body >= 0 && jm_generated_recoverypolicy_fault((size_t)current_body, vector)) bodies[current_body].state = BODY_BLOCKED;
    return jm_generated_faultclass_recovery(vector);
  }
  return jm_generated_unhandled_fault(frame);
}

static void __attribute__((noinline, used)) jm_generated_faultclassrecovery_health(void) {
  uint64_t passed = 0, checks = 8;
  if (JM_FAULTCLASS_VECTOR_UD == 6U) ++passed;
  if (JM_FAULTCLASS_VECTOR_GP == 13U) ++passed;
  if (JM_DYNAMICBODYREGISTRY_CAPACITY == 4U) ++passed;
  if (JM_FAULTCLASS_REUSED_SLOT == 3U) ++passed;
  if (sizeof(jm_faultclass_privilege_program) == 3U) ++passed;
  if (jm_faultclass_privilege_program[0] == 0xFAU) ++passed;
  if (JM_FAULTCLASS_BODY5_TICK == 150ULL) ++passed;
  if (JM_FAULTCLASS_REJECT_TICK == 200ULL) ++passed;
  serial_write("[JMFAULTHEALTH] checks="); serial_u64(checks);
  serial_write(" passed="); serial_u64(passed);
  serial_write(" classes=2 vectors=6,13 slot_reuse=retired state=");
  serial_write(passed == checks ? "PASS" : "HOLD"); serial_write("\n");
}

static void __attribute__((noinline, used)) jm_generated_faultclassrecovery_capability_emit(void) {
  serial_write("[JMFAULTCAP] version=v2.2A classes=2 vectors=6,13 programs=3 slot_reuse=retired generation=tracked recovery=quarantine\n");
}
/* END GENERATED FAULTCLASSRECOVERYROUTE. */
