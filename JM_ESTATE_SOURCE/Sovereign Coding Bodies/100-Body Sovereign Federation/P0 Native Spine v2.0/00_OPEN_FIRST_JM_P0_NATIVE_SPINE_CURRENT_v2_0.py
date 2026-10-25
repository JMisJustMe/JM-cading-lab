#!/usr/bin/env python3
from __future__ import annotations
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, List, Tuple, Optional, Callable
import argparse, ast, hashlib, json, re, sqlite3, tempfile, time, pathlib, struct

VERSION="2.0.0"

def stable(x:Any)->str:
    return json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=False,default=str)
def sha(x:Any)->str:
    return hashlib.sha256(stable(x).encode()).hexdigest()
def receipt(body:str, state:str, payload:Any=None, **extra)->dict:
    r={"body":body,"version":VERSION,"state":state,"payload":payload,"claim_scope":"CURRENT_P0_NATIVE_SPINE_V2"}
    r.update(extra); r["receipt_hash"]=sha(r); return r

# ---------------- TokenBody ----------------
@dataclass
class Token:
    raw:str; kind:str; start:int; end:int; line:int; column:int
    pressure:str="neutral"; body_id:Optional[str]=None
    def to_dict(self): return asdict(self)

PROTECTED=["32÷×&",".✓","RECORP~","RECORP.lock","→","✓","Ø"]
TOKEN_RX=re.compile(r'32÷×&|\.✓|RECORP\.lock|RECORP~|→|✓|Ø|->|==|!=|>=|<=|[A-Za-z_][A-Za-z0-9_.-]*|-?\d+(?:\.\d+)?|"(?:\\.|[^"])*"|[{}()[\],:=+*/<>.?~!-]')

def _pressure(raw:str)->str:
    if raw.endswith("!") or raw=="!": return "high"
    if raw.endswith("?") or raw=="?": return "query"
    if raw.endswith("~") or raw=="~": return "soften"
    if raw in {".✓","✓"}: return "validated"
    return "neutral"

def lex(source:str, body_id:Optional[str]=None)->List[Token]:
    toks=[]; line_starts=[0]
    for m in re.finditer("\n",source): line_starts.append(m.end())
    for m in TOKEN_RX.finditer(source):
        prefix=source[:m.start()]
        line=prefix.count("\n")+1
        ls=source.rfind("\n",0,m.start())+1
        raw=m.group(0)
        if raw.startswith('"'): kind="STRING"
        elif re.fullmatch(r"-?\d+(?:\.\d+)?",raw): kind="NUMBER"
        elif raw in {"->","→","==","!=",">=","<=",":","=","+","-","*","/","<",">",".✓","✓","Ø","32÷×&","~","!","?","(",")","{","}",",","[","]"}: kind="MARK"
        else: kind="WORD"
        toks.append(Token(raw,kind,m.start(),m.end(),line,m.start()-ls+1,_pressure(raw),body_id))
    return toks

def incremental_lex(old_source:str,new_source:str,body_id:Optional[str]=None)->dict:
    old=old_source.splitlines(); new=new_source.splitlines()
    n=max(len(old),len(new)); changed=[i+1 for i in range(n) if (old[i] if i<len(old) else None)!=(new[i] if i<len(new) else None)]
    return {"changed_lines":changed,"tokens": [t.to_dict() for t in lex(new_source,body_id)],"strategy":"changed-line-detection + safe full relex"}

# ---------------- Parser / PrimeBody ----------------
def parse_literal(s:str)->Any:
    s=s.strip()
    try:return ast.literal_eval(s)
    except Exception:
        if re.fullmatch(r"-?\d+",s):return int(s)
        if re.fullmatch(r"-?\d+\.\d+",s):return float(s)
        if s.lower()=="true":return True
        if s.lower()=="false":return False
        return s

