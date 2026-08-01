import{ACTIVE_STATES}from'./constants.mjs';
import{clone,randomId}from'./util.mjs';
import{grantDelegation,verifyDelegation}from'./delegation.mjs';
import{effectiveGovernance,mountInstruction,tick}from'./governance.mjs';
import{breach,evaluateChallenge,restore,resume}from'./handoff.mjs';
import{exportReplay,replay,routeOSEnvelope}from'./replay.mjs';
export class AuthorityHoldEngineV2{
  constructor(snapshot=null){this.engine='JM Authority Hold Engine';this.version='0.2.0';this.instructions=new Map();this.delegations=new Map();this.receipts=[];this.replayCursor=-1;if(snapshot)this.restore(snapshot)}
  mountInstruction(i){return mountInstruction(this,i)}
  grantDelegation(i){return grantDelegation(this,i)}
  verifyDelegation(...a){return verifyDelegation(this,...a)}
  evaluateChallenge(i){return evaluateChallenge(this,i)}
  effectiveGovernance(s,q){return effectiveGovernance(this,s,q)}
  tick(at){return tick(this,at)}
  resume(id,r){return resume(this,id,r)}
  markBreach(id,r){return breach(this,id,r)}
  restoreGovernance(id,r){return restore(this,id,r)}
  exportReplay(){return exportReplay(this)}
  replay(e,i){return replay(e,i)}
  stepReplay(envelope,direction=1){const next=Math.max(-1,Math.min(envelope.events.length-1,this.replayCursor+Number(direction)));const s=replay(envelope,next);this.restore(s,{tick:false});this.replayCursor=next;return this.snapshot()}
  routeOSEnvelope(i){return routeOSEnvelope(this,i)}
  activeInstructions(){return[...this.instructions.values()].filter(p=>p.role==='GOVERNANCE'&&ACTIVE_STATES.has(p.state))}
  requireInstruction(id){const p=this.instructions.get(id);if(!p)throw Error(`Instruction not found: ${id}`);return p}
  record(event,details={}){const r={receiptId:randomId('receipt'),sequence:this.receipts.length,event,engine:this.engine,version:this.version,timestamp:new Date().toISOString(),...clone(details)};this.receipts.push(r);return clone(r)}
  snapshot(){return{engine:this.engine,version:this.version,instructions:[...this.instructions.values()].map(clone),delegations:[...this.delegations.values()].map(clone),receipts:clone(this.receipts),replayCursor:this.replayCursor,exportedAt:new Date().toISOString()}}
  restore(snapshot,options={}){if(!snapshot||typeof snapshot!=='object')throw Error('Snapshot must be an object.');this.version=String(snapshot.version||'0.2.0');this.instructions=new Map((snapshot.instructions||[]).map(x=>[x.id,clone(x)]));this.delegations=new Map((snapshot.delegations||[]).map(x=>[x.id,clone(x)]));this.receipts=clone(snapshot.receipts||[]);this.replayCursor=Number.isInteger(snapshot.replayCursor)?snapshot.replayCursor:-1;if(options.tick!==false)this.tick();return this.snapshot()}
  reset(){this.instructions.clear();this.delegations.clear();this.receipts=[];this.replayCursor=-1;return this.snapshot()}
}
export{STATES,DIRECTIVES,CHALLENGE_CLASSES}from'./constants.mjs';
export{normalizeScope,scopeContains,scopesOverlap,directivesConflict,comparePriority}from'./util.mjs';
export{signReceipt,verifyReceipt}from'./receipt.mjs';
