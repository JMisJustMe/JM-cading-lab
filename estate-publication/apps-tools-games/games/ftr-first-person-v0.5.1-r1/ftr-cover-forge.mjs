/**
 * JM FTR CP11 — source-owned world-contact cover, a real defensive mechanic.
 * Translates concepts from JM Western Sniper's ORIGINAL WSDestructibleCover.cs
 * (material, health, break/collider retirement) into existing FTR 2D world.
 * It does NOT execute the Unity C# body, replace raycaster or impersonate Gardles.
 * FTR's original world, enemies, projectiles, player, collisions are authoritative.
 */
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime}
 from '../../../../coding-estate/sovereign-ten/direct/game-native.mjs';
if(!window.FTR||typeof window.JMFTRNative?.corePulse!=='function'||
   !window.JMFTRSpatial||typeof window.solid!=='function'||
   typeof window.updateWorld!=='function'||typeof window.drawSprites!=='function')
 throw Error('JM_CP11_NATIVE_FTR_RECIPIENT_ABSENT');

const originalSolid=window.solid;
const originalWorld=window.updateWorld;
const originalDrawSprites=window.drawSprites;
const materials=Object.freeze({
 Timber:Object.freeze({health:36,cost:3,multiplier:1.15,color:'#ad9162'}),
 Stone:Object.freeze({health:54,cost:5,multiplier:.78,color:'#90b2c4'}),
 Metal:Object.freeze({health:75,cost:8,multiplier:.55,color:'#7af2d2'})
});
const donor='games-beyond/generation-packs/unity/JMAdvancedGenerator/Assets/JM/WesternSniper/WSDestructibleCover.cs';
const source=`entity Cover {
 ready = false
 result = "held"
}
mechanic ErectWorldCover {
 requires cover.ready == true
 effect cover.result = "erect"
}`;
const org=`organ CoverOrgan {
 handles = [Cover]
 rules = [ErectWorldCover]
 invariants = {
 cover.result == "erect"
 }
}
system FTRCoverForge {
 organs = [CoverOrgan]
 events = [WorldContact]
 identity = "JM.FTR.CoverForge"
}`;
const gameAst=GameCoding.parse(source);
const coreAst=JMGameCore.parse(org);
let selected='Timber',barrier=null,builds=0,hits=0,breaks=0,last=null;
let sessionIdentity=run.started;
const output=document.getElementById('jmCoverStatus');
const action=document.getElementById('jmCoverBuild');
const materialButton=document.getElementById('jmCoverMaterial');
if(!output||!action||!materialButton)throw Error('JM_CP11_COVER_HUD_MISSING');
const denied=(reason)=>{last={schema:'jm.ftr.cover-contact/0.1',status:'DENIED',reason,donor,
 originalJMCode:'GameCodingRuntime and JMGameCoreRuntime',gardles:'HOLD_SOURCE_NOT_MOUNTED'};
 refresh();return last};
