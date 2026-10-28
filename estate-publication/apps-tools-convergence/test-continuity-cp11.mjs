import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const path='estate-publication/apps-tools-convergence/JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js';
const source=fs.readFileSync(path,'utf8');
let checks=0;
function check(label,fn){fn();checks++;console.log('DING '+label)}
function runtime(seed={}){
  const items=new Map(Object.entries(seed));let fail=null;
  const storage={
    getItem(k){return items.has(k)?items.get(k):null},
    setItem(k,v){if(fail?.(k,String(v)))throw new Error('SIMULATED_QUOTA');items.set(k,String(v))},
    removeItem(k){items.delete(k)}
  };
  const events=[];
  const window={dispatchEvent(e){events.push(e.type)}};
  vm.runInNewContext(source,{window,localStorage:storage,CustomEvent:class{constructor(type){this.type=type}},Event:class{constructor(type){this.type=type}},Date,Math,console,Blob,setTimeout,URL,document:{}},{filename:path});
  return {spine:window.JMAppsToolsSpine,items,events,storage,failOn(f){fail=f},unfail(){fail=null}};
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
  assert.deepEqual(t.spine.read().map(x=>x.id),['new','old']);
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
  assert.deepEqual(t.spine.read().map(x=>x.id),rows.map(x=>x.id));
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
console.log('CP11_SHARED_SPINE '+checks+'/'+checks+' PASS (source VM fault injection; not user-device or network proof)');
