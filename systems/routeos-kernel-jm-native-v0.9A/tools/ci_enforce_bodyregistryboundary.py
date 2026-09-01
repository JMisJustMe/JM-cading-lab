#!/usr/bin/env python3
from pathlib import Path
import sys
trace=Path(sys.argv[1]).read_text(encoding="utf-8",errors="replace")
source=Path(sys.argv[2]).read_text(encoding="utf-8")
sha="c84db3d5aaad07e90b45d4ac84216cd9c60c0fbc22d25a00caeccb6354bda99f"
markers={
"ignition":"[JM] IGNITIONBODY GENERATED v0.7A SOURCE e038b1549e6831de566ef2180a1b83a5c2071aa2b3951bb415e3c1002e4d0c22 ACTIVE",
"memory":"[JM] MEMORYBODY GENERATED v0.5A SOURCE 847e3d7266a5873d099c0b3403df5e7dd6fea3f8e09ab1092bc28178083fcbe8 ACTIVE",
"descriptor":"[JM] DESCRIPTORBODY GENERATED v0.8A SOURCE 680ba2c31be8dfa7b8ebde7ea518ca385c7faa3906f5ac8af8ecb7c52c4165ea ACTIVE",
"registry":f"[JM] BODYREGISTRY GENERATED v0.9A SOURCE {sha} ACTIVE",
"boundary":f"[JM] USERBOUNDARY GENERATED v0.9A SOURCE {sha} ACTIVE",
"interrupt":"[JM] INTERRUPTROUTE GENERATED v0.8A SOURCE 680ba2c31be8dfa7b8ebde7ea518ca385c7faa3906f5ac8af8ecb7c52c4165ea ACTIVE",
"scheduler":"[JM] ROUTESCHEDULER GENERATED v0.4A SOURCE 13d2d2cc90d338cd7a1177caa150dd16f3ec2aa32d0f0fb5c1959e11898b632c ACTIVE",
"permission":"[JM] PERMISSIONGATE GENERATED v0.3A SOURCE 2bc50156fe908d6bb9eff42e27296736c2235ecd5a065dec75bccbb15fa7fac2 ACTIVE",
"fault":"[JM] FAULTHOLD GENERATED v0.6A SOURCE 2bbcf026b977de46e10ea9d8a337b96a901e69bd6514880fb32fb8d79dedfd00 ACTIVE",
"recovery":"[JM] RECOVERYBODY GENERATED v0.6A SOURCE 2bbcf026b977de46e10ea9d8a337b96a901e69bd6514880fb32fb8d79dedfd00 SELECT SAFE NEXT",
}
for name,marker in markers.items():
    if trace.count(marker)!=1: raise SystemExit(f"HOLD: {name} marker count wrong")
authority="[JM] JM_NATIVE AUTHORITY v0.2A"
interrupt_receipt="[JM] INTERRUPT ROUTE ACTIVE"
registry_receipt="[JM] BODYREGISTRY: TWO USER BODIES REGISTERED"
order=[markers["ignition"],authority,markers["memory"],markers["descriptor"],markers["registry"],markers["boundary"],markers["interrupt"],interrupt_receipt,registry_receipt,markers["scheduler"],markers["permission"],markers["fault"],markers["recovery"]]
pos=[]
for marker in order:
    if marker not in trace: raise SystemExit(f"HOLD: ordered marker missing: {marker}")
    pos.append(trace.index(marker))
if pos!=sorted(pos): raise SystemExit("HOLD: BodyRegistry/UserBoundary machine order is wrong")
for inherited in ("USER BODY 1 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS","USER BODY 2 -> SYSTEM CALL TRACE_READ -> PERMISSIONGATE PASS","FAULTHOLD: USER BODY 2 INVALID OPCODE CAUGHT","RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES"):
    if inherited not in trace: raise SystemExit(f"HOLD: inherited marker missing: {inherited}")
if source.count("/* GENERATED BODYREGISTRY.")!=1 or source.count("/* GENERATED USERBOUNDARY.")!=1: raise SystemExit("HOLD: generated offices not singular")
if "/* ---- BODYREGISTRY / ROUTESCHEDULER ---- */" in source: raise SystemExit("HOLD: handwritten BodyRegistry remains")
if source.count("static void user_boundary_install(void)")!=1: raise SystemExit("HOLD: generated UserBoundary not singular")
print("JM_GENERATED_BODYREGISTRY_USERBOUNDARY_TRACE PASS")
