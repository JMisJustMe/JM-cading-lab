import{ACTIVE_STATES,STATES,TERMINAL_STATES}from'./constants.mjs';
import{createInstruction}from'./models.mjs';
import{verifyDelegation}from'./delegation.mjs';
import{clone,comparePriority,directivesConflict,scopeContains,scopesOverlap}from'./util.mjs';
export function authorityFor(engine,p){
  if(p.sourceVerified)return{valid:true,rank:p.authorityRank,reason:'Source verified directly.',chain:[]};
  if(!p.delegationId)return{valid:false,rank:0,reason:'Unverified source without delegation.',chain:[]};
  const d=verifyDelegation(engine,p.delegationId,p.issuer,p.scope,p.authorityRank,p.createdAt);return{...d,rank:d.valid?p.authorityRank:0};
}
export function mountInstruction(engine,input){
  const p=createInstruction(input),authority=authorityFor(engine,p);
  if(!authority.valid){p.state=STATES.INVALIDATED;p.role='HISTORY';engine.instructions.set(p.id,p);engine.record('INSTRUCTION_INVALIDATED',{instructionId:p.id,instruction:clone(p),decision:'INVALIDATE',reason:authority.reason,authority});return clone(p)}
  const rivals=engine.activeInstructions().filter(x=>x.subject===p.subject&&scopesOverlap(x.scope,p.scope)&&directivesConflict(x.directive,p.directive));
  if(rivals.length){p.state=STATES.HELD;p.role='CANDIDATE';engine.instructions.set(p.id,p);engine.record('INSTRUCTION_HELD_ON_MOUNT',{instructionId:p.id,instruction:clone(p),decision:'HOLD',reason:'Conflicting governance already active.',competitors:rivals.map(x=>x.id)});return clone(p)}
  p.state=STATES.GOVERNING;p.role='GOVERNANCE';engine.instructions.set(p.id,p);engine.record('INSTRUCTION_MOUNTED',{instructionId:p.id,instruction:clone(p),decision:'GOVERN',reason:'Packet passed authority and conflict gates.'});return clone(p);
}
export function effectiveGovernance(engine,scope='root',subject=''){
  engine.tick();const q=String(subject||'').trim();
  const governing=engine.activeInstructions().filter(p=>scopeContains(p.scope,scope)&&(!q||p.subject===q)).sort((a,b)=>comparePriority(b,a));
  const held=[...engine.instructions.values()].filter(p=>p.role==='CANDIDATE'&&p.state===STATES.HELD&&scopesOverlap(p.scope,scope)&&(!q||p.subject===q));
  const conflicts=[];for(let i=0;i<governing.length;i++)for(let j=i+1;j<governing.length;j++)if(governing[i].subject===governing[j].subject&&directivesConflict(governing[i].directive,governing[j].directive))conflicts.push([governing[i].id,governing[j].id]);
  return{status:conflicts.length?'CONTESTED':governing.length?'GOVERNING':'UNBOUND',governing:clone(governing),heldCandidates:clone(held),conflicts,winner:clone(governing[0]||null)};
}
export function tick(engine,at=new Date().toISOString()){
  const t=new Date(at).getTime();for(const p of engine.instructions.values())if(p.expiresAt&&!TERMINAL_STATES.has(p.state)&&t>=new Date(p.expiresAt).getTime()){
    const previousState=p.state;p.state=STATES.EXPIRED;engine.record('INSTRUCTION_EXPIRED',{instructionId:p.id,previousState,decision:'EXPIRE',reason:'Packet reached expiry.',at});
  }return engine.snapshot();
}
export const isActive=(p)=>p?.role==='GOVERNANCE'&&ACTIVE_STATES.has(p.state);
