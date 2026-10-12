/* JM world v0.6 · owner-contact standalone. No external APIs, no private GLB bundled.
 Manual source-qualified checkpoint ≠ native RouteOS receipt.
*/
(()=>{'use strict';
const P='JM.Ecostate.OwnerWorldCheckpoint/0.6',GAME='JM Form Forge Guardian Courier v0.6';
let connected=false,seen=false,status,stepper,importFile,ready=false,importing=false;
const $=id=>document.getElementById(id);
const setStatus=(s,hold=false)=>{if(status){status.textContent=s;status.style.color=hold?'#ffacb3':'#c9ffe5'}};
const got=()=>window.JMForgeContact?.scene?.loaded&&window.JMForgeEmbodiment&&window.JMForgeArticulation&&window.JMForgeDualActor&&window.JMForgeWorld;
function onLoaded(){
 if(!got())return setStatus('Source loaded but one or more inherited mechanics are missing. HOLD.',true);
 try{
  window.JMForgeKinetics?.resetSourceSession();
  window.JMForgeEmbodiment.bindSource();
  window.JMForgeDualActor.bindSource();
  connected=true;seen=false;ready=true;
  setStatus('FORGE SOURCE CHECKED · Guardian and Courier ready. Tap APPROACH to begin.');refresh();
 }catch(e){connected=false;setStatus('SOURCE HOLD · '+e.message,true)}
}
window.JMOfflineSource={onLoaded};
function checkpoint(){
 if(!ready||!got())throw Error('Import your own verified Forge mesh first');
 const world=window.JMForgeWorld.state(),body=window.JMForgeDualActor.state();
 window.JMForgeWorld.validate(world);window.JMForgeDualActor.validate(body);
 return {schema:P,game:GAME,created_at:new Date().toISOString(),source_sha256:'ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba',
  mesh_sha256:window.JMForgeContact.scene.meshSha,snapshot_hash:window.JMForgeContact.scene.snapshot,
  encounter:JSON.parse(JSON.stringify(body)),scope:'MANUAL_OWNER_CONTACT_CHECKPOINT_NOT_NATIVE_ROUTEOS',private_mesh_included:false};
}
function download(name,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function save(){
 const p=checkpoint();download('JM_WORLD_v0_6_OWNER_CHECKPOINT.json',p);
 try{localStorage.setItem('jm.owner.world.v06.'+p.mesh_sha256,JSON.stringify(p))}catch{}
 setStatus('OWNER CHECKPOINT SAVED · World/actor state only, NOT private mesh bytes.');return p;
}
function load(p){
 if(!p||p.schema!==P||p.game!==GAME||p.private_mesh_included!==false||
    p.source_sha256!=='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba'||
    p.mesh_sha256!==window.JMForgeContact?.scene?.meshSha||p.snapshot_hash!==window.JMForgeContact?.scene?.snapshot||!p.encounter)
    throw Error('Source/model passport mismatch. Import the identical Forge mesh first.');
 const d=window.JMForgeDualActor.restore(p.encounter);
 setStatus('OWNER CHECKPOINT RESTORED · '+(window.JMForgeWorld.state().beacon.open?'Beacon OPEN · earned world consequence retained.':'Continue Guardian/Courier gameplay.'));
 refresh();return d;
}
function once(fn){return()=>{try{fn();refresh()}catch(e){setStatus('HOLD · '+e.message,true)}}}
function button(id,label,action,emphasis=false){
 const b=document.createElement('button');b.id=id;b.textContent=label;
 if(emphasis)b.className='owner-primary';b.onclick=once(action);return b;
}
function refresh(){
 if(!stepper)return;
 if(!ready){stepper.textContent='1 · LOAD YOUR FORGE PACKET';return}
 const w=window.JMForgeWorld.state();
 stepper.textContent=w.beacon.open?'WORLD COMPLETE · BEACON LIT · GATE OPEN':
  !w.clearance?'1 · GUARDIAN CONTACT':
  w.phase==='transport'?'3 · PUSH RELAY CORE TO BEACON':'2 · COURIER DELIVERS CORE';
 const v=$('ownerApproach'),d=$('ownerDeliver'),sv=$('ownerSave');
 if(v)v.disabled=w.clearance||w.beacon.open;
 if(d)d.disabled=!w.clearance||w.beacon.open;
 if(sv)sv.disabled=false;
 if(w.beacon.open&&!seen){seen=true;setStatus('DING · Relay physically delivered, beacon lit, gate open. SAVE your earned world state.')}
}
function init(){
 const app=$('app');if(!app)return;
 document.title='JM Guardian / Courier — Offline Owner Contact v0.6';
 const h=document.querySelector('header h1');if(h)h.textContent='GUARDIAN // COURIER';
 const byline=document.querySelector('header .mini');if(byline)byline.textContent='v0.6 · OWNER CONTACT / OFFLINE';
 const lead=document.querySelector('.sub');if(lead)lead.textContent='An actual Forge-powered world game. Contact Guardian, escort Courier, move the relay core, and light the beacon. Your source model stays yours.';
 const dock=document.createElement('div');dock.id='jmOwnerDock';
 stepper=document.createElement('div');stepper.id='jmOwnerStage';stepper.textContent='1 · LOAD YOUR FORGE PACKET';dock.append(stepper);
 const actions=document.createElement('div');actions.id='jmOwnerActions';dock.append(actions);
 actions.append(button('ownerImport','LOAD FORGE',()=>{$('import').click()},true),
  button('ownerApproach','GUARDIAN APPROACH',()=>window.JMForgeDualActor.approach(),true),
  button('ownerDeliver','COURIER DELIVER',()=>window.JMForgeWorld.startDelivery(),true),
  button('ownerSave','SAVE WORLD',save),
  button('ownerLoad','LOAD WORLD',()=>importFile.click()));
 status=document.createElement('div');status.id='jmOwnerStatus';status.setAttribute('role','status');
 status.textContent='Import your existing JM Field/Form Forge game packet; no private mesh is preloaded.';dock.append(status);
 app.querySelector('main')?.before(dock);
 importFile=document.createElement('input');importFile.type='file';importFile.id='jmOwnerImportState';
 importFile.accept='.json,application/json';importFile.hidden=true;dock.append(importFile);
 importFile.addEventListener('change',async()=>{
  if(importing)return;importing=true;
  try{const f=importFile.files?.[0];if(!f)return;
   if(f.size>200000)throw Error('Checkpoint larger than 200 KB: refusing untrusted file.');
   load(JSON.parse(await f.text()));
  }catch(e){setStatus('CHECKPOINT HOLD · '+e.message,true)}
  finally{importing=false;importFile.value=''}
 });
 const aside=app.querySelector('aside');if(aside){
  const advanced=document.createElement('details');advanced.id='jmOwnerAdvanced';
  const sum=document.createElement('summary');sum.textContent='TOOLS · ORIGINAL CONTROLS · SOURCE EVIDENCE';
  advanced.append(sum);while(aside.firstChild)advanced.append(aside.firstChild);aside.append(advanced);
 }
 window.setInterval(refresh,175);
 if(got())onLoaded();refresh();
}
const css=document.createElement('style');
css.textContent='#app{max-width:1080px}#jmOwnerDock{background:linear-gradient(105deg,#122a3b,#192436);border:1px solid #627b88;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:7px}#jmOwnerStage{letter-spacing:.13em;color:#d7f5dc;font-size:12px;font-weight:900}#jmOwnerActions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}#jmOwnerActions button{min-height:45px;font-size:11px;padding:6px 4px}#jmOwnerActions .owner-primary{border-color:#baad71;background:#3e3924;color:#ffe2a1}#jmOwnerStatus{font-size:12px;min-height:16px;color:#bdebd3}#jmOwnerAdvanced>summary{cursor:pointer;list-style:auto;padding:11px;color:#a9d7ee;font-size:11px;font-weight:800;letter-spacing:.09em}#jmOwnerAdvanced>section{margin:7px 0}.stage{height:min(61dvh,620px);min-height:350px}aside{display:block}#jmOwnerAdvanced{border:1px solid #3e6075;border-radius:13px;background:#0c1928;padding:5px}@media(max-width:700px){#jmOwnerActions{grid-template-columns:repeat(3,minmax(0,1fr))}#jmOwnerActions button{min-height:46px}.stage{height:52dvh;min-height:315px}#app{padding:8px;gap:7px}header h1{font-size:clamp(23px,7vw,32px)}.hud{top:6px;left:6px;right:6px}.foot{bottom:5px}}';
document.head.append(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
