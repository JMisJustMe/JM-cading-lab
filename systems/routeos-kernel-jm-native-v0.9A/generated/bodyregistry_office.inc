/* GENERATED BODYREGISTRY. EDIT source/bodyregistry_userboundary.jmroute, NOT THIS FILE. */
#define JM_BODYREGISTRY_VERSION "v0.9A"
#define JM_BODYREGISTRY_SOURCE_SHA256 "c84db3d5aaad07e90b45d4ac84216cd9c60c0fbc22d25a00caeccb6354bda99f"
#define JM_BODYREGISTRY_PROOF_PARENT "e25f338d0d0025bdf9d00d502a832702082eda71"
#define JM_BODYREGISTRY_MACHINE_PARENT "fd62b04fc9e0efeb958aba96b73eba072860e0c4"
#define JM_BODYREGISTRY_BODY_COUNT 2

_Static_assert(JM_BODYREGISTRY_BODY_COUNT == JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES, "generated body count mismatch");

struct cpu_frame {
  uint64_t r15, r14, r13, r12, r11, r10, r9, r8;
  uint64_t rsi, rdi, rbp, rdx, rcx, rbx, rax;
  uint64_t vector, error, rip, cs, rflags, rsp, ss;
};
enum body_state { BODY_READY = 0, BODY_RUNNING = 1, BODY_BLOCKED = 2 };
struct body {
  uint64_t id;
  enum body_state state;
  struct cpu_frame frame;
  uint64_t runs;
};
static struct body bodies[JM_BODYREGISTRY_BODY_COUNT];
static int current_body = -1;
static uint64_t ticks = 0;

static void jm_bodyregistry_announce(void) {
  static bool announced;
  if (!announced) {
    serial_write("[JM] BODYREGISTRY GENERATED "); serial_write(JM_BODYREGISTRY_VERSION);
    serial_write(" SOURCE "); serial_write(JM_BODYREGISTRY_SOURCE_SHA256); serial_write(" ACTIVE\n");
    announced = true;
  }
}
