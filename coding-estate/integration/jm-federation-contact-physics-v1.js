/*
JM Game Engine Federation — COMBOUND contact-physics organ v1.0
Authority: extracted from COMBOUND Original v3.8 / JM Game Engine D2 runtime federation.
Scope: true unit-pair impulse/separation/restitution, NOT character abilities,
scoring, obstacles, or the entire collision semantics. This body is re-entrant:
there is no global game state or DOM dependency. Units are updated by reference.
v1.0.5: finite gameplay impulses no longer overflow diagnostic totals or JSON export.
v1.0.4: derived overflow rejects atomically; normal contact remains formula-identical.
v1.0.3: malformed restitution/release tuning rejects before position/velocity mutation.
v1.0.2: invalid unit/roster data rejects before any position/velocity mutation.
v1.0.1: explicit zero restitution tuning is preserved; only absent/null values
use inherited defaults. Existing nonzero COMBOUND formula parity is retained.
Recipient proof is in the existing selftest via real GameCoding/GameCore calls;
this does not promote any full game, private source or physical-device release.
*/
(function(root){'use strict';
 const VERSION='1.0.5';
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 let pairCount=0, impulseCount=0, totalImpulse=0, totalImpulseSaturated=false;
 function solvePair(a,b,model){
   if(!a||!b||!model?.fighters||!model?.rules)throw Error('JM_PHYSICS_INVALID_MODEL');
   const rules=model.rules,fighters=model.fighters;
   // Fail closed before changing either fighter: malformed contact must not
   // leave half-separated positions or NaN velocities in the original game.
   const fields=['x','y','vx','vy','r','mass','spin','squash'];
   if(fields.some(k=>!Number.isFinite(a[k])||!Number.isFinite(b[k])) ||
      a.mass<=0||b.mass<=0||a.r<0||b.r<0 ||
      !fighters[a.key]||!fighters[b.key] ||
      !Number.isFinite(fighters[a.key].restitution)||!Number.isFinite(fighters[b.key].restitution)||
      fighters[a.key].restitution<0||fighters[b.key].restitution<0)
     throw Error('JM_PHYSICS_INVALID_CONTACT');
   // Tuning is part of the contact input. Reject NaN/Infinity and inverted
   // bounds BEFORE separation, rather than corrupting both fighters later.
   // Explicit numeric zero remains authored and valid (CP31/CP56 parity).
   const scale=rules.contact_restitution_scale??1.055;
   const add=rules.contact_restitution_add??0;
   const restitutionMin=rules.contact_restitution_min??.72;
   const restitutionMax=rules.contact_restitution_max??1.13;
   const releaseFactor=rules.contact_release_factor??0;
   const releaseCap=rules.contact_release_cap??0;
   if([scale,add,restitutionMin,restitutionMax,releaseFactor,releaseCap].some(v=>!Number.isFinite(v))||
      scale<0||restitutionMin<0||restitutionMax<restitutionMin||
      releaseFactor<0||releaseCap<0)
     throw Error('JM_PHYSICS_INVALID_TUNING');
   // Copy-on-write: do not expose a half-applied collision on overflow.
   const nextA={...a},nextB={...b};
   const dx=nextB.x-nextA.x,dy=nextB.y-nextA.y,d=Math.hypot(dx,dy),min=a.r+b.r;
   if(d>=min||d===0)return null;
   const nx=dx/d,ny=dy/d,over=min-d,invA=1/a.mass,invB=1/b.mass,sum=invA+invB;
   nextA.x-=nx*over*(invA/sum);nextA.y-=ny*over*(invA/sum);
   nextB.x+=nx*over*(invB/sum);nextB.y+=ny*over*(invB/sum);
   const rvx=nextB.vx-nextA.vx,rvy=nextB.vy-nextA.vy,vel=rvx*nx+rvy*ny;
   let j=0;
   if(vel<0){
     const ra=fighters[a.key].restitution,rb=fighters[b.key].restitution;
     const e=clamp(Math.sqrt(ra*rb)*scale+add,restitutionMin,restitutionMax);
     j=-(1+e)*vel/sum;
     nextA.vx-=j*nx*invA;nextA.vy-=j*ny*invA;nextB.vx+=j*nx*invB;nextB.vy+=j*ny*invB;
     const release=clamp((-vel)*releaseFactor,0,releaseCap);
     nextA.vx-=release*nx*(invA/sum);nextA.vy-=release*ny*(invA/sum);
     nextB.vx+=release*nx*(invB/sum);nextB.vy+=release*ny*(invB/sum);
     nextA.spin-=j*.0028;nextB.spin+=j*.0028;nextA.squash=nextB.squash=.36;
     // Telemetry commits only after the finite-result gate.
   }
   const fieldsToCommit=['x','y','vx','vy','spin','squash'];
   if(!Number.isFinite(vel)||!Number.isFinite(over)||!Number.isFinite(j)||
      fieldsToCommit.some(k=>!Number.isFinite(nextA[k])||!Number.isFinite(nextB[k])))
     throw Error('JM_PHYSICS_UNSAFE_CONTACT');
   for(const k of fieldsToCommit){a[k]=nextA[k];b[k]=nextB[k];}
   if(vel<0){
     impulseCount++;
     // Telemetry must not turn a valid finite collision into Infinity/JSON null.
     // Saturate only the diagnostic sum; never alter the actual impulse or units.
     if(totalImpulse>Number.MAX_VALUE-j){totalImpulse=Number.MAX_VALUE;totalImpulseSaturated=true;}
     else totalImpulse+=j;
   }
   pairCount++;
   return {contact:true,normalSpeed:vel,impulse:j,overlap:over};
 }
 function stats(){return {version:VERSION,source:'COMBOUND Original v3.8 collision physical-contact formula',pairs:pairCount,impulses:impulseCount,totalImpulse:totalImpulse>Number.MAX_VALUE/100?totalImpulse:Math.round(totalImpulse*100)/100,totalImpulseSaturated,identity:'JM.GameEngine.Federation.ContactPhysics/1.0',scope:'POSITION_IMPULSE_ONLY'};}
 function reset(){pairCount=0;impulseCount=0;totalImpulse=0;totalImpulseSaturated=false;}
 root.JM_FEDERATION_PHYSICS=Object.freeze({version:VERSION,solvePair,stats,reset});
})(typeof globalThis!=='undefined'?globalThis:this);
