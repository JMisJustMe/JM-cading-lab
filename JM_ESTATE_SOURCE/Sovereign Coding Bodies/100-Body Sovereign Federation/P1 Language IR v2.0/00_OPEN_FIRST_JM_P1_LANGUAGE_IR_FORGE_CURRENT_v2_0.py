#!/usr/bin/env python3
from __future__ import annotations
import argparse, ast, hashlib, json, re, sqlite3, pathlib, tempfile
from dataclasses import dataclass, asdict
from typing import Any

VERSION="2.0.0"
def stable(x): return json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=False,default=str)
def sha(x): return hashlib.sha256(stable(x).encode()).hexdigest()
def rec(body,state,payload=None,**extra):
    r={"body":body,"version":VERSION,"state":state,"payload":payload,"claim_scope":"P1_CURRENT_DESCENDANT"}
    r.update(extra);r["receipt_hash"]=sha(r);return r
def lit(s):
    s=str(s).strip()
    try:return ast.literal_eval(s)
    except:
        if re.fullmatch(r"-?\d+",s):return int(s)
        if re.fullmatch(r"-?\d+\.\d+",s):return float(s)
        if s.lower()=="true":return True
        if s.lower()=="false":return False
        return s

# JM32-1DA ----------------------------------------------------
JM32_RECEIPT_SCHEMA={"schema":"jm32.receipt/v2","required":["source","contact","state_change","trace","status"]}
def jm32_policy(source:str)->dict:
    required={"SOURCE","CONTACT","STATE_CHANGE","TRACE"}
    declared=set()
    guards=[]
    for line in source.splitlines():
        s=line.strip()
        if not s or s.startswith("#"):continue
        if s.upper().startswith("REQUIRE "): declared.add(s.split(None,1)[1].upper())
        elif s.upper().startswith("GUARD "):
            m=re.fullmatch(r"GUARD\s+([A-Z_]+)\s*=\s*(true|false)",s,re.I)
            if m:guards.append({"name":m.group(1).upper(),"expected":m.group(2).lower()=="true"})
    missing=sorted(required-declared)
    ir={"schema":"jm32.policy-ir/v2","required":sorted(declared),"guards":guards,"law":"SOURCE→CONTACT→STATE_CHANGE→DING→TRACE→RECOVERY→OUTPUT"}
    return {"state":"DING" if not missing else "HOLD","ir":ir,"static":{"missing_required":missing}}
def jm32_guard(policy:dict,ctx:dict)->dict:
    fails=[]
    for g in policy["ir"]["guards"]:
        if bool(ctx.get(g["name"]))!=g["expected"]:fails.append(g["name"])
    status="DING" if policy["state"]=="DING" and not fails else "HOLD"
    receipt={"source":ctx.get("SOURCE"),"contact":ctx.get("CONTACT"),"state_change":ctx.get("STATE_CHANGE"),"trace":ctx.get("TRACE"),"status":status,"guard_failures":fails}
    return rec("jm32-1da",status,receipt,schema=JM32_RECEIPT_SCHEMA)

# Polyglot Bridge ----------------------------------------------
BRIDGE_ABI={"schema":"jm.polybridge.abi/v2","calling_convention":"C","scalar":{"i32":"int32","u64":"uint64"},"string":"utf8_ptr_len","receipt":"json_utf8"}
def poly_source_map(source:str,target:str)->list:
    lines=source.splitlines() or [""]
    return [{"source_line":i+1,"target_line":i+1,"target":target} for i in range(len(lines))]
def ffi_generate(name="pulse",target="rust")->str:
    if target=="rust": return f'extern "C" {{ fn {name}() -> i32; }}\n'
    if target=="python": return f'import ctypes\nlib=ctypes.CDLL("./lib32cb.so")\nlib.{name}.restype=ctypes.c_int\n'
    if target=="c-header": return f'int {name}(void);\n'
    raise ValueError(target)
def poly_roundtrip(obj:dict)->dict:
    carrier=stable(obj);back=json.loads(carrier)
    return {"state":"DING" if back==obj else "BUGG","carrier":carrier,"back":back,"fingerprint":sha(obj)}

