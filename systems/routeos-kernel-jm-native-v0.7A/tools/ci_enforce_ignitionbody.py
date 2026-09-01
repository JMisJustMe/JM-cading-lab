#!/usr/bin/env python3
from pathlib import Path
import sys

trace = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
source = Path(sys.argv[2]).read_text(encoding="utf-8")
ignition = "[JM] IGNITIONBODY GENERATED v0.7A SOURCE e038b1549e6831de566ef2180a1b83a5c2071aa2b3951bb415e3c1002e4d0c22 ACTIVE"
authority = "[JM] JM_NATIVE AUTHORITY v0.2A"
memory = "[JM] MEMORYBODY GENERATED v0.5A SOURCE 847e3d7266a5873d099c0b3403df5e7dd6fea3f8e09ab1092bc28178083fcbe8 ACTIVE"
scheduler = "[JM] ROUTESCHEDULER GENERATED v0.4A SOURCE 13d2d2cc90d338cd7a1177caa150dd16f3ec2aa32d0f0fb5c1959e11898b632c ACTIVE"
permission = "[JM] PERMISSIONGATE GENERATED v0.3A SOURCE 2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2 ACTIVE"
fault = "[JM] FAULTHOLD GENERATED v0.6A SOURCE 2bbcf026b977de46e10ea9d8a337b96a901e69bd6514880fb32fb8d79dedfd00 ACTIVE"
recovery = "[JM] RECOVERYBODY GENERATED v0.6A SOURCE 2bbcf026b977de46e10ea9d8a337b96a901e69bd6514880fb32fb8d79dedfd00 SELECT SAFE NEXT"
for marker in (ignition, memory, scheduler, permission, fault, recovery):
    if trace.count(marker) != 1:
        raise SystemExit(f"HOLD: generated marker count wrong: {marker}")
if authority not in trace or not (trace.index(ignition) < trace.index(authority) < trace.index(memory)):
    raise SystemExit("HOLD: IgnitionBody did not govern boot order")
for inherited in (
    "MEMORY INITIALISED: ALLOCATE/RELEASE PASS",
    "USER BODY 1 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS",
    "USER BODY 2 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS",
    "FAULTHOLD: USER BODY 2 INVALID OPCODE CAUGHT",
    "RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES",
):
    if inherited not in trace:
        raise SystemExit(f"HOLD: inherited marker missing: {inherited}")
if source.count("static void jm_generated_ignitionbody") != 1:
    raise SystemExit("HOLD: generated IgnitionBody function is not singular")
if source.count("jm_generated_ignitionbody(magic, mb_info);") != 1:
    raise SystemExit("HOLD: IgnitionBody entry wrapper is not singular")
wrapper = source.split("__attribute__((noreturn)) void routeos_kernel_entry", 1)[1]
if "serial_init();" in wrapper.split("}", 1)[0]:
    raise SystemExit("HOLD: handwritten entry orchestration remains")
print("JM_GENERATED_IGNITIONBODY_TRACE PASS")
