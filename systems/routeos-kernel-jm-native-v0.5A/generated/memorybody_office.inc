/* GENERATED OPERATIONAL OFFICE. EDIT source/memorybody.jmroute, NOT THIS FILE. */
#define JM_MEMORYBODY_VERSION "v0.5A"
#define JM_MEMORYBODY_SOURCE_SHA256 "847e3d7266a5873d099c0b3403df5e7dd6fea3f8e09ab1092bc28178083fcbe8"
#define JM_MEMORYBODY_PROOF_PARENT "52706adf66b5060b3aec17f21982d9cf5eddc23d"
#define JM_MEMORYBODY_MACHINE_PARENT "ba60cc66c1cfa622971301af7b84f35f5ad570c9"
#define JM_MEMORYBODY_BLOCKS 16
#define JM_MEMORYBODY_BLOCK_SIZE 256
#define JM_MEMORYBODY_ALIGNMENT 16

_Static_assert(JM_MEMORYBODY_BLOCK_SIZE <= JM_BODY_MEMORYBODY_PAGE_SIZE, "generated memory block exceeds authority page size");

static uint8_t heap[JM_MEMORYBODY_BLOCKS][JM_MEMORYBODY_BLOCK_SIZE] __attribute__((aligned(JM_MEMORYBODY_ALIGNMENT)));
static bool heap_used[JM_MEMORYBODY_BLOCKS];

static void jm_memorybody_announce(void) {
  static bool announced;
  if (!announced) {
    serial_write("[JM] MEMORYBODY GENERATED ");
    serial_write(JM_MEMORYBODY_VERSION);
    serial_write(" SOURCE ");
    serial_write(JM_MEMORYBODY_SOURCE_SHA256);
    serial_write(" ACTIVE\n");
    announced = true;
  }
}

static void *memory_allocate(void) {
  jm_memorybody_announce();
  for (size_t i = 0; i < JM_MEMORYBODY_BLOCKS; ++i) {
    if (!heap_used[i]) {
      heap_used[i] = true;
      return heap[i];
    }
  }
  return NULL;
}

static bool memory_release(void *p) {
  jm_memorybody_announce();
  for (size_t i = 0; i < JM_MEMORYBODY_BLOCKS; ++i) {
    if (p == heap[i] && heap_used[i]) {
      heap_used[i] = false;
      return true;
    }
  }
  return false;
}