# Hybrid Auto-Compiler -----------------------------------------
BACKENDS={
"javascript":{"caps":{"web","dynamic","json"},"ext":".js"},
"python":{"caps":{"dynamic","data","json"},"ext":".py"},
"rust":{"caps":{"native","safe","ffi"},"ext":".rs"},
"c":{"caps":{"native","ffi","abi"},"ext":".c"},
"wasm":{"caps":{"web","portable","sandbox"},"ext":".wasm"},
}
def resolve_backend(required,preferred=None):
    req=set(required); candidates=[(n,b) for n,b in BACKENDS.items() if req<=b["caps"]]
    if preferred and any(n==preferred for n,b in candidates):pick=preferred
    elif candidates:pick=sorted(n for n,b in candidates)[0]
    else:return {"state":"HOLD","required":sorted(req),"reason":"NO_BACKEND"}
    return {"state":"DING","backend":pick,"contract":BACKENDS[pick],"required":sorted(req),"source_authority":"CALLER"}
def backend_contract(name):return {"name":name,**BACKENDS[name],"law":"BACKEND MAY EXECUTE; BACKEND MAY NOT CHOOSE SOURCE AUTHORITY"}

# WakeForge -----------------------------------------------------
def recover_source(name:str,carrier:str,kind="text")->dict:
    raw=carrier
    return {"source_id":name,"kind":kind,"raw":raw,"sha256":hashlib.sha256(raw.encode()).hexdigest(),"identity_preserved":True}
def topo(nodes,edges):
    deps={n:set() for n in nodes}
    for a,b in edges:deps.setdefault(b,set()).add(a);deps.setdefault(a,set())
    out=[]
    while deps:
        ready=sorted(n for n,d in deps.items() if not d)
        if not ready:return {"state":"BUGG","error":"CYCLE"}
        for n in ready:
            out.append(n);deps.pop(n)
            for d in deps.values():d.discard(n)
    return {"state":"DING","order":out}
def wake_build(sources,edges,target="json"):
    graph=topo([s["source_id"] for s in sources],edges)
    if graph["state"]!="DING":return graph
    bundle={"body":"WakeForge","target":target,"order":graph["order"],"sources":[{"id":s["source_id"],"sha256":s["sha256"]} for s in sources]}
    return {"state":"DING","graph":graph,"emitted":json.dumps(bundle,indent=2),"bundle":bundle}

# Kading --------------------------------------------------------
KADING_LINE=re.compile(r'^(MOUNT|RELATE|RUN|TRACE|DING)\b(.*)$',re.I)
def kading_parse(source:str)->dict:
    astn=[];diag=[]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=KADING_LINE.match(s)
        if not m:diag.append({"line":i,"code":"KADING_SYNTAX"});continue
        op=m.group(1).upper();rest=m.group(2).strip()
        if op=="MOUNT":
            mm=re.fullmatch(r'([A-Za-z_][\w.-]*)\s+AS\s+([A-Za-z_][\w.-]*)',rest,re.I)
            if not mm:diag.append({"line":i,"code":"KADING_MOUNT"});continue
            astn.append({"op":"MOUNT","body":mm.group(1),"room":mm.group(2)})
        elif op=="RELATE":
            mm=re.fullmatch(r'([A-Za-z_][\w.-]*)\s*(?:->|→)\s*([A-Za-z_][\w.-]*)',rest)
            if not mm:diag.append({"line":i,"code":"KADING_RELATE"});continue
            astn.append({"op":"RELATE","from":mm.group(1),"to":mm.group(2)})
        else:astn.append({"op":op,"value":rest})
    ir={"schema":"jm.kading-ir/v2","nodes":astn,"law":"mounted through Kading, not swallowed by Kading"}
    return {"state":"DING" if astn and not diag else "HOLD","ast":astn,"ir":ir,"diagnostics":diag}
