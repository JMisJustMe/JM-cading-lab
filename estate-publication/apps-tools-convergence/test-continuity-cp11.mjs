import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const path='estate-publication/apps-tools-convergence/JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js';
const source=fs.readFileSync(path,'utf8');
let checks=0;
function check(label,fn){fn();checks++;console.log('DING '+label)}
function runtime(seed={}){
  const items=new Map(Object.entries(seed));let fail=null,ignore=null;
  const storage={
    getItem(k){return items.has(k)?items.get(k):null},
    setItem(k,v){if(fail?.(k,String(v)))throw new Error('SIMULATED_QUOTA');if(ignore?.(k,String(v)))return;items.set(k,String(v))},
    removeItem(k){items.delete(k)}
  };
  const events=[];
  const window={dispatchEvent(e){events.push(e.type)}};
  vm.runInNewContext(source,{window,localStorage:storage,CustomEvent:class{constructor(type){this.type=type}},Event:class{constructor(type){this.type=type}},Date,Math,console,Blob,setTimeout,URL,document:{}},{filename:path});
  return {spine:window.JMAppsToolsSpine,items,events,storage,failOn(f){fail=f},unfail(){fail=null},ignoreOn(f){ignore=f},unignore(){ignore=null}};
}
const key='jm.apps.tools.shared.bus.v1';
const stateKey=env=>'jm.apps.tools.env.'+env+'.v1';
const p=(id,environment)=>({schema:'jm.packet/1.0',id,kind:'unit.contact',source:'JM '+environment,created_at:'2026-10-28T18:00:00Z',payload:{text:'one'},meta:{environment}});
const originalState={rooms:{gem:{source:'PRESERVE ORIGINAL'}},active:'gem'};
const nextState={rooms:{gem:{source:'IMPORT EXACT'}},active:'gem'};

