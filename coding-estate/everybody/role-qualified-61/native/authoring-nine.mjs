/*
 * Authoring Nine — authorised forward current-native coding faces.
 * Recovered lineage/profile authority: body-registry-extension-01.json (6034bef...).
 * These descendants do not claim historical-original source recovery.
 */
import { Trace, digest } from '../../../sovereign-ten/direct/native-core.mjs';

function need(ok, code, message) { if (!ok) { const e = new Error(message); e.code = code; throw e; } }
function clean(source) { return String(source ?? '').replace(/\r/g,'').split('\n').map(x=>x.replace(/\s*(?:#|\/\/).*$/,'').trim()).filter(Boolean); }
function body(source, keyword) {
  const m = String(source ?? '').match(new RegExp(`^\\s*${keyword}\\s+([A-Za-z_][\\w.-]*)\\s*\\{([\\s\\S]*)\\}\\s*$`, 'i'));
  need(m, `${keyword.toUpperCase()}_BODY`, `${keyword} NAME { ... } required.`);
  return { name:m[1], lines:clean(m[2]) };
}
function receipt(name, action, result) { const t = new Trace(name); t.emit(action, result); return { trace:t.events, receipt:t.receipt(action,result) }; }

export const AUTHORING_NINE_BOUNDARY = Object.freeze({
  schema:'jm.authoring-nine-current-native/1.0',
  status:'AUTHORISED_FORWARD_NATIVE_BRIDGES',
  historicalRecoveryClaim:false,
  bodies:['zezu.nwona / Cading Lab','CadenPad','JM Coding Body House — Intuitive Builder','Finger One','Finger One CodeStudio / GripCube','Finger Two','Lexicon','NameBank','Codeing Engine'],
  law:'Recovered authoring roles keep distinct intrinsic coding grammars; HOUSE != LANGUAGE and ENVIRONMENT != HOSTED BODY.'
});

export const CadingLab = {
  parse(source) {
    const b=body(source,'cadinglab'); const mounts=[], trials=[], promotions=[];
    for (const line of b.lines) {
      let m=line.match(/^mount\s+([\w.-]+)\s+as\s+([\w.-]+)$/i); if(m){mounts.push({body:m[1],slot:m[2]});continue;}
      m=line.match(/^trial\s+([\w.-]+)\s+using\s+([\w.-]+)$/i); if(m){trials.push({name:m[1],slot:m[2]});continue;}
      m=line.match(/^promote\s+([\w.-]+)\s+if\s+ding$/i); if(m){promotions.push(m[1]);continue;}
      need(false,'CADINGLAB_DECL',`Unknown Cading Lab declaration: ${line}`);
    }
    need(mounts.length&&trials.length,'CADINGLAB_EMPTY','Cading Lab requires mount + trial.');
    return {type:'CadingLabProgram',name:b.name,mounts,trials,promotions,boundary:AUTHORING_NINE_BOUNDARY};
  },
  execute(source, trialName, ding=true) {
    const ast=this.parse(source); const trial=ast.trials.find(x=>x.name===trialName); need(trial,'CADINGLAB_TRIAL','Unknown trial.');
    const mount=ast.mounts.find(x=>x.slot===trial.slot); need(mount,'CADINGLAB_SLOT','Trial slot is not mounted.');
    const promoted=ding && ast.promotions.includes(trial.name);
    const result={type:'CadingLabResult',trial:trial.name,body:mount.body,slot:trial.slot,ding:Boolean(ding),promoted,proof:digest({trial,mount,ding:Boolean(ding)})};
    return {ast,runtime:{...result,...receipt('Cading Lab','trial.executed',result)}};
  }
};

export const CadenPad = {
  parse(source){
    const b=body(source,'cadenpad'); const ops=[];
    for(const line of b.lines){
      let m=line.match(/^(open|run|inspect|receipt)\s+([\w.-]+)$/i); need(m,'CADENPAD_OP',`Invalid CadenPad op: ${line}`); ops.push({op:m[1].toLowerCase(),target:m[2]});
    }
    need(ops.some(x=>x.op==='open')&&ops.some(x=>x.op==='run'),'CADENPAD_FLOW','CadenPad requires open + run.');
    return {type:'CadenPadProgram',name:b.name,ops};
  },
  execute(source){ const ast=this.parse(source); const opened=new Set(); const output=[]; for(const op of ast.ops){ if(op.op==='open') opened.add(op.target); else need(opened.has(op.target),'CADENPAD_NOT_OPEN',`${op.target} must be open first.`); output.push({...op,status:'ok'}); } const result={type:'CadenPadResult',output,opened:[...opened]}; return {ast,runtime:{...result,...receipt('CadenPad','pad.executed',result)}}; }
};

export const CodingBodyHouse = {
  parse(source){
    const b=body(source,'codinghouse'); const rooms=new Map(), routes=[];
    for(const line of b.lines){
      let m=line.match(/^room\s+([\w.-]+)\s*=>\s*([\w.-]+)$/i); if(m){need(!rooms.has(m[1]),'HOUSE_DUP_ROOM','Duplicate room.');rooms.set(m[1],m[2]);continue;}
      m=line.match(/^route\s+([\w.-]+)\s*->\s*([\w.-]+)$/i); if(m){routes.push({from:m[1],to:m[2]});continue;}
      need(false,'HOUSE_DECL',`Invalid house declaration: ${line}`);
    }
    need(rooms.size&&routes.length,'HOUSE_EMPTY','House requires rooms + route.');
    for(const r of routes) need(rooms.has(r.from)&&rooms.has(r.to),'HOUSE_ROUTE_ROOM','Route endpoints must be declared rooms.');
    return {type:'CodingBodyHouseProgram',name:b.name,rooms:Object.fromEntries(rooms),routes};
  },
  execute(source,from,to){ const ast=this.parse(source); const edge=ast.routes.find(r=>r.from===from&&r.to===to); need(edge,'HOUSE_NO_ROUTE','No declared room route.'); const result={type:'CodingBodyHouseResult',from,to,fromBody:ast.rooms[from],toBody:ast.rooms[to],preservedIdentity:ast.rooms[from]!==ast.rooms[to]}; return {ast,runtime:{...result,...receipt('Coding Body House','room.routed',result)}}; }
};

export const FingerOne = {
  parse(source){
    const b=body(source,'fingerone'); let selected=null; const routes=[];
    for(const line of b.lines){ let m=line.match(/^select\s+([\w.-]+)$/i); if(m){selected=m[1];continue;} m=line.match(/^route\s+([\w.-]+)\s*->\s*([\w.-]+)$/i); if(m){routes.push({body:m[1],target:m[2]});continue;} need(false,'F1_DECL',`Invalid Finger One declaration: ${line}`); }
    need(selected,'F1_SELECT','Finger One requires select.'); return {type:'FingerOneProgram',name:b.name,selected,routes};
  },
  execute(source){ const ast=this.parse(source); const route=ast.routes.find(r=>r.body===ast.selected)??null; need(route,'F1_ROUTE','Selected body has no route.'); const result={type:'FingerOneResult',selected:ast.selected,target:route.target,authority:'selection-not-source-rewrite'}; return {ast,runtime:{...result,...receipt('Finger One','body.selected',result)}}; }
};

export const FingerOneCodeStudio = {
  parse(source){
    const b=body(source,'codestudio'); let project=null; const mounts=[],trials=[];
    for(const line of b.lines){ let m=line.match(/^project\s+([\w.-]+)$/i); if(m){project=m[1];continue;} m=line.match(/^mount\s+([\w.-]+)$/i); if(m){mounts.push(m[1]);continue;} m=line.match(/^trial\s+([\w.-]+)\s+with\s+([\w.-]+)$/i); if(m){trials.push({name:m[1],body:m[2]});continue;} need(false,'STUDIO_DECL',`Invalid CodeStudio declaration: ${line}`); }
    need(project&&mounts.length&&trials.length,'STUDIO_EMPTY','CodeStudio requires project, mount, trial.'); for(const t of trials) need(mounts.includes(t.body),'STUDIO_UNMOUNTED','Trial body must be mounted.'); return {type:'FingerOneCodeStudioProgram',name:b.name,project,mounts,trials};
  },
  execute(source,trialName){ const ast=this.parse(source); const trial=ast.trials.find(t=>t.name===trialName); need(trial,'STUDIO_TRIAL','Unknown trial.'); const result={type:'FingerOneCodeStudioResult',project:ast.project,trial:trial.name,body:trial.body,grip:'retained'}; return {ast,runtime:{...result,...receipt('Finger One CodeStudio','trial.executed',result)}}; }
};

export const FingerTwo = {
  parse(source){
    const b=body(source,'fingertwo'); const binds=new Map(), sequence=[];
    for(const line of b.lines){ let m=line.match(/^bind\s+(mudra|morseminus|formula|zerogrip)\s+([\w.-]+)$/i); if(m){binds.set(m[1].toLowerCase(),m[2]);continue;} m=line.match(/^sequence\s+(.+)$/i); if(m){sequence.push(...m[1].split('>').map(x=>x.trim().toLowerCase()).filter(Boolean));continue;} need(false,'F2_DECL',`Invalid Finger Two declaration: ${line}`); }
    need(binds.size&&sequence.length,'F2_EMPTY','Finger Two requires embodied binds + sequence.'); for(const kind of sequence) need(binds.has(kind),'F2_UNBOUND',`Sequence kind ${kind} is unbound.`); return {type:'FingerTwoProgram',name:b.name,binds:Object.fromEntries(binds),sequence};
  },
  execute(source){ const ast=this.parse(source); const route=ast.sequence.map(kind=>({kind,body:ast.binds[kind]})); const result={type:'FingerTwoResult',route,embodied:true,flattened:false}; return {ast,runtime:{...result,...receipt('Finger Two','embodied.route',result)}}; }
};

export const Lexicon = {
  parse(source){
    const b=body(source,'lexicon'); const terms={};
    for(const line of b.lines){ const m=line.match(/^term\s+([\w.-]+)\s*=\s*("(?:\\.|[^"\\])*")\s+route\s+([\w.-]+)$/i); need(m,'LEXICON_DECL',`Invalid Lexicon term: ${line}`); need(!terms[m[1]],'LEXICON_DUP','Duplicate term.'); terms[m[1]]={meaning:JSON.parse(m[2]),route:m[3]}; }
    need(Object.keys(terms).length,'LEXICON_EMPTY','Lexicon requires terms.'); return {type:'LexiconProgram',name:b.name,terms};
  },
  execute(source,term){ const ast=this.parse(source); const entry=ast.terms[term]; need(entry,'LEXICON_UNKNOWN','Unknown term.'); const result={type:'LexiconResult',term,...entry}; return {ast,runtime:{...result,...receipt('Lexicon','term.resolved',result)}}; }
};

export const NameBank = {
  parse(source){
    const b=body(source,'namebank'); const names=new Map(), aliases=new Map();
    for(const line of b.lines){ let m=line.match(/^name\s+([\w.-]+)\s+id\s+([\w.-]+)$/i); if(m){need(!names.has(m[1]),'NAME_DUP','Duplicate canonical name.');names.set(m[1],m[2]);continue;} m=line.match(/^alias\s+([\w.-]+)\s*->\s*([\w.-]+)$/i); if(m){need(!aliases.has(m[1]),'ALIAS_DUP','Duplicate alias.');aliases.set(m[1],m[2]);continue;} need(false,'NAMEBANK_DECL',`Invalid NameBank declaration: ${line}`); }
    for(const target of aliases.values()) need(names.has(target),'ALIAS_TARGET','Alias target must be canonical.'); return {type:'NameBankProgram',name:b.name,names:Object.fromEntries(names),aliases:Object.fromEntries(aliases)};
  },
  execute(source,input){ const ast=this.parse(source); const canonical=ast.names[input]?input:ast.aliases[input]; need(canonical&&ast.names[canonical],'NAME_UNKNOWN','Unknown name.'); const result={type:'NameBankResult',input,canonical,id:ast.names[canonical],aliased:input!==canonical}; return {ast,runtime:{...result,...receipt('NameBank','name.resolved',result)}}; }
};

export const CodeingEngine = {
  parse(source){
    const b=body(source,'codeingengine'); let frontend=null,ir=null,backend=null;
    for(const line of b.lines){ let m=line.match(/^(frontend|ir|backend)\s+([\w.-]+)$/i); need(m,'ENGINE_DECL',`Invalid Codeing Engine declaration: ${line}`); const k=m[1].toLowerCase(); if(k==='frontend')frontend=m[2]; if(k==='ir')ir=m[2]; if(k==='backend')backend=m[2]; }
    need(frontend&&ir&&backend,'ENGINE_PIPELINE','Codeing Engine requires frontend + ir + backend.'); return {type:'CodeingEngineProgram',name:b.name,frontend,ir,backend};
  },
  execute(source,input){ const ast=this.parse(source); const artifact={frontend:ast.frontend,ir:ast.ir,backend:ast.backend,inputDigest:digest(String(input??''))}; const result={type:'CodeingEngineResult',artifact,lowered:true,sourceAuthority:'external-to-engine'}; return {ast,runtime:{...result,...receipt('Codeing Engine','pipeline.executed',result)}}; }
};
