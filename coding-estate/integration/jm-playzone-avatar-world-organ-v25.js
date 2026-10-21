/* JM PlayZone × JM Actual Engine — Avatar & World Contact Organ v2.5
   Extracted from the generated scene engine, not a new standalone engine.
   Input, collision, placement, animation and character 3D mesh instructions
   are independent of any one game's objectives or presentation.
   The host remains PlayZone; GameCore stores avatar progress; Actual Engine draws.
*/
(function(root){'use strict';
const VERSION='2.5.0',SCHEMA='jm.playzone.avatar-world/2.5',LIMIT=11.15;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=x=>Number.isFinite(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const collisionSource=world=>{
 if(!Array.isArray(world?.geometry))throw Error('JM_AVATAR_WORLD_NOT_GENERATED');
 return world.geometry.filter(g=>g && ['cube','cylinder','hex'].includes(g.mesh)
   && g.pos[1]-g.scale[1]<1.30 && g.pos[1]+g.scale[1]>.3
   && Math.abs(g.pos[0])<12 && Math.abs(g.pos[2])<11.5
   && Math.max(g.scale[0],g.scale[2])>.13
   // The terrain foundation is traversable; raised structures are solid.
   && !(g.pos[1]<.15 && g.scale[1]<=.35))
 .map(g=>({x:g.pos[0],z:g.pos[2],rx:g.scale[0],rz:g.scale[2],mesh:g.mesh,id:g.id}));
};
function create(world,{start={x:6,z:7},radius=.47,speed=5.2}={}){
 const solids=collisionSource(world);let collisions=0,moves=0,footsteps=0;
 const s={x:0,z:0,heading:0,stride:0,steps:0,frames:0,contactTarget:null,zoneId:world.zoneId};
 const radiusSq=radius*radius;
 function free(x,z){if(!finite(x)||!finite(z)||Math.abs(x)>LIMIT||Math.abs(z)>LIMIT)return false;
  return !solids.some(c=>{
   const qx=clamp(x,c.x-c.rx,c.x+c.rx),qz=clamp(z,c.z-c.rz,c.z+c.rz);
   return (x-qx)*(x-qx)+(z-qz)*(z-qz)<radiusSq;
  });
 }
 function safeStart(x,z){if(free(x,z))return{x,z};for(let r=.75;r<=7;r+=.75)for(let a=0;a<12;a++){
  const qx=x+Math.cos(a*Math.PI/6)*r,qz=z+Math.sin(a*Math.PI/6)*r;
  if(free(qx,qz))return{x:qx,z:qz};}
  throw Error('JM_AVATAR_NO_WALKABLE_SPAWN');}
 function restore(p){const q=safeStart(finite(p?.x)?p.x:start.x,finite(p?.z)?p.z:start.z);s.x=q.x;s.z=q.z;s.heading=finite(p?.heading)?p.heading:0;s.steps=finite(p?.steps)?p.steps:0;s.stride=0;return snapshot()}
 restore(start);
 function move(vx,vz,dt){dt=clamp(Number(dt)||0,0,.075);const len=Math.hypot(vx,vz);if(len<.001||!dt)return false;
  const nx=vx/len,nz=vz/len,amount=Math.min(1,len)*dt*speed;
  if(!finite(amount))return false;
  let changed=false;const toX=s.x+nx*amount,toZ=s.z+nz*amount;
  if(free(toX,s.z)){s.x=toX;changed=true;}else collisions++;
  if(free(s.x,toZ)){s.z=toZ;changed=true;}else collisions++;
  if(changed){s.heading=Math.atan2(nx,nz);s.stride+=amount*6;s.steps++;moves++;footsteps+=amount;}
  return changed;
 }
 function nearest(actors,range=2.4){let best=null;
  for(const a of Object.values(actors||{})){if(!a.alive||a.kind==='SKY')continue;const d=Math.hypot(a.pos.x-s.x,a.pos.z-s.z);if(d<=range&&(!best||d<best.distance))best={id:a.id,kind:a.kind,distance:d};}
  s.contactTarget=best?.id||null;return best;
 }
 function models(renderer,t=0){if(!renderer?.object)throw Error('JM_AVATAR_ACTUAL_RENDERER_REQUIRED');const O=renderer.object;
  const a=[],add=(mesh,x,y,z,sx,sy,sz,color,em=0,rotation=0)=>a.push(O(mesh,x,y,z,sx,sy,sz,color,em,rotation));
  const x=s.x,z=s.z,walk=Math.sin(s.stride),b=Math.abs(walk)*.065;
  add('ring',x,.05,z,.65,.022,.65,'#6debdc',.27);
  add('cylinder',x,.79+b,z,.30,.48,.26,'#296a82',.16,s.heading);
  add('sphere',x,1.47+b,z,.32,.34,.31,'#98d7e9',.14);
  add('cube',x,1.14+b,z+.23,.36,.18,.10,'#f4d397',.22,s.heading);
  add('cube',x-.35,.87+b,z,.13,.35,.14,'#52c9cd',.10,s.heading);
  add('cube',x+.35,.87+b,z,.13,.35,.14,'#52c9cd',.10,s.heading);
  add('cylinder',x-.16,.27+Math.max(0,walk)*.10,z,.13,.25,.14,'#2a5670',.07);
  add('cylinder',x+.16,.27+Math.max(0,-walk)*.10,z,.13,.25,.14,'#2a5670',.07);
  add('octa',x,1.86+b,z,.10,.15,.10,'#ffd98a',.6);
  return a;
 }
 function snapshot(){return clone({...s,collisionCount:collisions,moveCount:moves,walkedDistance:+footsteps.toFixed(3),solidCount:solids.length,version:VERSION,schema:SCHEMA});}
 function receipt(){return {schema:SCHEMA,source:'JM PlayZone v2.1 topology / generated geometry + JM Actual Engine stage',...snapshot(),scope:'WALKABLE_AVATAR_CONSTRAINTS_AND_ACTUAL_RENDER_OBJECTS'};}
 return Object.freeze({move,free,nearest,models,restore,snapshot,receipt,zoneId:world.zoneId,solids:()=>clone(solids)});
}
const API=Object.freeze({VERSION,SCHEMA,create,collisionSource});
root.JMPlayZoneAvatarWorld=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
