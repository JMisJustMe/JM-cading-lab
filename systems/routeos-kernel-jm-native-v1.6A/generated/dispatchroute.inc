/* GENERATED DISPATCHROUTE v1.6A SOURCE 50a58585fab1ee1bbcd34e76ce99e4878c82a56118531144a5131f6f2c070a80. */
#define JM_DISPATCHROUTE_VERSION "v1.6A"
#define JM_DISPATCHROUTE_SOURCE_SHA256 "50a58585fab1ee1bbcd34e76ce99e4878c82a56118531144a5131f6f2c070a80"
#define JM_DISPATCHROUTE_TIMER_VECTOR 32U
#define JM_DISPATCHROUTE_PIC_EOI_PORT 0x20U
#define JM_DISPATCHROUTE_PIC_EOI_VALUE 0x20U

static struct cpu_frame *jm_generated_dispatchroute(struct cpu_frame *frame) __attribute__((noinline, used));
static void jm_generated_dispatchroute_announce(void) __attribute__((noinline, used));
struct cpu_frame *routeos_interrupt_dispatch(struct cpu_frame *frame) __attribute__((noinline, used));

const char jm_generated_dispatchroute_source[] =
  "[JM] DISPATCHROUTE GENERATED v1.6A SOURCE 50a58585fab1ee1bbcd34e76ce99e4878c82a56118531144a5131f6f2c070a80 ACTIVE";

static void jm_generated_dispatchroute_announce(void) {
  static bool announced;
  if (!announced) { serial_write(jm_generated_dispatchroute_source); serial_write("\n"); announced = true; }
}

static struct cpu_frame *jm_generated_dispatchroute(struct cpu_frame *frame) {
  jm_generated_dispatchroute_announce();
  if (frame->vector == JM_DISPATCHROUTE_TIMER_VECTOR) {
    ++ticks;
    outb(JM_DISPATCHROUTE_PIC_EOI_PORT, JM_DISPATCHROUTE_PIC_EOI_VALUE);
    save_current(frame);
    if ((ticks % JM_BODY_ROUTESCHEDULER_CADENCE_TICKS) == 0) {
      serial_write("[JM] TIMER TICK "); serial_u64(ticks); serial_write(" -> ROUTESCHEDULER\n");
    }
    return select_next();
  }
  if (frame->vector == JM_GATE_PERMISSIONGATE_VECTOR) return jm_generated_permissiongate(frame);
  if (frame->vector == JM_FAULT_FAULTHOLD_VECTOR) return jm_generated_faulthold(frame);
  return jm_generated_unhandled_fault(frame);
}

struct cpu_frame *routeos_interrupt_dispatch(struct cpu_frame *frame) {
  return jm_generated_dispatchroute(frame);
}
/* END GENERATED DISPATCHROUTE. */