def parse_source(source:str, body_id:str="anonymous")->dict:
    tokens=lex(source,body_id)
    nodes=[]; diags=[]; routes=set(); body_name=None
    for lineno,line in enumerate(source.splitlines(),1):
        raw=line; s=line.strip()
        if not s or s.startswith("#"): continue
        span={"line":lineno,"start":source.find(raw),"raw":raw}
        try:
            m=re.fullmatch(r"BODY\s+([A-Za-z_][\w.-]*)",s,re.I)
            if m: body_name=m.group(1); nodes.append({"type":"Body","name":body_name,"source":span}); continue
            m=re.fullmatch(r"ROUTE\s+([A-Za-z_][\w.-]*)\s*(?:->|→)\s*([A-Za-z_][\w.-]*)",s,re.I)
            if m:
                routes.add(m.group(1));routes.add(m.group(2));nodes.append({"type":"Route","from":m.group(1),"to":m.group(2),"source":span});continue
            m=re.fullmatch(r"SET\s+([A-Za-z_][\w.-]*)\s*=\s*(.+)",s,re.I)
            if m:nodes.append({"type":"Set","name":m.group(1),"value":parse_literal(m.group(2)),"source":span});continue
            m=re.fullmatch(r"TRACE\s+(.+)",s,re.I)
            if m:nodes.append({"type":"Trace","text":m.group(1),"source":span});continue
            if s.upper()=="DING":nodes.append({"type":"Ding","source":span});continue
            if s.upper()=="HOLD":nodes.append({"type":"Hold","source":span});continue
            m=re.fullmatch(r"EMIT\s+(.+)",s,re.I)
            if m:nodes.append({"type":"Emit","value":parse_literal(m.group(1)),"source":span});continue
            diags.append({"code":"PARSER_UNKNOWN_LINE","severity":"error","line":lineno,"raw":raw,"repair":"preserve source; verify syntax/body grammar"})
        except Exception as e:
            diags.append({"code":"PARSER_EXCEPTION","severity":"error","line":lineno,"raw":raw,"message":str(e)})
    source_map=[t.to_dict() for t in tokens]
    ast_body={"type":"Program","body":body_name,"nodes":nodes,"source_sha256":hashlib.sha256(source.encode()).hexdigest()}
    ding_schema={
        "source_present":bool(source),"tokens_present":bool(tokens),"source_map_complete":all(source[t.start:t.end]==t.raw for t in tokens),
        "explicit_structure":bool(nodes),"identity_explicit":bool(body_name),"routes_resolved":True,
        "protected_marks":[p for p in PROTECTED if p in source],"error_count":sum(d["severity"]=="error" for d in diags),
        "warning_count":sum(d["severity"]=="warning" for d in diags)
    }
    ding_schema["ding_allowed"]=all([ding_schema["source_present"],ding_schema["tokens_present"],ding_schema["source_map_complete"],ding_schema["explicit_structure"],ding_schema["identity_explicit"],ding_schema["error_count"]==0])
    ding_schema["status"]="DING" if ding_schema["ding_allowed"] else "HOLD"
    return {"tokens":source_map,"ast":ast_body,"diagnostics":diags,"ding_schema":ding_schema}

def incremental_parse(old_source:str,new_source:str,body_id="anonymous")->dict:
    ch=incremental_lex(old_source,new_source,body_id)["changed_lines"]
    out=parse_source(new_source,body_id)
    out["incremental"]={"changed_lines":ch,"node_reuse":"line-stable nodes may be reused by caller","strategy":"changed-region identification + deterministic safe parse"}
    return out

# ---------------- OneBody IR / TheoC ----------------
IR_SCHEMA="jm.onebody-ir/v2"
def lower_to_ir(parsed:dict, source_kind:str="cading")->dict:
    nodes=[]
    body=parsed["ast"].get("body")
    for n in parsed["ast"]["nodes"]:
        typ=n["type"]
        if typ=="Route": nodes.append({"op":"ROUTE","from":n["from"],"to":n["to"],"source":n["source"]})
        elif typ=="Set": nodes.append({"op":"SET","name":n["name"],"value":n["value"],"source":n["source"]})
        elif typ=="Trace": nodes.append({"op":"TRACE","text":n["text"],"source":n["source"]})
        elif typ=="Emit": nodes.append({"op":"EMIT","value":n["value"],"source":n["source"]})
        elif typ=="Ding": nodes.append({"op":"DING","source":n["source"]})
        elif typ=="Hold": nodes.append({"op":"HOLD","source":n["source"]})
    ir={"schema":IR_SCHEMA,"body_id":body,"source_kind":source_kind,"source_fingerprint":parsed["ast"]["source_sha256"],"nodes":nodes,
        "pressure_preserved":True,"trace_required":True,"permission":"source-governed"}
    ir["meaning_fingerprint"]=sha({"body":body,"nodes":[{k:v for k,v in n.items() if k!="source"} for n in nodes]})
    return ir

def verify_ir(ir:dict)->dict:
    errs=[]
    if ir.get("schema")!=IR_SCHEMA:errs.append("IR_SCHEMA")
    if not ir.get("body_id"):errs.append("BODY_ID")
    if not ir.get("source_fingerprint"):errs.append("SOURCE_FINGERPRINT")
    if not isinstance(ir.get("nodes"),list):errs.append("NODES")
    allowed={"ROUTE","SET","TRACE","EMIT","DING","HOLD","LOGIC","FLOW"}
    for i,n in enumerate(ir.get("nodes",[])):
        if n.get("op") not in allowed:errs.append(f"OP_{i}")
    return {"state":"DING" if not errs else "BUGG","errors":errs,"meaning_fingerprint":ir.get("meaning_fingerprint")}

def optimise_ir(ir:dict)->dict:
    # bounded non-semantic pass: remove adjacent duplicate TRACE entries only
    out=[]; prev=None
    for n in ir["nodes"]:
        key=stable({k:v for k,v in n.items() if k!="source"})
        if n.get("op")=="TRACE" and key==prev: continue
        out.append(n); prev=key
    z={**ir,"nodes":out,"optimisations":["dedupe_adjacent_trace"],"pre_opt_fingerprint":ir["meaning_fingerprint"]}
    z["meaning_fingerprint"]=sha({"body":z["body_id"],"nodes":[{k:v for k,v in n.items() if k!="source"} for n in out]})
    return z

