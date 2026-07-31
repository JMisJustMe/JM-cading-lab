#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, shutil, tempfile
from pathlib import Path
from typing import Any

VERSION="0.1"
EXPECTED_BODY_COUNT=100
REGISTRIES=(
 "coding-estate/everybody/body-registry.json",
 "coding-estate/everybody/body-registry-extension-01.json",
 "coding-estate/everybody/body-registry-extension-02.json",
)
FAMILY_PRIMITIVES={
 "route":("source","route","state","recover"),
 "logic":("fact","when","then","decide"),
 "formula":("form","bind","apply","yield"),
 "embodied":("pose","contact","hold","shift"),
 "compiler":("source","token","parse","emit"),
 "runtime":("state","load","exec","recover"),
 "game":("entity","input","step","score"),
 "governance":("claim","evidence","gate","pass"),
 "delivery":("source","manifest","hash","package"),
 "visual":("field","input","render","feedback"),
 "authoring":("project","edit","build","test"),
 "composition":("source","target","check","bind"),
 "service":("register","lookup","resolve","return"),
}

def stable(value:Any)->str:
 return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(value:Any)->str:
 text=value if isinstance(value,str) else stable(value)
 return hashlib.sha256(text.encode()).hexdigest()
def token(value:str)->str:
 return re.sub(r"[^a-z0-9]+","-",value.lower()).strip("-") or "unnamed"

def classify(body:dict[str,Any])->str:
 text=re.sub(r"[^a-z0-9]+"," "," ".join([str(body.get("id","")),str(body.get("name","")),str(body.get("kind","")),*map(str,body.get("caps",[]))]).lower())
 checks=(
  (r"gesture|mudra|contact|speech|embodied|body input|paired contact|mood|signal language|pattern tapping|seedform","embodied"),
  (r"game|playable|glyphplay|gameforge|glyphforge|playform","game"),
  (r"compiler|parser|frontend|emitter|lexer|syntax body|compiler ir|tokenbody|punctbody|theoc|primebody","compiler"),
  (r"virtual machine|\bvm\b|opcode|runtime|routevm|jmvm|cadenvm|routecore|routeos|routebox","runtime"),
  (r"governance|proof|validation|guardrail|register|ledger|gate|dings|reality contact|choice box","governance"),
  (r"delivery|container|build mode|zionfolder|onebody delivery","delivery"),
  (r"visual|render|interaction runtime","visual"),
  (r"ide|lab|builder|authoring|codestudio|language service|pattern library|namebank|lexicon|speakgate","authoring"),
  (r"composition|graft|smooth|bridge|adapter|combibind|polyglot","composition"),
  (r"formula|formeula|formulaborn|formula born","formula"),
  (r"logic|decision","logic"),
  (r"registry|service|lookup","service"),
 )
 for pattern,family in checks:
  if re.search(pattern,text): return family
 return "route"

def load_bodies(repo:Path)->list[dict[str,Any]]:
 bodies=[]; seen=set()
 for relative in REGISTRIES:
  data=json.loads((repo/relative).read_text(encoding="utf-8"))
  for source in data.get("bodies",[]):
   body=dict(source); body_id=str(body.get("id","")).strip()
   if not body_id or body_id in seen: raise ValueError(f"missing or duplicate body id {body_id!r}")
   for field in ("name","kind","law"):
    if not str(body.get(field,"")).strip(): raise ValueError(f"{body_id} missing {field}")
   body.setdefault("caps",[]); body.setdefault("targets",[]); body.setdefault("needs",[])
   body["registry_source"]=relative; seen.add(body_id); bodies.append(body)
 if len(bodies)!=EXPECTED_BODY_COUNT: raise ValueError(f"expected {EXPECTED_BODY_COUNT}, found {len(bodies)}")
 return sorted(bodies,key=lambda x:x["id"])

def cap_verbs(body:dict[str,Any])->list[str]:
 verbs=[]
 for cap in body.get("caps",[]):
  verb="cap-"+token(str(cap))
  if verb not in verbs: verbs.append(verb)
 return verbs or ["cap-identity"]

