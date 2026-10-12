/* JM ECOSTATE / Field Form Forge World Consequence v0.6.
 * Two distinct gameplay roles, same protected mesh source; no invented character asset.
 * Guardian(A) grants clearance on witnessed v0.5 contact; Courier(B) then pushes
 * a genuine simulated relay-core WORLD OBJECT to a beacon. Object motion is
 * collision-derived proxy contact and persistent consequence, not mesh-mesh physics.
 * Full current world state joins existing RouteOS encounter checkpoint, no GLB bytes.
 */
(()=>{
'use strict';
if(window.JMForgeWorld)return;
const dual=window.JMForgeDualActor,scene=window.JMForgeContact?.scene;
if(dual?.schema!=='JM.FormForge.DualActor/0.5'||!dual.registerWorld||!scene)
 throw Error('Recover exact protected v0.5 two-actor source before joining world consequences');
const SCHEMA='JM.FormForge.WorldConsequence/0.6',STATE='JM.FormForge.WorldState/0.6';
const SOURCE='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const round=x=>Math.round(x*10000)/10000,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let mesh='',snapshot='',ready=false,clearance=false,phase='waiting',
    coreX=1.34,beaconX=2.12,deliveries=0,sequence=0,pushes=0,gateOpen=false,
    canvas=null,readout=null,zoomAtBind=null,lastX=null;
function fresh(){
 clearance=false;phase='await-guardian-contact';coreX=1.34;beaconX=2.12;
 deliveries=0;sequence=0;pushes=0;gateOpen=false;lastX=null;show();
}
function bindSource(){
 if(!scene.loaded||!/^[a-f0-9]{64}$/.test(scene.meshSha||'')||!/^[a-f0-9]{8}$/.test(scene.snapshot||''))
  throw Error('Source-verified Forge GLB required to create bounded world');
 mesh=scene.meshSha;snapshot=scene.snapshot;ready=true;fresh();
 // Mobile-fit composition only, not a change to geometry or original input grammar.
 if(zoomAtBind===null)zoomAtBind=scene.zoom;
 scene.zoom=Math.min(scene.zoom,.76);
 return {schema:SCHEMA,source:SOURCE,mesh,worldObjects:2,roles:['guardian','courier']};
}
function check(){if(!ready||scene.meshSha!==mesh||scene.snapshot!==snapshot)throw Error('World source mismatch: re-enter verified Forge geometry')}
function state(){
 return {schema:STATE,source:SOURCE,mesh,snapshot,roles:['guardian','courier'],
  clearance,phase,core:{id:'relay-core',x:round(coreX),pushes},beacon:{id:'home-beacon',x:round(beaconX),open:gateOpen},
  deliveries,sequence,consequence:gateOpen?'BEACON_LIT_AND_GATE_OPEN':'PENDING'};
}
function validate(s){
 if(!s||s.schema!==STATE||s.source!==SOURCE||s.mesh!==mesh||s.snapshot!==snapshot||
  !Array.isArray(s.roles)||s.roles.join('|')!=='guardian|courier'||
  !['await-guardian-contact','clearance','transport','delivered'].includes(s.phase)||
  typeof s.clearance!=='boolean'||!s.core||s.core.id!=='relay-core'||
  typeof s.core.x!=='number'||!Number.isFinite(s.core.x)||s.core.x<1.3||s.core.x>2.25||
  !Number.isSafeInteger(s.core.pushes)||s.core.pushes<0||s.core.pushes>100000||
  !s.beacon||s.beacon.id!=='home-beacon'||s.beacon.x!==2.12||typeof s.beacon.open!=='boolean'||
  !Number.isInteger(s.deliveries)||s.deliveries<0||s.deliveries>1||
  !Number.isInteger(s.sequence)||s.sequence<0||s.sequence>100000||
  s.consequence!==(s.beacon.open?'BEACON_LIT_AND_GATE_OPEN':'PENDING')||
  (s.beacon.open&&(s.deliveries!==1||!s.clearance||s.phase!=='delivered'||s.core.x<2.12))||
  (s.deliveries===0&&s.beacon.open)||
  (!s.clearance&&s.phase!=='await-guardian-contact'))throw Error('Invalid or mismatched world consequence checkpoint');
 return true;
}
function restore(s){
 check();validate(s);
 if(gateOpen&&!s.beacon.open)throw Error('HOLD: an earned world consequence cannot be erased by an older checkpoint');
 clearance=s.clearance;phase=s.phase;coreX=s.core.x;pushes=s.core.pushes;
 deliveries=s.deliveries;sequence=s.sequence;gateOpen=s.beacon.open;lastX=null;show();
 return {restored:true,gateOpen,coreX:round(coreX),deliveries,consequence:state().consequence};
}
function reset(){if(!ready)return false;fresh();return true}
function onActorContact(n){
 check();if(!Number.isInteger(n)||n<1)return false;
 if(clearance)return true;
 clearance=true;phase='clearance';sequence++;show();
 return true;
}
function canEscort(){return ready&&clearance&&!gateOpen}
function send(event,extra={}){
 if(window.parent===window||location.origin==='null')return;
 window.parent.postMessage({schema:SCHEMA,event,source:SOURCE,geometryHash:mesh,snapshotHash:snapshot,
  world:state(),...extra},location.origin);
}
function startDelivery(){
 check();if(!canEscort())throw Error('Guardian contact must happen before Courier can move the relay core');
 dual.escort();phase='transport';show();return state();
}
function step(dt,courierX){
 if(!ready)return null;check();
 if(!Number.isFinite(dt)||dt<0||dt>.05||!Number.isFinite(courierX))throw Error('World simulation timestep/actor motion invalid');
 if(phase!=='transport'||gateOpen)return null;
 // Actual source-dependent Courier B x-position drives the core. Courier must touch
 // the left side of a .17-radius 3D world object; no arbitrary timer advances it.
 const cx=clamp(courierX,-2,5),reach=.42;
 if(cx+reach>=coreX&&cx<coreX+.17){
  const before=coreX;coreX=clamp(Math.max(coreX,cx+reach),1.34,2.12);
  if(coreX>before+1e-6){pushes++;sequence++}
 }
 if(coreX>=2.12-1e-8&&!gateOpen){
  coreX=2.12;gateOpen=true;deliveries=1;phase='delivered';sequence++;
  const proof={delivered:true,world:state(),courierX:round(courierX),contactMode:'COURIER_TO_RELAY_CORE_PROXY',
   sourceConsequences:['RELAY_CORE_MOVED','BEACON_LIT','GATE_OPEN']};
  send('WORLD_DELIVERED',{courierX:round(courierX),contactMode:proof.contactMode});
  show();return proof;
 }
 show();return {pushed:coreX>1.34,world:state()};
}
function show(){
 if(readout)readout.textContent=!ready?'IMPORT VERIFIED FORGE GEOMETRY':
  'GUARDIAN '+(clearance?'GRANTED':'WAITING')+' · COURIER '+phase.toUpperCase()+
  ' · CORE '+round(coreX)+' → BEACON '+(gateOpen?'OPEN ✓':'SEALED');
}
function project(p,w,h){
 const cy=Math.cos(scene.angles.y),sy=Math.sin(scene.angles.y),cx=Math.cos(scene.angles.x),sx=Math.sin(scene.angles.x),
 x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy,y=p[1]*cx-z*sx,depth=p[1]*sx+z*cx,
 factor=Math.min(w,h)*.34*scene.zoom*(3.2/(3.7+depth*.18));
 return{x:w/2+x*factor,y:h*.51-y*factor};
}
function draw(){
 if(!canvas||!ready)return;
 const r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1),w=r.width,h=r.height;
 if(!w||!h)return;
 if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d)}
 const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
 const core=project([coreX,-.4,0],w,h),beacon=project([beaconX,-.4,0],w,h);
 c.lineWidth=3;c.strokeStyle=gateOpen?'#9ff0ad':'#b38b6b';c.beginPath();c.moveTo(beacon.x,beacon.y-25);c.lineTo(beacon.x,beacon.y+14);c.stroke();
 c.beginPath();c.arc(beacon.x,beacon.y-25,11,0,2*Math.PI);c.strokeStyle=gateOpen?'#81ffa8':'#a5afcf';c.lineWidth=4;c.stroke();
 c.shadowColor='#f4c477';c.shadowBlur=13;c.fillStyle='#f0ba64';c.beginPath();c.arc(core.x,core.y,10,0,Math.PI*2);c.fill();c.shadowBlur=0;
 c.font='700 11px system-ui';c.textAlign='center';c.fillStyle=gateOpen?'#c4ffd0':'#ffe6b8';
 c.fillText(gateOpen?'WORLD COMPLETE':'RELAY CORE',core.x,core.y+29);
}
function mount(){
 const stage=document.querySelector('.stage'),panel=document.getElementById('jmDualActorPanel');
 if(!stage||!panel)return;
 canvas=document.createElement('canvas');canvas.id='jmWorldOverlay';
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:7';stage.append(canvas);
 const card=document.createElement('section');card.id='jmWorldConsequence';
 card.style.cssText='padding:8px;margin:8px 0;border:1px solid #78a6a1;border-radius:10px;background:#102f32';
 const heading=document.createElement('strong');heading.textContent='WORLD CONSEQUENCE · GUARDIAN + COURIER';card.append(heading);
 readout=document.createElement('p');readout.id='jmWorldStatus';readout.setAttribute('role','status');card.append(readout);
 const p=document.createElement('p');p.style.fontSize='11px';
 p.textContent='1. ECHO APPROACH the Guardian. 2. Move the Courier to push the visible relay core into the beacon. 3. SAVE ENCOUNTER; your world consequence will cross devices without copying mesh bytes.';card.append(p);
 const b=document.createElement('button');b.id='jmWorldDeliver';b.textContent='COURIER DELIVER RELAY · H';
 b.onclick=()=>{try{startDelivery()}catch(e){readout.textContent='DELIVERY HOLD: '+e.message}};card.append(b);
 panel.append(card);
 window.addEventListener('keydown',e=>{
  if(e.code==='KeyH'&&!e.repeat&&e.target?.tagName!=='INPUT'&&e.target?.tagName!=='TEXTAREA')try{startDelivery()}catch{}});
 function tick(){draw();requestAnimationFrame(tick)}
 if(scene.loaded)bindSource();show();requestAnimationFrame(tick);
}
Object.defineProperty(window,'JMForgeWorld',{value:Object.freeze({schema:SCHEMA,bindSource,onActorContact,step,state,validate,restore,reset,canEscort,startDelivery,get ready(){return ready}}),configurable:false});
dual.registerWorld(window.JMForgeWorld);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();