function placement(){
 const x=player.x+Math.cos(player.a)*1.55,y=player.y+Math.sin(player.a)*1.55;
 const cell={x:Math.floor(x),y:Math.floor(y)};
 const center={x:cell.x+.5,y:cell.y+.5};
 if(Math.hypot(center.x-player.x,center.y-player.y)<.91)return null;
 if(!circleFree(center.x,center.y,.4))return null;
 if(terminals.some(t=>Math.hypot(t.x-center.x,t.y-center.y)<.86))return null;
 if(doors.some(d=>Math.hypot(d.x+.5-center.x,d.y+.5-center.y)<1.05))return null;
 if(enemies.some(e=>!e.dead&&Math.hypot(e.x-center.x,e.y-center.y)<.8))return null;
 return center;
}
function routeStillOpen(target){
 // Four-neighbour check against actual collision authority, including this cover.
 if(!target)return true;
 const start={x:Math.floor(player.x),y:Math.floor(player.y)};
 const goal={x:Math.floor(target.x),y:Math.floor(target.y)};
 const key=(x,y)=>x+W*y,visited=new Uint8Array(W*H),queue=[start];
 visited[key(start.x,start.y)]=1;let idx=0;
 while(idx<queue.length){
  const p=queue[idx++];if(p.x===goal.x&&p.y===goal.y)return true;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=p.x+dx,ny=p.y+dy;
   if(nx<0||ny<0||nx>=W||ny>=H)continue;
   const id=key(nx,ny);
   if(visited[id]||solid(nx+.5,ny+.5))continue;
   visited[id]=1;queue.push({x:nx,y:ny});
  }
 }
 return false;
}
function refresh(){
 materialButton.textContent='MATERIAL '+selected.toUpperCase();
 const m=materials[selected],s=window.FTR.state();
 action.textContent=barrier?'COVER DEPLOYED':'BUILD COVER · '+m.cost+' AMMO';\n action.setAttribute('aria-disabled',barrier?'true':'false');
 output.textContent=barrier?
  barrier.kind.toUpperCase()+' · COVER '+Math.ceil(barrier.hp)+'/'+barrier.maxHp+' · '+barrier.ttl.toFixed(1)+'s'
  :s.running?'COVER READY · '+(2-builds)+' BUILDS LEFT':'COVER STANDBY';
}
function build(){
 const s=window.FTR.state(),kind=selected,mat=materials[kind];
 const pos=placement();
 const reason=!s.running?'GAME_NOT_RUNNING':s.player.cores<1?'TRACE_CORE_REQUIRED':
  barrier?'COVER_ALREADY_ACTIVE':builds>=2?'BUILD_LIMIT_REACHED':
  s.player.ammo<mat.cost?'AMMO_REQUIRED':s.player.reload>0?'RELOADING':
  !pos?'PLACEMENT_BLOCKED':null;
 const engine=new GameCodingRuntime(gameAst,{cover:{ready:!reason,result:'held'}});
 const jm=new JMGameCoreRuntime(coreAst,engine);
 if(reason){const gate=engine.trigger('ErectWorldCover');if(gate.applied)throw Error('JM_COVER_NATIVE_BAD_REFUSAL');return denied(reason)}
 const dispatch=jm.dispatch('FTRCoverForge','WorldContact');
 if(dispatch.executions.length!==1||!dispatch.executions[0].applied)throw Error('JM_COVER_NATIVE_NOT_AUTHORISED');
 const previous=barrier,ammo=player.ammo;
 barrier={x:pos.x,y:pos.y,kind,hp:mat.health,maxHp:mat.health,ttl:12,placedAt:time};
 const target=terminals.find(t=>!t.active);
 // Never convert an already open core route into an impossible one.
 if(target && !routeStillOpen(target)){
  barrier=previous;return denied('ORIGINAL_CORE_ROUTE_WOULD_BE_BLOCKED');
 }
 player.ammo-=mat.cost;
 if(player.ammo<0){barrier=previous;player.ammo=ammo;throw Error('JM_COVER_NEGATIVE_AMMO')}
 builds++;event('JM_COVER_BUILT',{material:kind,x:pos.x,y:pos.y,cost:mat.cost});
 sound('door');updateHUD();refresh();
 last={schema:'jm.ftr.cover-contact/0.1',status:'BUILT',kind,position:pos,
  ammoBefore:ammo,ammoAfter:player.ammo,originalWorldAuthority:true,
  nativeIdentity:dispatch.identity,traceDigest:dispatch.receipt.traceDigest,
  donor,gardles:'HOLD_SOURCE_NOT_MOUNTED'};
 return last;
}
function remove(reason){
 if(!barrier)return;
 const old=barrier;barrier=null;
 if(reason==='DAMAGE')breaks++;
 event('JM_COVER_RETIRED',{reason,kind:old.kind,x:old.x,y:old.y});
 spawnImpact(old.x,old.y,materials[old.kind].color,8);
 refresh();
}
function applyHit(amount){
 if(!barrier)return false;
 const before=barrier.hp,mat=materials[barrier.kind];
 barrier.hp=Math.max(0,barrier.hp-Math.max(0,amount)*mat.multiplier);
 hits++;
 event('JM_COVER_HIT',{material:barrier.kind,damage:+(before-barrier.hp).toFixed(2)});
 if(barrier.hp<=0)remove('DAMAGE');
 return true;
}
window.solid=function(x,y){
 if(barrier&&Math.hypot(x-barrier.x,y-barrier.y)<.38)return true;
 return originalSolid(x,y);
};
window.updateWorld=function(dt){
 // The original start() resets the global run receipt before the next frame.
 // Detect it without modifying or wrapping original source, and retire all
 // purpose-specific constructs/counters before fresh-session gameplay resumes.
 if(run.started!==sessionIdentity){
  barrier=null;builds=0;hits=0;breaks=0;last=null;
  sessionIdentity=run.started;refresh();
 }
 if(!running&&barrier){remove('SESSION_ENDED');}
 if(running&&barrier){
  barrier.ttl-=dt;
  if(barrier.ttl<=0)remove('TIMEOUT');
  if(barrier){
   for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i],nextX=p.x+p.vx*dt,nextY=p.y+p.vy*dt;
    if(Math.hypot(nextX-barrier.x,nextY-barrier.y)<.48){
     projectiles.splice(i,1);applyHit(18);
    }
   }
  }
 }
 return originalWorld(dt);
};
function drawBarrier(){
 if(!barrier)return;
 const p=projectSprite(barrier.x,barrier.y,.55);
 if(!p||!visibleAt(p)||p.dist>14)return;
 const w=Math.min(240,p.size*.65),h=Math.min(140,p.size*.44);
 // Ground the base of the shield on the original FTR projected floor,\n // not in the air over the world horizon.\n const x=p.x,y=p.y+p.size*.92,mat=materials[barrier.kind];
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='rgba(3,15,22,.91)';ctx.strokeStyle=mat.color;ctx.lineWidth=Math.max(1,w*.013);
 ctx.beginPath();ctx.roundRect(-w/2,-h,w,h,Math.max(2,w*.06));ctx.fill();ctx.stroke();
 if(barrier.kind==='Timber'){
  ctx.strokeStyle='#bba383';ctx.lineWidth=2;
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(-w*.46,-h+i*h/4);ctx.lineTo(w*.46,-h+i*h/4);ctx.stroke()}
 }else if(barrier.kind==='Stone'){
  ctx.strokeStyle='#7897a7';ctx.lineWidth=2;
  for(let i=0;i<3;i++){ctx.strokeRect(-w*.46+i*w*.31,-h*.92,w*.28,h*.45);ctx.strokeRect(-w*.31+i*w*.31,-h*.44,w*.28,h*.4)}
 }else{
  ctx.fillStyle='#3b6a6c';ctx.fillRect(-w*.43,-h*.83,w*.86,h*.10);
  ctx.fillRect(-w*.43,-h*.28,w*.86,h*.1);
  ctx.fillStyle='#7af2d2';ctx.fillRect(-w*.05,-h*.65,w*.1,h*.55);
 }
 ctx.fillStyle='#ffffff';ctx.globalAlpha=.7;
 ctx.fillRect(-w*.43,-h*.13,(w*.86)*(barrier.hp/barrier.maxHp),Math.max(2,h*.04));
 ctx.restore();
}
window.drawSprites=function(){originalDrawSprites();drawBarrier()};
window.JMFTRCover=Object.freeze({
 schema:'jm.ftr.cover-forge/0.1',materials:Object.keys(materials),donor,
 select:kind=>{if(!materials[kind])throw Error('JM_COVER_MATERIAL_UNKNOWN');selected=kind;refresh();return kind},
 build,hit:applyHit,state:()=>({builds,hits,breaks,active:barrier?{...barrier}:null,selected}),
 last:()=>last,authoritative:true,realFTRCollision:true,gardles:'HOLD_SOURCE_NOT_MOUNTED'
});
materialButton.addEventListener('click',()=>{
 const all=Object.keys(materials);selected=all[(all.indexOf(selected)+1)%all.length];refresh();
});
action.addEventListener('click',build);
window.addEventListener('keydown',e=>{
 if(e.code==='KeyB'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();build()}
 if(e.code==='KeyN'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();materialButton.click()}
});
setInterval(refresh,350);
refresh();