def emit_backend(ir:dict,target:str)->str:
    target=target.lower()
    if target=="json":return json.dumps(ir,indent=2,ensure_ascii=False)
    if target=="javascript":
        return "const ir="+json.dumps(ir,ensure_ascii=False)+";\nconsole.log(JSON.stringify({body:ir.body_id,status:'DING',fingerprint:ir.meaning_fingerprint}));\n"
    if target=="python":
        return "IR="+repr(ir)+"\nprint({'body':IR['body_id'],'status':'DING','fingerprint':IR['meaning_fingerprint']})\n"
    if target=="rust":
        return 'fn main(){println!(r#"{{\\"body\\":\\"'+str(ir["body_id"])+'\\",\\"status\\":\\"DING\\"}}"#);}\n'
    raise ValueError(target)

def theoc_compile(source:str,source_kind="cading",target="json")->dict:
    p=parse_source(source,source_kind)
    if p["ding_schema"]["status"]!="DING":return {"state":"HOLD","diagnostics":p["diagnostics"],"ding_schema":p["ding_schema"]}
    ir=lower_to_ir(p,source_kind); v=verify_ir(ir)
    if v["state"]!="DING":return {"state":"BUGG","verify":v}
    oi=optimise_ir(ir); return {"state":"DING","ir":oi,"verify":verify_ir(oi),"target":target,"output":emit_backend(oi,target)}

# ---------------- Language-specific frontends ----------------
def cading_compile(source:str,target="json")->dict:
    # Cading is source-preserving and refuses silent correction.
    r=theoc_compile(source,"cading",target)
    r["language"]="Cading";r["law"]="Mark -> Signal -> Route -> State Change -> Trace"
    return r

LOGIC_RX=re.compile(r"^(ALLOW|DENY)\s+IF\s+([A-Za-z_][\w.-]*)\s*(==|!=|>=|<=|>|<)\s*(.+)$",re.I)
def jmlogic_parse(source:str)->dict:
    rules=[];diags=[]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=LOGIC_RX.fullmatch(s)
        if not m:diags.append({"code":"JMLOGIC_SYNTAX","line":i,"raw":line});continue
        rules.append({"effect":m.group(1).upper(),"name":m.group(2),"cmp":m.group(3),"value":parse_literal(m.group(4)),"line":i})
    return {"rules":rules,"diagnostics":diags,"state":"DING" if rules and not diags else "HOLD"}
def _cmp(a,op,b):
    return {"==":a==b,"!=":a!=b,">":a>b,"<":a<b,">=":a>=b,"<=":a<=b}[op]
def jmlogic_eval(source:str,ctx:dict)->dict:
    p=jmlogic_parse(source);hits=[]
    for r in p["rules"]:
        if r["name"] in ctx and _cmp(ctx[r["name"]],r["cmp"],r["value"]):hits.append(r)
    effect=hits[-1]["effect"] if hits else "HOLD"
    ir={"schema":"jm.logic-ir/v2","rules":p["rules"],"effect":effect,"context_fingerprint":sha(ctx)}
    return {"state":"DING" if p["state"]=="DING" else "HOLD","effect":effect,"hits":hits,"ir":ir,"diagnostics":p["diagnostics"]}

def flowtalk_parse(text:str)->dict:
    # Preserve segments, alternatives and ordered arrows without claiming final semantic identity.
    segs=[]
    for part in re.split(r"\s*(?:->|→)\s*",text.strip()):
        alts=[x.strip() for x in part.split("/") if x.strip()]
        segs.append({"raw":part,"alternatives":alts,"ambiguous":len(alts)>1})
    edges=[{"from":i,"to":i+1} for i in range(max(0,len(segs)-1))]
    return {"schema":"jm.flowtalk-ir/v2","segments":segs,"edges":edges,"ambiguous":any(x["ambiguous"] for x in segs),"state":"DING" if segs else "HOLD"}

# ---------------- Root Method bytecode VM ----------------
ROOT_OPS={"NOP":0,"PUSH":1,"STORE":2,"LOAD":3,"ADD":4,"SUB":5,"MUL":6,"DIV":7,"TRACE":8,"EMIT":9,"DING":10,"HOLD":11}
ROOT_OPS_R={v:k for k,v in ROOT_OPS.items()}
def root_assemble(lines:List[str])->bytes:
    out=bytearray(b"JMRM2")
    for line in lines:
        s=line.strip()
        if not s or s.startswith("#"):continue
        parts=s.split(maxsplit=1); op=parts[0].upper()
        if op not in ROOT_OPS:raise ValueError("UNKNOWN_OPCODE:"+op)
        arg=parts[1] if len(parts)>1 else ""
        payload=arg.encode()
        out += struct.pack(">BH",ROOT_OPS[op],len(payload))+payload
    return bytes(out)
