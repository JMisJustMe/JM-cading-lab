import {Trace,assignments,blocks,digest,listOf,need,stable} from './native-core.mjs';

export const VTS={
 parse(source){const validators=blocks(source,'validate').map(b=>{const d=assignments(b.body);const evidence=listOf(d.evidence).map(String);need(d.claim&&evidence.length&&d.consequence&&d.hold,'VTS_CORE',`Validate ${b.name} incomplete.`);return{name:b.name,claim:d.claim,evidence,consequence:d.consequence,hold:d.hold};});need(validators.length,'VTS_NONE','VTS requires validation route.');return{type:'VTSProgram',validators};},
 execute(source,contact={}){const ast=this.parse(source),v=ast.validators[0],trace=new Trace('VTS / Validate That System');const missing=v.evidence.filter(e=>contact[e]!==true);const passed=missing.length===0;const state={validation:v.name,claim:v.claim,evidence:v.evidence,missing,passed,outcome:passed?v.consequence:v.hold};trace.emit('system.validated',state);return{ast,state,trace:trace.events,receipt:trace.receipt('route claim or system through evidence into consequence or hold',state)};}
};

export const DGYAK={
 parse(source){const knows=blocks(source,'know').map(b=>{const d=assignments(b.body);const evidence=listOf(d.evidence).map(String);need(d.claim&&evidence.length&&d.know&&d.hold,'DGYAK_CORE',`Know ${b.name} incomplete.`);return{name:b.name,claim:d.claim,evidence,know:d.know,hold:d.hold};});need(knows.length,'DGYAK_NONE','DGYAK requires know body.');return{type:'DGYAKProgram',knows};},
 execute(source,contact={}){const ast=this.parse(source),k=ast.knows[0],trace=new Trace('DGYAK');const proven=k.evidence.every(e=>contact[e]===true);const state={body:k.name,claim:k.claim,evidence:k.evidence,proven,status:proven?k.know:k.hold};trace.emit('knowing.checked',state);return{ast,state,trace:trace.events,receipt:trace.receipt('check claimed knowing into know or hold',state)};}
};

export const OneBody={
 parse(source){const bodies=blocks(source,'onebody').map(b=>{const d=assignments(b.body);need(d.identity&&d.state&&d.route&&d.trace&&d.receipt,'ONEBODY_CORE',`OneBody ${b.name} incomplete.`);return{name:b.name,identity:d.identity,state:d.state,route:d.route,trace:d.trace,receipt:d.receipt};});need(bodies.length,'ONEBODY_NONE','OneBody requires body.');return{type:'OneBodyProgram',bodies};},
 execute(source){const ast=this.parse(source),b=ast.bodies[0],payload={identity:b.identity,state:b.state,route:b.route,trace:b.trace,receipt:b.receipt};const state={...payload,oneBodyDigest:digest(payload),complete:true};const trace=new Trace('OneBody');trace.emit('onebody.formed',state);return{ast,state,trace:trace.events,receipt:trace.receipt('form identity route state trace and receipt as one recoverable body',state)};},
 verify(state){const payload={identity:state.identity,state:state.state,route:state.route,trace:state.trace,receipt:state.receipt};need(state.oneBodyDigest===digest(payload),'ONEBODY_TAMPERED','OneBody digest mismatch.');return true;}
};

export const Buildode={
 parse(source){const modes=blocks(source,'buildode').map(b=>{const d=assignments(b.body);need(d.body&&d.purpose&&d.mode&&d.adapt&&d.package,'BUILDODE_CORE',`Buildode ${b.name} incomplete.`);return{name:b.name,body:d.body,purpose:d.purpose,mode:d.mode,adapt:d.adapt,package:d.package};});need(modes.length,'BUILDODE_NONE','Buildode requires buildode.');return{type:'BuildodeProgram',modes};},
 execute(source,body){const ast=this.parse(source),m=ast.modes[0];need(body?.identity===m.body,'BUILDODE_BODY_MISMATCH',m.body);const state={buildode:m.name,body:m.body,purpose:m.purpose,mode:m.mode,adaptation:m.adapt,package:m.package,sourceDigest:digest(body)};const trace=new Trace('Buildode');trace.emit('build.mode.applied',state);return{ast,state,trace:trace.events,receipt:trace.receipt('adapt body package to declared purpose and build mode',state)};}
};

