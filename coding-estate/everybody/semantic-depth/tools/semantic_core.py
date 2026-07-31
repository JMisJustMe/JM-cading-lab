from __future__ import annotations
import hashlib, json, re
from pathlib import Path
from typing import Any

VERSION="0.2.0"
EXPECTED_BODY_COUNT=100
REGISTRIES=(
 "coding-estate/everybody/body-registry.json",
 "coding-estate/everybody/body-registry-extension-01.json",
 "coding-estate/everybody/body-registry-extension-02.json",
)

def stable(value:Any)->str:
 return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(value:Any)->str:
 text=value if isinstance(value,str) else stable(value)
 return hashlib.sha256(text.encode()).hexdigest()
def slug(value:str)->str:
 return re.sub(r"[^a-z0-9]+","-",value.lower()).strip("-") or "unnamed"

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
 return sorted(bodies,key=lambda item:item["id"])

def cap_verb(capability:str)->str: return "cap-"+slug(capability)
def capability_mode(capability:str,kind:str)->str:
 text=f"{capability} {kind}".lower()
 rules=(
  (r"trace|receipt|proof|evidence|ding|validation|claim|gate|guardrail","evidence"),
  (r"route|routing|control|branch|transition|flow|path","route"),
  (r"state|shift|change|difference|pressure|mood|charge","state"),
  (r"parser|parse|token|lexer|syntax|punct|grammar|ast","structure"),
  (r"compiler|compile|lower|emit|backend|ir|opcode|bytecode|vm","transform"),
  (r"game|score|combo|entity|play|collide|guard","game"),
  (r"gesture|contact|speech|mudra|hand|input|signal|pulse|pose","event"),
  (r"visual|render|layout|glyph|field|feedback","visual"),
  (r"package|delivery|export|manifest|open-first|seal|hash","delivery"),
  (r"registry|name|lookup|symbol|lexicon|dictionary|alias","registry"),
  (r"recover|repair|rollback|reset|restore","recovery"),
  (r"compose|composition|bind|graft|adapter|bridge|interop|ffi","composition"),
 )
 for pattern,mode in rules:
  if re.search(pattern,text): return mode
 return "identity"

def profile(body:dict[str,Any])->dict[str,Any]:
 caps=[str(item) for item in body.get("caps",[])] or ["identity"]
 effects=[]
 for ordinal,cap in enumerate(caps,1):
  effects.append({"ordinal":ordinal,"capability":cap,"verb":cap_verb(cap),"mode":capability_mode(cap,str(body["kind"])),"state_key":f"{slug(cap)}-{ordinal}","token":int(sha({"body":body["id"],"cap":cap})[:8],16)})
 identity={key:body[key] for key in ("id","name","kind","law","registry_source")}
 return {"schema":"jm.body-specific-semantic-profile/0.2","factory_version":VERSION,"body":identity,"namespace":f"jm.body.{body['id']}","source_prefix":f"{slug(str(body['id']))}::","law_sha256":sha(body["law"]),"identity_sha256":sha(identity),"semantic_signature":sha({"identity":identity,"effects":effects}),"capability_effects":effects,"targets":body.get("targets",[]),"needs":body.get("needs",[]),"claim_boundary":"Body-specific current-canon semantics executed in an isolated process through a shared Python carrier; exact historical syntax, self-hosting and machine-kernel crown remain open."}

def proof_source(current:dict[str,Any])->str:
 body_id=current["body"]["id"]
 lines=[f"BODY {body_id}",f"LAW_SHA {current['law_sha256']}"]
 for effect in current["capability_effects"]:
  payload={"body":body_id,"capability":effect["capability"],"mode":effect["mode"],"ordinal":effect["ordinal"],"token":effect["token"]}
  lines.append(f"{current['source_prefix']}{effect['verb']} {stable(payload)}")
 lines += [f"{current['source_prefix']}fault {stable({'kind':'invalid-operation','body':body_id})}",f"{current['source_prefix']}recover {stable({'route':'RecoveryBody','body':body_id})}","RECEIPT"]
 return "\n".join(lines)+"\n"

def parse(current:dict[str,Any],source:str)->dict[str,Any]:
 lines=[line.strip() for line in source.splitlines() if line.strip()]; body_id=current["body"]["id"]
 if not lines or lines[0]!=f"BODY {body_id}": raise ValueError("cross-body or missing BODY header")
 if len(lines)<4 or lines[1]!=f"LAW_SHA {current['law_sha256']}" or lines[-1]!="RECEIPT": raise ValueError("law or receipt mismatch")
 allowed={item["verb"] for item in current["capability_effects"]}|{"fault","recover"}; nodes=[]
 for number,line in enumerate(lines[2:-1],3):
  if not line.startswith(current["source_prefix"]): raise ValueError(f"line {number}: wrong body namespace")
  raw=line[len(current["source_prefix"]):]; verb,sep,payload_text=raw.partition(" ")
  if verb not in allowed: raise ValueError(f"line {number}: unsupported body verb {verb}")
  nodes.append({"verb":verb,"payload":json.loads(payload_text) if sep else {},"source_line":number})
 return {"schema":"jm.body-specific-ast/0.2","body_id":body_id,"semantic_signature":current["semantic_signature"],"nodes":nodes,"source_sha256":sha(source)}

def lower(current:dict[str,Any],ast:dict[str,Any])->dict[str,Any]:
 effect_map={item["verb"]:item for item in current["capability_effects"]}; instructions=[]
 for node in ast["nodes"]:
  verb=node["verb"]
  if verb in effect_map:
   effect=effect_map[verb]; opcode=f"{current['namespace']}.{effect['mode']}.{slug(effect['capability'])}"; effect_name=effect["mode"]
  else:
   opcode=f"{current['namespace']}.control.{verb}"; effect_name=verb
  instructions.append({"opcode":opcode,"verb":verb,"effect":effect_name,"payload":node["payload"],"source_line":node["source_line"]})
 return {"schema":"jm.body-specific-ir/0.2","body_id":current["body"]["id"],"namespace":current["namespace"],"semantic_signature":current["semantic_signature"],"instructions":instructions,"ast_sha256":sha(ast)}
