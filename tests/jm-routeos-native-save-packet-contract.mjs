import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const shared=fs.readFileSync('estate-publication/apps-tools-convergence/JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js','utf8');
const adapter=fs.readFileSync('contact/JM_ROUTEOS_NATIVE_SAVE_PACKET_BRIDGE_v0_1.js','utf8');
const source=fs.readFileSync('games-beyond/routeos/runtime/index.html','utf8');
assert.match(source,/const STORE='JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'/);
assert.match(source,/function saveCurrent\(/);
assert.match(source,/JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js/);
assert.match(source,/JM_ROUTEOS_NATIVE_SAVE_PACKET_BRIDGE_v0_1.js/);
assert.equal(source.split('JM_ROUTEOS_NATIVE_SAVE_PACKET_BRIDGE_v0_1.js').length,2);

const store=()=>{const map=new Map();return {
 getItem:k=>map.has(k)?map.get(k):null,
 setItem:(k,v)=>map.set(k,String(v)),
 removeItem:k=>map.delete(k)
}};
const native=(x=120)=>({
 recordType:'JMConsoleCartridgeSave',
 namespace:'routeos.seed-runner.jm',playerId:'jm',
 cartridgeId:'seed-runner',title:'Seed Runner',
 savedAt:'2026-10-10T01:00:00Z',
 state:{id:'seed-runner',score:4,energy:4,time:2.3,player:{x,y:310,r:19,vx:0,vy:0},
 seeds:[],hazards:[],goal:{x:840,y:310,r:28}}
});
const base=(saves={})=>({
 version:'0.8.2',activePlayerId:'jm',players:[{id:'jm',name:'JM'}],
 activeCart:null,quickResume:null,saves,installed:[],receipts:[],settings:{controlSide:'right'},lastScreen:'vault'
});
function enter(storage){
 const context={window:{dispatchEvent:()=>{}},document:{readyState:'loading',addEventListener:()=>{}},
 localStorage:storage,location:{origin:'https://jmisjustme-estate.pages.dev',pathname:'/games-beyond/routeos/runtime/'},
 Event:class {constructor(type){this.type=type}},CustomEvent:class {constructor(type,args){this.type=type;this.detail=args?.detail}}};
 vm.runInNewContext(shared,context,{filename:'JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js'});
 vm.runInNewContext(adapter,context,{filename:'JM_ROUTEOS_NATIVE_SAVE_PACKET_BRIDGE_v0_1.js'});
 return {api:context.window.JMRouteOSNativeBridge,spine:context.window.JMAppsToolsSpine};
}
const srcStore=store();
srcStore.setItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8',JSON.stringify(base({'seed-runner':native(249)})));
const src=enter(srcStore);
assert.ok(Array.isArray(src.spine.read()),'Cold JM shared bus must initialise as an array, not a string');
assert.equal(src.api.schema,'JM.RouteOSNativePacketBridge/0.1');
assert.equal(src.api.saveList().length,1);
const before=srcStore.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8');
const pub=src.api.publish('seed-runner');
assert.equal(pub.namespace,'routeos.seed-runner.jm');
assert.equal(src.api.inbox().length,1);
assert.equal(src.spine.read().length,1);
assert.equal(srcStore.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'),before,'Source native save must not be rewritten during publication');
const raw=JSON.parse(JSON.stringify(src.api.exportBundle()));
assert.equal(raw.schema,'jm.routeos.native-state-transfer/1.0');
assert.equal(raw.packets.length,1);
assert.equal(raw.packets[0].payload.save.state.player.x,249);
assert.throws(()=>src.api.publish('pulse-orbit'),/Save in the existing/);

const dstStore=store();
dstStore.setItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8',JSON.stringify(base()));
const dst=enter(dstStore);
assert.equal(dst.api.importBundle(raw).imported,1);
assert.equal(dst.api.importBundle(raw).duplicates,1);
assert.equal(dst.api.inbox()[0].id,raw.packets[0].id);
const result=dst.api.restore(raw.packets[0].id);
assert.equal(result.status,'NATIVE_SAVE_RESTORED_RELOAD_REQUIRED');
const imported=JSON.parse(dstStore.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'));
assert.equal(imported.saves['seed-runner'].state.player.x,249);
assert.equal(imported.receipts[0].type,'BRIDGE_IMPORT');
assert.equal(dst.api.restore(raw.packets[0].id).status,'ALREADY_PRESENT');
assert.equal(imported.players.length,1);
assert.equal(dst.spine.read().length,1);

const conflict=base({'seed-runner':native(777)});
const conflictStore=store();conflictStore.setItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8',JSON.stringify(conflict));
const conflicted=enter(conflictStore);conflicted.api.importBundle(raw);
const conflictBefore=conflictStore.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8');
assert.throws(()=>conflicted.api.restore(raw.packets[0].id),/HOLD: destination has a different save/);
assert.equal(conflictStore.getItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8'),conflictBefore,'Conflict cannot mutate native save');

const bad=JSON.parse(JSON.stringify(raw));bad.packets[0].payload.save.namespace='wrong.namespace';
const invalid=store();invalid.setItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8',JSON.stringify(base()));
const rejected=enter(invalid);
assert.throws(()=>rejected.api.importBundle(bad),/invalid|Invalid|unsupported/i);
assert.equal(rejected.spine.read().length,0);
const full=store();full.setItem('JM_ROUTEOS_PUBLIC_RUNTIME_v0_8',JSON.stringify(base({'seed-runner':native()})));
full.setItem('jm.apps.tools.shared.bus.v1',JSON.stringify(Array.from({length:250},(_,i)=>({schema:'jm.packet/1.0',id:'DONOR-'+i,kind:'legacy',source:'donor',payload:{},meta:{}}))));
const f=enter(full);assert.throws(()=>f.api.publish('seed-runner'),/full/);
assert.equal(f.spine.read().length,250);
assert.throws(()=>f.api.importBundle(raw),/capacity/);
assert.equal(f.spine.read().length,250);
console.log('PASS: actual JM Apps Tools packet spine consumed; RouteOS native save sent/restored, preserves progress, refuses overwrite, transfer format validated, protected full bus.');
