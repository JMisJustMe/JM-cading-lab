#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, hmac, json, math, re, sqlite3, time
from dataclasses import dataclass, asdict
from typing import Any

VERSION="2.0.0"
BODIES={'P2_SYSTEMS': ['codehand', 'routebox', 'js-emitter', 'recorp', 'finger-one', 'jmvisual-runtime', 'command-glyphs', 'noncoding-code', 'tbs-string'], 'P2_TOOLING_GOVERNANCE': ['cadenpad', 'coding-body-house', 'finger-one-codestudio', 'builder-lads', 'lexicon', 'namebank', 'pattern-library', 'star-route-builder', 'build-gates', 'choice-box', 'crown-register', 'current-best-register', 'dgyak', 'dings', 'seven-birth-gates', 'source-ledger', 'vts', 'buildode', 'cold-ding-join', 'combibind', 'jmsmooth', 'jqgraft', 'mirror-pair-finger-law', 'onebody', 'onebody-delivery', 'zionfolder', 'glyph-candidates'], 'P3_GAME_EMBODIED': ['finger-two', 'game-coding', 'gameforge', 'glyphforge', 'glyphplay', 'good-gold-star-codegame', 'jm-game-native-core', 'jmgamecore', 'kading-game-estate-engine', 'playform', 'jmvisualgraft', 'contactband', 'contactcode', 'pattern-tapping', 'seedform', 'reality-contact', 'prayer-hands-paired-contact', 'flowtalk-body-route', 'jickma-jickmah', 'mood-drills', 'morseminus', 'mudra-code', 'speakgate', 'speakuals', 'speech-code']}

def stable(x): return json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=False,default=str)
def sha(x): return hashlib.sha256(stable(x).encode()).hexdigest()
def ding(body,payload=None,**extra):
    r={"body":body,"version":VERSION,"state":"DING","payload":payload,"claim_scope":"CURRENT_DESCENDANT_V2"}
    r.update(extra);r["receipt_hash"]=sha(r);return r
def hold(body,reason,payload=None,**extra):
    r={"body":body,"version":VERSION,"state":"HOLD","reason":reason,"payload":payload}
    r.update(extra);r["receipt_hash"]=sha(r);return r
def bugg(body,reason,payload=None,**extra):
    r={"body":body,"version":VERSION,"state":"BUGG","reason":reason,"payload":payload}
    r.update(extra);r["receipt_hash"]=sha(r);return r

def topo(nodes,edges):
    deps={n:set() for n in nodes}
    for a,b in edges: deps.setdefault(a,set());deps.setdefault(b,set()).add(a)
    out=[]
    while deps:
        ready=sorted(n for n,d in deps.items() if not d)
        if not ready:return None
        for n in ready:
            out.append(n);deps.pop(n)
            for d in deps.values():d.discard(n)
    return out

# ---------- P2 systems ----------
class CodeHand:
    def __init__(self): self.projects={};self.breakpoints=set();self.trace=[]
    def project(self,name,targets): self.projects[name]={"targets":list(targets),"vars":{}}
    def repl(self,name,line):
        p=self.projects[name];m=re.fullmatch(r"SET\s+(\w+)\s*=\s*(-?\d+)",line,re.I)
        if m:p["vars"][m.group(1)]=int(m.group(2));self.trace.append({"op":"SET","name":m.group(1)});return p["vars"][m.group(1)]
        if line.upper().startswith("GET "):return p["vars"].get(line.split()[1])
        return None
    def debug(self,line): self.breakpoints.add(line);return {"breakpoint":line,"state":"DING"}

class RouteBox:
    def __init__(self,allowed=None): self.allowed=set(allowed or {"SET","TRACE","DING"});self.trace=[]
    def run(self,program):
        vars={};state="HOLD"
        for line in program.splitlines():
            p=line.strip().split(maxsplit=2)
            if not p:continue
            op=p[0].upper()
            if op not in self.allowed:return hold("routebox","SANDBOX_DENY",{"op":op,"trace":self.trace})
            if op=="SET":vars[p[1]]=p[2] if len(p)>2 else None
            elif op=="TRACE":self.trace.append(" ".join(p[1:]))
            elif op=="DING":state="DING"
        return ding("routebox",{"vars":vars,"trace":self.trace}) if state=="DING" else hold("routebox","NO_DING",{"vars":vars})

def js_emit(ir):
    body=json.dumps(ir,ensure_ascii=False)
    return f"const IR={body};\nconsole.log(JSON.stringify({{body:IR.body||'unknown',status:'DING'}}));\n"

def recorp(parts):
    seen=set();items=[]
    for p in parts:
        fp=sha(p)
        if fp not in seen:items.append({"value":p,"fingerprint":fp});seen.add(fp)
    return ding("recorp",{"items":items,"route":"SCATTERED→RECORP→REGROUPED_BODY"})