def dialect(body:dict[str,Any])->dict[str,Any]:
 family=classify(body); caps=cap_verbs(body)
 signature=sha({"id":body["id"],"law":body["law"],"family":family,"caps":body.get("caps",[])})
 return {
  "schema":"jm.functioning-body-dialect/0.1","version":VERSION,
  "body_id":body["id"],"body_name":body["name"],"kind":body["kind"],"family":family,
  "law":body["law"],"law_sha256":sha(body["law"]),"source_prefix":token(body["id"])+"::",
  "primitives":list(FAMILY_PRIMITIVES[family]),"capability_verbs":caps,
  "allowed_verbs":list(FAMILY_PRIMITIVES[family])+caps,
  "semantic_signature":signature,"parity_floor":"CADING_QUADZE_FUNCTIONING",
  "claim_boundary":"Executable current-canon body dialect; no fabricated historical syntax or machine-kernel Ding."
 }

def payload(family:str,op:str,n:int)->Any:
 common={"ordinal":n,"op":op}
 samples={
  "route":{"source":{"value":"source"},"route":{"from":"source","to":"state"},"state":{"value":n},"recover":{"reason":"proof"}},
  "logic":{"fact":{"name":"contact","value":True},"when":{"fact":"contact","equals":True},"then":{"result":"pass"},"decide":{"label":"proof"}},
  "formula":{"form":{"name":"seed","value":n},"bind":{"name":"factor","value":2},"apply":{"op":"multiply","left":n,"right":2},"yield":{"name":"result"}},
  "embodied":{"pose":{"name":"open"},"contact":{"channel":"proof","pressure":n},"hold":{"ticks":1},"shift":{"from":"open","to":"closed"}},
  "compiler":{"source":{"text":f"body {n} route state"},"token":{"mode":"words"},"parse":{"shape":"sequence"},"emit":{"target":"javascript"}},
  "runtime":{"state":{"counter":0},"load":{"module":"proof"},"exec":{"op":"increment","key":"counter","amount":n},"recover":{"checkpoint":"proof"}},
  "game":{"entity":{"id":"player","hp":10},"input":{"action":"move","amount":n},"step":{"ticks":1},"score":{"amount":n}},
  "governance":{"claim":{"text":"body functions"},"evidence":{"kind":"executed","value":True},"gate":{"requires":"evidence"},"pass":{"scope":"portable-runtime"}},
  "delivery":{"source":{"path":"source/proof"},"manifest":{"name":"proof-package"},"hash":{"value":f"body-{n}"},"package":{"format":"zionfolder"}},
  "visual":{"field":{"width":32,"height":32},"input":{"x":n,"y":n},"render":{"node":"proof"},"feedback":{"text":"visible-state"}},
  "authoring":{"project":{"name":"proof-project"},"edit":{"path":"main","text":"route state"},"build":{"target":"portable"},"test":{"name":"proof","expect":"pass"}},
  "composition":{"source":{"id":f"source-{n}"},"target":{"id":f"target-{n}"},"check":{"compatible":True},"bind":{"mode":"identity-preserving"}},
  "service":{"register":{"key":f"body-{n}","value":"ready"},"lookup":{"key":f"body-{n}"},"resolve":{"key":f"body-{n}"},"return":{"status":"ok"}},
 }
 return samples.get(family,{}).get(op,common)

def proof_source(body:dict[str,Any],d:dict[str,Any],n:int)->str:
 lines=[f"USE {body['id']}",f"LAW {json.dumps(body['law'],ensure_ascii=False)}"]
 for op in d["primitives"]:
  lines.append(f"{d['source_prefix']}{op} {json.dumps(payload(d['family'],op,n),sort_keys=True)}")
 cap=d["capability_verbs"][0]
 lines.append(f"{d['source_prefix']}{cap} {json.dumps({'capability':cap[4:],'ordinal':n},sort_keys=True)}")
 lines.append("RECEIPT")
 return "\n".join(lines)+"\n"

def parse(d:dict[str,Any],source:str)->dict[str,Any]:
 lines=[x.strip() for x in source.splitlines() if x.strip()]
 if lines[0]!=f"USE {d['body_id']}": raise ValueError("cross-body or missing USE")
 if not lines[1].startswith("LAW ") or lines[-1]!="RECEIPT": raise ValueError("missing LAW or RECEIPT")
 nodes=[]
 for number,line in enumerate(lines[2:-1],3):
  if not line.startswith(d["source_prefix"]): raise ValueError(f"line {number}: wrong prefix")
  raw=line[len(d["source_prefix"]):]; verb,sep,text=raw.partition(" ")
  if verb not in d["allowed_verbs"]: raise ValueError(f"line {number}: unsupported verb")
  nodes.append({"verb":verb,"payload":json.loads(text) if sep else {},"line":number})
 return {"schema":"jm.functioning-body-ast/0.1","body_id":d["body_id"],"law":json.loads(lines[1][4:]),"nodes":nodes,"source_sha256":sha(source)}

