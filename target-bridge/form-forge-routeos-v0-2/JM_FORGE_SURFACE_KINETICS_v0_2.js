/* JM Form Contact — Surface Kinetics 0.2
 * Original JM v0.1 geometry/cartridge remains unedited and callable.
 * This organ intersects a MOVING 3D probe against real triangles from the
 * existing GLB decoder. No physics library or external rendering service.
 * Kinematic line-triangle impact, restitution and source-qualified receipts;
 * not a general rigid-body / cloth / GPU physics claim.
 */
(()=>{
'use strict';
if(window.JMForgeKinetics)return;
const g=window.JMForgeContact;
if(!g?.scene||!g.decodeGLB)throw Error('Recover JM Form Contact v0.1 before Surface Kinetics v0.2');
const sc=g.scene, src='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const v=(x,y,z)=>[x,y,z], add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
const round=x=>Math.round(x*1000)/1000;
let serial=0, mesh='',snapshot='',shot=null,aim=[0,0],last=0, trail=[],impacts=[],steps=0,elasticity=.6, overlay=null,head=null,count=null,liveState='WAITING';
function rotate(p){
 const cy=Math.cos(sc.angles.y),sy=Math.sin(sc.angles.y),cx=Math.cos(sc.angles.x),sx=Math.sin(sc.angles.x);
 const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy;
 return [x,p[1]*cx-z*sx,p[1]*sx+z*cx];
}
function triangleHit(start,delta,a,b,c){
 const e1=sub(b,a),e2=sub(c,a),h=cross(delta,e2),det=dot(e1,h);
 if(Math.abs(det)<1e-9)return null;
 const inv=1/det,s=sub(start,a),u=inv*dot(s,h);
 if(u<-1e-7||u>1+1e-7)return null;
 const q=cross(s,e1),vv=inv*dot(delta,q);
 if(vv<-1e-7||u+vv>1+1e-7)return null;
 const t=inv*dot(e2,q);
 if(t<1e-6||t>1+1e-7)return null;
 let normal=unit(cross(e1,e2));
 if(dot(normal,delta)>0)normal=mul(normal,-1);
 return{t,normal,point:add(start,mul(delta,t))};
}
function collision(start,delta){
 if(!sc.loaded||!sc.faces.length)return null;
 if(sc.faces.length>6000)throw Error('Kinetic triangle limit 6000; original v0.1 contact remains available');
 const points=sc.points.map(rotate);let hit=null;
 for(let id=0;id<sc.faces.length;id++){
  const f=sc.faces[id];if(f[0]>=points.length||f[1]>=points.length||f[2]>=points.length)continue;
  const h=triangleHit(start,delta,points[f[0]],points[f[1]],points[f[2]]);
  if(h&&(!hit||h.t<hit.t))hit={...h,face:id};
 }
 return hit;
}
function host(event,detail={}){
 if(window.parent===window||location.origin==='null')return;
 window.parent.postMessage({
  schema:'JM.FormForge.RouteOSKinetics/0.2',event,
  source:src,geometryHash:mesh,snapshotHash:snapshot,
  shot:serial,step:steps,face:detail.face??-1,impactCount:impacts.length,
  point:detail.point?.map(round)||null,normal:detail.normal?.map(round)||null,
  velocity:shot?.vel.map(round)||null
 },location.origin);
}
function note(text){if(head)head.textContent=text;if(count)count.textContent='3D IMPACTS '+impacts.length}
function refresh(){
 if(sc.loaded&&sc.meshSha!==mesh){mesh=sc.meshSha;snapshot=sc.snapshot;shot=null;trail=[];impacts=[];serial=0;steps=0;liveState='READY';note('Real mesh loaded · aim and FIRE PROBE to contact its actual triangles')}
 if(!sc.loaded){liveState='WAITING';note('Import a source-verified Forge mesh using the existing loader')}
}
function resetSourceSession(){
 shot=null;trail=[];impacts=[];serial=0;steps=0;last=0;
 mesh=sc.meshSha||'';snapshot=sc.snapshot||'';
 liveState=sc.loaded?'READY':'WAITING';
 note(sc.loaded?'Source geometry re-entered · new kinetic contact session':'Waiting for exact Forge geometry');
 return {mesh,session_status:liveState,impact_count:impacts.length};
}
function setAim(x,y){aim=[Math.max(-1.45,Math.min(1.45,Number(x)||0)),Math.max(-1.45,Math.min(1.45,Number(y)||0))];return aim.slice()}
function fire(){
 refresh();
 if(!sc.loaded)throw Error('Import verified JM Forge mesh before firing');
 if(sc.faces.length>6000)throw Error('Kinetics HOLD: geometry exceeds 6000 triangles; prior contact game remains available');
 serial++;
 shot={pos:[aim[0],aim[1],4],vel:[0,0,-3.8],elapsed:0,bounces:0};
 trail=[shot.pos.slice()];steps=0;liveState='FLYING';note('PROBE '+serial+' IN FLIGHT · moving toward actual mesh triangles');
 host('PROBE_LAUNCH');
 return {shot:serial,origin:shot.pos.slice(),velocity:shot.vel.slice()};
}
function step(dt){
 refresh();if(!shot||liveState!=='FLYING')return null;
 if(!Number.isFinite(dt)||dt<0||dt>0.1)throw Error('Kinetic simulation step out of bounds');
 // 3D kinematic motion, continuous segment-vs-triangle collision (no tunnelling through thin faces).
 const displacement=mul(shot.vel,dt),start=shot.pos.slice(),found=collision(start,displacement);
 shot.elapsed+=dt;steps++;
 if(found){
  shot.pos=add(found.point,mul(found.normal,.006));
  shot.vel=sub(shot.vel,mul(found.normal,(1+elasticity)*dot(shot.vel,found.normal)));
  shot.bounces++;
  impacts.push({shot:serial,face:found.face,point:found.point.map(round),normal:found.normal.map(round),step:steps,at_elapsed:round(shot.elapsed)});
  host('SURFACE_IMPACT',found);
  liveState='IMPACT';
  note('3D SURFACE CONTACT · face '+found.face+' · bounce '+shot.bounces+' · original mesh geometry');
  trail.push(shot.pos.slice());
  // A bounced probe has a visible one-frame consequence; next step will fly away.
  return impacts.at(-1);
 }
 shot.pos=add(start,displacement);
 trail.push(shot.pos.slice());if(trail.length>32)trail.shift();
 if(shot.elapsed>3.5||Math.hypot(...shot.pos)>8){shot=null;liveState='READY';note('Probe flight ended · aim another 3D contact')}
 return null;
}
function resume(){if(liveState==='IMPACT')liveState='FLYING'}
function projection(p,w,h){
 const scale=Math.min(w,h)*.34*sc.zoom*(3.2/(3.7+p[2]*.18));
 return {x:w/2+p[0]*scale,y:h*.51-p[1]*scale,r:Math.max(3,5.5*scale/100)};
}
function draw(){
 if(!overlay)return;
 const rect=overlay.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);
 if(overlay.width!==Math.round(rect.width*d)||overlay.height!==Math.round(rect.height*d)){overlay.width=Math.round(rect.width*d);overlay.height=Math.round(rect.height*d)}
 const ctx=overlay.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,rect.width,rect.height);
 if(!sc.loaded)return;
 const center=projection([aim[0],aim[1],0],rect.width,rect.height);
 ctx.strokeStyle='#fcd58b';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(center.x,center.y,10,0,Math.PI*2);ctx.moveTo(center.x-16,center.y);ctx.lineTo(center.x-6,center.y);ctx.moveTo(center.x+6,center.y);ctx.lineTo(center.x+16,center.y);ctx.stroke();
 if(!shot)return;
 for(let i=1;i<trail.length;i++){
  const a=projection(trail[i-1],rect.width,rect.height),b=projection(trail[i],rect.width,rect.height);
  ctx.strokeStyle='rgba(150,238,255,'+(i/trail.length*.7)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 const q=projection(shot.pos,rect.width,rect.height);
 ctx.fillStyle='#fff5c8';ctx.shadowColor='#7ce9ff';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(q.x,q.y,q.r+2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
}
let acc=0;
function tick(t){
 const dt=Math.min(.05,Math.max(0,(t-(last||t))/1000));last=t;acc+=dt;
 if(acc>.15)acc=.15;
 try{while(acc>=1/120){if(liveState==='IMPACT')resume();step(1/120);acc-=1/120}}catch(e){liveState='HOLD';shot=null;note('KINETICS HOLD · '+e.message)}
 draw();requestAnimationFrame(tick);
}
function mount(){
 const stage=document.querySelector('.stage'),aside=document.querySelector('aside');if(!stage||!aside)return;
 overlay=document.createElement('canvas');overlay.setAttribute('aria-hidden','true');overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4';
 stage.append(overlay);
 const panel=document.createElement('section');panel.id='jmKinetics';panel.innerHTML='<h2>SURFACE KINETICS · ACTUAL 3D IMPACT</h2><p>Launch a moving probe toward the existing Forge mesh. The recipient computes segment–triangle collision and reflects the probe along the actual face normal. Original touch face-picking still works separately.</p><div class="actions"><button id="jmAimL">AIM LEFT</button><button id="jmAimR">AIM RIGHT</button><button id="jmAimU">AIM UP</button><button id="jmAimD">AIM DOWN</button><button class="highlight" id="jmFire">FIRE PROBE · F</button><button id="jmAimZero">CENTRE AIM</button></div><p id="jmKinStatus" role="status"></p><strong id="jmKinCount">3D IMPACTS 0</strong><p class="mini">Original orbit: ← → ↑ ↓ / touch drag. Additional probe controls: F to fire, I/J/K/L aim. Not a rigid-body solver.</p>';
 aside.prepend(panel);head=panel.querySelector('#jmKinStatus');count=panel.querySelector('#jmKinCount');
 for(const [key,x,y] of [['jmAimL',-.18,0],['jmAimR',.18,0],['jmAimU',0,.18],['jmAimD',0,-.18]])panel.querySelector('#'+key).onclick=()=>setAim(aim[0]+x,aim[1]+y);
 panel.querySelector('#jmFire').onclick=()=>{try{fire()}catch(e){note(e.message)}};
 panel.querySelector('#jmAimZero').onclick=()=>setAim(0,0);
 window.addEventListener('keydown',e=>{
  if(e.target?.tagName==='INPUT'||e.target?.tagName==='TEXTAREA'||e.repeat)return;
  const m={KeyJ:[-.18,0],KeyL:[.18,0],KeyI:[0,.18],KeyK:[0,-.18]};
  if(m[e.code]){e.preventDefault();setAim(aim[0]+m[e.code][0],aim[1]+m[e.code][1])}
  if(e.code==='KeyF'){e.preventDefault();try{fire()}catch(err){note(err.message)}}
 });
 note('Import Forge geometry; original touch controls and new moving-probe input remain separate.');
 requestAnimationFrame(tick);
}
Object.defineProperty(window,'JMForgeKinetics',{value:Object.freeze({
 schema:'JM.FormForge.SurfaceKinetics/0.2',fire,step,collision,triangleHit,setAim,rotate,resetSourceSession,
 get state(){return{phase:liveState,mesh,snapshot,shot:serial,impacts:impacts.map(x=>({...x})),position:shot?.pos.slice()||null,velocity:shot?.vel.slice()||null,aim:aim.slice()}}
}),configurable:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();