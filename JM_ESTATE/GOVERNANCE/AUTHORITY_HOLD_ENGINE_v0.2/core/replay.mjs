import{AuthorityHoldEngineV2}from'./engine.mjs';
import{clone,normalizeScope}from'./util.mjs';
export const exportReplay=(engine)=>({engine:engine.engine,version:engine.version,mode:'REPLAY',events:clone(engine.receipts),exportedAt:new Date().toISOString()});
export function replay(envelope,throughIndex=Infinity){
  if(!Array.isArray(envelope?.events))throw Error('Replay envelope must contain events.');
  const e=new AuthorityHoldEngineV2(),limit=Math.min(envelope.events.length,Number.isFinite(throughIndex)?throughIndex+1:envelope.events.length);
  for(let i=0;i<limit;i++)apply(e,envelope.events[i]);e.receipts=clone(envelope.events.slice(0,limit));e.replayCursor=limit-1;return e.snapshot();
}
function apply(e,event){
  if(event.event==='DELEGATION_GRANTED'&&event.delegation){e.delegations.set(event.delegation.id,clone(event.delegation));return}
  if(event.replacementInstruction)e.instructions.set(event.replacementInstruction.id,clone(event.replacementInstruction));
  const id=event.instructionId;if(!id)return;if(event.instruction)e.instructions.set(id,clone(event.instruction));
  const p=e.instructions.get(id);if(!p)return;if(event.nextState)p.state=event.nextState;
  else if(event.event==='INSTRUCTION_MOUNTED')p.state='GOVERNING';else if(event.event==='INSTRUCTION_HELD_ON_MOUNT')p.state='HELD';
  else if(event.event==='INSTRUCTION_INVALIDATED')p.state='INVALIDATED';else if(event.event==='INSTRUCTION_EXPIRED')p.state='EXPIRED';
  else if(event.event==='INSTRUCTION_BREACHED')p.state='BREACHED';else if(['GOVERNANCE_RESTORED','INSTRUCTION_RESUMED'].includes(event.event))p.state='GOVERNING';
}
export function routeOSEnvelope(engine,input={}){
  const scope=normalizeScope(input.scope||'root'),subject=String(input.subject||'').trim(),g=engine.effectiveGovernance(scope,subject);
  return{body:'RouteOS Authority Hold Bridge',version:'0.2.0',INPUT:clone(input.input??input),ROUTE:{scope,subject,channel:String(input.channel||'unspecified')},
    STATE:g.status,SIGNAL:input.signal??'AUTHORITY_EVALUATION',OUTPUT:g.winner??null,TRACE:clone(engine.receipts.slice(-10)),
    RECOURSE:g.status==='CONTESTED'?'Enter Authority Hold; validate source, scope, authority, release and boundary.':'Continue governing route or mount a versioned handoff.',
    NEXT_ACTION:g.status==='UNBOUND'?'MOUNT_INSTRUCTION':g.status==='CONTESTED'?'VALIDATE_HANDOFF':'CONTINUE',generatedAt:new Date().toISOString()};
}
