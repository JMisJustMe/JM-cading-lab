#!/usr/bin/env python3
import argparse, hashlib, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "agent-runtime" / "JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json"

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def tokens(value):
    return sorted(set(re.sub(r"[^a-z0-9]+", " ", str(value).lower()).split()))

def candidate_tokens(item):
    parts=[item.get("name",""),item.get("domain","")]
    parts += list(item.get("capabilities") or [])
    parts += list(item.get("donor_roles") or [])
    return set(tokens(" ".join(parts)))

def stable(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",",":"))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--query",default="")
    ap.add_argument("--core-only",action="store_true")
    args=ap.parse_args()

    runtime=load_json(CONTRACT_PATH)
    sources={}
    docs={}
    for key,rel in runtime["canonical_sources"].items():
        path=ROOT/rel
        docs[key]=load_json(path)
        sources[key]={"path":rel,"sha256":sha256(path)}

    agent=docs["sovereign_agent"]
    governance=docs["build_governance"]
    estate=docs["estate_capability_field"]
    current64=docs["coding_current64"]

    errors=[]
    if agent.get("schema")!="JM.SovereignAgentContract/0.1": errors.append("sovereign agent schema")
    if governance.get("schema")!="JM.BuildLawsPreferencesGovernance/1.0": errors.append("build governance schema")
    if estate.get("schema")!="JM.EstateCapabilityField/1.0": errors.append("Estate capability schema")
    if current64.get("schema")!="JM.CodingEstate.Current64/1.0": errors.append("Current64 schema")
    if len(estate.get("current_project_heads") or [])!=19: errors.append("Estate current head count")
    if len(estate.get("overlay_and_donor_profiles") or [])!=11: errors.append("Estate overlay count")
    if len(current64.get("identities") or [])!=64: errors.append("Current64 identity count")
    if errors:
        print("JM AGENT RUNTIME: FAIL " + ", ".join(errors), file=sys.stderr)
        return 1

    q=tokens(args.query)
    candidates=[]
    for kind,items in [
        ("current_project_head",estate["current_project_heads"]),
        ("overlay_donor_profile",estate["overlay_and_donor_profiles"])
    ]:
        for item in items:
            ct=candidate_tokens(item)
            score=sum(1 for t in q if t in ct)
            if score:
                candidates.append({
                    "kind":kind,
                    "id":item.get("id"),
                    "name":item.get("name"),
                    "domain":item.get("domain"),
                    "score":score
                })
    candidates.sort(key=lambda x:(-x["score"],0 if x["kind"]=="current_project_head" else 1,x["name"] or ""))

    core={
        "schema":"JM.AgentRuntimeSession/0.1",
        "authority_class":"SESSION_ROUTER_NOT_SOURCE_AUTHORITY",
        "source_digests":sources,
        "governance":{
            "master_runtime":governance.get("master_runtime"),
            "authority_gate":(governance.get("authority_gate") or {}).get("required"),
            "host_neutral":(governance.get("sovereignty") or {}).get("host_neutral")
        },
        "estate":{
            "current_project_heads":len(estate["current_project_heads"]),
            "overlay_profiles":len(estate["overlay_and_donor_profiles"]),
            "routing_authority_class":estate.get("authority_class")
        },
        "coding":{
            "current_identities":len(current64["identities"]),
            "identity_law":current64.get("identity_law")
        },
        "query":{"raw":args.query,"tokens":q},
        "route_candidates":candidates,
        "required_next":[
            "resolve live/current authority for selected head before material action",
            "preserve donor and recipient identity",
            "execute only through an authorized host route",
            "require returned consequence before Ding"
        ],
        "keeper":runtime["keeper"]
    }
    if args.core_only:
        print(stable(core))
    else:
        envelope={
            "adapter":{"implementation":"python","role":"HOST_ADAPTER_NOT_SOURCE_AUTHORITY"},
            "core":core,
            "core_sha256":hashlib.sha256(stable(core).encode("utf-8")).hexdigest()
        }
        print(json.dumps(envelope,ensure_ascii=False,sort_keys=True,indent=2))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
