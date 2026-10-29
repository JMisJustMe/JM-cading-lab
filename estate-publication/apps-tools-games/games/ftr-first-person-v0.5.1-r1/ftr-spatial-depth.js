/* JM FTR CP10 — source-adjacent SPATIAL FIELD candidate.
 * Original FTR raycast, sprite loop, collision, map, AI, score and controls
 * remain the authority. This organ adds perspective-correct world-linked floor
 * material + real scan-bearing/line-of-sight signals. It does not invent a
 * duplicate engine, Gardles, GPU shader or collidable new geometry.
 * Baseline: CP09 SHA 110c315d0a50e839ecfd8a60f82dd8fbb662b9b3.
 */
(function(){
'use strict';
if(typeof raycast!=='function'||typeof drawSprites!=='function'||
   typeof tileAt!=='function'||typeof los!=='function'||
   !Array.isArray(terminals)||!Array.isArray(enemies))throw Error('JM_FTR_CP10_ORIGINAL_WORLD_NOT_FOUND');
const originalRaycast=raycast, originalSprites=drawSprites;
const palette=[
 '#071219','#081a20','#0b2026','#0c272d','#0d2b31',
 '#112c31','#143138','#163941','#1a4248','#1c4b4d',
 '#204c4c','#285354','#2f595a','#3c6262'
];
const metrics={renderSamples:0,renderMs:0,lastMs:0,maxMs:0,floorSamples:0,visualFrameCount:0};
let enabled=true,quality='balanced',lastEcho=null,worldFloorDigest=0;
function nearestCore(){
 const target=terminals.filter(t=>!t.active).sort((a,b)=>
  Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
 if(!target)return {state:'ALL_CORES_MOUNTED',range:0,visible:true,id:null};
 const dx=target.x-player.x,dy=target.y-player.y;
 const distance=Math.hypot(dx,dy),angle=wrapAngle(Math.atan2(dy,dx)-player.a);
 return {state:los(player.x,player.y,target.x,target.y)?'CLEAR':'OBSTRUCTED',
  id:target.id,range:+distance.toFixed(1),bearing:+(angle*180/Math.PI).toFixed(1),
  visible:Math.abs(angle)<Math.PI*.195,world:{x:target.x,y:target.y}};
}
function routeCore(){
 // Real 4-neighbour route across the ORIGINAL live FTR collision map, with
 // dynamically opening original doors. Never assume a route through locked cells.
 const target=nearestCore();
 if(!target.id)return {status:'ALL_CORES_MOUNTED',steps:0,path:[]};
 const start={x:Math.floor(player.x),y:Math.floor(player.y)};
 const goal={x:Math.floor(target.world.x),y:Math.floor(target.world.y)};
 const width=W,height=H;
 const valid=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&tileAt(x+.5,y+.5)==='.';
 if(!valid(start.x,start.y))return {status:'PLAYER_TILE_BLOCKED',steps:null,path:[]};
 if(!valid(goal.x,goal.y))return {status:'CORE_TILE_BLOCKED',steps:null,path:[]};
 const id=(x,y)=>y*width+x;
 const visited=new Int32Array(width*height).fill(-1);
 const queue=[start];visited[id(start.x,start.y)]=id(start.x,start.y);
 let at=0,found=false;
 while(at<queue.length){
  const cur=queue[at++];
  if(cur.x===goal.x&&cur.y===goal.y){found=true;break}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=cur.x+dx,y=cur.y+dy;
   if(!valid(x,y))continue;
   const k=id(x,y);if(visited[k]!==-1)continue;
   visited[k]=id(cur.x,cur.y);queue.push({x,y});
  }
 }
 if(!found)return {status:'NO_TRAVERSABLE_ROUTE',steps:null,path:[],target:target.id};
 const path=[];let k=id(goal.x,goal.y),limit=width*height;
 while(limit-->0){
  path.push({x:k%width,y:Math.floor(k/width)});
  if(visited[k]===k)break;
  k=visited[k];if(k<0)throw Error('JM_FTR_CP10_ROUTE_TRACE_BROKEN');
 }
 path.reverse();
 const first=path[1]||path[0];
 const bearing=wrapAngle(Math.atan2(first.y+.5-player.y,first.x+.5-player.x)-player.a);
 return {status:'ROUTE_FOUND',target:target.id,steps:path.length-1,path,
  next:{x:first.x+.5,y:first.y+.5},bearingDegrees:+(bearing*180/Math.PI).toFixed(1)};
}
function sampleFloor(){
 // CP10 refinement: preserve the original FTR floor as the *material*.
 // Only overlay sparse world-coordinate structural seams and scan responses;
 // never replace it with a solid, blocky flat-texture carpet.
 const horizon=rh*.43-player.pitch*rh*.58+Math.sin(player.bob)*1.8;
 const scale=quality==='detail'?3:quality==='balanced'?4:6;
 const FOV=Math.PI*.39, half=FOV*.5;
 const pending=terminals.find(t=>!t.active);
 let cells=0,hash=2166136261;
 ctx.save();
 for(let y=Math.max(0,Math.ceil(horizon+4));y<rh;y+=scale){
  const baseDistance=(rh*.50)/(y-horizon);
  if(baseDistance>22)continue;
  for(let x=0;x<rw;x+=scale){
   const a=player.a-half+((x+scale*.5)/rw)*FOV;
   const distance=baseDistance/Math.max(.78,Math.cos(a-player.a));
   if(distance>zBuffer[Math.min(rw-1,x)]-.10)continue;
   const wx=player.x+Math.cos(a)*distance,wy=player.y+Math.sin(a)*distance;
   if(tileAt(wx,wy)!=='.')continue;
   const gx=wx-Math.floor(wx),gy=wy-Math.floor(wy);
   const seam=Math.min(gx,1-gx,gy,1-gy)<.031;
   const corner=Math.min(gx,1-gx)<.09&&Math.min(gy,1-gy)<.09;
   const coreDistance=pending?Math.hypot(wx-pending.x,wy-pending.y):100;
   const coreField=player.scan>0&&coreDistance<1.15&&
     Math.abs(Math.sin(coreDistance*6-time*5))>.86;
   if(!seam&&!corner&&!coreField)continue;
   const attenuation=Math.max(0,1-distance/22);
   const lit=seam?8:corner?10:12;
   const shade=Math.min(palette.length-1,Math.round(lit+attenuation*2));
   ctx.globalAlpha=(coreField?.25:seam?.18:.12)*attenuation;
   ctx.fillStyle=palette[shade];ctx.fillRect(x,y,scale+.1,scale+.1);
   cells++;
   hash=(Math.imul(hash,16777619)^(shade+x*3+y*5))>>>0;
  }
 }
 ctx.restore();
 metrics.floorSamples=cells;
 worldFloorDigest=hash;
}

function drawRouteMarks(){
 const route=routeCore();
 if(route.status!=='ROUTE_FOUND')return;
 ctx.save();
 for(let i=1;i<route.path.length;i+=Math.max(1,Math.floor(route.path.length/14))){
  const node=route.path[i],p=projectSprite(node.x+.5,node.y+.5,.1);
  if(!p||!visibleAt(p)||p.dist>12)continue;
  const size=Math.max(2,Math.min(9,p.size*.018));
  ctx.fillStyle='rgba(129,239,211,.45)';
  ctx.beginPath();ctx.moveTo(p.x,p.y+p.size*.42-size);
  ctx.lineTo(p.x+size,p.y+p.size*.42);
  ctx.lineTo(p.x,p.y+p.size*.42+size);
  ctx.lineTo(p.x-size,p.y+p.size*.42);
  ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
function markWorldSignals(){
 // Only when the original SCAN is active; terminal target selection,
 // visibility and blocked sight derive from original game-world state.
 if(player.scan<=0)return;
 drawRouteMarks();
 const target=terminals.filter(t=>!t.active).sort((a,b)=>
  Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
 if(!target)return;
 const p=projectSprite(target.x,target.y,.8);
 if(!p||!visibleAt(p))return;
 const radius=Math.max(7,Math.min(22,p.size*.07))*(1+Math.sin(time*6)*.06);
 ctx.save();ctx.strokeStyle='rgba(113,245,204,.36)';ctx.lineWidth=1.6;
 ctx.beginPath();ctx.ellipse(p.x,p.y+p.size*.24,radius,radius*.22,0,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.moveTo(p.x,p.y+p.size*.24-radius*.8);ctx.lineTo(p.x,p.y+p.size*.24+radius*.8);ctx.stroke();
 ctx.restore();
}
raycast=function(){
 const start=performance.now();
 originalRaycast();
 if(enabled)sampleFloor();
 const ms=performance.now()-start;
 metrics.renderSamples++;metrics.renderMs+=ms;metrics.lastMs=ms;
 metrics.maxMs=Math.max(metrics.maxMs,ms);
 metrics.visualFrameCount++;
};
drawSprites=function(){originalSprites();if(enabled)markWorldSignals();};
function scanReading(){
 const target=nearestCore(),s=window.FTR?.state?.();
 return {schema:'jm.ftr.spatial-echo/0.1',source:'original FTR terminal coordinates + los',
  enabled,scanActive:!!s?.player?.scan&&s.player.scan>0,target,
  // Original FTR.state exposes scan timer and position, but not all source
  // internals; native source map is read here and never mutated.
  gameCoreState:s?{cores:s.player.cores,hp:s.player.hp,score:s.player.score}:null};
}
const label=document.getElementById('jmSpatialEcho'),button=document.getElementById('jmSpatialToggle');
if(!label||!button)throw Error('JM_FTR_CP10_HUD_MISSING');
function refresh(){
 const s=window.FTR?.state?.();
 lastEcho=nearestCore();
 const route=routeCore();
 if(!enabled){label.textContent='FIELD PAUSED · BASELINE VIEW';}
 else if(!s?.running){label.textContent='FIELD STANDBY · START TO SENSE';}
 else if(player.scan<=0){label.textContent='FIELD READY · SCAN TO TRACE';}
 else if(lastEcho.id===null){label.textContent='FIELD CLEAR · EXTRACTION';}
 else{
  const dir=lastEcho.bearing<-12?'LEFT':lastEcho.bearing>12?'RIGHT':'AHEAD';
  label.textContent='CORE '+lastEcho.id+' · '+lastEcho.range+'m · '+dir+' · '+(route.status==='ROUTE_FOUND'?route.steps+' STEPS':route.status);
 }
 button.setAttribute('aria-pressed',enabled?'true':'false');
 button.textContent=enabled?'FIELD ON':'FIELD OFF';
}
function toggle(next){
 enabled=Boolean(next);refresh();
 return enabled;
}
button.addEventListener('click',()=>toggle(!enabled));
addEventListener('keydown',e=>{
 if(e.code==='KeyV'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
  e.preventDefault();toggle(!enabled);
 }
});
setInterval(refresh,150);refresh();
window.JMFTRSpatial=Object.freeze({
 schema:'jm.ftr.spatial-source-contact/0.1',
 sources:['FTR v0.5.1 raycast','FTR v0.5.1 projectSprite','FTR v0.5.1 tileAt','FTR v0.5.1 los'],
 enabled:()=>enabled,toggle,route:routeCore,quality:()=>quality,setQuality:q=>{if(!['fast','balanced','detail'].includes(q))throw Error('JM_SPATIAL_QUALITY_UNKNOWN');quality=q;return q;},
 echo:()=>lastEcho?{...lastEcho}:nearestCore(),reading:scanReading,
 metrics:()=>({...metrics,meanMs:metrics.renderSamples?metrics.renderMs/metrics.renderSamples:0,
  floorDigest:worldFloorDigest}),gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED',
 originalCollisionAuthority:'FTR v0.5.1 unchanged',physicalSensor:'NO_RADIO_CAPTURE'});
})();
