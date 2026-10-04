#!/usr/bin/env python3
import argparse
import json
import pathlib
import subprocess
import sys

ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=ROOT/"agent-runtime"/"host-adapters"
CONTRACT=BASE/"JM_HOST_ADAPTER_CONFORMANCE_v1_0.json"
REGISTRY=BASE/"JM_HOST_ADAPTER_REGISTRY_v1_0.json"

LEVELS=["DECLARED","CONTRACT","TRANSPORT","FUNCTION","HOST_CONTACT","OWNER_DEVICE"]
RESULTS={"PASS","OPEN","NA"}

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def required_gates(contract,level):
    out=[]
    for gate in contract["gates"]:
        if level in gate["required_for"]:
            out.append(gate["id"])
    return out

def core_out(cmd,query):
    return subprocess.check_output(cmd+["--core-only","--query",query],cwd=ROOT,text=True).strip()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--all",action="store_true")
    ap.add_argument("--adapter",action="append",default=[])
    ap.add_argument("--run-local",action="store_true")
    args=ap.parse_args()

    contract=load(CONTRACT)
    registry=load(REGISTRY)
    errors=[]
    warnings=[]

    if contract.get("schema")!="JM.HostAdapterConformance/1.0":
        errors.append("conformance schema mismatch")
    if registry.get("schema")!="JM.HostAdapterRegistry/1.0":
        errors.append("registry schema mismatch")
    if contract.get("authority_class")!="CONFORMANCE_TESTER_NOT_HOST_OR_SOURCE_AUTHORITY":
        errors.append("authority class drift")

    gate_ids=[g["id"] for g in contract["gates"]]
    adapters=registry.get("adapters") or []
    ids=[a.get("id") for a in adapters]
    if len(ids)!=len(set(ids)):
        errors.append("duplicate adapter id")

    selected=adapters if args.all or not args.adapter else [a for a in adapters if a.get("id") in set(args.adapter)]
    if args.adapter:
        missing=set(args.adapter)-{a.get("id") for a in selected}
        for item in sorted(missing):
            errors.append(f"unknown requested adapter: {item}")

    for adapter in selected:
        aid=adapter.get("id","<missing>")
        level=adapter.get("proof_level")
        if level not in LEVELS:
            errors.append(f"{aid}: invalid proof_level {level!r}")
            continue
        gates=adapter.get("gates") or {}
        if set(gates)!=set(gate_ids):
            errors.append(f"{aid}: gate set mismatch")
            continue
        for gid,result in gates.items():
            if result not in RESULTS:
                errors.append(f"{aid}: invalid {gid} result {result!r}")
        evidence=adapter.get("evidence") or []
        missing_paths=[p for p in evidence if not (ROOT/p).exists()]
        if missing_paths:
            errors.append(f"{aid}: missing evidence paths: {missing_paths}")
        pass_count=sum(1 for v in gates.values() if v=="PASS")
        if pass_count and not evidence:
            errors.append(f"{aid}: PASS gates require durable evidence")

        for gid in required_gates(contract,level):
            if gates.get(gid)!="PASS":
                errors.append(f"{aid}: proof level {level} requires {gid}=PASS")

        # NA is forbidden on gates needed at or below the claimed level.
        for gid in required_gates(contract,level):
            if gates.get(gid)=="NA":
                errors.append(f"{aid}: required gate {gid} cannot be NA")

        open_gates=[gid for gid,v in gates.items() if v=="OPEN"]
        if open_gates:
            warnings.append(f"{aid}: OPEN -> {', '.join(open_gates)}")

    if args.run_local:
        samples=["music release","coding runtime","theory research","zzzz-no-known-domain"]
        py=["python3","agent-runtime/jm_agent_runtime.py"]
        node=["node","agent-runtime/jm-agent-runtime.mjs"]
        for query in samples:
            py_out=core_out(py,query)
            node_out=core_out(node,query)
            if py_out!=node_out:
                errors.append(f"local parity mismatch for query {query!r}")
                continue
            core=json.loads(py_out)
            if query=="zzzz-no-known-domain" and core.get("route_candidates")!=[]:
                errors.append("unknown-domain query fabricated a route")
            if core.get("authority_class")!="SESSION_ROUTER_NOT_SOURCE_AUTHORITY":
                errors.append(f"runtime authority drift for query {query!r}")
        if not errors:
            print("LOCAL REFERENCE PLUGS: PASS — Node/Python core parity preserved")

    if errors:
        print("JM HOST ADAPTER CONFORMANCE: FAIL")
        for e in errors: print("- "+e)
        return 1

    print("JM HOST ADAPTER CONFORMANCE: PASS")
    print(f"adapters_checked={len(selected)} proof_levels={len(LEVELS)} gates={len(gate_ids)}")
    for a in selected:
        opens=[k for k,v in a["gates"].items() if v=="OPEN"]
        print(f"- {a['id']}: {a['proof_level']} | open={','.join(opens) if opens else 'none'}")
    if warnings:
        print("OPEN BOUNDARIES PRESERVED:")
        for w in warnings: print("- "+w)
    return 0

if __name__=="__main__":
    raise SystemExit(main())