def kading_run(source:str)->dict:
    p=kading_parse(source)
    if p["state"]!="DING":return p
    rooms={};relations=[];trace=[]
    state="HOLD"
    for n in p["ast"]:
        if n["op"]=="MOUNT":rooms[n["room"]]={"body":n["body"],"identity":n["body"]}
        elif n["op"]=="RELATE":relations.append((n["from"],n["to"]))
        elif n["op"]=="RUN":
            room=n["value"]; 
            if room not in rooms:return {"state":"BUGG","error":"NO_ROOM","room":room}
            trace.append({"run":room,"body":rooms[room]["identity"]})
        elif n["op"]=="TRACE":trace.append({"text":n["value"]})
        elif n["op"]=="DING":state="DING"
    return {"state":state,"rooms":rooms,"relations":relations,"trace":trace,"identity_preserved":all(v["body"]==v["identity"] for v in rooms.values()),"ir":p["ir"]}

# Quadze --------------------------------------------------------
def quadze_parse(source:str)->dict:
    mode="BUILDER";entities={};moves=[];diag=[]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=re.fullmatch(r"MODE\s+(BUILDER|GAME)",s,re.I)
        if m:mode=m.group(1).upper();continue
        m=re.fullmatch(r"ENTITY\s+(\w+)\s+AT\s+(-?\d+)\s+(-?\d+)",s,re.I)
        if m:entities[m.group(1)]={"x":int(m.group(2)),"y":int(m.group(3))};continue
        m=re.fullmatch(r"MOVE\s+(\w+)\s+(-?\d+)\s+(-?\d+)",s,re.I)
        if m:moves.append({"id":m.group(1),"dx":int(m.group(2)),"dy":int(m.group(3))});continue
        if s.upper()=="DING":continue
        diag.append({"line":i,"code":"QUADZE_SYNTAX"})
    return {"state":"DING" if entities and not diag else "HOLD","ir":{"schema":"jm.quadze-game-ir/v2","mode":mode,"entities":entities,"moves":moves},"diagnostics":diag}
def quadze_run(source:str)->dict:
    p=quadze_parse(source)
    if p["state"]!="DING":return p
    st=json.loads(json.dumps(p["ir"]["entities"]))
    for m in p["ir"]["moves"]:
        if m["id"] not in st:return {"state":"BUGG","error":"UNKNOWN_ENTITY"}
        st[m["id"]]["x"]+=m["dx"];st[m["id"]]["y"]+=m["dy"]
    return {"state":"DING","mode":p["ir"]["mode"],"game_claim":p["ir"]["mode"]=="GAME","state_field":st,"determinism_fingerprint":sha({"ir":p["ir"],"state":st})}
def quadze_emit(source,target="javascript"):
    r=quadze_run(source)
    if target=="javascript":return "console.log("+json.dumps(json.dumps(r,ensure_ascii=False))+");\n"
    if target=="json":return json.dumps(r,indent=2)
    raise ValueError(target)

# Kocodifying / Codifying / J'MP -------------------------------
def relation_language_parse(source:str,flavour:str)->dict:
    nodes=[];diag=[]
    patterns={
      "kocodifying":re.compile(r"^KOCODE\s+(.+?)\s*=>\s*(.+)$",re.I),
      "codifying":re.compile(r"^CODIFY\s+(.+?)\s+AS\s+(.+)$",re.I),
      "jmp":re.compile(r"^JMP\s+(.+?)\s*(?:->|→)\s*(.+?)(?:\s*:\s*(.+))?$",re.I),
    }
    rx=patterns[flavour]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=rx.fullmatch(s)
        if not m:diag.append({"line":i,"code":flavour.upper()+"_SYNTAX"});continue
        if flavour=="jmp":nodes.append({"op":"MOVE_MEANING","from":m.group(1),"to":m.group(2),"meaning":m.group(3)})
        else:nodes.append({"op":"AUTHOR_ROUTE" if flavour=="kocodifying" else "CODIFY","source":m.group(1),"route":m.group(2)})
    ir={"schema":f"jm.{flavour}-ir/v2","nodes":nodes,"flavour":flavour}
    return {"state":"DING" if nodes and not diag else "HOLD","ast":nodes,"ir":ir,"diagnostics":diag}

