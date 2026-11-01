import assert from 'node:assert/strict';
import './jm-federation-contact-physics-v1.js';
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime} from '../sovereign-ten/direct/game-native.mjs';
const e=globalThis.JM_FEDERATION_PHYSICS;
const rules={contact_restitution_scale:1.055,contact_restitution_add:0,contact_restitution_min:.72,contact_restitution_max:1.13,contact_release_factor:.065,contact_release_cap:48};
const model={fighters:{ZIPP:{restitution:.88},BRAX:{restitution:.94}},rules};
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
function sourceCollision(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;if(d>=min||d===0)return null;
 const nx=dx/d,ny=dy/d,over=min-d,invA=1/a.mass,invB=1/b.mass,sum=invA+invB;
 a.x-=nx*over*(invA/sum);a.y-=ny*over*(invA/sum);b.x+=nx*over*(invB/sum);b.y+=ny*over*(invB/sum);
 const rvx=b.vx-a.vx,rvy=b.vy-a.vy,vel=rvx*nx+rvy*ny;
 if(vel<0){
  const ra=model.fighters[a.key].restitution,rb=model.fighters[b.key].restitution;
  const ee=clamp(Math.sqrt(ra*rb)*(rules.contact_restitution_scale||1.055)+(rules.contact_restitution_add||0),rules.contact_restitution_min||.72,rules.contact_restitution_max||1.13),j=-(1+ee)*vel/sum;
  a.vx-=j*nx*invA;a.vy-=j*ny*invA;b.vx+=j*nx*invB;b.vy+=j*ny*invB;
  const release=clamp((-vel)*(rules.contact_release_factor||0),0,rules.contact_release_cap||0);
  a.vx-=release*nx*(invA/sum);a.vy-=release*ny*(invA/sum);b.vx+=release*nx*(invB/sum);b.vy+=release*ny*(invB/sum);
  a.spin-=j*.0028;b.spin+=j*.0028;a.squash=b.squash=.36;
 }
 return {vel};
}
let seed=124782;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296};
let contacts=0;
for(let k=0;k<250;k++){
 const x=330+rand()*260,y=280+rand()*260,r1=38,r2=44;
 const a={key:'ZIPP',x,y,r:r1,mass:1.15,vx:(rand()-.5)*720,vy:(rand()-.5)*720,spin:rand(),squash:0};
 const b={key:'BRAX',x:x+(rand()-.5)*150,y:y+(rand()-.5)*150,r:r2,mass:2,vx:(rand()-.5)*720,vy:(rand()-.5)*720,spin:rand(),squash:0};
 const expectedA=structuredClone(a),expectedB=structuredClone(b);
 const expected=sourceCollision(expectedA,expectedB);
 const actual=e.solvePair(a,b,model);
 assert.equal(Boolean(actual),Boolean(expected),'collision/no-collision at fixture '+k);
 if(actual){contacts++;assert.equal(actual.normalSpeed,expected.vel);}
 for(const field of ['x','y','vx','vy','spin','squash']){
  assert.equal(a[field],expectedA[field],field+' A fixture '+k);
  assert.equal(b[field],expectedB[field],field+' B fixture '+k);
 }
}
assert(contacts>50);
assert.equal(e.stats().pairs,contacts);
assert.throws(()=>e.solvePair({},{},{}),/JM_PHYSICS_INVALID_MODEL/);
e.reset();assert.equal(e.stats().pairs,0);
assert(Object.isFrozen(e));
// CP56: bad contact data must fail before the shared organ mutates either
// fighter. Keep the original 250 valid COMBOUND parity fixtures above intact.
assert.equal(e.version,'1.0.4');
let invalidContacts=0;
for(const [name,mutate,modelOverride] of [
 ['zero-mass',a=>{a.mass=0}],
 ['nan-velocity',a=>{a.vx=NaN}],
 ['unknown-fighter',a=>{a.key='MISSING'}],
 ['missing-spin',a=>{delete a.spin}],
 ['negative-restitution',a=>{}, {fighters:{ZIPP:{restitution:-1},BRAX:{restitution:.94}},rules}]
]){
 const a={key:'ZIPP',x:0,y:0,r:1,mass:1,vx:1,vy:0,spin:0,squash:0};
 const b={key:'BRAX',x:1.5,y:0,r:1,mass:1,vx:-1,vy:0,spin:0,squash:0};
 mutate(a);
 const beforeA=structuredClone(a),beforeB=structuredClone(b);
 const beforePairs=e.stats().pairs;
 assert.throws(()=>e.solvePair(a,b,modelOverride||model),/JM_PHYSICS_INVALID_CONTACT/,name);
 assert.deepEqual(a,beforeA,name+' A unchanged');
 assert.deepEqual(b,beforeB,name+' B unchanged');
 assert.equal(e.stats().pairs,beforePairs,name+' no phantom contact');
 invalidContacts++;
}
// CP57: invalid authored restitution/release tuning previously could
// separate both fighters and only then introduce NaN velocities/impulses.
// Reject every malformed tuning case atomically without losing CP56 parity.
let invalidTunings=0;
for(const [name,override] of [
 ['nan-scale',{contact_restitution_scale:NaN}],
 ['infinite-add',{contact_restitution_add:Infinity}],
 ['inverted-bounds',{contact_restitution_min:1.5,contact_restitution_max:.5}],
 ['negative-release-cap',{contact_release_cap:-1}],
 ['nan-release-factor',{contact_release_factor:NaN}],
 ['negative-scale',{contact_restitution_scale:-1}]
]){
 const a={key:'ZIPP',x:0,y:0,r:1,mass:1,vx:1,vy:0,spin:0,squash:0};
 const b={key:'BRAX',x:1.5,y:0,r:1,mass:1,vx:-1,vy:0,spin:0,squash:0};
 const beforeA=structuredClone(a),beforeB=structuredClone(b),beforePairs=e.stats().pairs;
 assert.throws(()=>e.solvePair(a,b,{fighters:model.fighters,rules:{...rules,...override}}),/JM_PHYSICS_INVALID_TUNING/,name);
 assert.deepEqual(a,beforeA,name+' A unchanged');
 assert.deepEqual(b,beforeB,name+' B unchanged');
 assert.equal(e.stats().pairs,beforePairs,name+' no phantom contact');
 invalidTunings++;
}
// CP58: finite inputs can overflow derived impulses or relative velocity.
// The original in-place solver corrupted both units before discovering this.
// Verify atomic rejection and no phantom telemetry, including receding motion.
let unsafeDerived=0;
for(const [name,mutate] of [
 ['subnormal-mass',(a,b)=>{a.mass=Number.MIN_VALUE}],
 ['overflowing-approach',(a,b)=>{a.vx=Number.MAX_VALUE}],
 ['overflowing-recession',(a,b)=>{a.vx=-Number.MAX_VALUE;b.vx=Number.MAX_VALUE}]
]){
 const a={key:'ZIPP',x:0,y:0,r:1,mass:1,vx:1,vy:0,spin:0,squash:0};
 const b={key:'BRAX',x:1.5,y:0,r:1,mass:1,vx:-1,vy:0,spin:0,squash:0};
 mutate(a,b);
 const beforeA=structuredClone(a),beforeB=structuredClone(b),beforeStats=e.stats();
 assert.throws(()=>e.solvePair(a,b,model),/JM_PHYSICS_UNSAFE_CONTACT/,name);
 assert.deepEqual(a,beforeA,name+' A unchanged');
 assert.deepEqual(b,beforeB,name+' B unchanged');
 assert.deepEqual(e.stats(),beforeStats,name+' no phantom telemetry');
 unsafeDerived++;
}
// Explicit zero is authored tuning, not an absent default. Existing native
// GameCoding/GameCore service dispatch must observe that exact physical result.
const gameSource=`entity Arena {
 resolved = false
}
mechanic Contact {
 requires arena.resolved == false
 effect call physics.resolve()
}`;
const coreSource=`organ ContactOrgan {
 handles = [Arena]
 rules = [Contact]
 invariants = {
 arena.resolved == true
 }
}
system ContactSystem {
 organs = [ContactOrgan]
 events = [Impact]
 identity = "JM.ContactPhysics.RecipientFixture"
}`;
let recipientContacts=0;
for(const [name,tuning,expected] of [
 ['zero-scale',{contact_restitution_scale:0,contact_restitution_min:0},0],
 ['zero-cap',{contact_restitution_max:0,contact_restitution_min:0},0],
 ['bounded-cap',{contact_restitution_max:.25,contact_restitution_min:0},.25]
]){
 const recipientModel={fighters:{ZIPP:{restitution:1},BRAX:{restitution:1}},rules:{...rules,contact_release_factor:0,...tuning}};
 const pair={left:{key:'ZIPP',x:0,y:0,r:1,mass:1,vx:1,vy:0,spin:0,squash:0},right:{key:'BRAX',x:1.5,y:0,r:1,mass:1,vx:-1,vy:0,spin:0,squash:0}};
 const runtime=new GameCodingRuntime(GameCoding.parse(gameSource),pair,{'physics.resolve':(_,state)=>{
  e.solvePair(state.left,state.right,recipientModel);state.arena.resolved=true;
 }});
 const core=new JMGameCoreRuntime(JMGameCore.parse(coreSource),runtime);
 const dispatch=core.dispatch('ContactSystem','Impact');
 assert.equal(dispatch.identity,'JM.ContactPhysics.RecipientFixture');
 assert.equal(dispatch.executions[0].applied,true,name);
 assert(Math.abs(dispatch.state.left.vx+expected)<1e-12,name+' left velocity');
 assert(Math.abs(dispatch.state.right.vx-expected)<1e-12,name+' right velocity');
 assert.equal(dispatch.state.right.x-dispatch.state.left.x,2,name+' separation');
 assert.equal(pair.left.vx,1,'recipient initial state remains unchanged');
 recipientContacts++;
}
console.log(JSON.stringify({schema:'jm.game-engine.contact-physics-proof/1.0',fixtures:250,contacts,recipientContacts,invalidContacts,invalidTunings,unsafeDerived,
 outcome:'PASS',claim:'pair geometry and impulse only; original COMBOUND art, abilities, walls, AI remain outside scope'},null,2));
