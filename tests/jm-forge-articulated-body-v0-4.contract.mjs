import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source3=fs.readFileSync('target-bridge/form-forge-routeos-v0-3/JM_FORGE_EMBODIED_RESPONSE_v0_3.js','utf8');
const source4=fs.readFileSync('target-bridge/form-forge-routeos-v0-4/JM_FORGE_ARTICULATED_BODY_v0_4.js','utf8');
const initial=[
 [-1.6,-2,0],[0,-2,0],[1.6,-2,0],
 [-1.5,-.6,0],[0,-.6,0],[1.5,-.6,0],
 [-1.2,.9,0],[0,.9,0],[1.2,.9,0],
 [-.8,2,0],[0,2,0],[.8,2,0]
];
const faces=[[0,1,4],[1,2,5],[3,4,7],[4,5,8],[6,7,10],[7,8,11],[9,10,11]];
const scene={loaded:true,points:initial.map(p=>p.slice()),faces:faces.map(f=>f.slice()),
 angles:{x:0,y:0},zoom:1,meshSha:'c'.repeat(64),snapshot:'12345678'};
const window={JMForgeContact:{scene},JMForgeKinetics:{collision:()=>{}}};window.parent=window;
const document={readyState:'loading',addEventListener:()=>{}};
const ctx={window,document,location:{origin:'null'},JSON,Math,Number,Date,Object,Set,Error};
vm.runInNewContext(source3,ctx,{filename:'JM_FORGE_EMBODIED_RESPONSE_v0_3.js'});
vm.runInNewContext(source4,ctx,{filename:'JM_FORGE_ARTICULATED_BODY_v0_4.js'});
const body=window.JMForgeEmbodiment,art=window.JMForgeArticulation;
assert.equal(art.schema,'JM.FormForge.Articulation/0.4');
assert.equal(art.state().vertices,initial.length);
assert.equal(art.state().hierarchy.length,3);
const before=scene.points.map(p=>p.slice());
art.setTargets(.36,-.28);
for(let i=0;i<150;i++)body.step(1/120);
assert.ok(art.state().joints[0].angle>.30);
assert.ok(art.state().joints[1].angle<-.20);
const after=scene.points.map(p=>p.slice());
assert.ok(after.some((p,i)=>p.some((x,j)=>x!==before[i][j])),'joint pose must actually move source geometry');
assert.ok(Math.hypot(...after[0].map((v,j)=>v-before[0][j]))<1e-7,'root anchor must remain still');
assert.ok(Math.hypot(...after[11].map((v,j)=>v-before[11][j]))>.1,'crown must move as its connected upper region');
assert.equal(body.status().geometryReversible,true);
const impact={event:'SURFACE_IMPACT',source:'ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba',
 geometryHash:scene.meshSha,snapshotHash:scene.snapshot,point:[0,1,0],normal:[1,0,1],face:5};
const spring=body.onImpact(impact);
assert.ok(spring.affected_vertices>0);
const recoil=art.recoil(impact);
assert.ok(recoil.offset>0);assert.ok(recoil.affectedVertices>0);
assert.equal(recoil.joints.length,2);
assert.ok(art.state().impactCount===1);
assert.throws(()=>art.recoil({...impact,face:999}),/Unverified/);
assert.throws(()=>art.recoil({...impact,geometryHash:'a'.repeat(64)}),/Unverified/);
assert.throws(()=>art.setTargets(Infinity,0),/finite/);
assert.throws(()=>art.compose(scene.points,initial,.2),/timestep/);
const restored=body.restore();
assert.equal(restored.restored,true);
assert.deepEqual(JSON.parse(JSON.stringify(scene.points)),before,'exact native source coordinate restore');
assert.ok(art.state().joints.every(j=>j.angle===0&&j.target===0));
assert.equal(art.state().impactCount,0);
for(let i=0;i<3;i++)body.step(1/120);
assert.deepEqual(JSON.parse(JSON.stringify(scene.points)),before,'original remains intact after resumed frames');
scene.points=before.map(p=>p.map((x,j)=>x*(j===1?1.3:1)));
scene.meshSha='e'.repeat(64);scene.snapshot='87654321';
const newRest=scene.points.map(p=>p.slice());
body.bindSource();
assert.equal(art.state().source,newRest.length===12?'e'.repeat(64):'');
assert.equal(art.state().impactCount,0);
assert.deepEqual(JSON.parse(JSON.stringify(scene.points)),newRest);
console.log('PASS: v0.3 spring composed with two connected v0.4 joints, source root anchored, crown moves, impact recoil changes original vertices, exact restore and mesh re-entry.');