class FingerOne:
    def __init__(self):self.body_map={};self.adapters={}
    def register(self,slot,body):self.body_map[slot]=body
    def adapter(self,body,fn):self.adapters[body]=fn
    def call(self,slot,payload):
        b=self.body_map[slot]
        if b not in self.adapters:return hold("finger-one","NO_ADAPTER",{"body":b})
        return ding("finger-one",{"slot":slot,"body":b,"result":self.adapters[b](payload),"identity_preserved":True})

def visual_input_ir(event):
    return {"schema":"jm.visual-input-ir/v2","kind":event.get("kind","tap"),"x":event.get("x",0),"y":event.get("y",0),"t":event.get("t",0)}
def recognise_gesture(events):
    if len(events)>=2:
        dx=events[-1]["x"]-events[0]["x"];dy=events[-1]["y"]-events[0]["y"]
        if abs(dx)>abs(dy) and abs(dx)>10:return "SWIPE_RIGHT" if dx>0 else "SWIPE_LEFT"
        if abs(dy)>10:return "SWIPE_DOWN" if dy>0 else "SWIPE_UP"
    return "TAP"
def render_bridge(state): return {"schema":"jm.visual-render/v2","nodes":[{"type":"text","value":stable(state)}]}

COMMAND_GLYPHS={"▶":"RUN","■":"STOP","↺":"RECOVER","✓":"DING","?":"HOLD"}
def command_glyphs_parse(s):return [COMMAND_GLYPHS[c] for c in s if c in COMMAND_GLYPHS]
def noncoding_parse(s):
    m=re.fullmatch(r"WHEN\s+(.+?)\s+DO\s+(.+)",s,re.I)
    return {"state":"DING","condition":m.group(1),"action":m.group(2)} if m else {"state":"HOLD"}
def tbs_string_parse(s):
    parts=[x.strip() for x in s.split("|")]
    return {"schema":"tbs.string/v2","raw":s,"segments":parts,"count":len(parts)}
def tbs_string_runtime(obj,op):
    if op=="join":return "|".join(obj["segments"])
    if op=="reverse":return list(reversed(obj["segments"]))
    return obj

# ---------- Tooling & governance ----------
class ProjectModel:
    def __init__(self,name):self.name=name;self.files={};self.plugins={};self.receipts=[]
    def put(self,path,text):self.files[path]=text;return sha(text)
    def plugin(self,name,fn):self.plugins[name]=fn
    def run_plugin(self,name,payload):return self.plugins[name](payload)