# FormeULA / Formula-Born Code ---------------------------------
ALLOWED_BIN={ast.Add:"+",ast.Sub:"-",ast.Mult:"*",ast.Div:"/",ast.Pow:"^"}
ALLOWED_UN={ast.USub:"-"}
def formula_ast(expr:str)->dict:
    tree=ast.parse(expr,mode="eval")
    def cv(n):
        if isinstance(n,ast.Expression):return cv(n.body)
        if isinstance(n,ast.Constant) and isinstance(n.value,(int,float,bool)):return {"type":"Literal","value":n.value,"value_type":type(n.value).__name__}
        if isinstance(n,ast.Name):return {"type":"Symbol","name":n.id,"value_type":"number"}
        if isinstance(n,ast.BinOp) and type(n.op) in ALLOWED_BIN:return {"type":"Binary","op":ALLOWED_BIN[type(n.op)],"left":cv(n.left),"right":cv(n.right),"value_type":"number"}
        if isinstance(n,ast.UnaryOp) and type(n.op) in ALLOWED_UN:return {"type":"Unary","op":ALLOWED_UN[type(n.op)],"value":cv(n.operand),"value_type":"number"}
        raise ValueError("FORMULA_UNSUPPORTED_NODE")
    return cv(tree)
def formula_eval(node,env):
    t=node["type"]
    if t=="Literal":return node["value"]
    if t=="Symbol":return env[node["name"]]
    if t=="Unary":return -formula_eval(node["value"],env)
    a=formula_eval(node["left"],env);b=formula_eval(node["right"],env)
    return {"+":lambda:a+b,"-":lambda:a-b,"*":lambda:a*b,"/":lambda:a/b,"^":lambda:a**b}[node["op"]]()
def formeula_compile(expr,env=None):
    tree=formula_ast(expr);ir={"schema":"jm.formeula-ir/v2","operators":{"+":10,"-":10,"*":20,"/":20,"^":30},"ast":tree}
    return {"state":"DING","typed_ast":tree,"ir":ir,"result":formula_eval(tree,env or {})}
def formula_born(expr):
    tree=formula_ast(expr);return {"state":"DING","symbolic_ast":tree,"lowered":{"op":"FORMULA_BODY","tree":tree,"fingerprint":sha(tree)}}

# Cading Lab ----------------------------------------------------
def extract_modules(source:str)->dict:
    modules={}
    rx=re.compile(r"MODULE\s+([A-Za-z_]\w*)\s*\{(.*?)\}",re.S)
    for m in rx.finditer(source):modules[m.group(1)]=m.group(2).strip()
    return {"state":"DING" if modules else "HOLD","modules":modules}