check('CP11 fresh browser starts with a real zero-length bus',()=>{
  const t=runtime();assert.equal(t.spine.read().length,0);
  const v=t.spine.emit('test','JM evidence','hello',{environment:'evidence-governance'});
  assert.equal(t.spine.read().length,1);assert.equal(t.spine.read()[0].id,v.id);
  assert(t.events.includes('jm:packet'));
});
check('CP11 saved environment roundtrips under original v0.1 key',()=>{
  const t=runtime();t.spine.saveState('evidence-governance',originalState);
  assert.deepEqual(JSON.parse(t.items.get(stateKey('evidence-governance'))),originalState);
  assert.equal(t.spine.loadState('evidence-governance').rooms.gem.source,'PRESERVE ORIGINAL');
});
check('CP11 corrupt state fails closed without overwriting original bytes',()=>{
  const t=runtime({[stateKey('evidence-governance')]:'{CORRUPTED SOURCE'});
  assert.throws(()=>t.spine.loadState('evidence-governance'),/UNREADABLE_HOLD/);
  assert.equal(t.items.get(stateKey('evidence-governance')),'{CORRUPTED SOURCE');
});
check('CP11 corrupt bus refuses first mutation and retains exact bytes',()=>{
  const t=runtime({[key]:'BAD ORIGINAL BUS'});
  assert.throws(()=>t.spine.emit('test','source',{},{}),/UNREADABLE_HOLD/);
  assert.equal(t.items.get(key),'BAD ORIGINAL BUS');
});
check('CP11 wrong environment and invalid packets cannot modify the local state',()=>{
  const t=runtime({[key]:JSON.stringify([p('old','route-ftr')]),[stateKey('evidence-governance')]:JSON.stringify(originalState)});
  const before=[t.items.get(key),t.items.get(stateKey('evidence-governance'))];
  assert.throws(()=>t.spine.importEnvironment('evidence-governance',{schema:'jm.apps.tools.portable-environment/1.0',environment:'route-ftr',state:nextState,packets:[p('x','route-ftr')]}),/ENVIRONMENT_ID_OR_SCHEMA_HOLD/);
  assert.throws(()=>t.spine.importEnvironment('evidence-governance',{schema:'jm.apps.tools.portable-environment/1.0',environment:'evidence-governance',state:nextState,packets:[{schema:'jm.packet/1.0'}]}),/PACKET_INVALID/);
  assert.deepEqual([t.items.get(key),t.items.get(stateKey('evidence-governance'))],before);
});
check('CP11 import merges distinct original environmental packets, commits and reads back state',()=>{
  const t=runtime({[key]:JSON.stringify([p('old','route-ftr')]),[stateKey('evidence-governance')]:JSON.stringify(originalState)});
  const result=t.spine.importEnvironment('evidence-governance',{schema:'jm.apps.tools.portable-environment/1.0',environment:'evidence-governance',state:nextState,packets:[p('new','evidence-governance')]});
  assert.equal(result.packets,1);assert.equal(result.mergedPackets,2);
  assert.equal(JSON.stringify(t.spine.read().map(x=>x.id)),JSON.stringify(['new','old']));
  assert.equal(t.spine.loadState('evidence-governance').rooms.gem.source,'IMPORT EXACT');
});
check('CP11 failed second write rolls back exact prior environment and bus, no fake packet event',()=>{
  const t=runtime({[key]:JSON.stringify([p('old','route-ftr')]),[stateKey('evidence-governance')]:JSON.stringify(originalState)});
  const before=[t.items.get(key),t.items.get(stateKey('evidence-governance'))];
  t.failOn(k=>k===key);
  assert.throws(()=>t.spine.importEnvironment('evidence-governance',{schema:'jm.apps.tools.portable-environment/1.0',environment:'evidence-governance',state:nextState,packets:[p('new','evidence-governance')]}),/SIMULATED_QUOTA/);
  assert.deepEqual([t.items.get(key),t.items.get(stateKey('evidence-governance'))],before);
  assert(!t.events.includes('jm:bus-imported'));
});
check('CP11 rejected first write neither clears original state nor announces import',()=>{
  const t=runtime({[key]:JSON.stringify([p('old','route-ftr')]),[stateKey('evidence-governance')]:JSON.stringify(originalState)});
  const before=[t.items.get(key),t.items.get(stateKey('evidence-governance'))];
  t.failOn(k=>k===stateKey('evidence-governance'));
  assert.throws(()=>t.spine.importEnvironment('evidence-governance',{schema:'jm.apps.tools.portable-environment/1.0',environment:'evidence-governance',state:nextState,packets:[p('new','evidence-governance')]}),/SIMULATED_QUOTA/);
  assert.deepEqual([t.items.get(key),t.items.get(stateKey('evidence-governance'))],before);
});
check('CP11 full packet bus refuses new writes, keeps original 250 with original order',()=>{
  const rows=Array.from({length:250},(_,i)=>p('kept-'+i,'route-ftr'));
  const t=runtime({[key]:JSON.stringify(rows)});
  assert.throws(()=>t.spine.emit('new','source',{},{}),/FULL_EXPORT_BEFORE_NEW_WRITE/);
  assert.equal(JSON.stringify(t.spine.read().map(x=>x.id)),JSON.stringify(rows.map(x=>x.id)));
});
check('CP11 over-capacity portable merge aborts before modifying any key',()=>{
  const rows=Array.from({length:250},(_,i)=>p('kept-'+i,'route-ftr'));
  const t=runtime({[key]:JSON.stringify(rows),[stateKey('evidence-governance')]:JSON.stringify(originalState)});
  const before=[t.items.get(key),t.items.get(stateKey('evidence-governance'))];
  assert.throws(()=>t.spine.importEnvironment('evidence-governance',{schema:'jm.apps.tools.portable-environment/1.0',environment:'evidence-governance',state:nextState,packets:[p('incoming','evidence-governance')]}),/BUS_FULL/);
  assert.deepEqual([t.items.get(key),t.items.get(stateKey('evidence-governance'))],before);
});
check('CP11 exported environment contains original state and original bus identities',()=>{
  const t=runtime();t.spine.saveState('evidence-governance',originalState);t.spine.send(p('kept','evidence-governance'));
  const e=t.spine.exportEnvironment('evidence-governance');
  assert.equal(e.schema,'jm.apps.tools.portable-environment/1.0');
  assert.equal(e.environment,'evidence-governance');
  assert.equal(e.state.rooms.gem.source,'PRESERVE ORIGINAL');
  assert.equal(e.packets[0].id,'kept');
});
check('CP13 portable environment same-ID/different-content import holds without mutation',()=>{
  const kept=p('kept-id','evidence-governance');
  const altered=p('kept-id','evidence-governance');
  altered.payload.text='CHANGED SOURCE WITH REUSED ID';
  const t=runtime({[key]:JSON.stringify([kept]),[stateKey('evidence-governance')]:JSON.stringify(originalState)});
  const before=[t.items.get(key),t.items.get(stateKey('evidence-governance'))];
  assert.throws(()=>t.spine.importEnvironment('evidence-governance',{
    schema:'jm.apps.tools.portable-environment/1.0',environment:'evidence-governance',
    state:nextState,packets:[altered]
  }),/PACKET_BUS_ID_COLLISION_HOLD/);
  assert.deepEqual([t.items.get(key),t.items.get(stateKey('evidence-governance'))],before);
  assert(!t.events.includes('jm:bus-imported'));
});
check('CP13 portable export flags inherited full shared bus privacy scope',()=>{
  const t=runtime();
  t.spine.saveState('route-ftr',{rooms:{deck:{value:'synthetic'}},active:'deck'});
  t.spine.send(p('other-room-packet','evidence-governance'));
  const portable=t.spine.exportEnvironment('route-ftr');
  assert.equal(portable.environment,'route-ftr');
  assert.equal(portable.packets.length,1);
  assert.equal(portable.packets[0].meta.environment,'evidence-governance');
  const ui=fs.readFileSync('estate-publication/apps-tools-convergence/JM_CAPABILITY_ENVIRONMENT_RUNTIME_v0_1.js','utf8');
  assert.match(ui,/PRIVATE EXPORT REQUESTED/);
  assert.match(ui,/Includes the entire shared packet bus across workrooms/);
});

