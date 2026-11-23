#!/usr/bin/env python3
"""Read-only JM Agent Skills route contact through existing Python and Node runtimes."""
import argparse, hashlib, json, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[3]
SKILL=pathlib.Path(__file__).resolve().parent
CONTRACT=ROOT/"agent-runtime/JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json"
SCHEMA="JM.AgentSkillReadOnlyContact/0.3"

def stable(x):
    return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
def run_child(cmd):
    p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=45,check=False)
    if p.returncode:
        raise RuntimeError("CHILD_EXIT_"+str(p.returncode)+": "+p.stderr[:220])
    try: return json.loads(p.stdout)
    except json.JSONDecodeError: raise RuntimeError("INVALID_CHILD_JSON")

def contact(query,surface="codex-repository-agent"):
    if not query or len(query)>4000 or "\x00" in query:
        raise ValueError("INVALID_QUERY")
    if not surface or len(surface)>80 or "\x00" in surface:
        raise ValueError("INVALID_SURFACE")
    spec=json.loads(CONTRACT.read_text(encoding="utf-8"))
    paths={
        "AGENTS.md",
        "JM_ESTATE/GOVERNANCE/JM_BUILD_LAWS_PREFERENCES_GOVERNANCE_STANDARD_v1.0.md",
        "JM_ESTATE/GOVERNANCE/JM_ESTATE_CAPABILITY_ROUTING_STANDARD_v1.0.md",
        "coding-estate/JM_CODING_ESTATE_RUNNING_STANDARD_v1_0.md",
        "agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md",
        "agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_v1_0.json",
        "agent-runtime/host-adapters/JM_HOST_ADAPTER_REGISTRY_v1_0.json",
        "agent-runtime/host-adapters/jm_host_adapter_conformance.py",
        "agent-runtime/JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json",
        "agent-runtime/jm_agent_runtime.py",
        "agent-runtime/jm-agent-runtime.mjs",
    }|set(spec["canonical_sources"].values())
    for name in paths:
        p=(ROOT/name).resolve()
        if not p.is_relative_to(ROOT.resolve()) or not p.is_file():
            raise RuntimeError("MISSING_OR_ESCAPE_AUTHORITY: "+name)
    before={name:sha(ROOT/name) for name in sorted(paths)}
    opts=["--core-only","--query",query,"--surface",surface]
    a=run_child([sys.executable,str(ROOT/"agent-runtime/jm_agent_runtime.py"),*opts])
    b=run_child(["node",str(ROOT/"agent-runtime/jm-agent-runtime.mjs"),*opts])
    after={name:sha(ROOT/name) for name in sorted(paths)}
    problems=[]
    if stable(a)!=stable(b): problems.append("NODE_PYTHON_PARITY")
    if a.get("schema")!="JM.AgentRuntimeSession/0.1": problems.append("CORE_SCHEMA")
    if a.get("authority_class")!="SESSION_ROUTER_NOT_SOURCE_AUTHORITY": problems.append("CORE_AUTHORITY")
    if (a.get("query") or {}).get("raw")!=query: problems.append("QUERY_MUTATED")
    activation=(a.get("coding") or {}).get("activation") or {}
    if activation.get("accounting")!={"active_route":12,"available_not_selected":52,"current_coding_identities":64}:
        problems.append("ACTIVATION_ACCOUNTING")
    if activation.get("selection_is_process_execution") is not False:
        problems.append("PROCESS_INFLATION")
    if activation.get("requested_surface")!=surface: problems.append("SURFACE_MUTATED")
    if before!=after: problems.append("AUTHORITIES_MUTATED")
    for k,v in (a.get("source_digests") or {}).items():
        if not isinstance(v,dict) or after.get(v.get("path"))!=v.get("sha256"):
            problems.append("SOURCE_DIGEST_"+k)
    if not a.get("source_digests"): problems.append("NO_SOURCE_DIGESTS")
    candidates=a.get("route_candidates") or []
    state="BUGG" if problems else "HELD"
    envelope={
        "schema":SCHEMA,"version":"0.3.0","carrier":"jm-ecostate-route-project-local-skill",
        "action":"READ_ONLY_ROUTE","source_hashes":after,"core_sha256":digest(stable(a)),
        "query":query,"query_sha256":digest(query),"surface_requested":surface,
        "candidate_count":0 if problems else len(candidates),
        "selected_candidates":[] if problems else candidates[:5],
        "coding_selection":activation.get("accounting",{}),
        "coding_selection_is_process_execution":False,
        "scope_state":state,
        "result":"FAIL_CLOSED" if problems else "ROUTE_CANDIDATES_ONLY" if candidates else "NO_MATCHING_CANDIDATE",
        "discrepancies":sorted(set(problems)),
        "host_contact":"OPEN","owner_device_contact":"OPEN",
        "live_current_head_resolution":"OPEN","external_agent_skill_discovery":"NOT_TESTED",
        "target_consequence":"NOT_ATTEMPTED",
        "recovery":"Discard additive draft branch; main and existing JM authorities remain unchanged.",
        "laws":["NO DING, NO CLAIM","MESH ≠ MERGE","ADAPTER ≠ BODY"]
    }
    envelope["receipt_sha256"]=digest(stable(envelope))
    return envelope

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--query",required=True)
    parser.add_argument("--surface",default="codex-repository-agent")
    parser.add_argument("--receipt")
    args=parser.parse_args()
    try:
        result=contact(args.query,args.surface)
        body=json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+"\n"
        if args.receipt: pathlib.Path(args.receipt).write_text(body,encoding="utf-8")
        print(body,end="")
        return 1 if result["scope_state"]=="BUGG" else 0
    except Exception as exc:
        print("JM SKILL GATE: BUGG "+type(exc).__name__+": "+str(exc),file=sys.stderr)
        return 1
if __name__=="__main__":
    raise SystemExit(main())
