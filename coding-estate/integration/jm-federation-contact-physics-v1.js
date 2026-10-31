/*
JM Game Engine Federation — COMBOUND contact-physics organ v1.0
Authority: extracted from COMBOUND Original v3.8 / JM Game Engine D2 runtime federation.
Scope: true unit-pair impulse/separation/restitution, NOT character abilities,
scoring, obstacles, or the entire collision semantics. This body is re-entrant:
there is no global game state or DOM dependency. Units are updated by reference.
v1.0.1: explicit zero restitution tuning is preserved; only absent/null values
use inherited defaults. Existing nonzero COMBOUND formula parity is retained.
Recipient proof is in the existing selftest via real GameCoding/GameCore calls;
this does not promote any full game, private source or physical-device release.
*/
(function(root){'use strict';
 const VERSION='1.0.1';
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 let pairCount=0, impulseCount=0, totalImpulse=0;
 function solvePair(a,b,model){
   if(!a||!b||!model?.fighters||!model?.rules)throw Error('JM_PHYSICS_INVALID_MODEL');
   const rules=model.rules,fighters=model.fighters;
   const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
   if(d>=min||d===0)return null;
   const nx=dx/d,ny=dy/d,over=min-d,invA=1/a.mass,invB=1/b.mass,sum=invA+invB;
   a.x-=nx*over*(invA/sum);a.y-=ny*over*(invA/sum);
   b.x+=nx*over*(invB/sum);b.y+=ny*over*(invB/sum);
   const rvx=b.vx-a.vx,rvy=b.vy-a.vy,vel=rvx*nx+rvy*ny;
   let j=0;
   if(vel<0){
     const ra=fighters[a.key].restitution,rb=fighters[b.key].restitution;
     const e=clamp(Math.sqrt(ra*rb)*(rules.contact_restitution_scale??1.055)+(rules.contact_restitution_add??0),rules.contact_restitution_min??.72,rules.contact_restitution_max??1.13);
     j=-(1+e)*vel/sum;
     a.vx-=j*nx*invA;a.vy-=j*ny*invA;b.vx+=j*nx*invB;b.vy+=j*ny*invB;
     const release=clamp((-vel)*(rules.contact_release_factor||0),0,rules.contact_release_cap||0);
     a.vx-=release*nx*(invA/sum);a.vy-=release*ny*(invA/sum);
     b.vx+=release*nx*(invB/sum);b.vy+=release*ny*(invB/sum);
     a.spin-=j*.0028;b.spin+=j*.0028;a.squash=b.squash=.36;
     impulseCount++;totalImpulse+=j;
   }
   pairCount++;
   return {contact:true,normalSpeed:vel,impulse:j,overlap:over};
 }
 function stats(){return {version:VERSION,source:'COMBOUND Original v3.8 collision physical-contact formula',pairs:pairCount,impulses:impulseCount,totalImpulse:Math.round(totalImpulse*100)/100,identity:'JM.GameEngine.Federation.ContactPhysics/1.0',scope:'POSITION_IMPULSE_ONLY'};}
 function reset(){pairCount=0;impulseCount=0;totalImpulse=0;}
 root.JM_FEDERATION_PHYSICS=Object.freeze({version:VERSION,solvePair,stats,reset});
})(typeof globalThis!=='undefined'?globalThis:this);
