#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path

EXPECTED_FIELDS = ["r15","r14","r13","r12","r11","r10","r9","r8","rsi","rdi","rbp","rdx","rcx","rbx","rax","vector","error","rip","cs","rflags","rsp","ss"]
EXPECTED_STATES = {"BODY_READY":0,"BODY_RUNNING":1,"BODY_BLOCKED":2}

def parse(path: Path) -> dict:
    raw=path.read_text(encoding="utf-8"); d={"offices":[],"frame_fields":[],"states":{},"users":[]}
    singles={"VERSION","PROOF_PARENT","MACHINE_PARENT","BODY_COUNT","CURRENT_BODY_INITIAL","TICKS_INITIAL","PAGE_USER_FLAG","PAGE_SIZE","FRAME_RFLAGS","USER_CODE_SELECTOR","USER_DATA_SELECTOR","TOKEN_REGISTER","BLOB_START","BLOB_END","RELOAD_CR3"}
    for no,line in enumerate(raw.splitlines(),1):
        p=line.strip().split()
        if not p or p[0].startswith("#"): continue
        k=p[0]
        if k=="OFFICE":
            if len(p)!=2: raise ValueError(f"line {no}: OFFICE expects one value")
            d["offices"].append(p[1]); continue
        if k=="FRAME_FIELD":
            if len(p)!=2: raise ValueError(f"line {no}: FRAME_FIELD expects one value")
            d["frame_fields"].append(p[1]); continue
        if k=="STATE":
            if len(p)!=3: raise ValueError(f"line {no}: STATE expects name value")
            d["states"][p[1]]=int(p[2],0); continue
        if k=="USER":
            if len(p)!=6: raise ValueError(f"line {no}: USER expects id code stack_page stack_top token")
            d["users"].append({"id":int(p[1],0),"code":p[2],"stack_page":p[3],"stack_top":p[4],"token":int(p[5],0)}); continue
        if k in singles:
            if len(p)!=2: raise ValueError(f"line {no}: {k} expects one value")
            if k in d: raise ValueError(f"line {no}: duplicate {k}")
            d[k]=p[1]; continue
        raise ValueError(f"line {no}: unknown directive {k}")
    for k in singles:
        if k not in d: raise ValueError(f"missing {k}")
    if d["offices"] != ["BodyRegistry","UserBoundary"]: raise ValueError("office order must be BodyRegistry then UserBoundary")
    if d["frame_fields"] != EXPECTED_FIELDS: raise ValueError("CPU frame field order must match ISR carrier contract")
    if d["states"] != EXPECTED_STATES: raise ValueError("body states must be READY/RUNNING/BLOCKED")
    if int(d["BODY_COUNT"],0)!=2 or [u["id"] for u in d["users"]] != [1,2]: raise ValueError("v0.9A requires user bodies 1 and 2")
    if [u["token"] for u in d["users"]] != [1,2]: raise ValueError("user tokens must match body ids")
    if d["TOKEN_REGISTER"] not in d["frame_fields"]: raise ValueError("token register absent from frame")
    if not re.fullmatch(r"v\d+\.\d+[A-Z]",d["VERSION"]): raise ValueError("invalid version")
    d["source_sha256"]=hashlib.sha256(raw.encode()).hexdigest(); return d

def cnum(v:str)->str: return hex(int(v,0)).upper().replace("X","x")

def render_registry(d:dict)->str:
    fields=", ".join(d["frame_fields"][:8])+";\n  uint64_t "+", ".join(d["frame_fields"][8:15])+";\n  uint64_t "+", ".join(d["frame_fields"][15:])
    return f'''/* GENERATED BODYREGISTRY. EDIT source/bodyregistry_userboundary.jmroute, NOT THIS FILE. */
#define JM_BODYREGISTRY_VERSION "{d['VERSION']}"
#define JM_BODYREGISTRY_SOURCE_SHA256 "{d['source_sha256']}"
#define JM_BODYREGISTRY_PROOF_PARENT "{d['PROOF_PARENT']}"
#define JM_BODYREGISTRY_MACHINE_PARENT "{d['MACHINE_PARENT']}"
#define JM_BODYREGISTRY_BODY_COUNT {int(d['BODY_COUNT'],0)}

_Static_assert(JM_BODYREGISTRY_BODY_COUNT == JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES, "generated body count mismatch");

struct cpu_frame {{
  uint64_t {fields};
}};
enum body_state {{ BODY_READY = 0, BODY_RUNNING = 1, BODY_BLOCKED = 2 }};
struct body {{
  uint64_t id;
  enum body_state state;
  struct cpu_frame frame;
  uint64_t runs;
}};
static struct body bodies[JM_BODYREGISTRY_BODY_COUNT];
static int current_body = {int(d['CURRENT_BODY_INITIAL'],0)};
static uint64_t ticks = {int(d['TICKS_INITIAL'],0)};

static void jm_bodyregistry_announce(void) {{
  static bool announced;
  if (!announced) {{
    serial_write("[JM] BODYREGISTRY GENERATED "); serial_write(JM_BODYREGISTRY_VERSION);
    serial_write(" SOURCE "); serial_write(JM_BODYREGISTRY_SOURCE_SHA256); serial_write(" ACTIVE\\n");
    announced = true;
  }}
}}
'''

