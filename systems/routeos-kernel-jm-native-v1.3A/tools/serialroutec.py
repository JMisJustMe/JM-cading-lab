#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, sys
from pathlib import Path

EXPECTED = {
    'VERSION':'v1.3A',
    'PROOF_PARENT':'5ccde5f1c8f1692cbffcc87595fecddf7b25b349',
    'MACHINE_PARENT':'5ccde5f1c8f1692cbffcc87595fecddf7b25b349',
    'PORT':'0x3F8','IER_OFFSET':'1','LCR_OFFSET':'3','DLL_OFFSET':'0','DLM_OFFSET':'1',
    'FCR_OFFSET':'2','MCR_OFFSET':'4','LSR_OFFSET':'5','IER_DISABLED':'0x00',
    'DLAB_ENABLE':'0x80','DIVISOR_LOW':'0x03','DIVISOR_HIGH':'0x00','LINE_8N1':'0x03',
    'FIFO_ENABLE_CLEAR_14':'0xC7','MODEM_DTR_RTS_OUT2':'0x0B','TX_READY_MASK':'0x20',
    'DECIMAL_BUFFER_BYTES':'21','NEWLINE_MODE':'CRLF','PREFIX':'[JM]_'
}
OFFICE='SerialRoute'
SOURCE_HASH='7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190'
GENERATED_HASH='7c0a1b5ef42702a035832e9e375444206bb559d031c4810f316b54d9883aff14'

def parse(path: Path) -> None:
    values={}; offices=[]
    for n,raw in enumerate(path.read_text().splitlines(),1):
        line=raw.strip()
        if not line or line.startswith('#'): continue
        parts=line.split(maxsplit=1)
        if len(parts)!=2: raise ValueError(f'line {n}: expected KEY VALUE')
        key,value=parts
        if key=='OFFICE': offices.append(value); continue
        if key in values: raise ValueError(f'line {n}: duplicate {key}')
        values[key]=value
    if offices != [OFFICE]: raise ValueError(f'office order mismatch: {offices}')
    missing=sorted(set(EXPECTED)-set(values)); extra=sorted(set(values)-set(EXPECTED))
    if missing or extra: raise ValueError(f'key mismatch missing={missing} extra={extra}')
    for key,want in EXPECTED.items():
        if values[key] != want: raise ValueError(f'{key} must remain {want}')
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != SOURCE_HASH: raise ValueError(f'source hash drift: {actual}')

def office() -> str:
    return '''/* GENERATED SERIALROUTE v1.3A SOURCE 7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190. */
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
  jm_generated_serialroute_write("\\n");
}

void jm_generated_serialroute_char(char c) {
  while ((inb(COM1 + 5) & JM_SERIALROUTE_TX_READY_MASK) == 0U) {}
  outb(COM1, (uint8_t)c);
}

void jm_generated_serialroute_write(const char *s) {
  while (*s) {
    if (*s == '\\n') jm_generated_serialroute_char('\\r');
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
  jm_generated_serialroute_write("\\n");
}

#define serial_init jm_generated_serialroute_init
#define serial_char jm_generated_serialroute_char
#define serial_write jm_generated_serialroute_write
#define serial_u64 jm_generated_serialroute_u64
#define receipt jm_generated_serialroute_receipt
/* END GENERATED SERIALROUTE. */
'''

def record(text: str) -> str:
    marker=f'[JM] SERIALROUTE GENERATED v1.3A SOURCE {SOURCE_HASH} ACTIVE'
    data={'decimal_buffer_bytes':21,'generated_sha256':hashlib.sha256(text.encode()).hexdigest(),
          'machine_parent':EXPECTED['MACHINE_PARENT'],'newline_mode':'CRLF','offices':[OFFICE],
          'port':1016,'proof_parent':EXPECTED['PROOF_PARENT'],'runtime_marker':marker,
          'source_sha256':SOURCE_HASH,'symbols':['jm_generated_serialroute_init','jm_generated_serialroute_char',
          'jm_generated_serialroute_write','jm_generated_serialroute_u64','jm_generated_serialroute_receipt',
          'jm_generated_serialroute_source'],'tx_ready_mask':32,'version':'v1.3A'}
    return json.dumps(data,indent=2,sort_keys=True)+'\n'

def write(path: Path, text: str, check: bool) -> None:
    if check:
        if not path.exists() or path.read_text()!=text: raise SystemExit(f'HOLD: stale generated output: {path}')
    else:
        path.parent.mkdir(parents=True,exist_ok=True); path.write_text(text)

def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument('source',type=Path); ap.add_argument('--out-dir',type=Path,required=True); ap.add_argument('--check',action='store_true'); a=ap.parse_args()
    parse(a.source); generated=office()
    if hashlib.sha256(generated.encode()).hexdigest()!=GENERATED_HASH: raise SystemExit('HOLD: compiler template hash drift')
    write(a.out_dir/'serialroute_office.inc',generated,a.check)
    write(a.out_dir/'serialroute.json',record(generated),a.check)
    if not a.check: print(SOURCE_HASH); print(GENERATED_HASH)
    return 0
if __name__=='__main__':
    try: raise SystemExit(main())
    except ValueError as exc: print(f'HOLD: {exc}',file=sys.stderr); raise SystemExit(2)
