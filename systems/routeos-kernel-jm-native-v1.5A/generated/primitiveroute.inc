/* GENERATED PRIMITIVEROUTE v1.5A SOURCE 62476361bed4398041d8005dd242d0344809a893a6ca5e85618f3495ca77ccbb. */
#define JM_PRIMITIVEROUTE_VERSION "v1.5A"
#define JM_PRIMITIVEROUTE_SOURCE_SHA256 "62476361bed4398041d8005dd242d0344809a893a6ca5e85618f3495ca77ccbb"
#define JM_PRIMITIVEROUTE_IO_WAIT_PORT 0x80U

void jm_generated_serialroute_write(const char *s);

static void jm_generated_portout(uint16_t port, uint8_t value) __attribute__((noinline, used));
static uint8_t jm_generated_portin(uint16_t port) __attribute__((noinline, used));
static void jm_generated_iowait(void) __attribute__((noinline, used));
static void *jm_generated_memorycopy(void *dst, const void *src, size_t n) __attribute__((noinline, used));
static void *jm_generated_memoryset(void *dst, int value, size_t n) __attribute__((noinline, used));
static void jm_generated_primitiveroute_announce(void) __attribute__((noinline, used));

const char jm_generated_primitiveroute_source[] =
  "[JM] PRIMITIVEROUTE GENERATED v1.5A SOURCE 62476361bed4398041d8005dd242d0344809a893a6ca5e85618f3495ca77ccbb ACTIVE";

static void jm_generated_portout(uint16_t port, uint8_t value) {
  __asm__ volatile("outb %0, %1" : : "a"(value), "Nd"(port));
}

static uint8_t jm_generated_portin(uint16_t port) {
  uint8_t value;
  __asm__ volatile("inb %1, %0" : "=a"(value) : "Nd"(port));
  return value;
}

static void jm_generated_iowait(void) {
  jm_generated_portout(JM_PRIMITIVEROUTE_IO_WAIT_PORT, 0);
}

static void *jm_generated_memorycopy(void *dst, const void *src, size_t n) {
  uint8_t *d = (uint8_t *)dst;
  const uint8_t *s = (const uint8_t *)src;
  for (size_t i = 0; i < n; ++i) d[i] = s[i];
  return dst;
}

static void *jm_generated_memoryset(void *dst, int value, size_t n) {
  uint8_t *d = (uint8_t *)dst;
  for (size_t i = 0; i < n; ++i) d[i] = (uint8_t)value;
  return dst;
}

static void jm_generated_primitiveroute_announce(void) {
  static bool announced;
  if (!announced) {
    jm_generated_serialroute_write(jm_generated_primitiveroute_source);
    jm_generated_serialroute_write("\n");
    announced = true;
  }
}

#define outb jm_generated_portout
#define inb jm_generated_portin
#define io_wait jm_generated_iowait
#define jm_memcpy jm_generated_memorycopy
#define jm_memset jm_generated_memoryset
/* END GENERATED PRIMITIVEROUTE. */
