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

def activation_record(current64, policy, surface, current64_sha, policy_sha):
    identities=current64.get("identities") or []
    active_by_id={x["code_id"]:x["reason"] for x in (policy.get("baseline_active") or [])}
    support_map=policy.get("surface_support") or {}
    surface_key=surface if surface in support_map else "other"

    body_states=[]
    active_code_ids=[]
    active_bodies=[]
    available=[]
    for body in identities:
        code_id=body.get("code_id")
        base={
            "code_id":code_id,
            "name":body.get("name"),
            "slug":body.get("slug")
        }
        if code_id in active_by_id:
            item={**base,
                "state":"ACTIVE_ROUTE",
                "reason":active_by_id[code_id],
                "proof_class":"DETERMINISTIC_ROUTE_SELECTION"
            }
            active_code_ids.append(code_id)
            active_bodies.append(item)
            body_states.append(item)
        else:
            item={**base,"state":"AVAILABLE_NOT_SELECTED"}
            available.append(item)
            body_states.append(item)

    return {
        "schema":"JM.CodingBodyActivation/1.0",
        "authority_class":"PER_RUN_ROUTE_SELECTION_NOT_PROCESS_AUTHORITY",
        "selection_mode":policy.get("selection_mode"),
        "requested_surface":surface,
        "surface_profile":surface_key,
        "policy_sha256":policy_sha,
        "current64_sha256":current64_sha,
        "accounting":{
            "active_route":len(active_bodies),
            "available_not_selected":len(available),
            "current_coding_identities":len(identities)
        },
        "active_code_ids":active_code_ids,
        "active_bodies":active_bodies,
        "available_not_selected":[
            {"code_id":x["code_id"],"name":x["name"],"slug":x["slug"]}
            for x in available
        ],
        "body_states":body_states,
        "supporting_organs":support_map.get(surface_key,[]),
        "selection_is_process_execution":False,
        "direct_execution_boundary":(policy.get("proof_semantics") or {}).get("direct_execution_boundary"),
        "keeper":policy.get("keeper"),
        "future_extension_boundary":policy.get("future_extension_boundary")
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--query",default="")
    ap.add_argument("--surface",default="portable-runtime")
    ap.add_argument("--core-only",action="store_true")
    ap.add_argument("--activation-only",action="store_true")
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
    policy=docs["coding_activation_policy"]

    errors=[]
    if agent.get("schema")!="JM.SovereignAgentContract/0.1": errors.append("sovereign agent schema")
    if governance.get("schema")!="JM.BuildLawsPreferencesGovernance/1.0": errors.append("build governance schema")
    if estate.get("schema")!="JM.EstateCapabilityField/1.0": errors.append("Estate capability schema")
    if current64.get("schema")!="JM.CodingEstate.Current64/1.0": errors.append("Current64 schema")
    if policy.get("schema")!="JM.CodingBodyActivationPolicy/0.1": errors.append("coding activation policy schema")
    if len(estate.get("current_project_heads") or [])!=19: errors.append("Estate current head count")
    if len(estate.get("overlay_and_donor_profiles") or [])!=11: errors.append("Estate overlay count")
    if len(current64.get("identities") or [])!=64: errors.append("Current64 identity count")
    if errors:
        print("JM AGENT RUNTIME: FAIL " + ", ".join(errors), file=sys.stderr)
        return 1

    activation=activation_record(
        current64, policy, args.surface,
        sources["coding_current64"]["sha256"],
        sources["coding_activation_policy"]["sha256"]
    )
    if activation["accounting"]!={"active_route":12,"available_not_selected":52,"current_coding_identities":64}:
        print("JM AGENT RUNTIME: FAIL coding activation accounting drift", file=sys.stderr)
        return 1

    if args.activation_only:
        print(stable(activation))
        return 0

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
            "identity_law":current64.get("identity_law"),
            "activation":activation
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
            "adapter":{
                "implementation":"python",
                "role":"HOST_ADAPTER_NOT_SOURCE_AUTHORITY",
                "executed_carrier":"agent-runtime/jm_agent_runtime.py"
            },
            "core":core,
            "core_sha256":hashlib.sha256(stable(core).encode("utf-8")).hexdigest()
        }
        print(json.dumps(envelope,ensure_ascii=False,sort_keys=True,indent=2))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
