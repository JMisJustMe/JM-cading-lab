/* JM Form Forge Dual-Actor Contact v0.5
 * Reuses exact verified GLB source vertices for a SECOND independently placed instance.
 * Actor A: unchanged v0.1→v0.4 original scene and articulated controls.
 * Actor B: first-party mesh triangle instance, independent x velocity/state, drawn alongside.
 * Broad-phase contact: explicit source-bound proxy radii; NOT exact mesh-mesh collision.
 * State: structured checkpoint only; mesh and private Forge bytes never serialized.
 */
(()=>{
'use strict';
if(window.JMForgeDualActor)return;
const scene=window.JMForgeContact?.scene,art=window.JMForgeArticulation;
if(!scene||art?.schema!=='JM.FormForge.Articulation/0.4')throw Error('JM original mesh and articulated ancestor not running');
const SCHEMA='JM.FormForge.DualActor/0.5';
const SOURCE='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const VERSION='JM.FormForge.EncounterState/0.5';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let original=[],mesh='',snapshot='',actor=null,ready=false,canvas=null,info=null,last=0,ticks=0,world=null;
const round=x=>Math.round(x*10000)/10000;
function fresh(){
 const xs=original.map(p=>p[0]),low=Math.min(...xs),high=Math.max(...xs),extent=Math.max(.15,(high-low)/2);
 const a=Math.min(.95,Math.max(.22,extent*.42)),b=Math.min(.62,Math.max(.12,extent*.24));
 return {x:round(a+b+.88),vx:0,mode:'idle',contacts:0,sequence:0,hitRadiusA:a,hitRadiusB:b};
}
function bindSource(){
 if(!scene.loaded||!/^[a-f0-9]{64}$/.test(scene.meshSha||'')||!/^[a-f0-9]{8}$/.test(scene.snapshot||''))
  throw Error('Source-verified Forge geometry required');
 original=scene.points.map(p=>p.slice());mesh=scene.meshSha;snapshot=scene.snapshot;
 actor=fresh();ready=true;ticks=0;last=0;world?.bindSource?.();show();
 return {schema:SCHEMA,mesh,source:SOURCE,vertices:original.length,triangles:scene.faces.length,instances:2};
}
function verify(){
 if(!ready||mesh!==scene.meshSha||snapshot!==scene.snapshot||!actor)throw Error('Actor source changed; re-enter verified geometry');
}
function send(event,detail={}){
 if(window.parent===window||location.origin==='null')return;
 window.parent.postMessage({schema:SCHEMA,event,source:SOURCE,geometryHash:mesh,snapshotHash:snapshot,
  instances:2,contactCount:actor.contacts,sequence:actor.sequence,actorX:round(actor.x),velocity:round(actor.vx),...detail},location.origin);
}
function approach(){
 verify();if(actor.mode==='approaching')return state();
 actor.vx=-1.65;actor.mode='approaching';show();return state();
}
function step(dt){
 if(!ready)return null;
 verify();if(!Number.isFinite(dt)||dt<0||dt>.05)throw Error('Encounter timestep out of bounds');
 ticks++;
 const radius=actor.hitRadiusA+actor.hitRadiusB;
 if(actor.mode==='approaching'){
  // Continuous 1D swept broad-phase against verified mesh-derived spherical proxies.
  const next=actor.x+actor.vx*dt;
  if(actor.x>radius&&next<=radius){
   actor.x=radius;actor.sequence++;actor.contacts++;actor.vx=.72;actor.mode='recoil';
   art.setTargets(-.26,.14); // visible purposeful reaction in existing shared source body
   world?.onActorContact?.(actor.contacts);
   send('ACTOR_CONTACT',{contactMode:'SOURCE_BOUNDS_PROXY',threshold:round(radius),actors:['original','echo']});
   show();return {contact:true,sequence:actor.sequence,threshold:round(radius),actors:2,source:mesh};
  }
  actor.x=next;
 }else if(actor.mode==='recoil'){
  actor.x+=actor.vx*dt;actor.vx=Math.max(0,actor.vx-1.15*dt);
  if(actor.vx===0)actor.mode='settled';
 }else if(actor.mode==='escort'){
  actor.x+=actor.vx*dt;
  if(actor.x>4.5){actor.vx=0;actor.mode='settled'}
 }
 if(world?.step?.(dt,actor.x)?.delivered){actor.vx=0;actor.mode='settled'}
 show();return null;
}
function state(){
 return {schema:VERSION,source:SOURCE,mesh,snapshot,actors:2,echo:{x:round(actor?.x??0),vx:round(actor?.vx??0),
  mode:actor?.mode||'unbound',contacts:actor?.contacts||0,sequence:actor?.sequence||0},
  originalPose:art.state().joints.map(j=>({name:j.name,target:j.target})),contactMode:'SOURCE_BOUNDS_PROXY',world:world?.state?.()||null};
}
function validate(s){
 if(!s||s.schema!==VERSION||s.source!==SOURCE||s.mesh!==mesh||s.snapshot!==snapshot||s.actors!==2||
   s.contactMode!=='SOURCE_BOUNDS_PROXY'||!s.echo||!['idle','approaching','recoil','settled'].includes(s.echo.mode)||
   ![s.echo.x,s.echo.vx].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<100)||
   !Number.isInteger(s.echo.contacts)||s.echo.contacts<0||s.echo.contacts>100000||
   !Number.isInteger(s.echo.sequence)||s.echo.sequence!==s.echo.contacts||
   !Array.isArray(s.originalPose)||s.originalPose.length!==2||s.originalPose[0].name!=='body'||s.originalPose[1].name!=='crown'||
   !s.originalPose.every(p=>typeof p.target==='number'&&Number.isFinite(p.target)&&Math.abs(p.target)<.6)||
   (s.world!==null&&s.world!==undefined&&(!world||!world.validate(s.world))))
   throw Error('Unverified or mismatched JM two-actor state');
 return true;
}
function restore(s){
 verify();validate(s);
 if(actor.contacts>0&&JSON.stringify(state().echo)!==JSON.stringify(s.echo))
  throw Error('HOLD: destination has different contact history; do not overwrite');
 actor.x=s.echo.x;actor.vx=s.echo.vx;actor.contacts=s.echo.contacts;actor.sequence=s.echo.sequence;actor.mode=s.echo.mode;
 art.setTargets(s.originalPose[0].target,s.originalPose[1].target);
 if(world){if(s.world)world.restore(s.world);else world.reset()}
 show();
 return {restored:true,contacts:actor.contacts,mesh,source:SOURCE};
}
function reset(){
 if(!ready)return false;actor=fresh();ticks=0;last=0;world?.reset?.();show();return true;
}
function registerWorld(partner){
 if(!partner||partner.schema!=='JM.FormForge.WorldConsequence/0.6'||!['bindSource','onActorContact','step','state','validate','restore','reset','canEscort'].every(k=>typeof partner[k]==='function'))throw Error('Only source-bound JM v0.6 world organ may join');
 if(world&&world!==partner)throw Error('World consequence organ already registered');
 world=partner;if(ready)partner.bindSource();return true
}
function escort(){
 verify();
 if(!world?.canEscort?.())throw Error('Guardian must grant courier clearance through actual encounter contact');
 if(actor.mode==='escort')return state();
 actor.mode='escort';actor.vx=1.18;show();return state();
}
function snapshotToHost(){verify();const s=state();send('STATE_SAVE',{checkpoint:s});return s}
function show(){
 if(info)info.textContent=!ready?'IMPORT VERIFIED FORGE MESH TO CREATE TWO ACTORS':
 'ACTOR A + ECHO B · '+(actor?.mode||'waiting').toUpperCase()+' · CONTACTS '+(actor?.contacts||0)+' · x '+round(actor?.x||0);
}
function projected(p,w,h){
 const cy=Math.cos(scene.angles.y),sy=Math.sin(scene.angles.y),cx=Math.cos(scene.angles.x),sx=Math.sin(scene.angles.x);
 const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy,y=p[1]*cx-z*sx,depth=p[1]*sx+z*cx,
   factor=Math.min(w,h)*.34*scene.zoom*(3.2/(3.7+depth*.18));
 return{x:w/2+x*factor,y:h*.51-y*factor,z:depth};
}
function draw(){
 if(!canvas)return;
 const r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1),w=r.width,h=r.height;
 if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d)}
 const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
 if(!ready||!original.length)return;
 // The same verified source GLB indices and vertices form a second independently transformed actor.
 // Draw this smaller duplicate as a distinct tinted mesh, not as a static billboard.
 const points=original.map(p=>projected([p[0]*.46+actor.x,p[1]*.46,p[2]*.46],w,h));
 const faces=scene.faces.map((tri,id)=>{const p=tri.map(i=>points[i]),cross=(p[1].x-p[0].x)*(p[2].y-p[0].y)-(p[1].y-p[0].y)*(p[2].x-p[0].x);return{id,p,z:p.reduce((s,q)=>s+q.z,0)/3,area:cross}})
  .filter(f=>Math.abs(f.area)>.18).sort((a,b)=>b.z-a.z);
 for(const f of faces.slice(0,4500)){
  c.beginPath();c.moveTo(f.p[0].x,f.p[0].y);c.lineTo(f.p[1].x,f.p[1].y);c.lineTo(f.p[2].x,f.p[2].y);c.closePath();
  c.fillStyle=f.area>0?'rgba(248,172,109,.82)':'rgba(194,123,111,.84)';c.strokeStyle='rgba(255,224,158,.5)';c.lineWidth=.7;c.fill();c.stroke();
 }
 const q=projected([actor.x,0,0],w,h);c.font='700 12px system-ui';c.textAlign='center';c.fillStyle='#ffe5aa';c.fillText('ECHO · B',q.x,q.y+54);
 const a=projected([0,0,0],w,h);c.fillStyle='#b9f5fa';c.fillText('SOURCE · A',a.x,a.y+54);
}
function mount(){
 const stage=document.querySelector('.stage'),panel=document.getElementById('jmArticulation')||document.getElementById('jmKinetics');
 if(!stage||!panel)return;
 canvas=document.createElement('canvas');canvas.id='jmDualActorOverlay';
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6';stage.append(canvas);
 const section=document.createElement('section');section.id='jmDualActorPanel';section.style.cssText='margin:9px 0;padding:9px;border:1px solid #9a765b;border-radius:9px;background:#282339';
 const title=document.createElement('strong');title.textContent='TWO REAL MESH INSTANCES · CONTACT';section.append(title);
 info=document.createElement('p');info.id='jmDualActorStatus';info.setAttribute('role','status');section.append(info);
 const controls=document.createElement('div');controls.className='actions';section.append(controls);
 for(const [id,label,fn] of [
  ['jmActorApproach','ECHO APPROACH · G',approach],
  ['jmActorSave','SEND ENCOUNTER TO JM BUS',snapshotToHost],
  ['jmActorReset','RESET ECHO',reset]]){
  const b=document.createElement('button');b.id=id;b.textContent=label;b.onclick=()=>{try{fn()}catch(e){info.textContent='ENCOUNTER HOLD: '+e.message}};controls.append(b)}
 const note=document.createElement('p');note.style.fontSize='11px';note.textContent='Second instance uses the same validated source triangles, separate position/velocity, and bounded mesh-derived proxy contact. Existing body controls remain. No general mesh-mesh collision claim.';section.append(note);panel.append(section);
 window.addEventListener('keydown',e=>{if(e.code==='KeyG'&&!e.repeat&&e.target?.tagName!=='INPUT'){try{approach()}catch{}}});
 let elapsed=0;function tick(t){const dt=last?clamp((t-last)/1000,0,.05):0;last=t;elapsed=Math.min(.12,elapsed+dt);
  try{while(elapsed>=1/120){step(1/120);elapsed-=1/120}}catch(e){if(info)info.textContent='ENCOUNTER HOLD: '+e.message}
  draw();requestAnimationFrame(tick);
 }
 if(scene.loaded)bindSource();
 window.addEventListener('jm:mesh-verified',()=>{try{bindSource()}catch(e){if(info)info.textContent=e.message}});
 show();requestAnimationFrame(tick);
}
Object.defineProperty(window,'JMForgeDualActor',{value:Object.freeze({
 schema:SCHEMA,bindSource,approach,escort,registerWorld,step,reset,state,restore,validate,snapshotToHost,
 get ready(){return ready},get geometry(){return{mesh,vertexCount:original.length,faceCount:scene.faces.length}}
}),configurable:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();