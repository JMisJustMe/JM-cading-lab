/* JM Apps & Tools CP02 — portable recovery and no-silent-loss regression.
 * VM/mock-storage proof ONLY; not Android, deployed browser, or owner contact.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'JM_CAPABILITY_ENVIRONMENT_RUNTIME_v0_1.js'),'utf8');
const BUS='jm.apps.tools.shared.bus.v1';
const ENV='evidence-governance';
const STATE='jm.apps.tools.env.'+ENV+'.v1';
const packet=(i,source='JM Evidence & Governance Environment / Gem')=>({schema:'jm.packet/1.0',id:'JMP-'+i,source,kind:'gem.extraction',meta:{environment:ENV}});
const initialState={rooms:{gem:{source:'PROTECTED ORIGINAL'}},active:'gem'};
const initialBus=[packet('original')];
const storedSeed=()=>({[BUS]:JSON.stringify(initialBus),[STATE]:JSON.stringify(initialState)});
function boot(seed={},fault=null){
  const map=new Map(Object.entries(seed));
  const events=[];
  let armed=!!fault;
  const localStorage={
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>{
      if(armed&&fault?.key===key){armed=false;throw Error('simulated quota/write fault')}
      map.set(key,String(value));
    },
    removeItem:key=>map.delete(key),
  };
  class TestEvent{constructor(type,opt={}){this.type=type;this.detail=opt.detail}}
  const window={dispatchEvent:e=>{events.push({type:e.type,bus:map.get(BUS),state:map.get(STATE)});return true}};
  vm.runInNewContext(source,{window,localStorage,CustomEvent:TestEvent,Event:TestEvent,Date,Math,JSON},{timeout:1000});
  assert.ok(window.JMAppsToolsSpine);
  return {spine:window.JMAppsToolsSpine,map,events};
}
const portable=(state=initialState,packets=[packet('incoming')])=>({schema:'jm.apps.tools.portable-environment/1.0',environment:ENV,state,packets});
const json=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function test(label,fn){try{fn();passed++;console.log('PASS '+label)}catch(error){console.error('FAIL '+label);throw error}}
test('preview reports incoming packets without mutating state or bus',()=>{
 const h=boot(storedSeed()),before=Array.from(h.map);
 const plan=h.spine.previewEnvironment(ENV,portable());
 assert.equal(plan.accepted,1);assert.equal(plan.rejected,0);assert.equal(plan.truncated,0);
 assert.deepEqual(Array.from(h.map),before);assert.equal(h.events.length,0);
});
test('wrong environment is rejected before mutation',()=>{
 const h=boot(storedSeed()),before=Array.from(h.map);
 assert.throws(()=>h.spine.importEnvironment('route-ftr',portable()),/Packet belongs to/);
 assert.deepEqual(Array.from(h.map),before);
});
test('malformed state scalar is rejected before mutation',()=>{
 const h=boot(storedSeed()),before=Array.from(h.map);
 assert.throws(()=>h.spine.importEnvironment(ENV,portable('not-an-object')),/state must be an object/);
 assert.deepEqual(Array.from(h.map),before);
});
test('malformed rooms array is rejected before mutation',()=>{
 const h=boot(storedSeed()),before=Array.from(h.map);
 assert.throws(()=>h.spine.importEnvironment(ENV,portable({rooms:[]})),/rooms must be an object/);
 assert.deepEqual(Array.from(h.map),before);
});
test('malformed active room is rejected before mutation',()=>{
 const h=boot(storedSeed()),before=Array.from(h.map);
 assert.throws(()=>h.spine.importEnvironment(ENV,portable({rooms:{},active:123})),/Active room/);
 assert.deepEqual(Array.from(h.map),before);
});
test('malformed packet collection is rejected before mutation',()=>{
 const h=boot(storedSeed()),before=Array.from(h.map);
 const bad=portable();bad.packets={length:1};
 assert.throws(()=>h.spine.importEnvironment(ENV,bad),/packets must be an array/);
 assert.deepEqual(Array.from(h.map),before);
});
test('valid import commits both keys before announcing event',()=>{
 const h=boot(storedSeed());
 const updated={rooms:{gem:{source:'NEW SOURCE'}},active:'gem'};
 const outcome=h.spine.importEnvironment(ENV,portable(updated,[packet('new')]));
 assert.equal(outcome.packets,1);assert.equal(json(h.spine.loadState(ENV)).rooms.gem.source,'NEW SOURCE');
 assert.equal(h.spine.read()[0].id,'JMP-new');
 assert.equal(h.events.length,1);assert.equal(h.events[0].type,'jm:bus-imported');
 assert.equal(JSON.parse(h.events[0].state).rooms.gem.source,'NEW SOURCE');
 assert.equal(JSON.parse(h.events[0].bus)[0].id,'JMP-new');
});
test('failed state write restores both previous values with no success event',()=>{
 const h=boot(storedSeed(),{key:STATE});
 const before=Array.from(h.map);
 assert.throws(()=>h.spine.importEnvironment(ENV,portable({rooms:{gem:{source:'DANGER'}}})),/prior saved work restored/);
 assert.deepEqual(Array.from(h.map),before);assert.equal(h.events.length,0);
});
test('failed write with no prior state key does not invent old state',()=>{
 const seed={[BUS]:JSON.stringify(initialBus)};
 const h=boot(seed,{key:STATE});
 assert.throws(()=>h.spine.importEnvironment(ENV,portable()),/prior saved work restored/);
 assert.equal(h.map.has(STATE),false);assert.equal(h.map.get(BUS),seed[BUS]);assert.equal(h.events.length,0);
});
test('failed bus write leaves both old values intact and no success event',()=>{
 const h=boot(storedSeed(),{key:BUS}),before=Array.from(h.map);
 assert.throws(()=>h.spine.importEnvironment(ENV,portable()),/prior saved work restored/);
 assert.deepEqual(Array.from(h.map),before);assert.equal(h.events.length,0);
});
test('legacy packets without optional fields still import',()=>{
 const h=boot();
 assert.equal(h.spine.importBus([{schema:'jm.packet/1.0',id:'minimal'}]),1);
 assert.equal(h.spine.read()[0].id,'minimal');
});
test('foreign-shaped packet sources cannot poison the next room render',()=>{
 const h=boot(storedSeed());
 const bad={schema:'jm.packet/1.0',id:'bad',source:17,meta:{environment:ENV}};
 const plan=h.spine.previewEnvironment(ENV,portable(initialState,[bad,packet('good')]));
 assert.equal(plan.accepted,1);assert.equal(plan.rejected,1);
 const result=h.spine.importEnvironment(ENV,portable(initialState,[bad,packet('good')]));
 assert.equal(result.packets,1);assert.equal(h.spine.read()[0].id,'JMP-good');
});
test('invalid metadata is dropped instead of breaking room rendering',()=>{
 const h=boot(),bad={schema:'jm.packet/1.0',id:'bad',source:'good',meta:['bad']};
 assert.equal(h.spine.importBus([bad,packet('good')]),1);
 assert.equal(h.spine.read()[0].id,'JMP-good');
});
test('retention and reported count both respect last-250 bound',()=>{
 const h=boot();
 const arr=Array.from({length:270},(_,i)=>packet(i));
 const plan=h.spine.previewEnvironment(ENV,portable(initialState,arr));
 assert.equal(plan.accepted,250);assert.equal(plan.truncated,20);
 const result=h.spine.importEnvironment(ENV,portable(initialState,arr));
 assert.equal(result.packets,250);assert.equal(h.spine.read().length,250);
 assert.equal(h.spine.read()[0].id,'JMP-0');
});
test('UI has explicit import preview, owner choice, and guarded packet source',()=>{
 assert.match(runtime,/spine\.previewEnvironment\(cfg\.id,obj\)/);
 assert.match(runtime,/if\(!confirm\(/);
 assert.match(runtime,/typeof p\.source==='string'/);
 assert.match(runtime,/normaliseState\(result\.state\)/);
});
console.log('CP02 recovery regression: '+passed+'/'+passed+' PASS (mock storage; real-device HOLD).');
