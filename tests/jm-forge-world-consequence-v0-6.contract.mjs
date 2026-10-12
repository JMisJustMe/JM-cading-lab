import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const v5=fs.readFileSync('target-bridge/form-forge-routeos-v0-5/JM_FORGE_DUAL_ACTOR_v0_5.js','utf8');
const v6=fs.readFileSync('target-bridge/form-forge-routeos-v0-6/JM_FORGE_WORLD_CONSEQUENCE_v0_6.js','utf8');
const geometry=[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0],[0,0,1],[0,0,-1]];
function runtime(){
 const scene={loaded:true,points:geometry.map(p=>p.slice()),faces:[[0,1,2],[0,2,3],[0,3,4]],
 meshSha:'a'.repeat(64),snapshot:'12345678',angles:{x:0,y:0},zoom:1.08};
 let reaction=0;
 const art={schema:'JM.FormForge.Articulation/0.4',setTargets:()=>{reaction++},state:()=>({joints:[{name:'body',target:0},{name:'crown',target:0}]})};
 const w={JMForgeContact:{scene},JMForgeArticulation:art};w.parent=w;
 const doc={readyState:'loading',addEventListener:()=>{}};
 const ctx={window:w,document:doc,location:{origin:'null'},Math,JSON,Object,Number,Date,Error};
 vm.runInNewContext(v5,ctx,{filename:'dual-v0.5'});
 vm.runInNewContext(v6,ctx,{filename:'world-v0.6'});
 w.JMForgeDualActor.bindSource();
 return{scene,dual:w.JMForgeDualActor,world:w.JMForgeWorld,getReactions:()=>reaction};
}
const a=runtime();
assert.equal(a.world.schema,'JM.FormForge.WorldConsequence/0.6');
assert.equal(a.dual.state().world.schema,'JM.FormForge.WorldState/0.6');
assert.equal(a.world.state().beacon.open,false);
assert.throws(()=>a.world.startDelivery(),/Guardian contact/);
const baseline=JSON.stringify(a.scene.points);
a.dual.approach();
let hit=null;for(let i=0;i<450;i++){hit=a.dual.step(1/120);if(hit?.contact)break}
assert.ok(hit?.contact,'Guardian contact must occur through inherited physical actor approach');
assert.ok(a.getReactions()>0);
assert.equal(a.world.state().clearance,true);
assert.equal(a.world.state().core.x,1.34,'Guardian clearance alone must NOT teleport core');
assert.equal(a.world.state().beacon.open,false);
a.world.startDelivery();
let before=a.world.state(),moved=false,complete=null;
for(let i=0;i<450;i++){
 const p=a.dual.step(1/120);
 const s=a.world.state();
 if(s.core.x>before.core.x)moved=true;
 if(s.beacon.open){complete={s,p};break}
}
assert.ok(moved,'Courier must physically advance the core object');
assert.ok(complete,'Moving Courier must deliver relay core into beacon');
assert.equal(complete.s.deliveries,1);
assert.equal(complete.s.consequence,'BEACON_LIT_AND_GATE_OPEN');
assert.ok(complete.s.core.pushes>0);
assert.equal(a.dual.state().echo.mode,'settled');
assert.equal(JSON.stringify(a.scene.points),baseline,'original Forge source mesh untouched by world event');
const checkpoint=JSON.parse(JSON.stringify(a.dual.state()));
assert.equal(checkpoint.world.beacon.open,true);
assert.equal(checkpoint.world.core.x,2.12);
const b=runtime();
assert.equal(b.dual.restore(checkpoint).contacts,1);
assert.equal(b.world.state().beacon.open,true);
assert.equal(b.world.state().core.x,2.12);
assert.equal(b.dual.state().echo.contacts,1);
assert.equal(b.dual.state().echo.mode,'settled');
assert.throws(()=>b.dual.restore({...checkpoint,mesh:'f'.repeat(64)}),/Unverified/);
assert.throws(()=>b.dual.restore({...checkpoint,world:{...checkpoint.world,core:{...checkpoint.world.core,x:99}}}),/Unverified/);
assert.throws(()=>b.world.restore({...checkpoint.world,beacon:{...checkpoint.world.beacon,open:false}}),/Invalid/);
assert.throws(()=>b.world.restore({...checkpoint.world,phase:'clearance',deliveries:0,beacon:{...checkpoint.world.beacon,open:false},consequence:'PENDING'}),/HOLD/);
b.dual.reset();
assert.equal(b.world.state().beacon.open,false);
assert.equal(b.dual.state().echo.contacts,0);
b.scene.meshSha='b'.repeat(64);b.scene.snapshot='87654321';b.dual.bindSource();
assert.equal(b.world.state().mesh,'b'.repeat(64));
assert.equal(b.world.state().beacon.open,false);
console.log('PASS · contact-derived Guardian clearance, moving Courier physically pushes world object, beacon/gate persist in v0.5 checkpoint, fresh runtime restores earned consequence, forged/stale state HOLD, original source mesh unchanged.');