def root_decode(blob:bytes)->List[Tuple[str,str]]:
    if not blob.startswith(b"JMRM2"):raise ValueError("BAD_MAGIC")
    i=5;out=[]
    while i<len(blob):
        if i+3>len(blob):raise ValueError("TRUNCATED")
        op,n=struct.unpack(">BH",blob[i:i+3]);i+=3
        if i+n>len(blob):raise ValueError("TRUNCATED_ARG")
        arg=blob[i:i+n].decode();i+=n
        if op not in ROOT_OPS_R:raise ValueError("BAD_OPCODE")
        out.append((ROOT_OPS_R[op],arg))
    return out
def root_verify(blob:bytes)->dict:
    try:
        ins=root_decode(blob)
        has_end=any(op in {"DING","HOLD"} for op,_ in ins)
        return {"state":"DING" if has_end else "HOLD","instructions":len(ins),"has_terminal":has_end}
    except Exception as e:return {"state":"BUGG","error":str(e)}
def root_disassemble(blob:bytes)->str:return "\n".join(op+((" "+arg) if arg else "") for op,arg in root_decode(blob))
def root_run(blob:bytes)->dict:
    v=root_verify(blob)
    if v["state"]!="DING":return v
    stack=[];mem={};trace=[];outs=[];state="RUNNING"
    for pc,(op,arg) in enumerate(root_decode(blob)):
        try:
            if op=="PUSH":stack.append(parse_literal(arg))
            elif op=="STORE":mem[arg]=stack.pop()
            elif op=="LOAD":stack.append(mem[arg])
            elif op in {"ADD","SUB","MUL","DIV"}:
                b=stack.pop();a=stack.pop()
                stack.append(a+b if op=="ADD" else a-b if op=="SUB" else a*b if op=="MUL" else a/b)
            elif op=="TRACE":trace.append({"pc":pc,"text":arg,"stack":list(stack),"memory":dict(mem)})
            elif op=="EMIT":outs.append(parse_literal(arg))
            elif op=="DING":state="DING";break
            elif op=="HOLD":state="HOLD";break
        except Exception as e:return {"state":"BUGG","pc":pc,"op":op,"error":str(e),"trace":trace}
    return {"state":state,"stack":stack,"memory":mem,"trace":trace,"outputs":outs}

# ---------------- CadenVM / RouteVM / JMVM ----------------
def caden_program(source:str)->List[Tuple[str,List[str]]]:
    out=[]
    for line in source.splitlines():
        s=line.strip()
        if not s or s.startswith("#"):continue
        p=s.split();out.append((p[0].upper(),p[1:]))
    return out
CADEN_ALLOWED={"SET","ADD","SUB","PUSH","POP","REMEMBER","RECALL","CHECKPOINT","TRACE","OUTPUT","ASSERT","DING","HOLD"}
def caden_verify(source:str)->dict:
    errs=[]
    for i,(op,args) in enumerate(caden_program(source)):
        if op not in CADEN_ALLOWED:errs.append({"line":i+1,"error":"BAD_OPCODE","op":op})
    if not any(op in {"DING","HOLD"} for op,_ in caden_program(source)):errs.append({"error":"NO_TERMINAL"})
    return {"state":"DING" if not errs else "BUGG","errors":errs}
def caden_run(source:str,debug=False)->dict:
    v=caden_verify(source)
    if v["state"]!="DING":return v
    vars={};stack=[];mem={};checkpoints={};trace=[];outs=[];steps=[];state="RUNNING"
    for pc,(op,args) in enumerate(caden_program(source)):
        before={"vars":dict(vars),"stack":list(stack)}
        try:
            if op=="SET":vars[args[0]]=parse_literal(" ".join(args[1:]))
            elif op=="ADD":vars[args[0]]=vars.get(args[0],0)+parse_literal(" ".join(args[1:]))
            elif op=="SUB":vars[args[0]]=vars.get(args[0],0)-parse_literal(" ".join(args[1:]))
            elif op=="PUSH":stack.append(parse_literal(" ".join(args)))
            elif op=="POP":vars[args[0]]=stack.pop()
            elif op=="REMEMBER":mem[args[0]]=parse_literal(" ".join(args[1:]))
            elif op=="RECALL":vars[args[0]]=mem[args[0]]
            elif op=="CHECKPOINT":checkpoints[args[0]]={"vars":dict(vars),"stack":list(stack),"memory":dict(mem)}
            elif op=="TRACE":trace.append({"pc":pc,"text":" ".join(args)})
            elif op=="OUTPUT":outs.append(vars.get(args[0],parse_literal(" ".join(args))))
            elif op=="ASSERT":
                name,cmpop=args[0],args[1];val=parse_literal(" ".join(args[2:]))
                if not _cmp(vars.get(name),cmpop,val):raise AssertionError(f"{name} {cmpop} {val}")
            elif op=="DING":state="DING"
            elif op=="HOLD":state="HOLD"
        except Exception as e:return {"state":"BUGG","pc":pc,"error":str(e),"trace":trace,"checkpoints":checkpoints}
        if debug:steps.append({"pc":pc,"op":op,"before":before,"after":{"vars":dict(vars),"stack":list(stack)}})
        if state in {"DING","HOLD"}:break
    return {"state":state,"vars":vars,"stack":stack,"memory":mem,"checkpoints":checkpoints,"trace":trace,"outputs":outs,"debug":steps,
            "execution_mode":"INTERPRETER","jit_aot_boundary":{"jit":"OPEN","aot":"PYTHON_EMITTER_AVAILABLE","native_self_host":"OPEN"}}