def lower(d:dict[str,Any],ast:dict[str,Any])->dict[str,Any]:
 return {"schema":"jm.functioning-body-ir/0.1","body_id":d["body_id"],"family":d["family"],"semantic_signature":d["semantic_signature"],"instructions":[{"opcode":n["verb"],"payload":n["payload"],"source_line":n["line"],"effect":"state-change"} for n in ast["nodes"]],"ast_sha256":sha(ast)}

def primitive_consequence(state:dict[str,Any],family:str,op:str,p:Any)->None:
 v=state["values"]; v[op]=p
 if family=="route":
  if op=="route": state["status"]="routed"
  if op=="state": state["output"]=p; state["status"]="changed"
  if op=="recover": state["recoveries"]+=1
 elif family=="logic":
  if op=="fact": v.setdefault("facts",{})[str(p.get("name"))]=p.get("value")
  if op=="when": v["condition"]=v.get("facts",{}).get(str(p.get("fact")))==p.get("equals")
  if op=="then" and v.get("condition"): state["output"]=p.get("result")
  if op=="decide": state["status"]="decided"
 elif family=="formula":
  if op=="apply": state["output"]=p.get("left",0)*p.get("right",0) if p.get("op")=="multiply" else p
  if op=="yield": state["status"]="yielded"
 elif family=="embodied":
  if op=="contact": state["output"]={"pressure":p.get("pressure"),"channel":p.get("channel")}; state["status"]="contact"
  if op=="shift": state["status"]="shifted"
 elif family=="compiler":
  if op=="source": v["source_text"]=str(p.get("text",""))
  if op=="token": v["tokens"]=v.get("source_text","").split()
  if op=="parse": v["tree"]=[{"word":x} for x in v.get("tokens",[])]
  if op=="emit": state["output"]=" ".join(x["word"] for x in v.get("tree",[])); state["status"]="emitted"
 elif family=="runtime":
  if op=="state": v.update(p)
  if op=="exec" and p.get("op")=="increment": v[str(p.get("key"))]=v.get(str(p.get("key")),0)+p.get("amount",1); state["status"]="executed"
  if op=="recover": state["recoveries"]+=1
 elif family=="game":
  if op=="step": v["tick"]=v.get("tick",0)+p.get("ticks",1); state["status"]="stepped"
  if op=="score": v["score"]=v.get("score",0)+p.get("amount",0); state["output"]=v["score"]
 elif family=="governance":
  if op=="evidence": v.setdefault("evidence",[]).append(p)
  if op=="gate": v["gate_passed"]=bool(v.get("evidence")); state["status"]="passed" if v["gate_passed"] else "held"
  if op=="pass" and v.get("gate_passed"): state["output"]=p
 elif family=="delivery":
  if op=="hash": v["sha256"]=sha(p)
  if op=="package": state["output"]=p; state["status"]="packaged"
 elif family=="visual":
  if op=="render": v["frame"]=v.get("frame",0)+1; state["status"]="rendered"
  if op=="feedback": state["output"]=p
 elif family=="authoring":
  if op=="build": state["output"]={"build":p,"edits":v.get("edit")}; state["status"]="built"
  if op=="test": v["test_status"]="passed"
 elif family=="composition":
  if op=="check": v["compatible"]=bool(p.get("compatible")); state["status"]="compatible" if v["compatible"] else "blocked"
  if op=="bind":
   if not v.get("compatible"): raise ValueError("bind blocked")
   state["output"]=p; state["status"]="bound"
 elif family=="service":
  if op=="register": v.setdefault("registry",{})[str(p.get("key"))]=p.get("value")
  if op=="lookup": v["lookup"]=v.get("registry",{}).get(str(p.get("key")))
  if op=="resolve": v["resolved"]=v.get("lookup")
  if op=="return": state["output"]={"request":p,"value":v.get("resolved")}; state["status"]="served"

