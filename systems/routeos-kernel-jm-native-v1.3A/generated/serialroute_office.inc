/* GENERATED SERIALROUTE v1.3A SOURCE 7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190. */
/* Proof parent: 5ccde5f1c8f1692cbffcc87595fecddf7b25b349; machine parent: 5ccde5f1c8f1692cbffcc87595fecddf7b25b349. */
#define JM_SERIALROUTE_VERSION "v1.3A"
#define JM_SERIALROUTE_SOURCE_SHA256 "7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190"
#define JM_SERIALROUTE_PORT 0x3f8U
#define JM_SERIALROUTE_TX_READY_MASK 0x20U
#define JM_SERIALROUTE_DECIMAL_BUFFER_BYTES 21U

_Static_assert(COM1 == JM_SERIALROUTE_PORT, "SerialRoute COM1 authority drift");

const char jm_generated_serialroute_source[] =
  "[JM] SERIALROUTE GENERATED v1.3A SOURCE 7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190 ACTIVE";

void jm_generated_serialroute_char(char c);
void jm_generated_serialroute_write(const char *s);
void jm_generated_serialroute_u64(uint64_t value);
void jm_generated_serialroute_receipt(const char *message);

void jm_generated_serialroute_init(void) {
  outb(COM1 + 1, 0x0);
  outb(COM1 + 3, 0x80);
  outb(COM1 + 0, 0x3);
  outb(COM1 + 1, 0x0);
  outb(COM1 + 3, 0x3);
  outb(COM1 + 2, 0xc7);
  outb(COM1 + 4, 0xb);
  jm_generated_serialroute_write(jm_generated_serialroute_source);
  jm_generated_serialroute_write("\n");
}

void jm_generated_serialroute_char(char c) {
  while ((inb(COM1 + 5) & JM_SERIALROUTE_TX_READY_MASK) == 0U) {}
  outb(COM1, (uint8_t)c);
}

void jm_generated_serialroute_write(const char *s) {
  while (*s) {
    if (*s == '\n') jm_generated_serialroute_char('\r');
    jm_generated_serialroute_char(*s++);
  }
}

void jm_generated_serialroute_u64(uint64_t value) {
  char b[JM_SERIALROUTE_DECIMAL_BUFFER_BYTES];
  size_t i = 0;
  if (!value) { jm_generated_serialroute_char('0'); return; }
  while (value && i < sizeof(b)) {
    b[i++] = (char)('0' + value % 10U);
    value /= 10U;
  }
  while (i) jm_generated_serialroute_char(b[--i]);
}

void jm_generated_serialroute_receipt(const char *message) {
  jm_generated_serialroute_write("[JM] ");
  jm_generated_serialroute_write(message);
  jm_generated_serialroute_write("\n");
}

#define serial_init jm_generated_serialroute_init
#define serial_char jm_generated_serialroute_char
#define serial_write jm_generated_serialroute_write
#define serial_u64 jm_generated_serialroute_u64
#define receipt jm_generated_serialroute_receipt
/* END GENERATED SERIALROUTE. */
