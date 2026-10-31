/* JM M002 CP9 — one actual execution body, independently hosted in games and arts.
   Source-derived from Shared Mechanisms v1.2; NOT original THEOGRAPHY authority.
   No DOM, audio, canvas, storage or network. Hosts own presentation and custody.
 */
function JMSharedContactKernel(input) {
  if (!input || !Array.isArray(input.stations) || input.stations.length < 2 || input.stations.length > 12 ||
      !input.stations.every(p => p && /^[A-Z][A-Z0-9]{0,7}$/.test(p.id) &&
        Number.isFinite(p.x) && Number.isFinite(p.y)) ||
      new Set(input.stations.map(p => p.id)).size !== input.stations.length ||
      !/^[A-Z][A-Z0-9_]{1,42}$/.test(input.receiptKind || '') ||
      !Number.isFinite(input.radius) || input.radius <= 0 || input.radius > 200 ||
      (input.shock && (!Number.isFinite(input.shock.x) || !Number.isFinite(input.shock.y) ||
        !Number.isFinite(input.shock.radius) || !input.stations.some(s => s.id === input.shock.requires)))) {
    throw Error('JM_CONTACT_CONFIG_HOLD');
  }
  const settings = {
    stations: input.stations.map(s => ({ id:s.id, x:s.x, y:s.y })),
    receiptKind:input.receiptKind, radius:input.radius,
    shock:input.shock ? { ...input.shock } : null,
  };
  const at = (x,y,cx,cy,r) => Number.isFinite(x) && Number.isFinite(y) && Math.hypot(x-cx,y-cy)<r;
  const earnedGate = s => Array.isArray(s?.earned) && settings.stations.every(p => s.earned.includes(p.id));
  function validate(state) {
    const e=state?.earned, r=state?.receipts;
    if(!Array.isArray(e)||e.length>settings.stations.length ||
       e.some((id,i)=> !settings.stations.some(s=>s.id===id) || e.indexOf(id)!==i) ||
       !Array.isArray(r)||r.length!==e.length ||
       r.some((v,i)=>v?.id!==e[i]||v?.kind!==settings.receiptKind ||
         v.order!==i+1||v.x!==settings.stations.find(s=>s.id===e[i])?.x ||
         v.y!==settings.stations.find(s=>s.id===e[i])?.y) ||
       !Number.isInteger(state.shocks)||state.shocks<0||state.shocks>(settings.shock?1:0) ||
       (state.shocks===1&&!e.includes(settings.shock?.requires)) ||
       (Object.prototype.hasOwnProperty.call(state,'routeOpen')&& state.routeOpen!==earnedGate(state)))
      throw Error('JM_CONTACT_INVARIANT_HOLD');
    return true;
  }
  // Public eligibility uses the same typed receipt/invariant checks as transitions.
  function gate(state) { validate(state); return earnedGate(state); }
  function claim(state,actor) {
    validate(state);
    const s=settings.stations.find(s=>!state.earned.includes(s.id)&&at(actor?.x,actor?.y,s.x,s.y,settings.radius));
    if(!s)return {changed:false,state,reason:'CONTACT_FIELD_NOT_ENTERED'};
    const next=structuredClone(state);
    next.earned.push(s.id);
    next.receipts.push({kind:settings.receiptKind,id:s.id,x:s.x,y:s.y,order:next.earned.length});
    if(Object.prototype.hasOwnProperty.call(next,'routeOpen'))next.routeOpen=earnedGate(next);
    validate(next);
    return {changed:true,state:next,event:{kind:'CONTACT_EARNED',id:s.id,order:next.earned.length,
      gate:gate(next),location:{x:s.x,y:s.y},source:'JM_SHARED_CONTACT_KERNEL_v1'}};
  }
  function shock(state,actor) {
    validate(state);
    const p=settings.shock;
    if(!p||state.shocks>0||!state.earned.includes(p.requires)||
       !at(actor?.x,actor?.y,p.x,p.y,p.radius))return {changed:false,state,reason:'SHOCK_NOT_TRIGGERED'};
    const next=structuredClone(state);next.shocks+=1;validate(next);
    return {changed:true,state:next,event:{kind:'REENTER_PRESERVE',retained:[...next.earned],
      shocks:next.shocks,location:{x:p.x,y:p.y},source:'JM_SHARED_CONTACT_KERNEL_v1'}};
  }
  function replay(actions, medium='game') {
    if(!['game','comic','book','music','cartoon'].includes(medium)||!Array.isArray(actions)||actions.length>100)
      throw Error('JM_CONTACT_MEDIUM_OR_SEQUENCE_HOLD');
    let state={earned:[],receipts:[],shocks:0,routeOpen:false};let trace=[];
    for(const a of actions){
      if(!a||!['claim','shock'].includes(a.kind))throw Error('JM_CONTACT_ACTION_HOLD');
      const outcome=(a.kind==='claim'?claim:shock)(state,{x:a.x,y:a.y});
      if(outcome.changed)state=outcome.state;
      trace.push({step:trace.length+1,request:a.kind,event:outcome.event?.kind||'HOLD',
        id:outcome.event?.id||null,earned:[...state.earned],reentries:state.shocks,gate:gate(state)});
    }
    const artifact = medium==='game' ? {schema:'jm.contact.game-events/1',events:trace} :
      medium==='comic' ? {schema:'jm.contact.comic-panels/1',panels:trace.map(t=>({panel:t.step,
        shot:t.event==='CONTACT_EARNED'?'character-close-up':t.event==='REENTER_PRESERVE'?'wide-reentry':
          t.gate?'gate-opening':'route-obstacle', caption:t.event==='REENTER_PRESERVE'?'What was earned remains.':
          t.event==='CONTACT_EARNED'?'Connection '+t.id+' established.':'The path still demands contact.',continuity:t}))} :
      medium==='book' ? {schema:'jm.contact.book-scenes/1',scenes:trace.map(t=>({scene:t.step,
        paragraph:t.event==='CONTACT_EARNED'?`Current ${t.id} answered the traveller. The connection endured.`:
          t.event==='REENTER_PRESERVE'?'The shock threw the traveller back, but the earned connection remained.':
          'The passage would not open without another real encounter.',tension:t.gate?'resolution':'rising',continuity:t}))} :
      medium==='music' ? {schema:'jm.contact.music-cues/1',tempo:110,measures:trace.map(t=>({bar:t.step,
        instrument:t.event==='CONTACT_EARNED'?'bright-pluck':t.event==='REENTER_PRESERVE'?'deep-drum':'muted-pulse',
        accent:t.gate?'open-chord':'held-cadence',beats:[1,0,t.event==='REENTER_PRESERVE'?1:0,1],continuity:t}))} :
      {schema:'jm.contact.cartoon-beats/1',beats:trace.map(t=>({beat:t.step,
        pose:t.event==='REENTER_PRESERVE'?'return-stumble':t.event==='CONTACT_EARNED'?'reaching-contact':'blocked-step',
        timingFrames:t.event==='REENTER_PRESERVE'?18:12,continuity:t}))};
    return {schema:'jm.m002.cp9.shared-contact-return/1',medium,gate:gate(state),state,trace,artifact,
      boundary:'Structured host execution. Panels/text/cues/beats are production data, not illustrated/printed/audio/video output.'};
  }
  return Object.freeze({version:'jm.m002.shared-contact/1',stations:settings.stations.map(x=>({...x})),
    gate,validate,claim,shock,replay});
}
export {JMSharedContactKernel};
