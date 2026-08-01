import{CHALLENGE_CLASSES,DIRECTIVES,STATES}from'./constants.mjs';
import{assert,clean,normalizeScope,nowIso,randomId}from'./util.mjs';
export function createInstruction(input={}){
  const createdAt=input.createdAt??nowIso(),durationMinutes=Math.max(0,Number(input.durationMinutes||0));
  const directive=clean(input.directive||'REQUIRE').toUpperCase();assert(DIRECTIVES.includes(directive),`Unknown directive: ${directive}`);
  const p={id:input.id??randomId('instruction'),issuer:clean(input.issuer)||'Unknown issuer',receiver:clean(input.receiver)||'Receiving body',
    subject:clean(input.subject||input.actionKey||input.action),action:clean(input.action),directive,scope:normalizeScope(input.scope),
    channel:clean(input.channel)||'Unspecified channel',createdAt,expiresAt:input.expiresAt??(durationMinutes?new Date(new Date(createdAt).getTime()+durationMinutes*60000).toISOString():null),durationMinutes,
    authorityRank:Math.max(0,Number(input.authorityRank??1)),boundaryRank:Math.max(0,Number(input.boundaryRank??0)),sourceVerified:Boolean(input.sourceVerified),
    delegationId:clean(input.delegationId)||null,releaseKey:clean(input.releaseKey),allowSameIssuerRelease:input.allowSameIssuerRelease!==false,
    allowHigherAuthority:input.allowHigherAuthority!==false,allowEmergencyBoundary:input.allowEmergencyBoundary!==false,antiOverride:Boolean(input.antiOverride),
    notes:clean(input.notes),state:STATES.PROPOSED,role:'CANDIDATE',replacedBy:null,suspendedReason:null};
  assert(p.action,'Instruction action is required.');assert(p.subject,'Instruction subject is required.');return p;
}
export function createChallenge(input={}){
  const classification=clean(input.classification||'UNKNOWN').toUpperCase();assert(CHALLENGE_CLASSES.includes(classification),`Unknown challenge class: ${classification}`);
  return{id:input.id??randomId('challenge'),targetInstructionId:clean(input.targetInstructionId)||null,message:clean(input.message),operator:clean(input.operator)||'Unknown operator',
    channel:clean(input.channel)||'Unspecified channel',authorityRank:Math.max(0,Number(input.authorityRank||0)),boundaryRank:Math.max(0,Number(input.boundaryRank||0)),
    sourceVerified:Boolean(input.sourceVerified),delegationId:clean(input.delegationId)||null,scope:normalizeScope(input.scope),subject:clean(input.subject),classification,
    conflicts:input.conflicts!==false,suppliedReleaseKey:clean(input.suppliedReleaseKey),emergencyBoundary:Boolean(input.emergencyBoundary),executable:input.executable!==false,
    proposedAction:clean(input.proposedAction),proposedDirective:clean(input.proposedDirective||'REQUIRE').toUpperCase(),replacementInstruction:input.replacementInstruction||null,
    receivedAt:input.receivedAt??nowIso(),notes:clean(input.notes)};
}
export function createDelegation(input={}){
  const d={id:input.id??randomId('delegation'),grantor:clean(input.grantor),grantee:clean(input.grantee),scope:normalizeScope(input.scope),
    maxAuthorityRank:Math.max(0,Number(input.maxAuthorityRank||0)),sourceVerified:Boolean(input.sourceVerified),parentDelegationId:clean(input.parentDelegationId)||null,
    allowRedelegation:Boolean(input.allowRedelegation),createdAt:input.createdAt??nowIso(),expiresAt:input.expiresAt??null,notes:clean(input.notes)};
  assert(d.grantor,'Delegation grantor is required.');assert(d.grantee,'Delegation grantee is required.');assert(d.maxAuthorityRank>0,'Delegation rank must exceed zero.');return d;
}
