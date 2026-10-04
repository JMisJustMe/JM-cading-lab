export const STATE_SCHEMA = 'JM.AGILab.RuntimeState/1';
export const RECEIPT_SCHEMA = 'JM.AGILab.RuntimeReceipt/1';
export const SETTLE_TICKS = 12;

function deepClone(value){
  return JSON.parse(JSON.stringify(value));
}

function sorted(value){
  if(Array.isArray(value)) return value.map(sorted);
  if(value && typeof value === 'object'){
    const out={};
    for(const key of Object.keys(value).sort()) out[key]=sorted(value[key]);
    return out;
  }
  return value;
}

export function canonical(value){
  return JSON.stringify(sorted(value));
}

export function newState(now=Date.now()){
  return {
    schema: STATE_SCHEMA,
    version: 1,
    revision: 0,
    phase: 'READY',
    facts: {},
    consequenceCount: 0,
    durability: {
      status: 'IDLE',
      heartbeat: 0,
      required: SETTLE_TICKS,
      startedAt: null,
      settledAt: null
    },
    timeline: [{
      revision: 0,
      kind: 'BOOT',
      at: now,
      detail: 'runtime state created'
    }],
    lastReceipt: null,
    updatedAt: now
  };
}

export function normalizeState(input, now=Date.now()){
  const base=newState(now);
  if(!input || input.schema !== STATE_SCHEMA) return base;
  const s=deepClone(input);
  s.version=1;
  s.revision=Number.isInteger(s.revision) && s.revision>=0 ? s.revision : 0;
  s.phase=typeof s.phase==='string' ? s.phase : 'READY';
  s.facts=s.facts && typeof s.facts==='object' && !Array.isArray(s.facts) ? s.facts : {};
  s.consequenceCount=Number.isInteger(s.consequenceCount) && s.consequenceCount>=0 ? s.consequenceCount : 0;
  s.timeline=Array.isArray(s.timeline) ? s.timeline : [];
  s.durability=s.durability && typeof s.durability==='object' ? s.durability : base.durability;
  s.durability.required=SETTLE_TICKS;
  s.durability.heartbeat=Math.max(0,Math.min(SETTLE_TICKS,Number(s.durability.heartbeat)||0));
  s.updatedAt=Number(s.updatedAt)||now;
  if(!('lastReceipt' in s)) s.lastReceipt=null;
  return s;
}

function event(state, kind, detail, now){
  state.timeline.push({
    revision: state.revision,
    kind,
    at: now,
    detail
  });
  if(state.timeline.length>80) state.timeline=state.timeline.slice(-80);
}

function nonEmpty(value, name){
  const s=String(value??'').trim();
  if(!s) throw new Error(name+' is required');
  return s;
}

export function applyCommand(input, command, now=Date.now()){
  const state=normalizeState(input, now);
  const cmd=command || {};
  const type=String(cmd.type||'').toUpperCase();

  if(type==='OBSERVE'){
    const key=nonEmpty(cmd.key,'observation key').slice(0,80);
    const value=nonEmpty(cmd.value,'observation value').slice(0,320);
    const confidence=Math.max(0,Math.min(1,Number.isFinite(Number(cmd.confidence)) ? Number(cmd.confidence) : 1));
    state.revision+=1;
    state.facts[key]={value,confidence,observedAt:now,revision:state.revision};
    state.phase='CONTACTED';
    state.updatedAt=now;
    event(state,'OBSERVE',{key,value,confidence},now);
    return state;
  }

  if(type==='CONSEQUENCE'){
    const label=nonEmpty(cmd.label||'bounded consequence','consequence label').slice(0,120);
    state.revision+=1;
    state.consequenceCount+=1;
    state.phase='CHANGED';
    state.updatedAt=now;
    event(state,'CONSEQUENCE',{label,count:state.consequenceCount},now);
    return state;
  }

  if(type==='ARM_SETTLE'){
    state.revision+=1;
    state.durability={
      status:'SETTLING',
      heartbeat:0,
      required:SETTLE_TICKS,
      startedAt:now,
      settledAt:null
    };
    state.phase='SETTLING';
    state.updatedAt=now;
    event(state,'ARM_SETTLE',{required:SETTLE_TICKS},now);
    return state;
  }

  if(type==='TICK_SETTLE'){
    if(state.durability.status!=='SETTLING') throw new Error('settle is not armed');
    const next=Math.min(SETTLE_TICKS,state.durability.heartbeat+1);
    state.durability.heartbeat=next;
    state.updatedAt=now;
    event(state,'HEARTBEAT',{value:next,required:SETTLE_TICKS},now);
    if(next===SETTLE_TICKS){
      state.revision+=1;
      state.durability.status='SETTLED';
      state.durability.settledAt=now;
      state.phase='SETTLED';
      event(state,'SETTLED',{heartbeat:next},now);
    }
    return state;
  }

  if(type==='RESET_SETTLE'){
    state.revision+=1;
    state.durability={
      status:'IDLE',
      heartbeat:0,
      required:SETTLE_TICKS,
      startedAt:null,
      settledAt:null
    };
    state.phase='READY';
    state.updatedAt=now;
    event(state,'RESET_SETTLE',{},now);
    return state;
  }

  throw new Error('unknown command: '+type);
}

