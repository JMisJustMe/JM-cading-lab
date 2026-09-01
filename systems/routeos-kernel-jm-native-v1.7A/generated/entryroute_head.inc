/* GENERATED ENTRYROUTE v1.7A HEAD SOURCE b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647. */
#define JM_ENTRYROUTE_VERSION "v1.7A"
#define JM_ENTRYROUTE_SOURCE_SHA256 "b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647"
static void jm_generated_entryroute_announce(void) __attribute__((noinline, used));
const char jm_generated_entryroute_source[] =
  "[JM] ENTRYROUTE GENERATED v1.7A SOURCE b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647 ACTIVE";
static void jm_generated_entryroute_announce(void) {
  static bool announced;
  if (!announced) { serial_write(jm_generated_entryroute_source); serial_write("\n"); announced = true; }
}
/* END GENERATED ENTRYROUTE HEAD. */
