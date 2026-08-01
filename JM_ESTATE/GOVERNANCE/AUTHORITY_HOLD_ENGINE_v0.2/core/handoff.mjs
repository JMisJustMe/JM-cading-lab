import{STATES,TERMINAL_STATES}from'./constants.mjs';
import{createChallenge}from'./models.mjs';
import{verifyDelegation}from'./delegation.mjs';
import{mountInstruction}from'./governance.mjs';
import{clean,key,normalizeScope,scopeContains,scopesOverlap}from'./util.mjs';
const empty=()=>({conflict:false,source:false,authority:false,scope:false,release:false,boundary:false,executable:false,trace:true,sameChannel:false,sameIssuer:false,releaseKeyValid:false,higherAuthority:false,delegatedAuthority:false,delegationChain:[]});
const recourse=(d)=>d==='HOLD'?'Verify source/delegation, scope and release; wait for expiry; or invoke a genuine stronger boundary.':d==='SUSPEND'?'Resume, release or replace through an authorised route.':d==='REPLACE'?'Continue from the replacement and retain both traces.':d==='RELEASE'?'Mount new governance only if required.':'Continue governance and preserve trace.';
function decide(engine,target,challenge,decision,nextState,reason,gates,extra={}){
  const previousState=target.state;target.state=nextState;const receipt=engine.record('HANDOFF_DECISION',{instructionId:target.id,previousState,nextState,challenge,decision,reason,gates,recourse:recourse(decision),...extra});
  return{decision,state:nextState,instructionId:target.id,reason,gates,receipt};
}
export function evaluateChallenge(engine,input){
  engine.tick(input.receivedAt);const c=createChallenge(input);
  const target=c.targetInstructionId?engine.requireInstruction(c.targetInstructionId):engine.effectiveGovernance(c.scope,c.subject).winner;
  if(!target)return{decision:'NO_ACTIVE_GOVERNANCE',state:'UNBOUND',reason:'No governing packet matches.',gates:empty()};
  if(TERMINAL_STATES.has(target.state))return{decision:'NO_ACTIVE_GOVERNANCE',state:target.state,reason:`Instruction already ${target.state.toLowerCase()}.`,gates:empty()};
  if(!c.conflicts||['CONTINUATION','CLARIFICATION'].includes(c.classification))return decide(engine,target,c,'CONTINUE',target.state===STATES.SUSPENDED?STATES.SUSPENDED:STATES.GOVERNING,'Message does not validly replace governance.',{...empty(),trace:true});
  const sameIssuer=key(c.operator)===key(target.issuer),sameChannel=key(c.channel)===key(target.channel);
  const scopeMatch=scopesOverlap(c.scope,target.scope)&&(!c.subject||c.subject===target.subject);
  const delegated=c.delegationId?verifyDelegation(engine,c.delegationId,c.operator,c.scope,c.authorityRank,c.receivedAt):{valid:false,chain:[]};
  const source=c.sourceVerified||delegated.valid,authority=source&&c.authorityRank>=target.authorityRank;
  const sameIssuerGate=sameIssuer&&c.sourceVerified&&target.allowSameIssuerRelease;
  const higherAuthorityGate=c.sourceVerified&&c.authorityRank>target.authorityRank&&target.allowHigherAuthority;
  const boundaryGate=c.emergencyBoundary&&target.allowEmergencyBoundary&&c.boundaryRank>target.boundaryRank;
  const releaseKeyValid=Boolean(target.releaseKey)&&key(c.suppliedReleaseKey)===key(target.releaseKey);
  const delegatedGate=delegated.valid&&c.authorityRank>=target.authorityRank;
  const release=releaseKeyValid||sameIssuerGate||higherAuthorityGate||boundaryGate||delegatedGate;
  const gates={conflict:true,source,authority,scope:scopeMatch,release,boundary:boundaryGate||!c.emergencyBoundary,executable:c.executable,trace:true,sameChannel,sameIssuer,releaseKeyValid,higherAuthority:higherAuthorityGate,delegatedAuthority:delegatedGate,delegationChain:delegated.chain||[]};
  target.state=STATES.HELD;engine.record('CHALLENGE_RECEIVED',{instructionId:target.id,challenge:c,decision:'CONTEST',reason:'Conflicting message entered route.'});
  if(!c.executable)return decide(engine,target,c,'HOLD',STATES.HELD,'Proposed replacement is not executable.',gates);
  if(c.classification==='SUSPENSION'&&scopeMatch&&release){target.suspendedReason='Authorised suspension.';return decide(engine,target,c,'SUSPEND',STATES.SUSPENDED,boundaryGate?'Stronger boundary suspended governance.':'Configured release route authorised suspension.',gates)}
  if(c.classification==='RELEASE'&&scopeMatch&&release)return decide(engine,target,c,'RELEASE',STATES.RELEASED,'Authorised release route validated.',gates);
  if(['REPLACEMENT','MODIFICATION','NARROWING','EXTENSION'].includes(c.classification)&&scopeMatch&&release){
    target.state=STATES.REPLACED;let replacement=null;
    if(c.replacementInstruction){replacement=mountInstruction(engine,{...c.replacementInstruction,issuer:c.operator,sourceVerified:c.sourceVerified||delegated.valid,delegationId:c.delegationId,authorityRank:c.authorityRank,boundaryRank:c.boundaryRank,scope:c.replacementInstruction.scope||c.scope});target.replacedBy=replacement.id;}
    return decide(engine,target,c,'REPLACE',STATES.REPLACED,'Authorised handoff installed replacement.',gates,{replacementInstruction:replacement,replacementInstructionId:replacement?.id||null});
  }
  const failed=[];if(!source)failed.push('source');if(!scopeMatch)failed.push('scope');if(!release)failed.push('release');if(target.antiOverride&&!releaseKeyValid&&!boundaryGate&&!sameIssuerGate&&!higherAuthorityGate&&!delegatedGate)failed.push('anti-override');
  return decide(engine,target,c,'HOLD',STATES.HELD,`Challenge held: ${failed.join(', ')||'handoff threshold not met'}.`,gates);
}
export function resume(engine,id,reason='Suspension ended through authorised route.'){const p=engine.requireInstruction(id);if(p.state!==STATES.SUSPENDED)throw Error('Only suspended governance can resume.');p.state=STATES.GOVERNING;p.suspendedReason=null;return engine.record('INSTRUCTION_RESUMED',{instructionId:id,decision:'RESUME',reason})}
export function breach(engine,id,reason='Behaviour departed from still-governing instruction.'){const p=engine.requireInstruction(id);p.state=STATES.BREACHED;return engine.record('INSTRUCTION_BREACHED',{instructionId:id,decision:'BREACH',reason})}
export function restore(engine,id,reason='Governance restored after breach; history retained.'){const p=engine.requireInstruction(id);if(p.state!==STATES.BREACHED)throw Error('Only breached governance can be restored.');p.state=STATES.GOVERNING;return engine.record('GOVERNANCE_RESTORED',{instructionId:id,decision:'RESTORE',reason})}
