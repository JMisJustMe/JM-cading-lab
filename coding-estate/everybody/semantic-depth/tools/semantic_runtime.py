from __future__ import annotations
import re
from typing import Any
try:
 from .semantic_core import sha
except ImportError:
 from semantic_core import sha

def apply_effect(state:dict[str,Any],effect:dict[str,Any],payload:dict[str,Any])->None:
 mode=effect["mode"]; key=effect["state_key"]; token_value=int(payload.get("token",effect["token"]))
 state["capabilities"][effect["verb"]]={"mode":mode,"token":token_value,"payload":payload}
 if mode=="evidence": state["evidence"].append({"key":key,"token":token_value}); state["output"]={"evidence_count":len(state["evidence"])}
 elif mode=="route": state["routes"].append({"from":state["position"],"to":key}); state["position"]=key; state["output"]={"position":key}
 elif mode=="state": state["values"][key]=state["values"].get(key,0)+(token_value%97)+1; state["output"]={key:state["values"][key]}
 elif mode=="structure":
  tokens=re.findall(r"[A-Za-z0-9_-]+",str(payload.get("capability",""))); state["structures"][key]=[{"token":item,"index":n} for n,item in enumerate(tokens)]; state["output"]=state["structures"][key]
 elif mode=="transform": state["artifacts"][key]=sha({"namespace":state["namespace"],"key":key,"token":token_value}); state["output"]={"artifact":state["artifacts"][key]}
 elif mode=="game": state["game"]["tick"]+=1; state["game"]["score"]+=(token_value%11)+1; state["game"]["last"]=key; state["output"]=dict(state["game"])
 elif mode=="event": state["events"].append({"channel":key,"pressure":(token_value%100)+1}); state["output"]=state["events"][-1]
 elif mode=="visual": state["visual"]["frame"]+=1; state["visual"]["nodes"].append({"id":key,"visible":True}); state["output"]=dict(state["visual"])
 elif mode=="delivery": state["packages"][key]=sha({"body":state["body_id"],"key":key}); state["output"]={"package":key,"sha256":state["packages"][key]}
 elif mode=="registry": state["registry"][key]={"body":state["body_id"],"token":token_value}; state["output"]=state["registry"][key]
 elif mode=="recovery": state["recoveries"]+=1; state["output"]={"recoveries":state["recoveries"]}
 elif mode=="composition": state["bindings"].append({"source":state["body_id"],"target":key,"preserved":True}); state["output"]=state["bindings"][-1]
 else: state["values"][key]=token_value; state["output"]={key:token_value}

def execute(current:dict[str,Any],ir:dict[str,Any])->dict[str,Any]:
 body_id=current["body"]["id"]
 state={"body_id":body_id,"namespace":current["namespace"],"status":"booted","tick":0,"position":"source","values":{},"structures":{},"artifacts":{},"capabilities":{},"routes":[],"events":[],"evidence":[],"packages":{},"registry":{},"bindings":[],"visual":{"frame":0,"nodes":[]},"game":{"tick":0,"score":0,"last":None},"faults":[],"recoveries":0,"trace":[],"output":None}
 effect_map={item["verb"]:item for item in current["capability_effects"]}; checkpoint=sha({"body_id":body_id,"status":"booted"})
 for ins in ir["instructions"]:
  state["tick"]+=1; verb=ins["verb"]; before=sha({k:v for k,v in state.items() if k!="trace"})
  if verb in effect_map: apply_effect(state,effect_map[verb],ins["payload"]); state["status"]="capability-executed"
  elif verb=="fault": state["faults"].append({"payload":ins["payload"],"held":True}); state["status"]="fault-held"
  elif verb=="recover":
   if not state["faults"]: raise ValueError("recovery without held fault")
   state["recoveries"]+=1; state["status"]="recovered"; state["output"]={"recovery_route":ins["payload"],"checkpoint":checkpoint}
  else: raise ValueError(f"unknown instruction {verb}")
  after=sha({k:v for k,v in state.items() if k!="trace"}); state["trace"].append({"tick":state["tick"],"opcode":ins["opcode"],"before_sha256":before,"after_sha256":after,"changed":before!=after})
 expected={item["verb"] for item in current["capability_effects"]}
 if set(state["capabilities"])!=expected: raise ValueError(f"{body_id}: not all body capabilities executed")
 if not state["faults"] or state["recoveries"]<1 or state["status"]!="recovered": raise ValueError(f"{body_id}: fault/recovery route incomplete")
 state["state_sha256"]=sha({k:v for k,v in state.items() if k not in {"trace","state_sha256"}}); return state

def receipt(current:dict[str,Any],source:str,ast:dict[str,Any],ir:dict[str,Any],state:dict[str,Any])->dict[str,Any]:
 return {"schema":"jm.body-specific-runtime-receipt/0.2","body_id":current["body"]["id"],"namespace":current["namespace"],"semantic_signature":current["semantic_signature"],"law_sha256":current["law_sha256"],"source_sha256":sha(source),"ast_sha256":sha(ast),"ir_sha256":sha(ir),"state_sha256":state["state_sha256"],"capability_count":len(state["capabilities"]),"declared_capability_count":len(current["capability_effects"]),"trace_count":len(state["trace"]),"fault_count":len(state["faults"]),"recovery_count":state["recoveries"],"output_sha256":sha(state["output"]),"status":"BODY_SPECIFIC_SEMANTICS_EXECUTED_IN_ISOLATED_PROCESS","machine_kernel_ding":"OPEN"}