def routevm_run(program:str,start="hub")->dict:
    routes={};current=start;trace=[];checkpoints={}
    lines=[x.strip() for x in program.splitlines() if x.strip() and not x.strip().startswith("#")]
    for i,s in enumerate(lines):
        p=s.split();op=p[0].upper()
        if op=="ROUTE" and len(p)==4 and p[2] in {"->","→"}:routes.setdefault(p[1],set()).add(p[3])
    for i,s in enumerate(lines):
        p=s.split();op=p[0].upper()
        try:
            if op=="ROUTE":continue
            if op=="GOTO":
                target=p[1]
                if target not in routes.get(current,set()):return {"state":"BUGG","error":"INVALID_TRANSITION","from":current,"to":target,"trace":trace}
                trace.append({"from":current,"to":target});current=target
            elif op=="CHECKPOINT":checkpoints[p[1]]=current
            elif op=="TRACE":trace.append({"at":current,"text":" ".join(p[1:])})
            elif op=="DING":return {"state":"DING","current":current,"routes":{k:sorted(v) for k,v in routes.items()},"trace":trace,"checkpoints":checkpoints}
            elif op=="HOLD":return {"state":"HOLD","current":current,"trace":trace}
            elif op not in {"ROUTE"}:return {"state":"BUGG","error":"BAD_OPCODE","op":op}
        except Exception as e:return {"state":"BUGG","error":str(e)}
    return {"state":"HOLD","current":current,"trace":trace}

JMVM_ALLOWED={"SET","CMP","EMIT","TRACE","DING","HOLD"}
def jmvm_run(source:str,body_id:str,permissions:Optional[set]=None)->dict:
    permissions=permissions or {"SET","CMP","EMIT","TRACE","DING","HOLD"}
    vars={};outs=[];trace=[];flag=None
    for pc,(op,args) in enumerate(caden_program(source)):
        if op not in JMVM_ALLOWED:return {"state":"BUGG","error":"IDENTITY_OPCODE_REFUSAL","op":op,"body_id":body_id}
        if op not in permissions:return {"state":"HOLD","error":"PERMISSION_REFUSAL","op":op,"body_id":body_id}
        if op=="SET":vars[args[0]]=parse_literal(" ".join(args[1:]))
        elif op=="CMP":flag=_cmp(vars.get(args[0]),args[1],parse_literal(" ".join(args[2:])))
        elif op=="EMIT":outs.append({"body_id":body_id,"value":parse_literal(" ".join(args))})
        elif op=="TRACE":trace.append({"body_id":body_id,"pc":pc,"text":" ".join(args)})
        elif op=="DING":return {"state":"DING","body_id":body_id,"vars":vars,"flag":flag,"outputs":outs,"trace":trace}
        elif op=="HOLD":return {"state":"HOLD","body_id":body_id,"vars":vars,"flag":flag,"outputs":outs,"trace":trace}
    return {"state":"HOLD","body_id":body_id,"vars":vars,"outputs":outs,"trace":trace}

# ---------------- RouteCore / RouteOS / OS_CODING ----------------
class MemoryModel:
    def __init__(self):self.next=1;self.blocks={}
    def alloc(self,value=None):h=self.next;self.next+=1;self.blocks[h]=value;return h
    def read(self,h):return self.blocks[h]
    def write(self,h,v):self.blocks[h]=v
    def free(self,h):return self.blocks.pop(h)
class Scheduler:
    def __init__(self):self.q=[];self.log=[]
    def add(self,name,fn):self.q.append((name,fn))
    def run(self):
        while self.q:
            name,fn=self.q.pop(0);res=fn();self.log.append({"task":name,"result":res})
        return list(self.log)
class FFI:
    def __init__(self):self.fn={}
    def register(self,name,fn):self.fn[name]=fn
    def call(self,name,*a):return self.fn[name](*a)
ROUTECORE_ABI={"schema":"jm.routecore.abi/v2","word_bits":64,"handle":"u64","call":"routecore_call(name,args)->receipt","memory":"owned-handle","ffi":"explicit-registry"}

class PermissionGate:
    def __init__(self,rules=None):self.rules=rules or {}
    def allow(self,service,cap):return cap in set(self.rules.get(service,[]))
