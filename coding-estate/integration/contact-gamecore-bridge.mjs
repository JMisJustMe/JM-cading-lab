/**
 * JM CP38 — additive Contact Lab → original JM Game-CODING / JM GameCore adapter.
 * The contact physics belongs to the protected original Lab. This module does
 * not recompute physics or mutate the native engine. An independent verifier
 * MUST authenticate each receipt before any runtime dispatch.
 */
import { GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime } from '../sovereign-ten/direct/game-native.mjs';

export const CONTACT_KINDS = Object.freeze([
  'low_shear_slide','displace','traction_stop','boundary_return',
  'state_recovered','recovery_unavailable','rupture_displace',
  'plastic_deformation','elastic_return'
]);
export const CONTACT_BANDS = Object.freeze({
  source:[1,16],signal:[17,32],contact_field:[33,48],route_pressure:[49,64],
  state_change:[65,80],trace:[81,96],recovery:[97,112],output:[113,128]
});
export const CONTACT_STAGES = Object.freeze(Object.keys(CONTACT_BANDS));
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const copy = x => structuredClone(x);
const hash = value => { let h=2166136261;for (let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0; };
function coord(stage,id) {
  const [start,end] = CONTACT_BANDS[stage];
  return { row:start+hash(stage+':'+id)%(end-start+1), col:1+hash('lane:'+stage+':'+id)%5 };
}
export function validateContactReceipt(r, event = 'contact.'+r?.consequence) {
  if (!r || typeof r!=='object' || !CONTACT_KINDS.includes(r.consequence)) fail('CONTACT_UNKNOWN_CONSEQUENCE');
  if (!/^E[0-9]{4,}$/.test(r.eventId) || r.tick!==Number(r.eventId.slice(1)) || r.tick<1) fail('CONTACT_TICK_INVALID');
  if (event!=='contact.'+r.consequence) fail('CONTACT_WRONG_EVENT');
  if (!r.source || typeof r.source!=='string' || !r.signal || !r.contact || !Number.isFinite(r.pressure) || r.pressure<0) fail('CONTACT_BAD_FIELDS');
  if (typeof r.changed!=='boolean' || !/^\d+,\d+$/.test(r.start) || !/^\d+,\d+$/.test(r.end)) fail('CONTACT_BAD_STATE');
  for (const point of [r.start,r.end]) {
    const [x,y]=point.split(',').map(Number);
    if(x<0||x>7||y<0||y>7) fail('CONTACT_POSITION_OOB');
  }
  const expected={
    source:r.source, signal:r.signal, contact_field:r.contact,
    route_pressure:'p='+r.pressure.toFixed(3), state_change:r.consequence,
    trace:r.eventId+':'+r.source+':'+r.contact,
    recovery:r.consequence==='state_recovered'?'snapshot-restored':
      r.consequence==='recovery_unavailable'?'no-snapshot':'baseline-held',
    output:r.consequence+':'+r.end
  };
  if (!r.coordinates || Object.keys(r.coordinates).length!==8) fail('CONTACT_STAGES_INVALID');
  for (const stage of CONTACT_STAGES) {
    const p=r.coordinates[stage], wanted=coord(stage,expected[stage]);
    if (!p || !Number.isInteger(p.row) || !Number.isInteger(p.col) || p.row!==wanted.row || p.col!==wanted.col) fail('CONTACT_COORDINATE_MISMATCH');
  }
  return r;
}
const gameSource = 'entity Contact {\n route = "none"\n outcome = "none"\n}\n'+
  CONTACT_KINDS.map(k=>'mechanic Apply_'+k+' {\n requires contact.route == "'+k+'"\n effect contact.outcome = "'+k+'"\n}').join('\n');
const coreSource = CONTACT_KINDS.map(k=>
  'organ ContactOrgan_'+k+' {\n handles = [Contact]\n rules = [Apply_'+k+']\n invariants = {\n contact.outcome == "'+k+'"\n }\n}\n'+
  'system Contact_'+k+' {\n organs = [ContactOrgan_'+k+']\n events = [contact.'+k+']\n identity = "JM.ContactLab.v0.1/'+k+'"\n}').join('\n');
export const CONTACT_GAME_AST = GameCoding.parse(gameSource);
export const CONTACT_CORE_AST = JMGameCore.parse(coreSource);

/** Returns a transactional, session-local dispatcher; no ancestor source changes. */
export function createContactGameCoreSession({ authenticate, coreProgram = CONTACT_CORE_AST } = {}) {
  if (typeof authenticate !== 'function') fail('CONTACT_AUTHENTICATOR_REQUIRED');
  const seen = new Set();
  let lastAcceptedTick = 0;
  let committed = null;
  let completed = 0;
  function dispatch(receipt, proof, event='contact.'+receipt?.consequence) {
    validateContactReceipt(receipt,event);
    if (seen.has(receipt.eventId) || receipt.tick<=lastAcceptedTick) fail('CONTACT_REPLAY_REJECTED');
    if (authenticate(receipt,proof)!==true) fail('CONTACT_AUTHENTICATION_FAILED');
    const kind=receipt.consequence;
    const input = {contact:{
      route:kind,outcome:'none',source:receipt.source,traceId:receipt.eventId,
      pressure:receipt.pressure,start:receipt.start,end:receipt.end,
      changed:receipt.changed,signal:receipt.signal,contactMaterial:receipt.contact
    }};
    // Transactional wrapper: an invariant failure discards this isolated runtime,
    // without altering committed state or consuming the authenticated receipt.
    const game=new GameCodingRuntime(CONTACT_GAME_AST,input,{});
    const core=new JMGameCoreRuntime(coreProgram,game);
    const native=core.dispatch('Contact_'+kind,event);
    if (native.type!=='JMGDispatchResult' || native.identity!=='JM.ContactLab.v0.1/'+kind ||
        native.executions.length!==1 || !native.executions[0].applied ||
        native.state.contact.outcome!==kind || !native.receipt?.resultDigest ||
        !native.trace.some(x=>x.type==='system.completed') ||
        !game.trace.events.some(x=>x.type==='mechanic.applied')) fail('CONTACT_NATIVE_EXECUTION_INVALID');
    const result={schema:'jm.contact.gamecore.native/1.0',
      event,sourceEventId:receipt.eventId,tick:receipt.tick,source:receipt.source,
      consequence:kind,contact:copy(native.state.contact),
      state:copy(native.state),nativeReceipt:copy(native.receipt),
      nativeTrace:copy(native.trace),mechanicTrace:copy(game.trace.events)};
    seen.add(receipt.eventId);
    lastAcceptedTick=receipt.tick;
    completed++;
    committed=copy(result);
    return result;
  }
  return Object.freeze({dispatch,status:()=>({completed,lastAcceptedTick,lastAccepted:copy(committed)})});
}
