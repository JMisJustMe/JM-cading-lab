/* JM RouteOS ↔ Apps & Tools native-state adapter v0.1
 * Runs original RouteOS cartridge save vault AND existing JMAppsToolsSpine packet bus.
 * Does not alter native game logic, inputs, cartridge source or native save semantics.
 * This adapter transfers only compatible, actual saved first-party cartridge states.
 */
(()=>{
'use strict';
if(window.JMRouteOSNativeBridge)return;
const OS_KEY='JM_ROUTEOS_PUBLIC_RUNTIME_v0_8';
const BUS_KEY='jm.apps.tools.shared.bus.v1';
const BRIDGE='JM.RouteOSNativePacketBridge/0.1';
const PACKET_KIND='routeos.native-cartridge-save';
const BUNDLE='jm.routeos.native-state-transfer/1.0';
const KINDS=new Set(['pulse-orbit','seed-runner','rebound-route']);
const small=(s,n=80)=>typeof s==='string'&&s.length>0&&s.length<=n;
const object=o=>o&&typeof o==='object'&&!Array.isArray(o);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const coord=p=>object(p)&&finite(p.x)&&finite(p.y)&&Math.abs(p.x)<=100000&&Math.abs(p.y)<=100000;
const copy=o=>JSON.parse(JSON.stringify(o));
const spine=()=>{if(!window.JMAppsToolsSpine)throw Error('Existing JM shared packet spine is unavailable');return window.JMAppsToolsSpine};
function osRead(){
 const raw=localStorage.getItem(OS_KEY);
 if(!raw)throw Error('RouteOS native vault not initialised');
 const os=JSON.parse(raw);
 if(!object(os)||!object(os.saves)||!Array.isArray(os.players)||!Array.isArray(os.receipts)||os.version!=='0.8.2')
  throw Error('RouteOS native vault shape/version mismatch; no changes made');
 return os;
}
function validateSave(s){
 if(!object(s)||s.recordType!=='JMConsoleCartridgeSave'||!KINDS.has(s.cartridgeId)||!small(s.playerId,40)||
  !small(s.title,140)||!small(s.savedAt,60)||!object(s.state)||s.state.id!==s.cartridgeId||
  s.namespace!==('routeos.'+s.cartridgeId+'.'+s.playerId))
  throw Error('Invalid or unsupported native RouteOS cartridge save');
 const g=s.state;
 if(!finite(g.score)||!finite(g.energy)||!finite(g.time)||!coord(g.player))
  throw Error('Native RouteOS saved game state is incomplete');
 if(s.cartridgeId==='seed-runner'&&(!Array.isArray(g.seeds)||!Array.isArray(g.hazards)||g.seeds.length>128||g.hazards.length>128||!coord(g.goal)))
  throw Error('Seed Runner save shape refused');
 if(s.cartridgeId==='pulse-orbit'&&(!coord(g.pulse)||!coord(g.target)||!finite(g.shots)))
  throw Error('Pulse Orbit save shape refused');
 if(s.cartridgeId==='rebound-route'&&(!Array.isArray(g.shots)||!Array.isArray(g.enemies)||g.shots.length>512||g.enemies.length>128||!finite(g.room)||!coord(g.goal)))
  throw Error('Rebound Route save shape refused');
 const serialized=JSON.stringify(s);
 if(serialized.length>100000)throw Error('Native RouteOS save exceeds 100 KB per cartridge');
 return true;
}
function saveList(){
 const os=osRead();return Object.values(os.saves).filter(s=>{
  try{validateSave(s);return true}catch{return false}
 }).map(s=>({cartridgeId:s.cartridgeId,title:s.title,playerId:s.playerId,savedAt:s.savedAt}));
}
function validatePacket(p){
 if(!object(p)||p.schema!=='jm.packet/1.0'||p.kind!==PACKET_KIND||
  !small(p.id,128)||p.source!=='JM.RouteOS/v0.8.2'||!object(p.meta)||p.meta.bridge!==BRIDGE||
  !object(p.payload)||!object(p.payload.save)||!object(p.payload.player))
  throw Error('Unsupported or untrusted RouteOS transfer packet');
 validateSave(p.payload.save);
 const player=p.payload.player;
 if(player.id!==p.payload.save.playerId||!small(player.name,24))throw Error('Packet player identity mismatch');
 return true;
}
function publish(cartridgeId){
 const native=osRead(),s=native.saves[cartridgeId];
 if(!s)throw Error('Save in the existing RouteOS vault first');
 validateSave(s);
 const bus=spine();if(bus.read().length>=250)throw Error('Shared packet bus full; export existing bus before proceeding');
 const player=native.players.find(p=>p.id===s.playerId);
 if(!player||!small(player.name,24))throw Error('Native player record missing');
 const p={
  schema:'jm.packet/1.0',id:bus.uid('JMROUTE'),
  created_at:bus.now(),kind:PACKET_KIND,source:'JM.RouteOS/v0.8.2',
  payload:{save:copy(s),player:{id:player.id,name:player.name}},
  meta:{bridge:BRIDGE,authority:'RouteOS native save vault',recipient:'RouteOS v0.8.2',origin:location.origin,execution:'NATIVE_SAVE_CAPTURED_NOT_OTHER_DEVICE_PROVEN'}
 };
 validatePacket(p);
 bus.send(p);
 return {packetId:p.id,cartridgeId:s.cartridgeId,namespace:s.namespace};
}
function inbox(){return spine().read().filter(p=>{try{return validatePacket(p)}catch{return false}})}
function restore(packetId){
 const p=inbox().find(x=>x.id===packetId);
 if(!p)throw Error('Packet not found in the existing JM bus');
 const s=p.payload.save,native=osRead(),current=native.saves[s.cartridgeId];
 if(current){
  if(JSON.stringify(current)===JSON.stringify(s))return {status:'ALREADY_PRESENT',namespace:s.namespace};
  throw Error('HOLD: destination has a different save for '+s.cartridgeId+'; no overwrite allowed');
 }
 const prior=native.players.find(x=>x.id===p.payload.player.id);
 if(prior&&prior.name!==p.payload.player.name)throw Error('HOLD: player identity conflicts with existing profile');
 if(!prior)native.players.push(copy(p.payload.player));
 native.saves[s.cartridgeId]=copy(s);
 native.receipts.unshift({
  id:'JM-BRIDGE-'+Date.now().toString(36),time:new Date().toISOString(),type:'BRIDGE_IMPORT',
  text:'Native RouteOS cartridge save transferred from JM packet bus; reload required',
  extra:{cartridgeId:s.cartridgeId,namespace:s.namespace,packetId:p.id,proof:'LOCAL_STORAGE_RESTORED_ONLY'}
 });
 native.receipts=native.receipts.slice(0,120);
 localStorage.setItem(OS_KEY,JSON.stringify(native));
 return {status:'NATIVE_SAVE_RESTORED_RELOAD_REQUIRED',namespace:s.namespace};
}
function exportBundle(){
 const selected=inbox();
 return {schema:BUNDLE,source:'JM.RouteOS/v0.8.2',exportedAt:new Date().toISOString(),packets:copy(selected)};
}
function importBundle(data){
 if(!object(data)||data.schema!==BUNDLE||!Array.isArray(data.packets)||data.packets.length>50)
  throw Error('Not a JM RouteOS native-state packet transfer');
 const existing=spine().read(),ids=new Set(existing.map(x=>x.id)),incoming=[];
 for(const p of data.packets){
  validatePacket(p);
  if(ids.has(p.id))continue;
  ids.add(p.id);incoming.push(copy(p));
 }
 if(existing.length+incoming.length>250)throw Error('Shared bus capacity HOLD; all existing packets preserved');
 for(const p of incoming)spine().send(p);
 return {imported:incoming.length,duplicates:data.packets.length-incoming.length};
}
const api={schema:BRIDGE,osRead,saveList,publish,inbox,restore,exportBundle,importBundle,validateSave,validatePacket};
Object.defineProperty(window,'JMRouteOSNativeBridge',{value:api,configurable:false});
function mount(){
 const vault=document.querySelector('#screen-vault .grid');
 if(!vault)return;
 const section=document.createElement('section');section.className='card';
 const title=document.createElement('h2');title.textContent='JM Native Save ↔ Estate Packet';section.append(title);
 const info=document.createElement('p');
 info.textContent='Uses the existing RouteOS SAVE and LOAD and the real JM Apps & Tools packet bus. Manual file transfer for other devices; never overwrites an existing save.';
 section.append(info);
 const actions=document.createElement('div');actions.className='actions';section.append(actions);
 const addButton=(name,handler)=>{const el=document.createElement('button');el.type='button';el.className='btn cyan';el.textContent=name;el.onclick=handler;actions.append(el);return el};
 const status=document.createElement('p');status.setAttribute('role','status');section.append(status);
 const write=(msg,bad=false)=>{status.textContent=msg;status.style.color=bad?'#ff879f':'#89f0ad'};
 const listing=document.createElement('div');listing.className='list';section.append(listing);
 const safeRun=fn=>{try{fn();refresh()}catch(e){write(String(e.message),true)}};
 addButton('EXPORT ROUTEOS PACKETS (.JSON)',()=>safeRun(()=>{
   const b=exportBundle();spine().download('JM_ROUTEOS_NATIVE_TRANSFER.json',b);write(b.packets.length+' native save packet(s) prepared for device transfer.');
 }));
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;section.append(input);
 addButton('IMPORT PHONE / LAPTOP FILE',()=>input.click());
 input.onchange=async()=>{try{
   const f=input.files?.[0];if(!f)return;
   if(f.size>1500000)throw Error('Transfer exceeds 1.5 MB limit');
   const result=importBundle(JSON.parse(await f.text()));write('Imported '+result.imported+' packet(s). Choose RESTORE below.');refresh();
 }catch(e){write(String(e.message),true)}finally{input.value=''}};
 addButton('RELOAD TO USE RESTORED SAVES',()=>location.reload());
 function refresh(){
  listing.replaceChildren();
  const h=document.createElement('h3');h.textContent='Existing native saves — send into JM bus';listing.append(h);
  try{
   const saves=saveList();
   if(!saves.length){const p=document.createElement('p');p.textContent='Save a live cartridge with the original RouteOS SAVE button first.';listing.append(p)}
   for(const s of saves){const row=document.createElement('div');row.className='row';const b=document.createElement('b');b.textContent=s.title+' · '+s.namespace;row.append(b);
    const btn=document.createElement('button');btn.type='button';btn.className='btn green';btn.textContent='SEND NATIVE SAVE';btn.onclick=()=>safeRun(()=>{const result=publish(s.cartridgeId);write('Published actual '+result.namespace+' to the existing JM packet bus')});row.append(btn);listing.append(row)}
  }catch(e){write('Native vault not ready: '+e.message,true)}
  const h2=document.createElement('h3');h2.textContent='Incoming native save packets — restore into RouteOS';listing.append(h2);
  try{
   const packets=inbox();if(!packets.length){const p=document.createElement('p');p.textContent='No RouteOS native state packets currently in the shared bus.';listing.append(p)}
   for(const p of packets.slice(0,30)){const row=document.createElement('div');row.className='row';const b=document.createElement('b');
    b.textContent=p.payload.save.title+' · '+p.payload.save.namespace;row.append(b);
    const btn=document.createElement('button');btn.type='button';btn.className='btn gold';btn.textContent='RESTORE INTO NATIVE VAULT';
    btn.onclick=()=>safeRun(()=>{const result=restore(p.id);write(result.status+' · '+result.namespace);});
    row.append(btn);listing.append(row)}
  }catch(e){write('Shared bus unavailable: '+e.message,true)}
 }
 vault.append(section);
 const nav=document.querySelector('[data-screen="vault"]');
 nav?.addEventListener('click',()=>setTimeout(refresh,0));
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();