def render_boundary(d:dict)->str:
    users=d["users"]
    page_lines=[]
    for u in users:
        page_lines += [f"  mark_user_page({u['code']});",f"  mark_user_page({u['stack_page']});"]
    frame_lines=[]
    for i,u in enumerate(users):
        frame_lines += [
            f"  bodies[{i}].id = {u['id']}; bodies[{i}].state = BODY_READY;",
            f"  bodies[{i}].frame.{d['TOKEN_REGISTER']} = {u['token']};",
            f"  bodies[{i}].frame.rip = {u['code']};",
            f"  bodies[{i}].frame.cs = {d['USER_CODE_SELECTOR']};",
            f"  bodies[{i}].frame.rflags = {cnum(d['FRAME_RFLAGS'])};",
            f"  bodies[{i}].frame.rsp = {u['stack_top']};",
            f"  bodies[{i}].frame.ss = {d['USER_DATA_SELECTOR']};",
        ]
    copy_lines=[]
    for u in users:
        copy_lines += [f"  jm_memcpy((void *){u['code']}, {d['BLOB_START']}, blob_size);",f"  jm_memset((void *){u['stack_page']}, 0, {int(d['PAGE_SIZE'],0)});"]
    return f'''/* GENERATED USERBOUNDARY. EDIT source/bodyregistry_userboundary.jmroute, NOT THIS FILE. */
#define JM_USERBOUNDARY_VERSION "{d['VERSION']}"
#define JM_USERBOUNDARY_SOURCE_SHA256 "{d['source_sha256']}"
#define JM_USERBOUNDARY_PAGE_USER_FLAG {cnum(d['PAGE_USER_FLAG'])}
#define JM_USERBOUNDARY_PAGE_SIZE {int(d['PAGE_SIZE'],0)}

static void jm_userboundary_announce(void) {{
  static bool announced;
  if (!announced) {{
    serial_write("[JM] USERBOUNDARY GENERATED "); serial_write(JM_USERBOUNDARY_VERSION);
    serial_write(" SOURCE "); serial_write(JM_USERBOUNDARY_SOURCE_SHA256); serial_write(" ACTIVE\\n");
    announced = true;
  }}
}}

static void mark_user_page(uint64_t address) {{
  size_t pde = (size_t)(address >> 21);
  size_t pte = (size_t)(address >> 12);
  boot_pml4[0] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
  boot_pdpt[0] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
  boot_pd[pde] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
  boot_pts[pte] |= JM_USERBOUNDARY_PAGE_USER_FLAG;
}}
static void user_boundary_install(void) {{
  jm_bodyregistry_announce();
  jm_userboundary_announce();
{chr(10).join(page_lines)}
  {d['RELOAD_CR3']}();

  size_t blob_size = (size_t)({d['BLOB_END']} - {d['BLOB_START']});
{chr(10).join(copy_lines)}

  jm_memset(bodies, 0, sizeof(bodies));
{chr(10).join(frame_lines)}
}}
'''

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument("source",type=Path); ap.add_argument("--out-dir",type=Path,required=True); ap.add_argument("--check",action="store_true")
    a=ap.parse_args(); d=parse(a.source); a.out_dir.mkdir(parents=True,exist_ok=True)
    meta=json.dumps(d,indent=2,sort_keys=True)+"\n"
    targets={a.out_dir/"bodyregistry_office.inc":render_registry(d),a.out_dir/"userboundary_office.inc":render_boundary(d),a.out_dir/"bodyregistry_userboundary.json":meta}
    if a.check:
        bad=[str(p) for p,c in targets.items() if not p.exists() or p.read_text()!=c]
        if bad: raise SystemExit("stale generated outputs: "+", ".join(bad))
    else:
        for p,c in targets.items(): p.write_text(c)
    return 0
if __name__=="__main__": raise SystemExit(main())