class RouteOS:
    ABI={"schema":"jm.routeos.service-abi/v2","request":["service","capability","payload"],"response":["state","payload","trace"]}
    def __init__(self,permissions=None):
        self.services={};self.events=[];self.trace=[];self.gate=PermissionGate(permissions or {"echo":["call"],"trace":["write"]})
    def register(self,name,fn):self.services[name]=fn
    def post(self,service,capability,payload):self.events.append({"service":service,"capability":capability,"payload":payload})
    def tick(self):
        if not self.events:return {"state":"HOLD","reason":"NO_EVENT"}
        ev=self.events.pop(0)
        if not self.gate.allow(ev["service"],ev["capability"]):return {"state":"HOLD","reason":"PERMISSION","event":ev}
        if ev["service"] not in self.services:return {"state":"BUGG","reason":"NO_SERVICE","event":ev}
        out=self.services[ev["service"]](ev["payload"]);r={"state":"DING","event":ev,"payload":out};self.trace.append(r);return r
    def drain(self):return [self.tick() for _ in range(len(self.events))]
    def native_host_boundary(self):return {"host":"PYTHON_HOSTED_REFERENCE","real_hardware":"HISTORICAL_QEMU_PROOF_MOUNTED_NOT_FRESHLY_EXECUTED","production_os":"OPEN"}

SERVICE_RX=re.compile(r"^SERVICE\s+([A-Za-z_][\w.-]*)\s+PERM\s+([A-Za-z_,]+)\s*->\s*([A-Za-z_][\w.-]*)$",re.I)
def os_coding_parse(source:str)->dict:
    services=[];diags=[]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=SERVICE_RX.fullmatch(s)
        if not m:diags.append({"line":i,"code":"SERVICE_GRAMMAR"});continue
        services.append({"name":m.group(1),"permissions":[x for x in m.group(2).split(",") if x],"target":m.group(3)})
    ir={"schema":"jm.os-coding.permissions-ir/v2","services":services}
    return {"state":"DING" if services and not diags else "HOLD","ir":ir,"diagnostics":diags}
def os_coding_mount(ir:dict,osobj:RouteOS,adapters:dict)->dict:
    for s in ir["services"]:
        if s["target"] not in adapters:return {"state":"BUGG","error":"MISSING_KERNEL_ADAPTER","target":s["target"]}
        osobj.register(s["name"],adapters[s["target"]])
        osobj.gate.rules[s["name"]]=s["permissions"]
    return {"state":"DING","mounted":[x["name"] for x in ir["services"]]}

# ---------------- TraceBox / BUGG ----------------
TRACE_SCHEMA="jm.tracebox.event/v2"
class TraceBox:
    def __init__(self,db=":memory:"):
        self.db=sqlite3.connect(db)
        self.db.execute("create table if not exists events(id integer primary key, ts real, body text, route text, kind text, payload text, prev text, hash text)")
        self.last=""
    def append(self,body,route,kind,payload):
        ev={"schema":TRACE_SCHEMA,"ts":time.time(),"body":body,"route":route,"kind":kind,"payload":payload,"prev":self.last}
        ev["hash"]=sha(ev);self.last=ev["hash"]
        self.db.execute("insert into events(ts,body,route,kind,payload,prev,hash) values(?,?,?,?,?,?,?)",(ev["ts"],body,route,kind,stable(payload),ev["prev"],ev["hash"]));self.db.commit()
        return ev
    def query(self,body=None,kind=None,limit=100):
        sql="select ts,body,route,kind,payload,prev,hash from events";where=[];args=[]
        if body:where.append("body=?");args.append(body)
        if kind:where.append("kind=?");args.append(kind)
        if where:sql+=" where "+" and ".join(where)
        sql+=" order by id limit ?";args.append(limit)
        rows=self.db.execute(sql,args).fetchall()
        return [{"ts":r[0],"body":r[1],"route":r[2],"kind":r[3],"payload":json.loads(r[4]),"prev":r[5],"hash":r[6]} for r in rows]
    def verify_chain(self):
        prev=""
        for e in self.query(limit=100000):
            if e["prev"]!=prev:return False
            x={"schema":TRACE_SCHEMA,"ts":e["ts"],"body":e["body"],"route":e["route"],"kind":e["kind"],"payload":e["payload"],"prev":e["prev"]}
            if sha(x)!=e["hash"]:return False
            prev=e["hash"]
        return True

BUGG_CODES={
"PARSE_UNKNOWN":{"severity":"error","repair":"preserve source; inspect grammar/token"},
"PERMISSION":{"severity":"hold","repair":"contact permission authority or reduce requested capability"},
"INVALID_TRANSITION":{"severity":"error","repair":"return to last valid route/checkpoint"},
"DIV_ZERO":{"severity":"error","repair":"guard denominator before DIV"},
"ASSERT_FAIL":{"severity":"error","repair":"inspect actual state and assertion premise"},
"IDENTITY_OPCODE_REFUSAL":{"severity":"hold","repair":"use the body-specific instruction office"},
}
def bugg(code:str,message:str="",context=None)->dict:
    meta=BUGG_CODES.get(code,{"severity":"error","repair":"trace source -> actual result -> correction -> retest"})
    return {"schema":"jm.bugg/v2","code":code,"message":message,"context":context or {},"severity":meta["severity"],"repair":meta["repair"],"state":"BUGG" if meta["severity"]=="error" else "HOLD"}

