import assert from 'node:assert/strict';
import './jm-federation-contact-physics-v1.js';
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
console.log(JSON.stringify({schema:'jm.game-engine.contact-physics-proof/1.0',fixtures:250,contacts,
 outcome:'PASS',claim:'pair geometry and impulse only; original COMBOUND art, abilities, walls, AI remain outside scope'},null,2));