check('CP12 original UI confirms destructive environment restore and room clear',()=>{
  const ui=fs.readFileSync('estate-publication/apps-tools-convergence/JM_CAPABILITY_ENVIRONMENT_RUNTIME_v0_1.js','utf8');
  const confirmAt=ui.indexOf("window.confirm('RESTORE ");
  const commitAt=ui.indexOf('spine.importEnvironment(cfg.id,obj)');
  assert(confirmAt>0 && commitAt>confirmAt);
  assert.match(ui,/Clear cancelled; saved room fields preserved/);
  assert(ui.includes("window.confirm('Clear saved fields in "));
  assert.match(ui,/IMPORT_FILE_TOO_LARGE_HOLD/);
});
check('CP13 silent packet persistence failure refuses a false Ding',()=>{
  const existing=p('original-packet','evidence-governance');
  const t=runtime({[key]:JSON.stringify([existing])});
  const saved=t.items.get(key);
  t.ignoreOn(k=>k===key);
  assert.throws(()=>t.spine.emit('test.run','JM Evidence / Gem',{source:'UNSAVED'},{}),/PACKET_WRITE_READBACK_HOLD/);
  assert.equal(t.items.get(key),saved);
  assert.equal(t.spine.read().length,1);
  assert.equal(t.events.includes('jm:packet'),false);
});
check('CP13 quota packet persistence failure preserves existing bus without false Ding',()=>{
  const existing=p('original-packet','route-ftr');
  const t=runtime({[key]:JSON.stringify([existing])});
  const saved=t.items.get(key);
  t.failOn(k=>k===key);
  assert.throws(()=>t.spine.emit('test.run','JM Route / FTR',{input:'UNSAVED'},{}),/SIMULATED_QUOTA/);
  assert.equal(t.items.get(key),saved);
  assert.equal(t.events.includes('jm:packet'),false);
});
check('CP13 unsaved visible input blocks outgoing packet and preserves editable form',()=>{
  const ui=fs.readFileSync('estate-publication/apps-tools-convergence/JM_CAPABILITY_ENVIRONMENT_RUNTIME_v0_1.js','utf8');
  assert(ui.includes('RUN HOLD: input was not saved; no packet was created'));
  assert(ui.includes('const visible=liveRoomFields()'));
  assert(ui.includes('unsavedRoomInput'));
});

check('CP14 raw recovery reads exact corrupt state and bus without mutation',()=>{
  const stateRaw='{corrupt state / private bytes';
  const busRaw='{corrupt packet bus / private bytes';
  const env='evidence-governance',sk=stateKey(env);
  const t=runtime({[sk]:stateRaw,[key]:busRaw,unrelated:'KEEP'});
  assert.throws(()=>t.spine.loadState(env),/UNREADABLE_HOLD/);
  assert.throws(()=>t.spine.read(),/UNREADABLE_HOLD/);
  const raw=t.spine.exportRawRecovery(env);
  assert.equal(raw.schema,'jm.apps.tools.raw-recovery/1.0');
  assert.equal(raw.read_only,true);
  assert.equal(raw.environment,env);
  assert.equal(raw.entries.environment.key,sk);
  assert.equal(raw.entries.environment.raw,stateRaw);
  assert.equal(raw.entries.packet_bus.key,key);
  assert.equal(raw.entries.packet_bus.raw,busRaw);
  assert.equal(t.items.get(sk),stateRaw);
  assert.equal(t.items.get(key),busRaw);
  assert.equal(t.items.get('unrelated'),'KEEP');
  assert.deepEqual(t.events,[]);
});
check('CP14 raw recovery cannot query a forged environment ID',()=>{
  const t=runtime();
  assert.throws(()=>t.spine.exportRawRecovery('../other-environment'),/ENVIRONMENT_ID_HOLD/);
  const safe=t.spine.exportRawRecovery('route-ftr');
  assert.equal(safe.entries.environment.raw,null);
  assert.equal(safe.entries.packet_bus.raw,null);
  assert.equal(t.items.size,0);
});
check('CP14 public UI has raw recovery only when storage is unreadable',()=>{
  const ui=fs.readFileSync('estate-publication/apps-tools-convergence/JM_CAPABILITY_ENVIRONMENT_RUNTIME_v0_1.js','utf8');
  assert.match(ui,/EXPORT RAW RECOVERY/);
  assert(ui.includes('rawRecoveryButton.hidden=!(sourceHold||busHold)'));
  assert(ui.includes('spine.exportRawRecovery(cfg.id)'));
  assert.match(ui,/PRIVATE RAW RECOVERY EXPORT REQUESTED/);
});
console.log('CP11_SHARED_SPINE '+checks+'/'+checks+' PASS (source VM fault injection plus CP12/13/14 static UI guard; not owner-device proof)');