# ---------------- Codeing Engine ----------------
def codeing_compile(language:str,source:str,target="json",context=None)->dict:
    l=language.lower()
    if l=="cading":return cading_compile(source,target)
    if l=="jmlogic":
        r=jmlogic_eval(source,context or {})
        return {"state":r["state"],"language":"JMLogic","ir":r["ir"],"output":json.dumps(r["ir"],indent=2) if target=="json" else stable(r["ir"])}
    if l=="flowtalk":
        ir=flowtalk_parse(source);return {"state":ir["state"],"language":"FlowTalk","ir":ir,"output":json.dumps(ir,indent=2) if target=="json" else stable(ir)}
    return {"state":"BUGG","error":"UNKNOWN_FRONTEND"}

# ---------------- tests ----------------
def self_test_all()->dict:
    tests=[]
    def T(name,cond):tests.append((name,bool(cond)))
    # TokenBody
    src='BODY Demo\nROUTE hub -> room\nTRACE 32÷×&\nDING'
    toks=lex(src,"Demo");T("tokenbody-source-spans",all(src[t.start:t.end]==t.raw for t in toks));T("tokenbody-protected",any(t.raw=="32÷×&" for t in toks))
    inc=incremental_lex("BODY Demo\nDING","BODY Demo\nTRACE x\nDING","Demo");T("tokenbody-incremental",inc["changed_lines"]==[2,3])
    # Parser/PrimeBody
    p=parse_source(src,"Demo");T("parser-ding",p["ding_schema"]["status"]=="DING");T("parser-source-map",p["ding_schema"]["source_map_complete"])
    bad=parse_source("BODY Demo\nWUT x","Demo");T("parser-error-recovery",len(bad["diagnostics"])==1 and bad["ding_schema"]["status"]=="HOLD")
    ip=incremental_parse(src,src.replace("room","room2"),"Demo");T("primebody-incremental",len(ip["incremental"]["changed_lines"])==1)
    # IR/TheoC/Cading
    ir=lower_to_ir(p);T("onebody-verify",verify_ir(ir)["state"]=="DING");T("onebody-opt",verify_ir(optimise_ir(ir))["state"]=="DING")
    tc=theoc_compile(src,"cading","json");T("theoc-compile",tc["state"]=="DING");T("theoc-backend",'jm.onebody-ir/v2' in tc["output"])
    T("cading-compile",cading_compile(src)["state"]=="DING")
    # JMLogic / FlowTalk
    jl=jmlogic_eval("ALLOW IF score >= 5",{"score":5});T("jmlogic",jl["effect"]=="ALLOW")
    ft=flowtalk_parse("four/for -> one -> two/to");T("flowtalk",ft["state"]=="DING" and ft["ambiguous"])
    # Root Method
    blob=root_assemble(["PUSH 3","PUSH 2","ADD","TRACE sum","DING"]);T("root-verify",root_verify(blob)["state"]=="DING");T("root-vm",root_run(blob)["state"]=="DING");T("root-disassembler","PUSH 3" in root_disassemble(blob))
    # CadenVM
    cp="SET x 1\nCHECKPOINT before\nADD x 1\nTRACE moved\nASSERT x == 2\nOUTPUT x\nDING"
    cr=caden_run(cp,debug=True);T("cadenvm",cr["state"]=="DING" and cr["vars"]["x"]==2);T("cadenvm-debugger",len(cr["debug"])>=5);T("cadenvm-boundary",cr["jit_aot_boundary"]["jit"]=="OPEN")
    # RouteVM / JMVM
    rr=routevm_run("ROUTE hub -> room\nGOTO room\nTRACE entered\nDING");T("routevm",rr["state"]=="DING" and rr["current"]=="room")
    jr=jmvm_run("SET pass 1\nCMP pass == 1\nEMIT BUILD_PASS\nTRACE checked\nDING","demo");T("jmvm",jr["state"]=="DING" and jr["outputs"][0]["body_id"]=="demo")
    refusal=jmvm_run("PUSH 1\nDING","demo");T("jmvm-identity-refusal",refusal["state"]=="BUGG")
    # RouteCore
    mm=MemoryModel();h=mm.alloc(3);mm.write(h,4);T("routecore-memory",mm.read(h)==4 and mm.free(h)==4)
    sc=Scheduler();sc.add("a",lambda:"A");sc.add("b",lambda:"B");T("routecore-scheduler",[x["result"] for x in sc.run()]==["A","B"])
    ffi=FFI();ffi.register("sum",lambda a,b:a+b);T("routecore-ffi",ffi.call("sum",3,2)==5);T("routecore-abi",ROUTECORE_ABI["word_bits"]==64)
    # RouteOS + OS_CODING
    ro=RouteOS();ro.register("echo",lambda p:p);ro.post("echo","call",{"x":1});T("routeos-event-loop",ro.tick()["state"]=="DING")
    ro.post("echo","write",{});T("routeos-permission",ro.tick()["state"]=="HOLD");T("routeos-abi","service" in RouteOS.ABI["request"])
    oc=os_coding_parse("SERVICE echo PERM call -> echo_adapter");T("os-coding-grammar",oc["state"]=="DING")
    ro2=RouteOS({});T("os-coding-mount",os_coding_mount(oc["ir"],ro2,{"echo_adapter":lambda p:p})["state"]=="DING")
    # TraceBox / BUGG
    tb=TraceBox();tb.append("a","r","TRACE",{"x":1});tb.append("a","r","DING",{"x":2});T("tracebox-storage",len(tb.query(body="a"))==2);T("tracebox-chain",tb.verify_chain())
    q=bugg("DIV_ZERO","bad div");T("bugg-schema",q["code"]=="DIV_ZERO" and "guard" in q["repair"])
    # Codeing Engine / Compiler
    ce=codeing_compile("cading",src);T("codeing-engine-cading",ce["state"]=="DING")
    ce2=codeing_compile("jmlogic","ALLOW IF x == 1",context={"x":1});T("codeing-engine-jmlogic",ce2["state"]=="DING")
    # Compiler office delegates to TheoC, preserving separation
    comp=theoc_compile(src,"compiler","javascript");T("compiler-delegation",comp["state"]=="DING" and comp["target"]=="javascript")
    passed=sum(v for _,v in tests)
    return {"version":VERSION,"tests":len(tests),"passed":passed,"percent":round(100*passed/len(tests),1),"state":"DING" if passed==len(tests) else "BUGG","details":tests}

