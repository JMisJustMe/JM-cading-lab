#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path
EXPECTED={"arguments": ["multiboot_magic", "multiboot_info"], "office": "EntryRoute", "retained_symbols": ["jm_generated_entryroute_announce", "routeos_kernel_entry"], "version": "v1.7A"}
OUTPUTS={'entryroute_head.inc': '/* GENERATED ENTRYROUTE v1.7A HEAD SOURCE b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647. */\n#define JM_ENTRYROUTE_VERSION "v1.7A"\n#define JM_ENTRYROUTE_SOURCE_SHA256 "b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647"\nstatic void jm_generated_entryroute_announce(void) __attribute__((noinline, used));\nconst char jm_generated_entryroute_source[] =\n  "[JM] ENTRYROUTE GENERATED v1.7A SOURCE b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647 ACTIVE";\nstatic void jm_generated_entryroute_announce(void) {\n  static bool announced;\n  if (!announced) { serial_write(jm_generated_entryroute_source); serial_write("\\n"); announced = true; }\n}\n/* END GENERATED ENTRYROUTE HEAD. */\n', 'entryroute_tail.inc': '/* GENERATED ENTRYROUTE v1.7A TAIL SOURCE b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647. */\n__attribute__((noreturn, noinline, used)) void routeos_kernel_entry(uint32_t magic, uint32_t mb_info) {\n  jm_generated_ignitionbody(magic, mb_info);\n}\n/* END GENERATED ENTRYROUTE TAIL. */\n', 'entryroute.json': '{\n  "generated": {\n    "entryroute_head.inc": "37cda9b49c9f481517d74f5bcd0361fabf11e847f43dab9b8e2327e0817db068",\n    "entryroute_tail.inc": "014c792c9d29b07612f09879ae03d66a3ea73f77ee6b225afc3ec598f4a88077"\n  },\n  "retained_symbols": [\n    "jm_generated_entryroute_announce",\n    "routeos_kernel_entry"\n  ],\n  "source_sha256": "b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647",\n  "version": "v1.7A"\n}\n'}
def main():
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--check',action='store_true');a=p.parse_args();raw=a.source.read_text()
 if json.loads(raw)!=EXPECTED or hashlib.sha256(raw.encode()).hexdigest()!='b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647': raise SystemExit('HOLD: source drift')
 a.out_dir.mkdir(parents=True,exist_ok=True)
 for n,d in OUTPUTS.items():
  q=a.out_dir/n
  if a.check:
   if not q.exists() or q.read_text()!=d: raise SystemExit(f'HOLD: generated {n} drift')
  else:q.write_text(d)
if __name__=='__main__':main()