def language_service(source:str,pos:int=0)->dict:
    words=sorted(set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*",source)))
    return {"completions":words+["MODULE","DING","TRACE"],"hover":{"position":pos,"token":next((w for w in words if w in source[max(0,pos-20):pos+20]),None)},"diagnostics":[]}
def cross_fixture(name,fn,*args):
    try:r=fn(*args);return {"name":name,"state":"DING" if isinstance(r,dict) and r.get("state")=="DING" else "HOLD","result":r}
    except Exception as e:return {"name":name,"state":"BUGG","error":str(e)}

# Mark-Level / Mark-Code / PunctBody ----------------------------
MARK_LEXICON={
"→":{"name":"RouteArrow","semantic":"route"},
".✓":{"name":"Fullstopped","semantic":"stage_validate"},
"✓":{"name":"Check","semantic":"validate"},
"Ø":{"name":"HoldZero","semantic":"hold"},
"_":{"name":"Bridge","semantic":"bridge"},
"=":{"name":"Speakuals","semantic":"relation"},
",":{"name":"CommaTravel","semantic":"continue"},
".":{"name":"Foolstopped","semantic":"pause"},
"!":{"name":"PressureHigh","semantic":"pressure_high"},
"?":{"name":"PressureQuery","semantic":"query"},
"~":{"name":"Soften","semantic":"soften"},
"32÷×&":{"name":"OpenField","semantic":"free_to_divide_timesand"},
}
MARK_RX=re.compile(r"32÷×&|\.✓|→|✓|Ø|[_=,.!?~]")
def mark_lex(source):
    return [{"raw":m.group(0),"start":m.start(),"end":m.end(),"entry":MARK_LEXICON[m.group(0)]} for m in MARK_RX.finditer(source)]
def mark_parse(source):
    toks=mark_lex(source);return {"state":"DING" if toks else "HOLD","tokens":toks,"ast":{"type":"MarkSequence","nodes":[{"type":t["entry"]["name"],"mark":t["raw"],"semantic":t["entry"]["semantic"]} for t in toks]}}
def markcode_run(source):
    p=mark_parse(source);effects=[]
    for n in p["ast"]["nodes"]:effects.append({"mark":n["mark"],"effect":n["semantic"]})
    return {"state":"DING" if effects else "HOLD","semantic_table":MARK_LEXICON,"effects":effects}

PUNCT_PRECEDENCE={"~":5,",":10,"?":15,"!":20,".":25,".✓":30,"✓":30,"Ø":30,"=":12,"→":8}
def punct_parse(source):
    toks=[m.group(0) for m in MARK_RX.finditer(source) if m.group(0) in PUNCT_PRECEDENCE]
    diag=[]
    for a,b in zip(toks,toks[1:]):
        if a==".✓" and b not in {"→",",","="}:diag.append({"code":"POST_FULLSTOP_CONTINUATION","after":b})
    astn=sorted([{"mark":t,"precedence":PUNCT_PRECEDENCE[t]} for t in toks],key=lambda x:(x["precedence"],x["mark"]))
    return {"state":"DING" if toks and not diag else ("HOLD" if toks else "HOLD"),"operator_grammar":PUNCT_PRECEDENCE,"ast":astn,"diagnostics":diag}

# MMZG ----------------------------------------------------------
MMZG_RX=re.compile(r"^SIG\s+(\S+)\s+FIELD\s+(\S+)\s+PRESSURE\s+(-?\d+)\s+DELTA\s+(-?\d+)\s+TRACE\s+(\S+)\s+PALM\s+(PASS|HOLD)$",re.I)
def mmzg_parse(source):
    nodes=[];diag=[];maps=[]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=MMZG_RX.fullmatch(s)
        if not m:diag.append({"line":i,"code":"MMZG_SYNTAX"});continue
        node={"signal":m.group(1),"field":m.group(2),"pressure":int(m.group(3)),"path_delta":int(m.group(4)),"trace":m.group(5),"palm":m.group(6).upper()}
        nodes.append(node);maps.append({"line":i,"raw":line})
    effect_errors=[{"code":"PRESSURE_RANGE","node":n} for n in nodes if not -10<=n["pressure"]<=10]
    ir={"schema":"jm.mmzg-ir/v2","typed_ast":nodes,"effects":{"errors":effect_errors},"source_maps":maps}
    return {"state":"DING" if nodes and not diag and not effect_errors else "HOLD","ir":ir,"diagnostics":diag+effect_errors}

# Route Code / Frame / Script -----------------------------------
def routecode_parse(source):
    nodes=set();edges=[];start=None
    diag=[]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=re.fullmatch(r"NODE\s+(\w+)",s,re.I)
        if m:nodes.add(m.group(1));continue
        m=re.fullmatch(r"ROUTE\s+(\w+)\s*(?:->|→)\s*(\w+)(?:\s+RECOVER\s+(\w+))?",s,re.I)
        if m:edges.append({"from":m.group(1),"to":m.group(2),"recover":m.group(3)});nodes|={m.group(1),m.group(2)};continue
        m=re.fullmatch(r"START\s+(\w+)",s,re.I)
        if m:start=m.group(1);nodes.add(start);continue
        diag.append({"line":i,"code":"ROUTE_CODE_SYNTAX"})
    ir={"schema":"jm.route-graph-ir/v2","nodes":sorted(nodes),"edges":edges,"start":start or (sorted(nodes)[0] if nodes else None)}
    return {"state":"DING" if nodes and not diag else "HOLD","ir":ir,"diagnostics":diag}
def routeframe_verify(ir):
    nodes=set(ir["nodes"]);errs=[]
    for e in ir["edges"]:
        if e["from"] not in nodes or e["to"] not in nodes:errs.append("BAD_EDGE")
        if e.get("recover") and e["recover"] not in nodes:errs.append("BAD_RECOVERY")
    if ir.get("start") not in nodes:errs.append("BAD_START")
    return {"state":"DING" if not errs else "BUGG","errors":errs}
def routeframe_lower(ir):return {"schema":"jm.routeframe-lowered/v2","entry":ir["start"],"transitions":{n:[e["to"] for e in ir["edges"] if e["from"]==n] for n in ir["nodes"]}}
def route_runtime(ir,actions):
    v=routeframe_verify(ir)
    if v["state"]!="DING":return v
    cur=ir["start"];trace=[]
    for target in actions:
        e=next((e for e in ir["edges"] if e["from"]==cur and e["to"]==target),None)
        if not e:return {"state":"BUGG","error":"INVALID_ROUTE","from":cur,"to":target,"trace":trace}
        trace.append({"from":cur,"to":target});cur=target
    return {"state":"DING","current":cur,"trace":trace}
def routescript_parse(source):
    astn=[];diag=[]
    for i,line in enumerate(source.splitlines(),1):
        s=line.strip()
        if not s or s.startswith("#"):continue
        m=re.fullmatch(r"(GOTO|TRACE|DING|HOLD)(?:\s+(.*))?",s,re.I)
        if m:astn.append({"op":m.group(1).upper(),"arg":m.group(2)});continue
        m=re.fullmatch(r"SET\s+(\w+)\s*=\s*(.+)",s,re.I)
        if m:astn.append({"op":"SET","name":m.group(1),"value":lit(m.group(2))});continue
        diag.append({"line":i,"code":"ROUTESCRIPT_SYNTAX"})
    return {"state":"DING" if astn and not diag else "HOLD","ast":astn,"diagnostics":diag}
def routescript_run(script,route_ir):
    p=routescript_parse(script)
    if p["state"]!="DING":return p
    cur=route_ir["start"];vars={};trace=[];state="HOLD"
    for n in p["ast"]:
        if n["op"]=="GOTO":
            r=route_runtime({**route_ir,"start":cur},[n["arg"]])
            if r["state"]!="DING":return r
            cur=r["current"];trace+=r["trace"]
        elif n["op"]=="SET":vars[n["name"]]=n["value"]
        elif n["op"]=="TRACE":trace.append({"at":cur,"text":n["arg"]})
        elif n["op"]=="DING":state="DING";break
        elif n["op"]=="HOLD":state="HOLD";break
    return {"state":state,"current":cur,"vars":vars,"trace":trace}

# StateField -----------------------------------------------------
STATE_SCHEMA={"schema":"jm.statefield/v2","types":["int","float","str","bool"],"effect_ops":["SET","INC","DEC"]}
class StateField:
    def __init__(self):
        self.db=sqlite3.connect(":memory:")
        self.db.execute("create table state(k text primary key,v text,t text)")
        self.effects=[]
    def set(self,k,v):
        t=type(v).__name__;self.db.execute("insert or replace into state values(?,?,?)",(k,json.dumps(v),t));self.db.commit()
    def get(self,k):
        r=self.db.execute("select v from state where k=?",(k,)).fetchone()
        return json.loads(r[0]) if r else None
    def register(self,contact,op,key,value=None):
        if op not in STATE_SCHEMA["effect_ops"]:raise ValueError("BAD_EFFECT")
        self.effects.append({"contact":contact,"op":op,"key":key,"value":value})
    def contact(self,contact):
        trace=[]
        for e in self.effects:
            if e["contact"]!=contact:continue
            before=self.get(e["key"])
            if e["op"]=="SET":after=e["value"]
            elif e["op"]=="INC":after=(before or 0)+e["value"]
            else:after=(before or 0)-e["value"]
            self.set(e["key"],after);trace.append({"effect":e,"before":before,"after":after})
        return {"state":"DING","contact":contact,"trace":trace}

# Self-tests -----------------------------------------------------
def self_test_all():
    tests=[]
    def T(n,c):tests.append((n,bool(c)))
    # JM32
    pol=jm32_policy("REQUIRE SOURCE\nREQUIRE CONTACT\nREQUIRE STATE_CHANGE\nREQUIRE TRACE\nGUARD TRACE=true")
    T("jm32-policy",pol["state"]=="DING");T("jm32-static",not pol["static"]["missing_required"])
    rg=jm32_guard(pol,{"SOURCE":"s","CONTACT":"c","STATE_CHANGE":"x","TRACE":True});T("jm32-guard",rg["state"]=="DING")
    # Polyglot
    T("poly-abi",BRIDGE_ABI["calling_convention"]=="C");T("poly-ffi","extern" in ffi_generate(target="rust"));T("poly-map",poly_source_map("a\nb","rust")[1]["target_line"]==2);T("poly-roundtrip",poly_roundtrip({"x":3})["state"]=="DING")
    # Hybrid
    rb=resolve_backend({"native","ffi"});T("hybrid-resolve",rb["state"]=="DING");T("hybrid-authority",rb["source_authority"]=="CALLER")
    # WakeForge
    s1=recover_source("a","BODY a");s2=recover_source("b","BODY b");wb=wake_build([s1,s2],[("a","b")]);T("wake-recovery",s1["identity_preserved"]);T("wake-graph",wb["graph"]["order"]==["a","b"]);T("wake-emitter","WakeForge" in wb["emitted"])
    # Kading
    ks="MOUNT Cading AS cading_room\nMOUNT FlowTalk AS flow_room\nRELATE cading_room -> flow_room\nRUN cading_room\nTRACE mounted\nDING"
    kp=kading_parse(ks);kr=kading_run(ks);T("kading-parser",kp["state"]=="DING");T("kading-ir",kp["ir"]["schema"].endswith("/v2"));T("kading-identity",kr["identity_preserved"] and kr["state"]=="DING")
    # Quadze
    qs="ENTITY player AT 0 0\nMOVE player 1 2\nDING"
    qr=quadze_run(qs);T("quadze-default-builder",qr["mode"]=="BUILDER" and not qr["game_claim"]);T("quadze-determinism",qr["determinism_fingerprint"]==quadze_run(qs)["determinism_fingerprint"]);T("quadze-emitter","console.log" in quadze_emit(qs))
    # relation languages
    T("kocodifying",relation_language_parse("KOCODE jump => move-right","kocodifying")["state"]=="DING")
    T("codifying",relation_language_parse("CODIFY source AS route","codifying")["state"]=="DING")
    T("jmp",relation_language_parse("JMP here -> there : carry-meaning","jmp")["state"]=="DING")
    # formulae
    fr=formeula_compile("a*2+1",{"a":3});T("formeula-parser",fr["result"]==7);T("formeula-typed",fr["typed_ast"]["value_type"]=="number");T("formula-born",formula_born("3+2")["state"]=="DING")
    # lab
    lm=extract_modules("MODULE A { BODY A\nDING }\nMODULE B { TRACE x }");T("lab-modules",set(lm["modules"])=={"A","B"});T("lab-language-service","MODULE" in language_service("BODY Demo",1)["completions"]);T("lab-fixture",cross_fixture("formula",formeula_compile,"3+2")["state"]=="DING")
    # marks
    ml=mark_parse("?_→.✓");T("mark-lexicon",len(ml["tokens"])==4);T("mark-ast",ml["ast"]["nodes"][2]["semantic"]=="route")
    mc=markcode_run("!→✓");T("mark-code",mc["state"]=="DING" and mc["effects"][1]["effect"]=="route")
    pp=punct_parse("!→.✓");T("punct-grammar","→" in pp["operator_grammar"]);T("punct-precedence",pp["operator_grammar"][".✓"]>pp["operator_grammar"]["→"])
    # MMZG
    mm=mmzg_parse("SIG pulse FIELD left PRESSURE 3 DELTA 1 TRACE t1 PALM PASS");T("mmzg-parser",mm["state"]=="DING");T("mmzg-typed",mm["ir"]["typed_ast"][0]["pressure"]==3);T("mmzg-source-map",mm["ir"]["source_maps"][0]["line"]==1)
    # route family
    rc=routecode_parse("NODE hub\nNODE room\nROUTE hub -> room RECOVER hub\nSTART hub");T("route-code",rc["state"]=="DING");T("routeframe-verify",routeframe_verify(rc["ir"])["state"]=="DING");T("routeframe-lower",routeframe_lower(rc["ir"])["entry"]=="hub")
    rs=routescript_run("GOTO room\nSET score=1\nTRACE arrived\nDING",rc["ir"]);T("routescript",rs["state"]=="DING" and rs["current"]=="room")
    # statefield
    sf=StateField();sf.set("score",1);sf.register("hit","INC","score",2);sr=sf.contact("hit");T("statefield-schema",STATE_SCHEMA["schema"].endswith("/v2"));T("statefield-effects",sf.get("score")==3 and sr["state"]=="DING")
    passed=sum(v for _,v in tests)
    return {"version":VERSION,"tests":len(tests),"passed":passed,"percent":round(100*passed/len(tests),1),"state":"DING" if passed==len(tests) else "BUGG","details":tests}

P1_BODIES=[{'body_id': 'jm32-1da', 'name': 'JM32-1DA', 'version': '2.0.0'}, {'body_id': 'polyglot-bridge', 'name': 'JM Polyglot Bridge', 'version': '2.0.0'}, {'body_id': 'hybrid-auto-compiler', 'name': 'Hybrid Auto-Compiler', 'version': '2.0.0'}, {'body_id': 'wakeforge', 'name': 'WakeForge', 'version': '2.0.0'}, {'body_id': 'kading', 'name': 'Kading', 'version': '2.0.0'}, {'body_id': 'quadze', 'name': 'Quadze', 'version': '2.0.0'}, {'body_id': 'kocodifying', 'name': 'Kocodifying', 'version': '2.0.0'}, {'body_id': 'codifying', 'name': 'Codifying', 'version': '2.0.0'}, {'body_id': 'jmp', 'name': 'J’MP', 'version': '2.0.0'}, {'body_id': 'formeula', 'name': 'FormeULA / Formula-born Coding', 'version': '2.0.0'}, {'body_id': 'cading-lab', 'name': 'zezu.nwona / Cading Lab', 'version': '2.0.0'}, {'body_id': 'formula-born-code', 'name': 'Formula-Born Code', 'version': '2.0.0'}, {'body_id': 'mark-level-syntax', 'name': 'Mark-Level Syntax', 'version': '2.0.0'}, {'body_id': 'mark-code', 'name': 'Mark-Code', 'version': '2.0.0'}, {'body_id': 'punctbody', 'name': 'PunctBody', 'version': '2.0.0'}, {'body_id': 'mmzg', 'name': 'MMZG / MorseMinus ZeroGrip', 'version': '2.0.0'}, {'body_id': 'route-code', 'name': 'Route-Code', 'version': '2.0.0'}, {'body_id': 'routeframe', 'name': 'RouteFrame', 'version': '2.0.0'}, {'body_id': 'routescript', 'name': 'RouteScript', 'version': '2.0.0'}, {'body_id': 'statefield', 'name': 'StateField', 'version': '2.0.0'}]

def main():
    p=argparse.ArgumentParser(prog="jm-p1",description="JM P1 Language/IR Forge v2.0")
    s=p.add_subparsers(dest="cmd",required=True);s.add_parser("self-test-all");s.add_parser("list")
    q=s.add_parser("about");q.add_argument("body")
    a=p.parse_args()
    if a.cmd=="self-test-all":
        r=self_test_all();print(json.dumps(r,indent=2,ensure_ascii=False));raise SystemExit(0 if r["state"]=="DING" else 1)
    if a.cmd=="list":print(json.dumps(P1_BODIES,indent=2,ensure_ascii=False))
    elif a.cmd=="about":
        print(json.dumps(next(x for x in P1_BODIES if x["body_id"]==a.body),indent=2,ensure_ascii=False))
if __name__=="__main__":main()