export function makeReloadChallenge(stateInput, options={}){
  const state=normalizeState(stateInput);
  if(state.durability.status!=='SETTLED') throw new Error('durability must settle before reload challenge');
  const token=nonEmpty(options.token,'challenge token');
  const armedLoadId=nonEmpty(options.loadId,'load id');
  const priorProbe=options.priorProbe===undefined ? null : options.priorProbe;
  const armedAt=Number(options.now)||Date.now();
  const expectedProbe=token+':'+state.revision;
  return {
    schema:'JM.AGILab.ReloadChallenge/1',
    token,
    armedLoadId,
    armedAt,
    armedRevision:state.revision,
    expectedState:canonical(state),
    expectedProbe,
    priorProbe
  };
}

export function verifyReloadChallenge(stateInput, challenge, witness={}){
  const state=normalizeState(stateInput);
  const currentLoadId=String(witness.loadId||'');
  const probeValue=witness.probeValue===null ? null : String(witness.probeValue??'');
  const checks={
    challengeSchema:challenge?.schema==='JM.AGILab.ReloadChallenge/1',
    distinctLoad:!!currentLoadId && currentLoadId!==challenge?.armedLoadId,
    revisionMatch:state.revision===challenge?.armedRevision,
    exactReadBack:canonical(state)===challenge?.expectedState,
    probeMatch:probeValue===challenge?.expectedProbe,
    settled:state.durability.status==='SETTLED' && state.durability.heartbeat===SETTLE_TICKS
  };
  const pass=Object.values(checks).every(Boolean);
  return {
    schema:RECEIPT_SCHEMA,
    state:pass?'PASS':'HOLD',
    kind:'RELOAD_REENTRY',
    checks,
    token:challenge?.token||null,
    armedRevision:challenge?.armedRevision??null,
    returnedRevision:state.revision,
    returnedAt:Number(witness.now)||Date.now(),
    boundary:'Exact state/probe re-entry only. No OS reboot, cross-device, owner-process or AGI capability claim.'
  };
}

export function attachReceipt(stateInput, receipt, now=Date.now()){
  const state=normalizeState(stateInput,now);
  state.lastReceipt=deepClone(receipt);
  state.updatedAt=now;
  if(receipt?.state==='PASS') state.phase='RETURNED';
  event(state,'RECEIPT',{state:receipt?.state||'UNKNOWN',kind:receipt?.kind||'UNKNOWN'},now);
  return state;
}

export function publicSnapshot(stateInput){
  const state=normalizeState(stateInput);
  return {
    schema:state.schema,
    version:state.version,
    revision:state.revision,
    phase:state.phase,
    facts:state.facts,
    consequenceCount:state.consequenceCount,
    durability:state.durability,
    lastReceipt:state.lastReceipt,
    updatedAt:state.updatedAt,
    timeline:state.timeline
  };
}
