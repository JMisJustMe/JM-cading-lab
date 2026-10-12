/* JM Field/Form Forge → GameCore · Embodied Surface Response v0.3
 * Additive organ: inherits v0.1 GLB scene and v0.2 real 3D triangle impact.
 * Own spring-damper response of ACTUAL mesh vertices, based on witnessed
 * collision point+normal. Original mesh packet and source remain immutable.
 * Bounded compliant surface response, NOT skeleton, soft-body solver or GPU rig.
 */
(()=>{
'use strict';
if(window.JMForgeEmbodiment)return;
const ancestor=window.JMForgeContact,kin=window.JMForgeKinetics;
if(!ancestor?.scene||!kin?.collision)throw Error('JM v0.1 mesh and v0.2 kinetic impact must be present before embodiment');
const scene=ancestor.scene,SOURCE='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],size=p=>Math.hypot(...p),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let base=[],displacement=[],velocity=[],mesh='',snapshot='',active=false,last=0,impacts=0,lastFace=-1,area=0,
    maxEver=0, settled=true, label=null,bar=null,freeze=false,lastTime=0,composer=null;
const copy=p=>p.slice(),dist=(a,b)=>size(sub(a,b));
const norm=p=>{const l=size(p)||1;return p.map(x=>x/l)};
function unrotate(q){
  const cy=Math.cos(scene.angles.y),sy=Math.sin(scene.angles.y),cx=Math.cos(scene.angles.x),sx=Math.sin(scene.angles.x);
  const x1=q[0],y1=q[1]*cx+q[2]*sx,z1=-q[1]*sx+q[2]*cx;
  return [x1*cy-z1*sy,y1,x1*sy+z1*cy];
}
function validMesh(){return scene.loaded&&/^[a-f0-9]{64}$/.test(scene.meshSha||'')&&/^[a-f0-9]{8}$/.test(scene.snapshot||'')&&scene.points?.length>3&&scene.faces?.length>0}
function bindSource(){
 if(!validMesh())throw Error('Exact Forge packet not yet validated');
 // Read the fresh source array only on an explicit verified mesh load,
 // never from a previously deformed state on repeated contact.
 mesh=scene.meshSha;snapshot=scene.snapshot;
 base=scene.points.map(copy);displacement=base.map(()=>[0,0,0]);velocity=base.map(()=>[0,0,0]);
 impacts=0;lastFace=-1;maxEver=0;settled=true;area=0;active=true;lastTime=0;if(composer)composer.bindSource();update();
 return {mesh,snapshot,vertices:base.length,triangles:scene.faces.length};
}
function maxOffset(){let m=0;for(const d of displacement)m=Math.max(m,size(d));return m}
function update(){
 if(label)label.textContent=(!active?'Import Forge mesh first':settled?'SURFACE RESTING':'SURFACE REACTING')+
   ' · impacts '+impacts+' · offset '+maxOffset().toFixed(3);
 if(bar)bar.style.width=Math.round(clamp(maxOffset()/.28,0,1)*100)+'%';
}
function step(dt){
 if(!active||freeze)return 0;
 if(!Number.isFinite(dt)||dt<0||dt>.05)throw Error('Surface response timestep must be 0–0.05 seconds');
 // Deterministic per-vertex linear spring+damper; bounded, conserves original
 // source state in "base"; visualization AND future kinetic collision use scene.points.
 let m=0,energy=0;
 for(let i=0;i<base.length;i++){
  const d=displacement[i],v=velocity[i],point=scene.points[i];
  for(let j=0;j<3;j++){
   v[j]+=(-66*d[j]-13*v[j])*dt;
   d[j]+=v[j]*dt;
  }
  const mag=size(d);
  if(mag>.30){const f=.30/mag;for(let j=0;j<3;j++){d[j]*=f;v[j]*=.6}}
  for(let j=0;j<3;j++)point[j]=base[i][j]+d[j];
  const off=size(d);m=Math.max(m,off);energy+=off*off+size(v)**2*.0002;
 }
 if(energy<.0000001){for(let i=0;i<base.length;i++){displacement[i].fill(0);velocity[i].fill(0);for(let k=0;k<3;k++)scene.points[i][k]=base[i][k]}
  settled=true;m=0;
 }
 maxEver=Math.max(maxEver,m);if(composer)composer.compose(scene.points,base,dt);update();return m;
}
function onImpact(contact){
 if(!active||!validMesh()||mesh!==scene.meshSha||snapshot!==scene.snapshot)throw Error('Forged source contact does not match active body');
 if(!contact||contact.event!=='SURFACE_IMPACT'||contact.geometryHash!==mesh||contact.snapshotHash!==snapshot||
   contact.source!==SOURCE||!Number.isInteger(contact.face)||contact.face<0||contact.face>=scene.faces.length||
   !Array.isArray(contact.point)||!Array.isArray(contact.normal)||contact.point.length!==3||contact.normal.length!==3||
   ![...contact.point,...contact.normal].every(x=>Number.isFinite(x)&&Math.abs(x)<10000))
   throw Error('Untrusted kinetic contact cannot deform Forge geometry');
 const face=scene.faces[contact.face],point=unrotate(contact.point),normal=norm(unrotate(contact.normal));
 const center=face.reduce((a,index)=>a.map((x,j)=>x+base[index][j]/3),[0,0,0]);
 // Round-trip-check source vicinity: witness must land on the declared triangle.
 if(dist(point,center)>1.8)throw Error('Impact location does not belong to reported source face');
 const radius=.86;let moved=0,total=0;
 for(let i=0;i<base.length;i++){
  const d=dist(base[i],point),weight=Math.exp(-d*d/(2*radius*radius));
  if(weight<.015)continue;
  // A local dent in the incoming normal, plus constrained radial breathing.
  const radial=norm(sub(base[i],point));
  const push=normal.map((n,j)=>-n*1.65*weight+radial[j]*.14*weight);
  for(let j=0;j<3;j++)velocity[i][j]=clamp(velocity[i][j]+push[j],-2.6,2.6);
  moved++;total+=weight;
 }
 if(moved<1||total<.01)throw Error('No actual source vertices within impact response field');
 impacts++;lastFace=contact.face;area=moved;settled=false;
 const immediate=step(1/120);if(immediate<=0)throw Error('No measurable mesh deformation occurred');
 return {source:SOURCE,mesh,snapshot,face:lastFace,affected_vertices:moved,total_vertices:base.length,
   max_offset:Math.round(immediate*100000)/100000,impact_sequence:impacts};
}
function restore(){
 if(!active)return {restored:false};
 for(let i=0;i<base.length;i++){for(let j=0;j<3;j++)scene.points[i][j]=base[i][j];displacement[i].fill(0);velocity[i].fill(0)}
 settled=true;freeze=false;if(composer)composer.reset();update();
 return {restored:true,source_vertices:base.length,mesh,impact_history:impacts};
}
function status(){return {schema:'JM.FormForge.Embodiment/0.3',source:SOURCE,mesh,snapshot,active,settled,impactCount:impacts,
 lastFace,affectedVertices:area,maxOffset:maxOffset(),maxEver,sourceVertices:base.length,
 geometryReversible:base.length===scene.points.length}}
function mount(){
 const stage=document.querySelector('.stage'),panel=document.getElementById('jmKinetics');
 if(!stage||!panel)return;
 const indicator=document.createElement('div');indicator.id='jmEmbodiedMeter';
 indicator.style.cssText='padding:8px 9px;border:1px solid #44617f;border-radius:9px;background:#0d2633;margin:8px 0';
 label=document.createElement('strong');label.style.cssText='display:block;color:#a6eedf;font-size:11px';
 const rail=document.createElement('div');rail.style.cssText='height:5px;border-radius:6px;background:#233c51;margin:7px 0';
 bar=document.createElement('div');bar.style.cssText='height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#82cef2,#ffdb96)';
 rail.append(bar);indicator.append(label,rail);
 const reset=document.createElement('button');reset.id='jmRestoreForm';reset.textContent='RESTORE ORIGINAL FORM';reset.onclick=restore;
 indicator.append(reset);panel.append(indicator);
 const hint=document.createElement('p');hint.className='mini';hint.textContent='Every real collision dents and rebounds the actual mesh vertices; they settle back to the source body. No mesh bytes or movement state enter JM shared receipts.';panel.append(hint);
 window.addEventListener('jm:mesh-verified',()=>{try{bindSource()}catch(e){label.textContent='EMBODIMENT HOLD · '+e.message}});
 let acc=0;
 function animate(time){
  const dt=lastTime?clamp((time-lastTime)/1000,0,.05):0;lastTime=time;acc=Math.min(acc+dt,.12);
  try{while(acc>=1/120){step(1/120);acc-=1/120}}catch(e){freeze=true;if(label)label.textContent='EMBODIMENT HOLD · '+e.message}
  requestAnimationFrame(animate);
 }
 update();requestAnimationFrame(animate);
 if(validMesh())bindSource();
}
function registerComposer(driver){if(!driver||driver.schema!=='JM.FormForge.Articulation/0.4'||typeof driver.compose!=='function'||typeof driver.bindSource!=='function'||typeof driver.reset!=='function')throw Error('Only JM v0.4 articulation composer may join');if(composer&&composer!==driver)throw Error('Articulation composer already owned by existing organ');composer=driver;if(active)composer.bindSource();return true}
const api=Object.freeze({schema:'JM.FormForge.Embodiment/0.3',bindSource,onImpact,step,restore,unrotate,status,registerComposer});
Object.defineProperty(window,'JMForgeEmbodiment',{value:api,configurable:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();