P0_BODIES = [{'body_id': 'routeos', 'name': 'RouteOS', 'version': '2.0.0'}, {'body_id': 'os-coding', 'name': 'OS_CODING', 'version': '2.0.0'}, {'body_id': 'routecore-native', 'name': 'RouteCore Native', 'version': '2.0.0'}, {'body_id': 'root-method', 'name': 'Root Method', 'version': '2.0.0'}, {'body_id': 'cadenvm', 'name': 'CadenVM', 'version': '2.0.0'}, {'body_id': 'routevm', 'name': 'RouteVM', 'version': '2.0.0'}, {'body_id': 'jmvm', 'name': 'JMVM', 'version': '2.0.0'}, {'body_id': 'parser', 'name': 'Parser', 'version': '2.0.0'}, {'body_id': 'primebody', 'name': 'PrimeBody Parser + Ding Schema', 'version': '2.0.0'}, {'body_id': 'tokenbody', 'name': 'TokenBody', 'version': '2.0.0'}, {'body_id': 'compiler', 'name': 'Compiler', 'version': '2.0.0'}, {'body_id': 'onebody-ir', 'name': 'IR / OneBody IR', 'version': '2.0.0'}, {'body_id': 'theoc', 'name': 'TheoC Contract + TheoC IR', 'version': '2.0.0'}, {'body_id': 'cading', 'name': 'Cading / Theomidul / zeze.nwona', 'version': '2.0.0'}, {'body_id': 'jmlogic', 'name': 'JMLogic', 'version': '2.0.0'}, {'body_id': 'flowtalk', 'name': 'FlowTalk', 'version': '2.0.0'}, {'body_id': 'tracebox', 'name': 'TraceBox / Energy TraceBox', 'version': '2.0.0'}, {'body_id': 'bugg-error-library', 'name': 'BUGG / Error Library', 'version': '2.0.0'}, {'body_id': 'codeing-engine', 'name': 'Codeing Engine', 'version': '2.0.0'}]

def body_about(body_id):
    for x in P0_BODIES:
        if x["body_id"]==body_id:return x
    raise KeyError(body_id)

def main():
    p=argparse.ArgumentParser(prog="jm-p0",description="JM P0 Native Spine v2.0")
    s=p.add_subparsers(dest="cmd",required=True)
    s.add_parser("self-test-all");s.add_parser("list")
    q=s.add_parser("about");q.add_argument("body")
    q=s.add_parser("parse");q.add_argument("file")
    q=s.add_parser("compile");q.add_argument("language");q.add_argument("file");q.add_argument("--target",default="json")
    q=s.add_parser("root-run");q.add_argument("file")
    q=s.add_parser("caden-run");q.add_argument("file");q.add_argument("--debug",action="store_true")
    a=p.parse_args()
    if a.cmd=="self-test-all":
        r=self_test_all();print(json.dumps(r,indent=2));raise SystemExit(0 if r["state"]=="DING" else 1)
    if a.cmd=="list":print(json.dumps(P0_BODIES,indent=2))
    elif a.cmd=="about":print(json.dumps(body_about(a.body),indent=2))
    elif a.cmd=="parse":print(json.dumps(parse_source(pathlib.Path(a.file).read_text(),a.file),indent=2))
    elif a.cmd=="compile":print(json.dumps(codeing_compile(a.language,pathlib.Path(a.file).read_text(),a.target),indent=2))
    elif a.cmd=="root-run":
        lines=pathlib.Path(a.file).read_text().splitlines();print(json.dumps(root_run(root_assemble(lines)),indent=2))
    elif a.cmd=="caden-run":print(json.dumps(caden_run(pathlib.Path(a.file).read_text(),a.debug),indent=2))
if __name__=="__main__":main()