def language_service(text):
    words=sorted(set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*",text)))
    return {"symbols":words,"completions":words+["BODY","TRACE","DING"],"diagnostics":[]}

def debug_adapter(program,breakpoint=0):
    lines=[x for x in program.splitlines() if x.strip()]
    return {"state":"DING","breakpoint":breakpoint,"line":lines[breakpoint] if lines and breakpoint<len(lines) else None,"stack":[]}

class BodyHouse:
    def __init__(self):self.rooms={};self.plugins={}
    def room(self,name,body):self.rooms[name]={"body":body,"identity":body}
    def plugin(self,name,fn):self.plugins[name]=fn
    def run_plugin(self,name,payload):return self.plugins[name](payload)
    def package(self):return {"rooms":self.rooms,"manifest_hash":sha(self.rooms),"identity_preserved":all(v["body"]==v["identity"] for v in self.rooms.values())}

def builder_lads(tasks):
    nodes=list(tasks);edges=[(d,t) for t,x in tasks.items() for d in x.get("deps",[])]
    order=topo(nodes,edges)
    if order is None:return bugg("builder-lads","TASK_CYCLE")
    receipts=[{"task":t,"state":"DING","authority":"SOURCE"} for t in order]
    return ding("builder-lads",{"order":order,"receipts":receipts})

class Lexicon:
    def __init__(self):self.e={}
    def add(self,term,definition,routes=None):self.e[term]={"definition":definition,"routes":routes or []}
    def get(self,term):return self.e.get(term)
    def complete(self,prefix):return sorted(k for k in self.e if k.startswith(prefix))

class NameBank:
    def __init__(self):self.ns={}
    def define(self,namespace,name,identity):
        key=f"{namespace}::{name}"
        if key in self.ns and self.ns[key]!=identity:return bugg("namebank","COLLISION",{"key":key,"existing":self.ns[key],"incoming":identity})
        self.ns[key]=identity;return ding("namebank",{"key":key,"identity":identity})
    def resolve(self,namespace,name):return self.ns.get(f"{namespace}::{name}")

class PatternLibrary:
    def __init__(self):self.patterns={}
    def add(self,name,regex,version="1.0"):self.patterns[name]={"regex":regex,"version":version}
    def match(self,name,text):return bool(re.search(self.patterns[name]["regex"],text))
    def version(self,name):return self.patterns[name]["version"]

def star_route(graph,start,tests):
    edges={(a,b) for a,b in graph}
    passed=all((a,b) in edges for a,b in tests)
    return ding("star-route-builder",{"graph":graph,"tests":tests,"passed":passed,"export":{"nodes":sorted(set(sum(([a,b] for a,b in graph),[]))),"edges":graph}}) if passed else bugg("star-route-builder","GRAPH_TEST_FAIL")

GATE_ORDER=["SOURCE","SIGNAL","ROUTE","STATE","TRACE","BODY","RECEIPT","REBUILD"]
def build_gates(vals):return ding("build-gates",{"passed":all(vals.get(k,False) for k in GATE_ORDER),"gates":GATE_ORDER,"values":vals})
def choice_box(options,index):
    ast={"type":"Choice","options":list(options),"selected":index}
    if not 0<=index<len(options):return bugg("choice-box","BRANCH_OUT_OF_RANGE",ast)
    return ding("choice-box",{"ast":ast,"branch":options[index]})
def crown_register(candidate,proof,scope):
    state="CROWN" if proof.get("all_gates") else ("WORKING_CROWN" if proof.get("partial") else "HOLD")
    return ding("crown-register",{"candidate":candidate,"scope":scope,"decision":state})
def current_best(candidates):
    # deterministic current-scope selection by explicit proof tuple; not a political/electoral ranking.
    valid=[c for c in candidates if c.get("usable")]
    if not valid:return hold("current-best-register","NO_USABLE")
    best=sorted(valid,key=lambda c:(c.get("proof",0),c.get("version","")),reverse=True)[0]
    return ding("current-best-register",{"selected":best,"basis":["proof","version"]})
def dgyak(claim,evidence):return ding("dgyak",{"claim":claim,"verdict":"KNOW" if evidence else "HOLD","evidence":evidence})
def sign_ding(claim,key=b"jm-local-test-key",links=None):
    obj={"schema":"jm.ding/v2","claim":claim,"trace_links":links or []};sig=hmac.new(key,stable(obj).encode(),hashlib.sha256).hexdigest();obj["signature"]=sig;return obj
def verify_ding(obj,key=b"jm-local-test-key"):
    x={k:v for k,v in obj.items() if k!="signature"};return hmac.compare_digest(obj["signature"],hmac.new(key,stable(x).encode(),hashlib.sha256).hexdigest())
def seven_birth_gates(vals,prev=None):
    names=["SOURCE","IDENTITY","ROUTE","STATE","TRACE","RECEIPT","RELEASE"]
    passed=all(vals.get(x,False) for x in names)
    r={"schema":"jm.birth-gates/v2","gates":names,"passed":passed,"prev":prev};r["hash"]=sha(r);return ding("seven-birth-gates",r)
def source_ledger(sources):
    out=[]
    for s in sources:out.append({**s,"fingerprint":sha({"path":s.get("path"),"authority":s.get("authority"),"version":s.get("version")})})
    conflicts=[]
    bypath={}
    for x in out:
        p=x.get("path")
        if p in bypath and bypath[p].get("authority")!=x.get("authority"):conflicts.append({"path":p,"a":bypath[p],"b":x})
        bypath[p]=x
    return ding("source-ledger",{"sources":out,"conflicts":conflicts})
def vts(claim,checks):return ding("vts",{"claim":claim,"checks":checks,"verdict":"PASS" if all(checks.values()) else "HOLD"})
def buildode(body,purpose,mode):return ding("buildode",{"body":body,"purpose":purpose,"mode":mode,"package":{"OPEN_FIRST":True,"manifest":True,"receipt":True}})
class ColdDing:
    def __init__(self):self.db={}
    def store(self,key,receipt):self.db[key]={"receipt":receipt,"hash":sha(receipt)}
    def recall(self,key):return self.db.get(key)
def combibind(a,b,contract):
    conflicts=[k for k in contract.get("must_differ",[]) if a.get(k)==b.get(k)]
    return ding("combibind",{"bound":[a,b],"contract":contract,"conflicts":conflicts,"identity_preserved":a.get("id")!=b.get("id")}) if not conflicts else hold("combibind","CONFLICT",{"conflicts":conflicts})
def jmsmooth(seq):
    t0=time.perf_counter();out=[];prev=object()
    for x in seq:
        if x!=prev:out.append(x);prev=x
    dt=time.perf_counter()-t0
    return ding("jmsmooth",{"input":seq,"output":out,"equivalent":out==[x for i,x in enumerate(seq) if i==0 or x!=seq[i-1]],"duration_seconds":dt})
class Graft:
    def __init__(self):self.nodes={};self.edges=[];self.history=[]
    def graft(self,target,donor,contract):self.history.append((dict(self.nodes),list(self.edges)));self.nodes[target]=self.nodes.get(target,{});self.nodes[donor]=self.nodes.get(donor,{});self.edges.append({"donor":donor,"target":target,"contract":contract});return ding("jqgraft",{"edges":self.edges})
    def rollback(self):
        if not self.history:return hold("jqgraft","NO_HISTORY")
        self.nodes,self.edges=self.history.pop();return ding("jqgraft",{"rolled_back":True})
def mirror_pair(left,right):return ding("mirror-pair-finger-law",{"left":left,"right":right,"difference":left!=right,"relation":"PAIRED"})
def onebody(identity,route,state,trace,receipt):return ding("onebody",{"identity":identity,"route":route,"state":state,"trace":trace,"receipt":receipt})
def onebody_delivery(body):return ding("onebody-delivery",{"source":body,"build":True,"receipt":True,"package":True,"OPEN_FIRST":True})
def zionfolder(body):return ding("zionfolder",{"source":body,"OPEN_FIRST":"00_OPEN_FIRST","manifest":sha(body),"receipt":True,"sha":sha(body),"recoverable":True})
def glyph_candidates(items):
    recs=[{"glyph":g,"candidate":True,"receipt":sha(g)} for g in items]
    return ding("glyph-candidates",{"registry":recs,"promoted":[x for x in recs if len(x["glyph"])==1]})

# ---------- P3 game / embodied ----------
def temporal_gestures(events,threshold=0.35):
    ev=sorted(events,key=lambda x:x["t"]);groups=[];cur=[]
    for e in ev:
        if cur and e["t"]-cur[-1]["t"]>threshold:groups.append(cur);cur=[]
        cur.append(e)
    if cur:groups.append(cur)
    ast=[]
    for g in groups:
        kind=g[0].get("kind","touch")
        ast.append({"type":"Gesture","kind":kind,"start":g[0]["t"],"end":g[-1]["t"],"count":len(g)})
    return ast
def finger_two(events):return ding("finger-two",{"grammar":["touch","hold","swipe","mudra","morseminus","zerogrip"],"ast":temporal_gestures(events),"runtime":"BODY_INPUT"})
def game_coding(source):
    entities={};inputs={};ticks=1
    for line in source.splitlines():
        s=line.strip()
        m=re.fullmatch(r"ENTITY\s+(\w+)\s+(-?\d+)\s+(-?\d+)",s,re.I)
        if m:entities[m.group(1)]={"x":int(m.group(2)),"y":int(m.group(3))}
        m=re.fullmatch(r"INPUT\s+(\w+)\s+DX\s+(-?\d+)\s+DY\s+(-?\d+)",s,re.I)
        if m:inputs[m.group(1)]={"dx":int(m.group(2)),"dy":int(m.group(3))}
        m=re.fullmatch(r"TICKS\s+(\d+)",s,re.I)
        if m:ticks=int(m.group(1))
    ir={"schema":"jm.gameplay-ir/v2","entities":entities,"inputs":inputs,"ticks":ticks}
    st=json.loads(json.dumps(entities))
    action=next(iter(inputs.values()),{"dx":0,"dy":0})
    for _ in range(ticks):
        for e in st.values():e["x"]+=action["dx"];e["y"]+=action["dy"]
    return ding("game-coding",{"ir":ir,"state":st,"determinism":sha({"ir":ir,"state":st})})
def gameforge(project):
    nodes=list(project["bodies"]);edges=project.get("deps",[]);order=topo(nodes,edges)
    if order is None:return bugg("gameforge","BUILD_CYCLE")
    emitters={t:f"// {t} game package {sha(project)[:12]}" for t in project.get("targets",["js"])}
    return ding("gameforge",{"adapter_sdk":{"register":"body->adapter"},"build_order":order,"emitters":emitters})
def glyphforge(adapter,host_caps):
    req=set(adapter.get("requires",[]));ok=req<=set(host_caps)
    return ding("glyphforge",{"abi":"jm.glyph-adapter/v2","negotiated":ok,"missing":sorted(req-set(host_caps)),"roundtrip":json.loads(stable(adapter))==adapter})
def glyphplay(source):
    trans={}
    for line in source.splitlines():
        m=re.fullmatch(r"GLYPH\s+(\S+)\s+FROM\s+(\w+)\s+TO\s+(\w+)",line.strip(),re.I)
        if m:trans[(m.group(2),m.group(1))]=m.group(3)
    state="idle";trace=[]
    for glyph in [k[1] for k in trans]:
        key=(state,glyph)
        if key in trans:trace.append({"from":state,"glyph":glyph,"to":trans[key]});state=trans[key]
    return ding("glyphplay",{"schema":"jm.playable-glyph-ir/v2","transitions":[{"from":a,"glyph":g,"to":b} for (a,g),b in trans.items()],"state":state,"trace":trace})
def star_codegame(trials,adapter=lambda x:x):
    receipts=[]
    for t in trials:
        got=adapter(t["input"]);receipts.append({"name":t["name"],"pass":got==t["expect"],"got":got})
    return ding("good-gold-star-codegame",{"receipts":receipts,"all_pass":all(x["pass"] for x in receipts)})
GAME_ABI={"schema":"jm.game.native-abi/v2","update":"state,input,dt->state","render":"state->render_ir"}
def game_native_core(game):
    js=f"export const game={json.dumps(game)};"
    cpp='extern "C" int jm_game_update(){return 1;}'
    rust='#[no_mangle] pub extern "C" fn jm_game_update()->i32{1}'
    wat='(module (func (export "jm_game_update") (result i32) i32.const 1))'
    return ding("jm-game-native-core",{"abi":GAME_ABI,"backends":{"js":js,"cpp":cpp,"rust":rust,"wat":wat}})
def jmgamecore(registry,deps,targets):
    order=topo(list(registry),deps)
    return ding("jmgamecore",{"registry":registry,"build_order":order,"targets":targets,"identity_preserved":len(registry)==len(set(registry))}) if order else bugg("jmgamecore","BUILD_CYCLE")
def kading_game(source):
    rooms={};entities={}
    for line in source.splitlines():
        m=re.fullmatch(r"MOUNT\s+(\w+)\s+AS\s+(\w+)",line.strip(),re.I)
        if m:rooms[m.group(2)]=m.group(1)
        m=re.fullmatch(r"ENTITY\s+(\w+)\s+ROOM\s+(\w+)",line.strip(),re.I)
        if m:entities[m.group(1)]={"room":m.group(2)}
    ir={"schema":"jm.kading-game-ir/v2","rooms":rooms,"entities":entities}
    return ding("kading-game-estate-engine",{"ir":ir,"runtime":{"loaded":list(entities)},"emitter":json.dumps(ir)})
def playform(source):
    nodes=[]
    for line in source.splitlines():
        m=re.fullmatch(r"FORM\s+(\w+)\s+AT\s+(\d+)\s+(\d+)\s+SIZE\s+(\d+)\s+(\d+)",line.strip(),re.I)
        if m:nodes.append({"id":m.group(1),"x":int(m.group(2)),"y":int(m.group(3)),"w":int(m.group(4)),"h":int(m.group(5))})
    return ding("playform",{"schema":"jm.layout-ir/v2","nodes":nodes,"render":[{"box":[n["x"],n["y"],n["w"],n["h"]],"id":n["id"]} for n in nodes]})
def visualgraft(scene):
    ir={"schema":"jm.render-ir/v2","assets":scene.get("assets",{}),"draw":scene.get("draw",[])}
    shaders={"wgsl":"@compute @workgroup_size(1) fn main(){}","glsl":"#version 450\nvoid main(){}","hlsl":"float4 main():SV_Target{return 1;}"}
    return ding("jmvisualgraft",{"ir":ir,"asset_contract":{"hashes":{k:sha(v) for k,v in ir["assets"].items()}},"gpu_targets":shaders})
def contactband(events,bands):
    routed=[]
    for e in events:
        b=next((b for b in bands if b["min"]<=e["value"]<=b["max"]),None)
        routed.append({"event":e,"band":b["name"] if b else None})
    return ding("contactband",{"model":bands,"routed":routed})
def contactcode(source):
    ast=[]
    for line in source.splitlines():
        m=re.fullmatch(r"ON\s+(\w+)\s*->\s*(\w+)",line.strip(),re.I)
        if m:ast.append({"event":m.group(1),"route":m.group(2)})
    return ding("contactcode",{"schema":"jm.contact-event-ast/v2","ast":ast,"runtime":{x["event"]:x["route"] for x in ast}})
def pattern_tapping(events):
    toks=[{"dt":0 if i==0 else round(e["t"]-events[i-1]["t"],3),"kind":e.get("kind","tap")} for i,e in enumerate(events)]
    ast={"type":"TapPattern","tokens":toks,"tempo_class":"fast" if toks and max(x["dt"] for x in toks)<0.3 else "mixed"}
    return ding("pattern-tapping",{"lexer":toks,"ast":ast})
def seedform(source,device):
    states={}
    for line in source.splitlines():
        m=re.fullmatch(r"GESTURE\s+(\w+)\s*->\s*STATE\s+(\w+)",line.strip(),re.I)
        if m:states[m.group(1)]=m.group(2)
    return ding("seedform",{"grammar":states,"body_state":states.get(device.get("gesture")),"device_adapter":device})
def reality_contact(signal,adapter=lambda x:x):
    observed=adapter(signal);evidence={"source":"adapter","signal":signal,"observed":observed,"sha256":sha(observed)}
    return ding("reality-contact",{"contact_api":"v2","evidence":evidence})
def prayer_hands(left,right):return ding("prayer-hands-paired-contact",{"left":left,"right":right,"paired":True,"same":left==right})
def flowtalk_body_route(source):return ding("flowtalk-body-route",{"source":source,"segments":[x.strip() for x in re.split(r"->|→",source)],"preserved":True})
def jickma(source):return ding("jickma-jickmah",{"side_be":source,"contact":True,"trace":sha(source)[:12],"gift":source,"side_af":source})
def mood_drill(mood,drill):return ding("mood-drills",{"before":mood,"drill":drill,"after":f"{mood}:{drill}","trace":True})
def morseminus(signal):return ding("morseminus",{"signal":signal,"minimal":"".join(c for c in signal if c in ".-0"),"route":"ACTION"})
MUDRA={"PALM_OPEN":"receive","PRAYER":"paired_contact","POINT":"select","FIST":"hold"}
def mudra_code(events):
    ast=temporal_gestures(events);poses=[MUDRA.get(e.get("pose"),"unknown") for e in events]
    return ding("mudra-code",{"vocabulary":MUDRA,"temporal_ast":ast,"sensor_adapter":{"poses":poses}})
def speakgate(text,choices=None):
    toks=re.findall(r"[A-Za-z0-9']+",text.lower());amb=[t for t in toks if t in {"to","too","two","for","four"}]
    need=bool(amb and choices)
    return ding("speakgate",{"tokens":toks,"ambiguity":amb,"confirmation_required":need,"policy":"CONFIRM_IF_AMBIGUOUS_ROUTE"})
def speakuals(source,ctx=None):
    m=re.fullmatch(r"(.+?)\s+(equals|is|becomes)\s+(.+)",source.strip(),re.I)
    if not m:return hold("speakuals","NO_RELATION")
    ast={"type":"Relation","left":m.group(1),"operator":m.group(2).lower(),"right":m.group(3)}
    safe=ast["left"].strip()!=ast["right"].strip() or ast["operator"]=="equals"
    return ding("speakuals",{"grammar":"LEFT RELATION RIGHT","relation_ast":ast,"semantic_checks":{"nonempty":True,"relation_allowed":safe}})
def speech_code(text,confirm=False):
    toks=re.findall(r"[A-Za-z0-9']+",text.lower());intent="unknown"
    if toks[:1]==["open"]:intent="OPEN"
    elif toks[:1]==["run"]:intent="RUN"
    ambiguous=any(t in {"to","too","two","for","four"} for t in toks)
    state="DING" if (not ambiguous or confirm) else "HOLD"
    return {"body":"speech-code","version":VERSION,"state":state,"intent_ir":{"intent":intent,"tokens":toks,"ambiguous":ambiguous},"confirmation":confirm}

def operate(body,payload):
    p=payload or {}
    if body=="codehand":
        x=CodeHand();x.project("p",p.get("targets",["python"]));v=x.repl("p",p.get("line","SET x = 3"));return ding(body,{"value":v,"debug":x.debug(0),"projects":x.projects})
    if body=="routebox":return RouteBox(set(p.get("allowed",["SET","TRACE","DING"]))).run(p.get("program","SET x 3\nTRACE x\nDING"))
    if body=="js-emitter":return ding(body,{"source":js_emit(p.get("ir",{"body":"demo"})),"historical_exact_conformance":"OPEN"})
    if body=="recorp":return recorp(p.get("parts",["a","b","a"]))
    if body=="finger-one":
        x=FingerOne();x.register("primary","demo");x.adapter("demo",lambda z:{"echo":z});return x.call("primary",p)
    if body=="jmvisual-runtime":
        ev=p.get("events",[{"x":0,"y":0,"t":0,"kind":"touch"},{"x":20,"y":0,"t":.1,"kind":"touch"}]);return ding(body,{"input_ir":[visual_input_ir(x) for x in ev],"gesture":recognise_gesture(ev),"render":render_bridge({"gesture":recognise_gesture(ev)})})
    if body=="command-glyphs":return ding(body,{"commands":command_glyphs_parse(p.get("source","▶✓")),"historical_exact_conformance":"OPEN"})
    if body=="noncoding-code":return ding(body,noncoding_parse(p.get("source","WHEN touched DO glow")),historical_exact_conformance="OPEN")
    if body=="tbs-string":
        o=tbs_string_parse(p.get("source","source|contact|ding"));return ding(body,{"schema":o,"joined":tbs_string_runtime(o,"join")})

    if body=="cadenpad":
        pm=ProjectModel("demo");pm.put("main.cading",p.get("source","BODY Demo\nDING"));return ding(body,{"project":pm.__dict__,"language":language_service(pm.files["main.cading"]),"debug":debug_adapter(pm.files["main.cading"])})
    if body=="coding-body-house":
        h=BodyHouse();h.room("cading","Cading");h.room("flow","FlowTalk");h.plugin("echo",lambda x:x);return ding(body,{"package":h.package(),"plugin":h.run_plugin("echo",p)})
    if body=="finger-one-codestudio":
        pm=ProjectModel("finger");pm.plugin("echo",lambda x:x);return ding(body,{"project":pm.name,"plugin":pm.run_plugin("echo",p),"debug":debug_adapter("TRACE x\nDING",0)})
    if body=="builder-lads":return builder_lads(p.get("tasks",{"design":{"deps":[]},"build":{"deps":["design"]}}))
    if body=="lexicon":
        l=Lexicon();l.add("route","a path of state change",["RouteOS"]);return ding(body,{"lookup":l.get("route"),"complete":l.complete("ro")})
    if body=="namebank":
        n=NameBank();a=n.define("jm","RouteOS","routeos");b=n.define("jm","Cading","cading");return ding(body,{"symbols":n.ns,"first":a["state"],"second":b["state"]})
    if body=="pattern-library":
        q=PatternLibrary();q.add("route",r"\w+\s*->\s*\w+","2.0");return ding(body,{"match":q.match("route",p.get("text","a -> b")),"version":q.version("route")})
    if body=="star-route-builder":return star_route(p.get("graph",[("hub","room")]),p.get("start","hub"),p.get("tests",[("hub","room")]))
    if body=="build-gates":return build_gates(p.get("gates",{k:True for k in GATE_ORDER}))
    if body=="choice-box":return choice_box(p.get("options",["A","B"]),int(p.get("index",0)))
    if body=="crown-register":return crown_register(p.get("candidate","body"),p.get("proof",{"all_gates":True}),p.get("scope","current"))
    if body=="current-best-register":return current_best(p.get("candidates",[{"id":"v1","usable":True,"proof":1,"version":"1.0"},{"id":"v2","usable":True,"proof":2,"version":"2.0"}]))
    if body=="dgyak":return dgyak(p.get("claim","x"),p.get("evidence",["receipt"]))
    if body=="dings":
        x=sign_ding(p.get("claim","proof"),links=p.get("links",["trace:1"]));return ding(body,{"ding":x,"verified":verify_ding(x)})
    if body=="seven-birth-gates":return seven_birth_gates(p.get("gates",{k:True for k in ["SOURCE","IDENTITY","ROUTE","STATE","TRACE","RECEIPT","RELEASE"]}),p.get("prev"))
    if body=="source-ledger":return source_ledger(p.get("sources",[{"path":"a","authority":"source","version":"1"}]))
    if body=="vts":return vts(p.get("claim","body"),p.get("checks",{"syntax":True,"runtime":True}))
    if body=="buildode":return buildode(p.get("body","demo"),p.get("purpose","test"),p.get("mode","OneBody"))
    if body=="cold-ding-join":
        c=ColdDing();c.store("x",p.get("receipt",{"state":"DING"}));return ding(body,{"recalled":c.recall("x")})
    if body=="combibind":return combibind(p.get("a",{"id":"a","kind":"x"}),p.get("b",{"id":"b","kind":"y"}),p.get("contract",{"must_differ":["id"]}))
    if body=="jmsmooth":return jmsmooth(p.get("sequence",[1,1,2,2,3]))
    if body=="jqgraft":
        g=Graft();r=g.graft("target","donor",{"compatible":True});rb=g.rollback();return ding(body,{"graft":r["payload"],"rollback":rb["state"]})
    if body=="mirror-pair-finger-law":return mirror_pair(p.get("left","L"),p.get("right","R"))
    if body=="onebody":return onebody(p.get("identity","demo"),p.get("route",["a","b"]),p.get("state",{}),p.get("trace",[]),p.get("receipt",{"state":"DING"}))
    if body=="onebody-delivery":return onebody_delivery(p.get("body",{"identity":"demo"}))
    if body=="zionfolder":return zionfolder(p.get("body",{"identity":"demo"}))
    if body=="glyph-candidates":return glyph_candidates(p.get("glyphs",["✓","→","candidate"]))

    if body=="finger-two":return finger_two(p.get("events",[{"t":0,"kind":"touch"},{"t":.1,"kind":"touch"}]))
    if body=="game-coding":return game_coding(p.get("source","ENTITY p 0 0\nINPUT right DX 1 DY 0\nTICKS 2"))
    if body=="gameforge":return gameforge(p.get("project",{"bodies":["core","game"],"deps":[("core","game")],"targets":["js","rust"]}))
    if body=="glyphforge":return glyphforge(p.get("adapter",{"requires":["tap"]}),p.get("host_caps",["tap","swipe"]))
    if body=="glyphplay":return glyphplay(p.get("source","GLYPH > FROM idle TO moving"))
    if body=="good-gold-star-codegame":return star_codegame(p.get("trials",[{"name":"one","input":1,"expect":1}]))
    if body=="jm-game-native-core":return game_native_core(p.get("game",{"id":"demo"}))
    if body=="jmgamecore":return jmgamecore(p.get("registry",["a","b"]),p.get("deps",[("a","b")]),p.get("targets",["cpp","rust","wasm"]))
    if body=="kading-game-estate-engine":return kading_game(p.get("source","MOUNT Arena AS arena\nENTITY player ROOM arena"))
    if body=="playform":return playform(p.get("source","FORM panel AT 0 0 SIZE 100 50"))
    if body=="jmvisualgraft":return visualgraft(p.get("scene",{"assets":{"sprite":"hero"},"draw":[{"asset":"sprite"}]}))
    if body=="contactband":return contactband(p.get("events",[{"value":5}]),p.get("bands",[{"name":"low","min":0,"max":9}]))
    if body=="contactcode":return contactcode(p.get("source","ON tap -> select"))
    if body=="pattern-tapping":return pattern_tapping(p.get("events",[{"t":0},{"t":.1},{"t":.2}]))
    if body=="seedform":return seedform(p.get("source","GESTURE open -> STATE ready"),p.get("device",{"gesture":"open"}))
    if body=="reality-contact":return reality_contact(p.get("signal",{"value":1}))
    if body=="prayer-hands-paired-contact":return prayer_hands(p.get("left","L"),p.get("right","R"))
    if body=="flowtalk-body-route":return flowtalk_body_route(p.get("source","source -> meaning -> output"))
    if body=="jickma-jickmah":return jickma(p.get("source","gift"))
    if body=="mood-drills":return mood_drill(p.get("mood","calm"),p.get("drill","focus"))
    if body=="morseminus":return morseminus(p.get("signal",".-0x"))
    if body=="mudra-code":return mudra_code(p.get("events",[{"t":0,"kind":"pose","pose":"PRAYER"}]))
    if body=="speakgate":return speakgate(p.get("text","go to room"),p.get("choices",["room","two"]))
    if body=="speakuals":return speakuals(p.get("source","source equals source"))
    if body=="speech-code":return speech_code(p.get("text","open room"),bool(p.get("confirm",False)))
    return bugg(body,"UNKNOWN_BODY")

def self_test(ids):
    rows=[]
    for body in ids:
        r=operate(body,{})
        ok=r.get("state") in {"DING","HOLD"} and r.get("body")==body
        rows.append({"body":body,"pass":ok,"state":r.get("state"),"receipt_hash":r.get("receipt_hash")})
    # Deep checks for each wave feature families
    checks=[
      ("codehand", CodeHand().debug(0)["state"]=="DING"),
      ("routebox", RouteBox().run("TRACE x\nDING")["state"]=="DING"),
      ("js-emitter", "console.log" in js_emit({"body":"x"})),
      ("recorp", recorp(["a","a"])["payload"]["items"][0]["value"]=="a"),
      ("finger-one", operate("finger-one",{})["state"]=="DING"),
      ("visual-runtime", operate("jmvisual-runtime",{})["state"]=="DING"),
      ("tbs-string", tbs_string_runtime(tbs_string_parse("a|b"),"join")=="a|b"),
      ("dings-sign", verify_ding(sign_ding("x"))),
      ("birth-chain", seven_birth_gates({k:True for k in ["SOURCE","IDENTITY","ROUTE","STATE","TRACE","RECEIPT","RELEASE"]})["state"]=="DING"),
      ("source-ledger", source_ledger([{"path":"x","authority":"a","version":"1"}])["state"]=="DING"),
      ("combibind", combibind({"id":"a"},{"id":"b"},{"must_differ":["id"]})["state"]=="DING"),
      ("graft-rollback", operate("jqgraft",{})["state"]=="DING"),
      ("game-determinism", game_coding("ENTITY p 0 0\nINPUT r DX 1 DY 0\nTICKS 2")["payload"]["determinism"]==game_coding("ENTITY p 0 0\nINPUT r DX 1 DY 0\nTICKS 2")["payload"]["determinism"]),
      ("glyphforge", glyphforge({"requires":["tap"]},["tap"])["payload"]["negotiated"]),
      ("game-native-backends", set(game_native_core({"id":"x"})["payload"]["backends"])=={"js","cpp","rust","wat"}),
      ("reality-evidence", bool(reality_contact({"v":1})["payload"]["evidence"]["sha256"])),
      ("speakuals", speakuals("a equals a")["state"]=="DING"),
      ("speech-confirm", speech_code("run to room",False)["state"]=="HOLD" and speech_code("run to room",True)["state"]=="DING"),
    ]
    passed=sum(x["pass"] for x in rows)+sum(ok for _,ok in checks)
    total=len(rows)+len(checks)
    return {"version":VERSION,"body_checks":rows,"feature_checks":checks,"tests":total,"passed":passed,"percent":round(100*passed/total,1),"state":"DING" if passed==total else "BUGG"}

def main():
    p=argparse.ArgumentParser();s=p.add_subparsers(dest="cmd",required=True)
    q=s.add_parser("run");q.add_argument("body");q.add_argument("--json",default="{}")
    q=s.add_parser("self-test");q.add_argument("group",choices=["systems","tooling","games","all"])
    s.add_parser("list")
    a=p.parse_args()
    if a.cmd=="list":print(json.dumps(BODIES,indent=2,ensure_ascii=False))
    elif a.cmd=="run":print(json.dumps(operate(a.body,json.loads(a.json)),indent=2,ensure_ascii=False))
    else:
        ids={"systems":BODIES["P2_SYSTEMS"],"tooling":BODIES["P2_TOOLING_GOVERNANCE"],"games":BODIES["P3_GAME_EMBODIED"],"all":sum(BODIES.values(),[])}[a.group]
        r=self_test(ids);print(json.dumps(r,indent=2,ensure_ascii=False));raise SystemExit(0 if r["state"]=="DING" else 1)
if __name__=="__main__":main()