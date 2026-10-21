import {installJMActualRenderer} from './jm-actual-renderer-organ.mjs';
import {buildJMSpatialRoom} from './gameforge-spatial-grammar.mjs';
import {GameForgeEncounter} from './gameforge-encounter.mjs';
import {installGameForgeSpatialView} from './gameforge-spatial-view.mjs';
import {GameForgeSpaces,installGameForgeSpaces} from './gameforge-spaces.mjs';
// Exact recovered GameForge source remains in its existing lossless transport.
// This module is a receiving adapter, not a second renderer or engine.
export const GAMEFORGE_DONOR_SHA256='a2d814c947a80cd00d9bfae7086e004179c8d3b6c9876a922a4b3e8b3b2d2adb';
const base=new URL('../../estate-publication/apps-tools-games/games-engines/source-authorities/gameforge-v3.16/transport/',import.meta.url);
const encode=value=>JSON.stringify(value).replaceAll('<','\\u003c');
async function hash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function loadGameForgeDonor(request=fetch){
  const get=async path=>{const r=await request(new URL(path,base));if(!r.ok)throw Error('GAMEFORGE_SOURCE_HTTP_'+r.status);return r.text()};
  const manifest=JSON.parse(await get('MANIFEST.json'));
  if(manifest.authority?.raw_sha256!==GAMEFORGE_DONOR_SHA256||manifest.transport?.chunk_count!==7)throw Error('GAMEFORGE_AUTHORITY_HOLD');
  const chunks=await Promise.all(manifest.transport.ordered_chunks.map(async (part,i)=>{
    if(part.name!=='source.html.gz.b64.part'+String(i+1).padStart(3,'0'))throw Error('GAMEFORGE_PART_PATH_HOLD');
    const value=await get(part.name);
    if(await hash(new TextEncoder().encode(value))!==part.sha256)throw Error('GAMEFORGE_PART_HASH_HOLD');
    return value;
  }));
  const compressed=Uint8Array.from(atob(chunks.join('')),c=>c.charCodeAt(0));
  const bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if(bytes.length!==manifest.authority.raw_bytes||await hash(bytes)!==GAMEFORGE_DONOR_SHA256)throw Error('GAMEFORGE_SOURCE_HASH_HOLD');
  return new TextDecoder().decode(bytes);
}
async function bootWorld(){
  const config=JSON.parse(document.getElementById('jm-world-boot').textContent);
  const world=config.world;
  // Deliberately use the donor's real start/apply and native draw/physics loop.
  GF.applyBody(world.body,false);
  const nativeStart=GFUX.start.bind(GFUX);
  GFUX.start=function(restart=false){nativeStart(restart);
  GF.hazards=Array.from({length:world.hazards},(_,i)=>({x:260+i*58,y:150+(i%3)*120,r:20+i%3*3,type:world.body==='burning'?(i%2?'boost':'heat'):world.body==='humanimals'?'spirit':i%2?'mud':'bounce'}));
  GF.coreObj.x=world.targetX;GF.coreObj.y=285;
  };
  GFUX.start(false);
  let paused=false;
  const originalStep=GF.step.bind(GF);GF.step=function(){if(!paused)originalStep()};
  let connected=null;
  const read=()=>({schema:'jm.gameforge.world-snapshot/1',body:GF.body.id,p1:GF.p1,p2:GF.p2,energy:GF.energyVal,chain:GF.chain,round:GF.round,meter:GF.stateMeter,pActive:GF.pActive,rActive:GF.rActive,
    player:{x:GF.player.x,y:GF.player.y,r:GF.player.r,vx:GF.player.vx,vy:GF.player.vy},core:{x:GF.coreObj.x,y:GF.coreObj.y,r:GF.coreObj.r},hazards:GF.hazards.map(h=>({x:h.x,y:h.y,r:h.r,type:h.type})),
    run:Object.fromEntries(['heat','instinct','spiritCaptures','powerUses','peakHeat','won','completed','resourceReady','lastSpiritAt'].map(k=>[k,GFPLAY.run[k]]))});
  const restoreArena=s=>{
    GF.p1=s.p1;GF.p2=s.p2;GF.energyVal=s.energy;GF.chain=s.chain;GF.round=s.round;GF.stateMeter=s.meter;GF.pActive=s.pActive;GF.rActive=s.rActive;
    Object.assign(GF.player,s.player);Object.assign(GF.coreObj,s.core);GF.hazards=s.hazards.map(h=>({...h}));Object.assign(GFPLAY.run,s.run);
  };
  if(world.spaces){
    connected=await window.JMInstallGameForgeSpaces({GF,GFUX,GFPLAY,world,token:config.token,initialSnapshot:config.snapshot,readArena:read,restoreArena,nativeStep:originalStep,isPaused:()=>paused,resume:()=>paused=false,pause:()=>paused=true},window.JMGameForgeSpaces,window.JMInstallSpatialView,window.JMInstallActualRenderer);
  }else if(config.snapshot){restoreArena(config.snapshot);paused=true;}
  const readSnapshot=()=>connected?connected.capture():read();
  GF.fx=[];GFPLAY.particles=[];GF.flash=0;GF.renderCrew();GF.updateBg();GF.update();
  const pixel=()=>{GF.draw();const p=GF.ctx.getImageData(0,0,GF.cv.width,GF.cv.height).data;let h=2166136261,painted=0;for(let i=0;i<p.length;i++){h=Math.imul(h^p[i],16777619);if(i%4===3&&p[i])painted++}return {digest:(h>>>0).toString(16),painted,width:GF.cv.width,height:GF.cv.height}};
  const reply=(kind,id)=>parent.postMessage({type:'jm.gameforge.world.return/1',token:config.token,kind,id,world,snapshot:readSnapshot(),pixels:pixel()},'*');
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.data?.token!==config.token||event.data?.type!=='jm.gameforge.world.capture/1')return;
    if(!connected&&(GF.turn!=='P1'||GFPLAY.rivalBusy||GF.winner)){parent.postMessage({type:'jm.gameforge.world.return/1',token:config.token,kind:'hold',id:event.data.id,error:'WORLD_SAVE_REQUIRES_SETTLED_LIVE_P1'},'*');return}
    paused=true;reply('snapshot',event.data.id);
  });
  document.addEventListener('pointerdown',()=>{paused=false},{capture:true});
  // Expose a read-only proof view, not an alternate game-state authority.
  window.JMConnectedWorldReadback=()=>connected?.read()||null;
  window.JMRenderedWorldReadback=()=>({world,snapshot:readSnapshot(),pixels:pixel(),paused,spatial:connected?.read()||null});
  if(!connected)document.getElementById('jm-world-title').textContent=GFUX.info().game;
  requestAnimationFrame(()=>requestAnimationFrame(()=>reply('rendered','boot')));
}
export function validateArenaSnapshot(s,world){
  const scan=v=>{if(v&&typeof v==='object')for(const [key,value] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(key))throw Error('WORLD_UNSAFE_KEY_HOLD');scan(value)}};scan(s);
  const finite=(n,lo,hi)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
  if(!s||s.schema!=='jm.gameforge.world-snapshot/1'||s.body!==world.body||!Array.isArray(s.hazards)||s.hazards.length!==world.hazards)throw Error('WORLD_SNAPSHOT_SCHEMA_HOLD');
  for(const key of ['p1','p2','energy','chain','round','meter'])if(!finite(s[key],0,100000))throw Error('WORLD_SNAPSHOT_VALUE_HOLD');
  if(!Number.isInteger(s.pActive)||s.pActive<0||s.pActive>3||!Number.isInteger(s.rActive)||s.rActive<0||s.rActive>3)throw Error('WORLD_SNAPSHOT_CREW_HOLD');
  for(const item of [s.player,s.core,...s.hazards]){
    if(!item||!finite(item.x,0,900)||!finite(item.y,0,570)||!finite(item.r,1,100))throw Error('WORLD_SNAPSHOT_GEOMETRY_HOLD');
  }
  if(!finite(s.player.vx,-500,500)||!finite(s.player.vy,-500,500))throw Error('WORLD_SNAPSHOT_VELOCITY_HOLD');
  if(s.hazards.some(h=>!['mud','bounce','heat','boost','spirit'].includes(h.type)))throw Error('WORLD_SNAPSHOT_HAZARD_HOLD');
  if(!s.run||Object.entries(s.run).some(([k,v])=>!['heat','instinct','spiritCaptures','powerUses','peakHeat','won','completed','resourceReady','lastSpiritAt'].includes(k)||(typeof v!=='boolean'&&!finite(v,0,1e15))))throw Error('WORLD_SNAPSHOT_RUN_HOLD');
  return s;
}
export function validateWorldSnapshot(s,world){
  if(!world.spaces)return validateArenaSnapshot(s,world);
  const model=GameForgeSpaces(world);model.validate(s);
  s.rooms.forEach((m,i)=>{if(m.snapshot)validateArenaSnapshot(m.snapshot,model.rooms[i].world)});
  return s;
}
export function readWorldBoot(html){
  const match=html.match(/<script type="application\/json" id="jm-world-boot">([\s\S]*?)<\/script>/);
  if(!match)throw Error('WORLD_BOOT_MISSING');
  const data=JSON.parse(match[1]);
  const w=data.world;
  if(!w||!['tboys','burning','humanimals'].includes(w.body)||!Number.isInteger(w.hazards)||w.hazards<1||w.hazards>8||!Number.isFinite(w.targetX)||w.targetX<500||w.targetX>780||w.entered!==true||typeof data.token!=='string')throw Error('WORLD_BOOT_HOLD');
  if(w.spaces!==undefined&&w.spaces!==3)throw Error('SPACES_SPEC_HOLD');
  if(data.snapshot)validateWorldSnapshot(data.snapshot,w);
  return data;
}
export function withWorldSnapshot(html,snapshot){
  const boot=readWorldBoot(html);validateWorldSnapshot(snapshot,boot.world);boot.snapshot=snapshot;
  return html.replace(/(<script type="application\/json" id="jm-world-boot">)[\s\S]*?(<\/script>)/,(_,a,b)=>a+encode(boot)+b);
}
export function makeGameForgeWorld(donor,world,token){
  // Only trusted, hash-verified donor text is accepted by the caller.
  const style='<style id="jm-world-view">html,body{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important}.app{display:flex!important;flex-direction:column!important;gap:5px!important;padding:6px!important;width:100%!important;max-width:none!important;height:100vh!important;box-sizing:border-box!important}.app>header,.app>.bodyRail,.app>.gameContractBar,.hudForm,.floatHud,.rivalIntentBar,.receipt,.forgePanel,.forgeBackdrop{display:none!important}.arenaWrap{flex:1!important;min-height:180px!important;border-radius:12px!important}canvas{touch-action:none!important;width:100%!important;height:100%!important}.cards{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:4px!important;flex:none!important}.cards button{min-height:46px!important;font-size:11px!important;padding:4px!important}.cards #cRival,.cards #cAuto,#next1PChallenge,#returnGameList,.playStartPanel,.turnGuide{display:none!important}#jm-world-title{margin:0;font:700 14px system-ui;color:#f2d98f}#jm-world-help{font:11px system-ui;margin:0;color:#afc1d0}</style>';
  const storage='<script>window.addEventListener("error",e=>parent.postMessage({type:"jm.gameforge.world.return/1",kind:"hold",id:"boot",token:'+encode(token)+',error:"RENDERER_ERROR:"+e.message},"*"));window.JMWorldStorage=null;if(parent===window){try{window.JMWorldStorage=window.localStorage}catch(e){}}Object.defineProperty(window,"localStorage",{value:(()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}})()});<\/script>';
  const spatial=world.spaces?'<script>window.JMSpatialRoom='+buildJMSpatialRoom.toString()+';window.JMGameForgeEncounter='+GameForgeEncounter.toString()+';window.JMGameForgeSpaces='+GameForgeSpaces.toString()+';window.JMInstallGameForgeSpaces='+installGameForgeSpaces.toString()+';window.JMInstallSpatialView='+installGameForgeSpatialView.toString()+';window.JMInstallActualRenderer='+installJMActualRenderer.toString()+';window.JMValidateArena='+validateArenaSnapshot.toString()+';</script>':'';
  const boot='<script type="application/json" id="jm-world-boot">'+encode({world,token,snapshot:null})+'</script>';
  return donor.replace('</head>',style+storage+'</head>').replace('<div class="app">','<div class="app"><h1 id="jm-world-title">JM resultant world</h1><p id="jm-world-help">Drag backwards on the arena and release. Act / Hit / Core / Hold change the live match.</p>')
    .replace('</body>',spatial+boot+'<script>('+bootWorld.toString()+')().catch(e=>{document.getElementById("jm-world-title").textContent="WORLD HOLD · "+e.message;parent.postMessage({type:"jm.gameforge.world.return/1",token:'+encode(token)+',kind:"hold",id:"boot",error:e.message},"*")});</script></body>');
}
export function waitWorldReturn(frame,token,world,kind='rendered',id='boot',timeout=15000){
  return new Promise((resolve,reject)=>{
    const finish=(error,data)=>{clearTimeout(timer);window.removeEventListener('message',listener);error?reject(error):resolve(data)};
    const listener=event=>{
      const d=event.data;
      if(event.source!==frame.contentWindow||d?.type!=='jm.gameforge.world.return/1'||d.token!==token||d.id!==id)return;
      if(d.kind==='hold'){finish(Error(d.error));return}
      if(d.kind!==kind)return;
      try{
        if(JSON.stringify(d.world)!==JSON.stringify(world)||!d.pixels?.painted||d.pixels.width!==900||(world.spaces?(!Number.isInteger(d.pixels.height)||d.pixels.height<300||d.pixels.height>1800):d.pixels.height!==570))throw Error('WORLD_RENDER_READBACK_HOLD');
        validateWorldSnapshot(d.snapshot,world);finish(null,d);
      }catch(e){finish(e)}
    };
    const timer=setTimeout(()=>finish(Error('WORLD_RENDER_TIMEOUT_HOLD')),timeout);
    window.addEventListener('message',listener);
    if(kind==='snapshot')frame.contentWindow.postMessage({type:'jm.gameforge.world.capture/1',token,id},'*');
  });
}