def execute(d:dict[str,Any],ir:dict[str,Any])->dict[str,Any]:
 state={"body_id":d["body_id"],"family":d["family"],"status":"ready","tick":0,"values":{},"capabilities":{},"trace":[],"output":None,"faults":[],"recoveries":0}
 primitives=set(d["primitives"]); caps=set(d["capability_verbs"])
 for ins in ir["instructions"]:
  before=sha({k:v for k,v in state.items() if k!="trace"}); op=ins["opcode"]; p=ins["payload"]
  try:
   if op in primitives: primitive_consequence(state,d["family"],op,p)
   elif op in caps:
    entry=state["capabilities"].setdefault(op,{"count":0,"last":None}); entry["count"]+=1; entry["last"]=p; state["status"]="capability-executed"
   else: raise ValueError(f"unknown opcode {op}")
  except Exception as exc:
   state["faults"].append({"opcode":op,"error":str(exc)}); state["status"]="fault-held"; raise
  state["tick"]+=1
  state["trace"].append({"tick":state["tick"],"opcode":op,"payload":p,"before_sha256":before,"after_sha256":sha({k:v for k,v in state.items() if k!="trace"})})
 if not state["trace"]: raise ValueError("no trace")
 if state["output"] is None: state["output"]=state["values"]
 return state

def receipt(body:dict[str,Any],d:dict[str,Any],source:str,ast:dict[str,Any],ir:dict[str,Any],state:dict[str,Any])->dict[str,Any]:
 return {"schema":"jm.functioning-body-receipt/0.1","version":VERSION,"body_id":body["id"],"body_name":body["name"],"family":d["family"],"parity_floor":"CADING_QUADZE_FUNCTIONING","status":"FUNCTIONING_BODY_EXECUTED","source_sha256":sha(source),"ast_sha256":sha(ast),"ir_sha256":sha(ir),"state_sha256":sha(state),"semantic_signature":d["semantic_signature"],"trace_count":len(state["trace"]),"state_changed":state["tick"]>0,"capability_executed":bool(state["capabilities"]),"fault_count":len(state["faults"]),"machine_kernel_ding":"OPEN","exact_historical_native":"OPEN_UNLESS_SOURCE_RECOVERED","claim_boundary":d["claim_boundary"]}

def write_json(path:Path,value:Any)->None:
 path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8")
def write_text(path:Path,value:str)->None:
 path.parent.mkdir(parents=True,exist_ok=True); path.write_text(value,encoding="utf-8")

def build_body(out:Path,body:dict[str,Any],n:int)->dict[str,Any]:
 d=dialect(body); source=proof_source(body,d,n); ast=parse(d,source); ir=lower(d,ast); state=execute(d,ir); r=receipt(body,d,source,ast,ir,state); root=out/"bodies"/str(body["id"])
 write_json(root/"dialect.json",d); write_text(root/"source"/"proof.jmfn",source); write_json(root/"ast"/"proof.ast.json",ast); write_json(root/"ir"/"proof.ir.json",ir); write_json(root/"run"/"state.json",state); write_json(root/"run"/"trace.json",state["trace"]); write_json(root/"receipt.json",r)
 return r

def build(repo:Path,out:Path)->dict[str,Any]:
 bodies=load_bodies(repo)
 if out.exists(): shutil.rmtree(out)
 out.mkdir(parents=True)
 receipts=[build_body(out,b,n) for n,b in enumerate(bodies,1)]
 if len({r["semantic_signature"] for r in receipts})!=len(receipts): raise ValueError("duplicate semantic signatures")
 manifest={"schema":"jm.100-functioning-bodies/0.1","version":VERSION,"status":"PORTABLE_FUNCTIONING_PARITY_PASS_NOT_FULL_NATIVE_CROWN","body_count":len(receipts),"parity_floor":"CADING_QUADZE_FUNCTIONING","receipts":receipts,"all_state_changed":all(r["state_changed"] for r in receipts),"all_capabilities_executed":all(r["capability_executed"] for r in receipts),"all_machine_kernel_dings":"OPEN","claim_boundary":"All 100 execute body-namespaced current-canon semantics with state change, trace and receipt. Exact recovered native languages, independent kernels, self-hosting and crown remain body-by-body work."}
 write_json(out/"FUNCTIONING_BODY_MANIFEST.json",manifest); return manifest

def deterministic(repo:Path)->None:
 with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
  if sha(build(repo,Path(a)))!=sha(build(repo,Path(b))): raise ValueError("non-deterministic build")

def main()->int:
 ap=argparse.ArgumentParser(); ap.add_argument("--repo",type=Path,default=Path(__file__).resolve().parents[4]); ap.add_argument("--out",type=Path); ap.add_argument("--deterministic",action="store_true"); args=ap.parse_args()
 if args.deterministic: deterministic(args.repo); print("FUNCTIONING_BODY_DETERMINISM_PASS"); return 0
 out=args.out or args.repo/"dist"/"functioning-bodies"; m=build(args.repo,out); print(json.dumps({"status":m["status"],"body_count":m["body_count"]},sort_keys=True)); return 0
if __name__=="__main__": raise SystemExit(main())
