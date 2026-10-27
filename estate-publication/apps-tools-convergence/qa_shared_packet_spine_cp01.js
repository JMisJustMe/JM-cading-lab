/* JM Apps & Tools — Shared Packet Spine CP01 forward-repair regression.
 * Source-side test only. No browser, owner-device or cross-device Ding implied.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js'),'utf8');
const BUS_KEY='jm.apps.tools.shared.bus.v1';
let passed=0;
function test(name,fn){try{fn();passed++;console.log('PASS '+name)}catch(e){console.error('FAIL '+name);throw e}}
function boot(seed={}){
  const store=new Map(Object.entries(seed)), events=[];
  const localStorage={
    getItem:k=>store.has(k)?store.get(k):null,
    setItem:(k,v)=>store.set(k,String(v)),
    removeItem:k=>store.delete(k),
  };
  class TestEvent {constructor(type,options={}){this.type=type;this.detail=options.detail}}
  const window={dispatchEvent:event=>{events.push(event);return true}};
  const sandbox={window,localStorage,CustomEvent:TestEvent,Event:TestEvent,Date,Math,JSON};
  vm.runInNewContext(source,sandbox,{timeout:1500,filename:'JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js'});
  assert.ok(window.JMAppsToolsSpine,'shared spine should install');
  return {spine:window.JMAppsToolsSpine,store,events};
}
const plain=value=>JSON.parse(JSON.stringify(value));

// Baseline defect documentation: v0.1 passed a string rather than [] as JSON fallback.
test('historical cold-start defect is a real non-array fallback',()=>{
  const oldSafeParse=(raw,fallback)=>{try{return JSON.parse(raw)??fallback}catch{return fallback}};
  const oldRead=()=>oldSafeParse(null,'[]')||[];
  assert.equal(typeof oldRead(),'string');
  assert.equal(typeof oldRead().unshift,'undefined');
});
test('clean install renders an empty array and first emit persists',()=>{
  const {spine,store,events}=boot();
  assert.deepEqual(plain(spine.read()),[]);
  const p=spine.emit('gem.extraction','evidence-governance',{source:'A'});
  assert.equal(spine.read().length,1);
  assert.equal(spine.read()[0].id,p.id);
  assert.equal(JSON.parse(store.get(BUS_KEY))[0].kind,'gem.extraction');
  assert.ok(events.some(x=>x.type==='jm:packet'));
});
test('valid existing local data remains readable and prepends newest packet',()=>{
  const older={schema:'jm.packet/1.0',id:'old',kind:'test.old',source:'old',meta:{}};
  const {spine}=boot({[BUS_KEY]:JSON.stringify([older])});
  const fresh=spine.emit('test.new','new',{});
  assert.equal(spine.read().length,2);
  assert.equal(spine.read()[0].id,fresh.id);
  assert.equal(spine.read()[1].id,'old');
});
for(const [label,raw] of [
  ['malformed JSON','{bad'],
  ['null JSON','null'],
  ['string JSON','"stray"'],
  ['object JSON','{"not":"an array"}'],
  ['number JSON','123'],
]){
  test(label+' cannot crash initial render or first emit',()=>{
    const {spine}=boot({[BUS_KEY]:raw});
    assert.deepEqual(plain(spine.read()),[]);
    spine.emit('repair.test','qa');
    assert.equal(spine.read().length,1);
  });
}
test('empty array JSON stays an array',()=>{
  const {spine}=boot({[BUS_KEY]:'[]'});
  assert.deepEqual(plain(spine.read()),[]);
});
test('bus import filters nonpacket rows and export reflects valid rows',()=>{
  const {spine}=boot();
  const n=spine.importBus([{schema:'other',id:'bad'},{schema:'jm.packet/1.0',id:'good',meta:{}}]);
  assert.equal(n,1);
  assert.equal(spine.exportBus().packets.length,1);
  assert.equal(spine.exportBus().packets[0].id,'good');
});
test('environment state and portable export/import remain distinct',()=>{
  const {spine}=boot();
  spine.saveState('evidence-governance',{rooms:{gem:{source:'KEEP'}}});
  spine.emit('test.packet','evidence-governance');
  const bundle=spine.exportEnvironment('evidence-governance');
  assert.equal(bundle.schema,'jm.apps.tools.portable-environment/1.0');
  assert.equal(bundle.state.rooms.gem.source,'KEEP');
  const next=boot(), result=next.spine.importEnvironment('evidence-governance',bundle);
  assert.equal(result.state.rooms.gem.source,'KEEP');
  assert.equal(result.packets,1);
  assert.throws(()=>next.spine.importEnvironment('route-ftr',bundle),/Packet belongs to/);
});
test('clear removes shared packets without clearing environment state',()=>{
  const {spine,store,events}=boot();
  spine.saveState('route-ftr',{retained:true});
  spine.emit('test.packet','route-ftr');
  spine.clear();
  assert.deepEqual(plain(spine.read()),[]);
  assert.equal(store.has(BUS_KEY),false);
  assert.equal(spine.loadState('route-ftr').retained,true);
  assert.ok(events.some(x=>x.type==='jm:bus-cleared'));
});
test('shared bus remains bounded to 250 newest packets',()=>{
  const {spine}=boot();
  for(let i=0;i<255;i++)spine.emit('test.bound','qa',{i});
  assert.equal(spine.read().length,250);
  assert.equal(spine.read()[0].payload.i,254);
  assert.equal(spine.read()[249].payload.i,5);
});
console.log('CP01 source/runtime regression: '+passed+'/'+passed+' PASS (mock localStorage; not physical browser/device proof).');
