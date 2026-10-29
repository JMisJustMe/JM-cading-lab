/**
 * JM FTR CP13 · SOVEREIGN SIGHT / MEMORY / COUNTERPLAY
 * The real, original FTR v0.5.1 enemies remain the moving/fighting bodies.
 * A genuine JM Game-CODING/GameCore rule admits each new direct-contact alert.
 * A temporary per-session sight memory replaces unearned omniscient pursuit:
 * - see = original range + original line-of-sight and player not phased
 * - allies only learn contact when close and visible to the reporting enemy
 * - hunters and flankers seek last known coordinates through the ORIGINAL map
 * - Phase interrupts targeting; original Scan exposes real pressure counters
 * No copied AI game, external agent, physics replacement or fake Gardles.
 */
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime}
 from '../../../../coding-estate/sovereign-ten/direct/game-native.mjs';
if(!window.FTR||!window.JMFTRTactics||!window.JMFTRCover||
 !window.JMFTRSpatial||typeof window.updateWorld!=='function'||
 typeof window.circleFree!=='function'||typeof window.los!=='function')
 throw Error('JM_CP13_ORIGINAL_AI_AND_NATIVE_RECIPIENT_MISSING');

const donor='estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1/ftr-world.js';
const rule=`entity Sighting {
 ready = false
 status = "pending"
}
mechanic EarnedSightAlert {
 requires sighting.ready == true
 effect sighting.status = "authorised"
}`;
const organ=`organ SightingOrgan {
 handles = [Sighting]
 rules = [EarnedSightAlert]
 invariants = {
 sighting.status == "authorised"
 }
}
system JMFTRSighting {
 organs = [SightingOrgan]
 events = [OriginalLineOfSight]
 identity = "JM.FTR.SightMemory"
}`;
const ast=GameCoding.parse(rule),coreAst=JMGameCore.parse(organ);
const originalWorld=window.updateWorld;
const memoryLifetime=3.25;
let session=run.started,store=new WeakMap(),enabled=true,latest=null;
let sighted=0,shared=0,searchMoves=0,forgetCount=0,phaseBreaks=0,routeReplans=0;
let lastScan=false,uiAt=-100,contactId=0,phaseLast=false;
const label=document.getElementById('jmAwarenessStatus');
const toggleButton=document.getElementById('jmAwarenessToggle');
if(!label||!toggleButton)throw Error('JM_CP13_HUD_RECIPIENT_MISSING');
const read=e=>{
 let m=store.get(e);
 if(!m){m={sighted:false,last:null,path:[],nextReplan:0,cell:''};store.set(e,m);}
 return m;
};
function reset(){
 if(run.started===session)return;
 session=run.started;store=new WeakMap();latest=null;
 sighted=shared=searchMoves=forgetCount=phaseBreaks=routeReplans=contactId=0;
 lastScan=false;phaseLast=false;uiAt=-100;
 status(); // original FTR starts a fresh clock; don't retain old HUD throttle
}
function directlyVisible(e,phase=player.phase>0&&run.phases>0){
 return !phase&&!e.dead&&Math.hypot(e.x-player.x,e.y-player.y)<9.5&&
   los(e.x,e.y,player.x,player.y);
}
function authoriseSight(e){
 const gate=new GameCodingRuntime(ast,{sighting:{ready:true,status:'pending'}});
 const core=new JMGameCoreRuntime(coreAst,gate);
 const receipt=core.dispatch('JMFTRSighting','OriginalLineOfSight');
 if(receipt.executions.length!==1||!receipt.executions[0].applied ||
   receipt.state.sighting.status!=='authorised')throw Error('JM_CP13_SIGHT_AUTHORITY_FAILURE');
 latest={schema:'jm.ftr.sight-memory/0.1',status:'SIGHTED',
   enemyType:e.type,nativeIdentity:receipt.identity,
   traceDigest:receipt.receipt.traceDigest,source:donor,observedAt:time,
   gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED'};
 sighted++;contactId++;
 event('JM_AI_SIGHTED',{type:e.type,contact:contactId});
}
function traversable(x,y){
 return x>=0&&y>=0&&x<W&&y<H&&tileAt(x+.5,y+.5)==='.' &&
   !solid(x+.5,y+.5);
}
function sourceRoute(enemy,target){
 // Four-neighbour BFS using original game's LIVE collision; doors and
 // newly constructed CP11 barriers are authoritative, not simulated grids.
 const sx=Math.floor(enemy.x),sy=Math.floor(enemy.y);
 const gx=Math.floor(target.x),gy=Math.floor(target.y);
 if(!traversable(sx,sy)||!traversable(gx,gy))return [];
 const start=sy*W+sx,goal=gy*W+gx,prev=new Int32Array(W*H);
 prev.fill(-1);prev[start]=start;
 const q=[start];let h=0,found=false;
 while(h<q.length){
  const p=q[h++];if(p===goal){found=true;break;}
  const x=p%W,y=Math.floor(p/W);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(!traversable(nx,ny))continue;
   const n=ny*W+nx;if(prev[n]!==-1)continue;
   prev[n]=p;q.push(n);
  }
 }
 if(!found)return [];
 const path=[];let t=goal;
 while(path.length<=W*H){
  path.push({x:t%W+.5,y:Math.floor(t/W)+.5});
  if(t===start)break;
  t=prev[t];
  if(t<0)throw Error('JM_CP13_CORRUPT_ORIGINAL_MAP_ROUTE');
 }
 return path.reverse();
}
function memorySeek(e,m,dt){
 if(!m.last||time-m.last.t>memoryLifetime)return;
 const target=m.last;
 const cell=[Math.floor(e.x),Math.floor(e.y),Math.floor(target.x),
   Math.floor(target.y)].join(',');
 if(time>=m.nextReplan||m.cell!==cell){
  m.path=sourceRoute(e,target);m.cell=cell;
  m.nextReplan=time+.46;routeReplans++;
 }
 if(!m.path.length)return; // blocked route HOLD: never step toward a target through walls
 let waypoint=m.path[1]||{x:target.x,y:target.y};
 if(Math.hypot(e.x-waypoint.x,e.y-waypoint.y)<.19&&m.path.length>2){
  m.path.shift();waypoint=m.path[1];
 }
 const dx=waypoint.x-e.x,dy=waypoint.y-e.y,d=Math.hypot(dx,dy);
 if(d<.08)return;
 const role=e.type==='hunter'?1.18:e.type==='flanker'?1.02:.45;
 const vx=dx/d*role*dt,vy=dy/d*role*dt;
 const x=e.x,y=e.y;
 if(circleFree(e.x+vx,e.y,.2))e.x+=vx;
 if(circleFree(e.x,e.y+vy,.2))e.y+=vy;
 if(Math.hypot(e.x-x,e.y-y)>.0001){
  searchMoves++;
  if(searchMoves%36===1)event('JM_AI_SEARCH_STEP',
    {type:e.type,source:m.last.source,age:+(time-target.t).toFixed(2)});
 }
}
function broadcast(donorEnemy){
 for(const ally of enemies){
  if(ally===donorEnemy||ally.dead||directlyVisible(ally))continue;
  if(Math.hypot(ally.x-donorEnemy.x,ally.y-donorEnemy.y)>4.8)continue;
  if(!los(ally.x,ally.y,donorEnemy.x,donorEnemy.y))continue;
  const m=read(ally);
  if(m.last&&time-m.last.t<.9)continue;
  m.last={x:player.x,y:player.y,t:time,source:'shared'};
  m.nextReplan=0;m.path=[];
  shared++;event('JM_AI_SHARED_CONTACT',{from:donorEnemy.type,to:ally.type});
 }
}
function status(){
 if(!enabled){
  label.textContent='MEMORY PAUSED · ORIGINAL AI';
 }else if(!running){
  label.textContent='MEMORY STANDBY';
 }else{
  const seen=enemies.filter(e=>!e.dead&&read(e).sighted).length;
  const remembering=enemies.filter(e=>!e.dead&&read(e).last&&
    time-read(e).last.t<=memoryLifetime&&!read(e).sighted).length;
  if(player.scan>0&&run.scans>0){
   const nearest=enemies.filter(e=>!e.dead).sort((a,b)=>
    Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
   const r=nearest?Math.hypot(nearest.x-player.x,nearest.y-player.y).toFixed(1):'—';
   label.textContent='SCAN · '+seen+' SIGHTED · '+remembering+' SEARCHING · '+r+'m';
  }else if(player.phase>0&&run.phases>0){
   label.textContent='PHASE · ENEMY CONTACT DISRUPTED';
  }else{
   label.textContent='MEMORY · '+seen+' SIGHTED · '+remembering+' SEARCHING';
  }
 }
 toggleButton.textContent=enabled?'MEMORY ON':'MEMORY OFF';
 toggleButton.setAttribute('aria-pressed',String(enabled));
}
function toggle(value=!enabled){enabled=!!value;status();return enabled;}
window.updateWorld=function(dt){
 reset();
 if(!enabled||!running||testFreeze)return originalWorld(dt);
 const phased=player.phase>0&&run.phases>0;
 const newSightings=[];
 for(const e of enemies){
  if(e.dead)continue;
  const m=read(e),seen=directlyVisible(e,phased);
  if(seen){
   if(!m.sighted){authoriseSight(e);newSightings.push(e);}
   m.last={x:player.x,y:player.y,t:time,source:'direct'};
   m.nextReplan=0;m.sighted=true;
  }else{
   if(phased){
    // Phase is actual player counterplay: the inherited original AI can't
    // fire through the phase window or silently maintain a live lock.
    e.stun=Math.max(e.stun,dt+.08);
    e.cool=Math.max(e.cool,Math.min(1,player.phase+.5));
    if(m.sighted){phaseBreaks++;event('JM_AI_PHASE_BREAK',{type:e.type});}
   }
   m.sighted=false;
   if(m.last&&time-m.last.t>memoryLifetime){
    m.last=null;m.path=[];m.nextReplan=0;forgetCount++;
    event('JM_AI_FORGOT',{type:e.type});
   }
   // Original AI otherwise remembers 'engage' forever after losing LOS.
   // Retire only that unearned stale lock; original 'seek' is preserved.
   if(e.state==='engage'&&!seen)e.state='patrol';
  }
 }
 if(!phased){
  for(const e of newSightings)broadcast(e);
 }
 if(player.scan>0&&run.scans>0&&!lastScan)event('JM_PLAYER_SCAN_INTELLIGENCE',
   {enemies:enemies.filter(e=>!e.dead).length});
 lastScan=player.scan>0&&run.scans>0;phaseLast=phased;
 const result=originalWorld(dt);
 if(running){
  for(let i=0;i<enemies.length;i++){
   const e=enemies[i];if(e.dead)continue;
   // CP12 already has earned collision-safe, cover-specific flanking.
   // The newer memory search must never fight or cancel that earlier body.
   if(window.JMFTRTactics.enabled()&&window.JMFTRTactics.inspectLane(i))continue;
   const m=read(e);
   if(!m.sighted&&m.last&&e.stun<=0)memorySeek(e,m,dt);
  }
 }
 if(time-uiAt>.2){uiAt=time;status();}
 return result;
};
toggleButton.addEventListener('click',()=>toggle());
addEventListener('keydown',e=>{
 if(e.code==='KeyU'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
  e.preventDefault();toggle();
 }
});
window.JMFTRMemory=Object.freeze({
 schema:'jm.ftr.original-threat-memory/0.1',source:donor,
 nativeBodies:['JMGameCoreRuntime','GameCodingRuntime'],
 toggle,enabled:()=>enabled,
 inspectEnemy:index=>{
  const enemy=enemies[index];if(!enemy)return null;
  const m=read(enemy);
  return {type:enemy.type,sighted:m.sighted,
   last:m.last?{...m.last}:null,routeLength:m.path.length,
   position:{x:enemy.x,y:enemy.y},state:enemy.state};
 },
 routeFor:(index,point)=>{
  const enemy=enemies[index];
  if(!enemy||!point)return [];
  return sourceRoute(enemy,point);
 },
 status:()=>({enabled,session,sighted,shared,searchMoves,forgetCount,
  phaseBreaks,routeReplans,latest,activeMemories:enemies.filter(e=>
   !e.dead&&read(e).last&&time-read(e).last.t<=memoryLifetime).length}),
 originalEnemyAI:donor,gardles:'HOLD_EXACT_SOURCE_NOT_MOUNTED',
 ownerPhysicalController:'NOT_TESTED'
});
status();