export const Zionfolder={
 parse(source){const folders=blocks(source,'zion').map(b=>{const d=assignments(b.body);need(d.source&&d.open_first&&d.manifest&&d.receipt&&d.sha,'ZION_CORE',`Zion ${b.name} incomplete.`);return{name:b.name,source:d.source,openFirst:d.open_first,manifest:d.manifest,receipt:d.receipt,sha:d.sha};});need(folders.length,'ZION_NONE','Zionfolder requires zion body.');return{type:'ZionfolderProgram',folders};},
 execute(source,files={}){const ast=this.parse(source),z=ast.folders[0];for(const name of [z.source,z.openFirst,z.manifest,z.receipt])need(Object.hasOwn(files,name),'ZION_FILE_MISSING',name);const contents=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));const computed=digest(contents);need(z.sha==='auto'||z.sha===computed,'ZION_SHA_MISMATCH','Zionfolder SHA mismatch.');const state={zion:z.name,source:z.source,openFirst:z.openFirst,manifest:z.manifest,receipt:z.receipt,sha:computed,recoverable:true};const trace=new Trace('Zionfolder');trace.emit('zion.sealed',state);return{ast,state,trace:trace.events,receipt:trace.receipt('seal source OPEN_FIRST manifest receipt and integrity into recoverable carrier',state)};}
};

export const CurrentBestRegister={
 parse(source){const regs=blocks(source,'currentbest').map(b=>{const d=assignments(b.body);const candidates=listOf(d.candidates).map(String);need(d.scope&&candidates.length&&d.proof&&d.strategy,'CBR_CORE',`CurrentBest ${b.name} incomplete.`);return{name:b.name,scope:d.scope,candidates,proof:d.proof,strategy:d.strategy};});need(regs.length,'CBR_NONE','Current Best Register requires register.');return{type:'CurrentBestProgram',regs};},
 execute(source,records={}){const ast=this.parse(source),r=ast.regs[0],available=r.candidates.map(id=>records[id]).filter(Boolean);need(available.length,'CBR_NO_CANDIDATES','No candidate records.');available.forEach(c=>need(c.proof===r.proof,'CBR_PROOF_MISMATCH',c.id));const chosen=[...available].sort((a,b)=>Number(b.version)-Number(a.version)||Number(b.score)-Number(a.score))[0];const state={register:r.name,scope:r.scope,chosen:chosen.id,version:chosen.version,proof:r.proof,strategy:r.strategy};const trace=new Trace('Current Best Register');trace.emit('current.best.selected',state);return{ast,state,trace:trace.events,receipt:trace.receipt('select strongest usable current version within scope and proof',state)};}
};

export const CrownRegister={
 parse(source){const crowns=blocks(source,'crown').map(b=>{const d=assignments(b.body);const gates=listOf(d.gates).map(String);need(d.candidate&&d.scope&&gates.length&&d.pass_status&&d.hold_status,'CROWN_CORE',`Crown ${b.name} incomplete.`);return{name:b.name,candidate:d.candidate,scope:d.scope,gates,passStatus:d.pass_status,holdStatus:d.hold_status};});need(crowns.length,'CROWN_NONE','Crown Register requires crown.');return{type:'CrownProgram',crowns};},
 execute(source,contacts={}){const ast=this.parse(source),c=ast.crowns[0],missing=c.gates.filter(g=>contacts[g]!==true),passed=!missing.length;const state={register:c.name,candidate:c.candidate,scope:c.scope,gates:c.gates,missing,passed,status:passed?c.passStatus:c.holdStatus};const trace=new Trace('Crown Register');trace.emit('crown.judged',state);return{ast,state,trace:trace.events,receipt:trace.receipt('judge candidate through scoped proof gates into crown working-crown or hold',state)};}
};

export class SourceLedger{
 constructor(){this.entries=[];this.trace=new Trace('Source Ledger');}
 parse(source){const entries=blocks(source,'source').map(b=>{const d=assignments(b.body);need(d.path&&d.authority&&d.receipt&&d.body&&d.conflict,'LEDGER_CORE',`Source ${b.name} incomplete.`);return{name:b.name,path:d.path,authority:d.authority,receipt:d.receipt,body:d.body,conflict:d.conflict};});need(entries.length,'LEDGER_NONE','Source Ledger requires source.');return{type:'SourceLedgerProgram',entries};}
 record(source){const ast=this.parse(source),entry=ast.entries[0],existing=this.entries.find(e=>e.path===entry.path);if(existing&&existing.authority!==entry.authority)throw Object.assign(new Error('Source authority conflict'),{code:'LEDGER_AUTHORITY_CONFLICT'});const stored={...entry,index:this.entries.length,digest:digest(entry)};this.entries.push(stored);this.trace.emit('source.recorded',stored);return{ast,state:stored,trace:this.trace.events,receipt:this.trace.receipt('link source path authority receipt and body without silent conflict',stored)};}
}
