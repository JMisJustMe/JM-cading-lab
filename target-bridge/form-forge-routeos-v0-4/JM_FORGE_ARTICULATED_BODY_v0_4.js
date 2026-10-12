/* JM Form Forge Articulated Body v0.4 — successor to v0.3
 * Two coupled hinge regions derived from the imported mesh bounds, NOT a claimed
 * authored skeleton. All motion composes on top of v0.3 spring body *per step*.
 * Root/body/crown are coherent weighted regions sharing ONE vertex array.
 * Source, GLB and original face indices never overwritten on disk.
 */
(()=>{
'use strict';
if(window.JMForgeArticulation)return;
const game=window.JMForgeContact,embody=window.JMForgeEmbodiment;
if(!game?.scene||embody?.schema!=='JM.FormForge.Embodiment/0.3'||typeof embody.registerComposer!=='function')
 throw Error('Recover v0.3 source-body composer interface first');
const scene=game.scene,SCHEMA='JM.FormForge.Articulation/0.4';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),round=x=>Math.round(x*100000)/100000;
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]);
const rotateZ=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a),p[2]];
const rotateX=(p,a)=>[p[0],p[1]*Math.cos(a)-p[2]*Math.sin(a),p[1]*Math.sin(a)+p[2]*Math.cos(a)];
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
let source='',snapshot='',rest=[],bounds=null,weights=[],joints=[
 {name:'body',angle:0,velocity:0,target:0},
 {name:'crown',angle:0,velocity:0,target:0}
],cycles=0,impacts=0,maximum=0,lastAffected=0,el=null,readout=null,ready=false;
function reset(){
 for(const j of joints){j.angle=0;j.velocity=0;j.target=0}
 cycles=0;impacts=0;maximum=0;lastAffected=0;show();
 return true;
}
function bindSource(){
 if(!scene.loaded||!scene.meshSha||!scene.snapshot||scene.points.length<4)throw Error('Unverified Forge shape is not loaded');
 source=scene.meshSha;snapshot=scene.snapshot;
 // This mesh is already restored to its protected source by inherited v0.3 bindSource().
 // Never capture a previously animated state as a new authority.
 const ys=scene.points.map(p=>p[1]),low=Math.min(...ys),high=Math.max(...ys),span=high-low;
 if(!Number.isFinite(span)||span<1e-5)throw Error('Mesh lacks two-axis depth for inferred articulation; native contact remains');
 const xs=scene.points.map(p=>p[0]),zs=scene.points.map(p=>p[2]);
 const cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
 bounds={low,high,span,cx,cz,pivotBody:[cx,low+.35*span,cz],pivotCrown:[cx,low+.72*span,cz]};
 rest=scene.points.map(p=>p.slice());
 weights=rest.map(p=>{
  const t=(p[1]-low)/span;
  return [smooth((t-.23)/.24),smooth((t-.64)/.25)];
 });
 ready=true;reset();show();
 return {source,snapshot,vertices:rest.length,joints:joints.map(j=>j.name)};
}
function setTargets(body,crown){
 if(!ready)throw Error('Import an actual Forge mesh first');
 if(!Number.isFinite(body)||!Number.isFinite(crown))throw Error('Articulated pose must be finite');
 joints[0].target=clamp(body,-.48,.48);
 joints[1].target=clamp(crown,-.56,.56);
 show();
 return state();
}
function compose(points,sourceBase,dt){
 if(!ready||source!==scene.meshSha||snapshot!==scene.snapshot||sourceBase.length!==rest.length) return 0;
 if(!Number.isFinite(dt)||dt<0||dt>.05)throw Error('Articulation timestep out of scope');
 for(const j of joints){
  const stiffness=31,damping=9.8;
  j.velocity=clamp(j.velocity+((j.target-j.angle)*stiffness-damping*j.velocity)*dt,-2.4,2.4);
  j.angle=clamp(j.angle+j.velocity*dt,-.63,.63);
  if(Math.abs(j.velocity)<.00002&&Math.abs(j.angle-j.target)<.00002){j.velocity=0;j.angle=j.target}
 }
 const [body,crown]=joints.map(j=>j.angle);
 // Exact zero-pose bypass: avoid floating-point pivot-subtract/re-add drift after native restore.
 if(Math.abs(body)<1e-12&&Math.abs(crown)<1e-12){lastAffected=0;show();return 0}
 const p1=bounds.pivotBody,p2=bounds.pivotCrown,
       p2World=add(p1,rotateZ(sub(p2,p1),body));
 let affected=0,max=0;
 for(let i=0;i<points.length;i++){
  const original=points[i].slice(),[wb,wc]=weights[i];
  const trunk=add(p1,rotateZ(sub(original,p1),body*wb));
  const world=add(p2World,rotateX(sub(trunk,p2World),crown*wc));
  points[i][0]=world[0];points[i][1]=world[1];points[i][2]=world[2];
  const d=Math.hypot(world[0]-original[0],world[1]-original[1],world[2]-original[2]);
  if(d>1e-7)affected++;max=Math.max(max,d);
 }
 cycles++;maximum=Math.max(maximum,max);lastAffected=affected;show();
 return max;
}
function recoil(contact){
 if(!ready||source!==scene.meshSha||snapshot!==scene.snapshot||
 !contact||contact.event!=='SURFACE_IMPACT'||contact.geometryHash!==source||contact.snapshotHash!==snapshot||
 !Number.isInteger(contact.face)||contact.face<0||contact.face>=scene.faces.length||
 !Array.isArray(contact.normal)||contact.normal.length!==3||!contact.normal.every(Number.isFinite))
 throw Error('Unverified kinetic contact cannot drive articulated body');
 // Face location chooses which part of the body moves more strongly.
 const f=scene.faces[contact.face],level=f.reduce((s,i)=>s+(rest[i]?.[1]??bounds.low),0)/3;
 const upper=clamp((level-bounds.low)/bounds.span,0,1);
 const nx=contact.normal[0],ny=contact.normal[1],nz=contact.normal[2];
 joints[0].velocity=clamp(joints[0].velocity+(.19+upper*.14)*(nx>=0?-1:1),-1.8,1.8);
 joints[1].velocity=clamp(joints[1].velocity+(upper>.45?.22:.08)*(nz>=0?-1:1),-1.8,1.8);
 impacts++;
 // Measurable immediate consequence in the real mesh; the next v0.3 frame
 // composes after spring deformation and retains both effects.
 const moved=compose(scene.points,rest,1/120);
 if(moved<=0||lastAffected<=0)throw Error('No observed articulated vertex displacement');
 return {schema:SCHEMA,source,snapshot,face:contact.face,impactSequence:impacts,
  joints:joints.map(j=>({name:j.name,angle:round(j.angle),target:round(j.target)})),
  affectedVertices:lastAffected,offset:round(moved),motion:'TWO_COUPLED_WEIGHTED_HINGES'};
}
function restPose(){return setTargets(0,0)}
function state(){
 return {schema:SCHEMA,source,snapshot,ready,vertices:rest.length,
  hierarchy:['root','body','crown'],joints:joints.map(j=>({name:j.name,angle:round(j.angle),velocity:round(j.velocity),target:round(j.target)})),
  impactCount:impacts,lastAffected,maxDisplacement:round(maximum),sourceUnchanged:source===scene.meshSha,cycles};
}
function show(){
 if(readout)readout.textContent=!ready?'IMPORT ORIGINAL FORGE MESH':'BODY '+round(joints[0].angle)+' · CROWN '+round(joints[1].angle)+' · MOVED '+lastAffected+' VERTICES';
}
function mount(){
 const panel=document.getElementById('jmEmbodiedMeter')||document.getElementById('jmKinetics');
 if(!panel)return;
 el=document.createElement('section');el.id='jmArticulation';el.style.cssText='margin:8px 0;padding:9px;border:1px solid #65869b;border-radius:9px;background:#102438';
 const heading=document.createElement('strong');heading.textContent='ARTICULATED BODY · TWO LINKED JOINTS';el.append(heading);
 readout=document.createElement('p');readout.setAttribute('role','status');readout.style.fontSize='11px';el.append(readout);
 const controls=document.createElement('div');controls.className='actions';el.append(controls);
 function button(id,title,delta1,delta2){
  const b=document.createElement('button');b.id=id;b.textContent=title;
  b.onclick=()=>{try{setTargets(joints[0].target+delta1,joints[1].target+delta2)}catch(e){readout.textContent=e.message}};
  controls.append(b)
 }
 button('jmBodyLeft','LEAN LEFT · Q',-.16,0);button('jmBodyRight','LEAN RIGHT · E',.16,0);
 button('jmCrownForward','CROWN FORWARD · R',0,.16);button('jmCrownBack','CROWN BACK · T',0,-.16);
 const r=document.createElement('button');r.id='jmPoseRest';r.textContent='REST POSE · P';r.onclick=()=>{try{restPose()}catch(e){readout.textContent=e.message}};controls.append(r);
 const d=document.createElement('p');d.style.fontSize='11px';d.textContent='Inferred body/crown hinges share original vertices; controls add movement without replacing touch, aim, shot, local impact or source restore.';el.append(d);
 panel.append(el);
 window.addEventListener('keydown',e=>{
  if(e.repeat||e.target?.tagName==='INPUT'||e.target?.tagName==='TEXTAREA')return;
  const m={KeyQ:[-.16,0],KeyE:[.16,0],KeyR:[0,.16],KeyT:[0,-.16]};
  if(m[e.code]){e.preventDefault();try{setTargets(joints[0].target+m[e.code][0],joints[1].target+m[e.code][1])}catch{}}
  if(e.code==='KeyP'){e.preventDefault();try{restPose()}catch{}}
 });
 show();
}
const api=Object.freeze({schema:SCHEMA,bindSource,compose,recoil,setTargets,restPose,reset,state});
Object.defineProperty(window,'JMForgeArticulation',{value:api,configurable:false});
embody.registerComposer(api);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();