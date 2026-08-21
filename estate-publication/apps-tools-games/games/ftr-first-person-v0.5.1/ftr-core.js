'use strict';
const VERSION='0.5.1';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const trackerCanvas=document.getElementById('trackerMarks');
const tctx=trackerCanvas.getContext('2d');
const $=id=>document.getElementById(id);
const ui={score:$('score'),cores:$('cores'),hpText:$('hpText'),hpBar:$('hpBar'),ammo:$('ammo'),objective:$('objective'),reticle:$('reticle'),prompt:$('prompt'),toast:$('toast'),act:$('act'),scan:$('scan'),phase:$('phase'),side:$('side'),flow:$('flow'),start:$('startOverlay'),end:$('endOverlay'),endTitle:$('endTitle'),endText:$('endText')};

const mapRows=[
'####################','#..............#...#','#..####........#...#','#..#..#........#...#','#..#..#........D...#','#..#..#........#...#','#..####........#...#','#..............#...#','#..............#...#','#..............#...#','##########D#########','#..................#','#....#####.........#','#....#...#.........#','#....#...#.........#','#....#####.........#','#..................#','#..................#','#..................#','####################'];
const H=mapRows.length,W=mapRows[0].length;
const doors=[{x:10,y:10,open:0,target:0,locked:false},{x:15,y:4,open:0,target:0,locked:true}];
const terminals=[{id:'A',x:14.4,y:15.4,active:false,progress:0,color:'#82ffd0'},{id:'B',x:2.2,y:2.2,active:false,progress:0,color:'#ffd36d'}];
const extraction={x:17.4,y:4.4,active:false};
const player={x:2.6,y:17.2,a:-Math.PI/2,pitch:0,hp:100,ammo:20,score:0,cores:0,side:1,bob:0,phase:0,scan:0,scanCd:0,invuln:0,step:0,fireCd:0,reload:0,shake:0,aimKick:0};
const enemies=[],projectiles=[],particles=[],pickups=[],keys={};
let running=false,last=0,time=0,toastTimer=0,promptTarget=null,interactHeld=false,interactTouch=false,mouseDown=false,testFreeze=false;
let rw=480,rh=800,scaleX=1,scaleY=1,renderDpr=1,zBuffer=new Float32Array(rw);
let joyState={id:null,cx:0,cy:0,x:0,y:0},lookState={id:null,x:0,y:0},controlMode='free';
let deckState={id:null,x:0,y:0,startX:0,startY:0,startT:0,moved:false,pulseTimer:null};
let audioCtx=null;
const run={started:null,shots:0,hits:0,kills:0,cores:0,phases:0,scans:0,damage:0,events:[]};
function event(type,data={}){const item={t:+time.toFixed(2),event:type,...data};run.events.push(item);if(run.events.length>120)run.events.shift();try{window.Android?.postMessage?.(JSON.stringify(item));}catch(_){}}
function sound(kind){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const now=audioCtx.currentTime;const cfg={fire:[110,48,.045,.12],hit:[420,120,.08,.08],hurt:[70,36,.14,.13],scan:[760,210,.24,.07],core:[260,980,.4,.12],phase:[180,760,.12,.09],door:[55,125,.35,.1],win:[330,880,.7,.12]}[kind]||[200,100,.08,.05];o.type=kind==='hurt'?'sawtooth':'sine';o.frequency.setValueAtTime(cfg[0],now);o.frequency.exponentialRampToValueAtTime(cfg[1],now+cfg[2]);g.gain.setValueAtTime(cfg[3],now);g.gain.exponentialRampToValueAtTime(.001,now+cfg[2]);o.start();o.stop(now+cfg[2]);}catch(_){}}
function vibrate(ms){try{navigator.vibrate?.(ms)}catch(_){}}
function tileAt(x,y){const ix=Math.floor(x),iy=Math.floor(y);if(ix<0||iy<0||ix>=W||iy>=H)return'#';const d=doors.find(v=>v.x===ix&&v.y===iy);if(d&&d.open>.82)return'.';return mapRows[iy][ix]}
function solid(x,y){return tileAt(x,y)==='#'||tileAt(x,y)==='D'}
function circleFree(x,y,r=.22){return!solid(x-r,y-r)&&!solid(x+r,y-r)&&!solid(x-r,y+r)&&!solid(x+r,y+r)}
function los(x0,y0,x1,y1){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/.08);for(let i=1;i<n;i++){const t=i/n;if(solid(x0+(x1-x0)*t,y0+(y1-y0)*t))return false}return true}
function wrapAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}
function resize(){const vw=Math.max(1,Math.round(document.documentElement.clientWidth||innerWidth));const vh=Math.max(1,Math.round(document.documentElement.clientHeight||innerHeight));renderDpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(vw*renderDpr);canvas.height=Math.round(vh*renderDpr);canvas.style.width=vw+'px';canvas.style.height=vh+'px';scaleX=vw/rw;scaleY=vh/rh;const tw=Math.max(1,trackerCanvas.clientWidth),th=Math.max(1,trackerCanvas.clientHeight);trackerCanvas.width=Math.round(tw*renderDpr);trackerCanvas.height=Math.round(th*renderDpr);tctx.setTransform(renderDpr,0,0,renderDpr,0,0)}
function reset(){Object.assign(player,{x:2.6,y:17.2,a:-Math.PI/2,pitch:0,hp:100,ammo:20,score:0,cores:0,side:1,bob:0,phase:0,scan:0,scanCd:0,invuln:0,step:0,fireCd:0,reload:0,shake:0,aimKick:0});controlMode='free';updateControlMode();terminals.forEach(t=>{t.active=false;t.progress=0});doors.forEach((d,i)=>{d.open=0;d.target=0;d.locked=i===1});extraction.active=false;enemies.length=projectiles.length=particles.length=pickups.length=0;time=0;toastTimer=0;promptTarget=null;Object.assign(run,{started:new Date().toISOString(),shots:0,hits:0,kills:0,cores:0,phases:0,scans:0,damage:0,events:[]});spawnEnemy(3.5,16.5,'hunter');spawnEnemy(11.5,15.5,'sentry');spawnEnemy(15.5,13.2,'flanker');spawnEnemy(12.8,7.5,'sentry');spawnEnemy(12.2,3.5,'hunter');spawnEnemy(4.9,8.0,'flanker');spawnEnemy(17.2,5.2,'sentry');updateHUD()}
function spawnEnemy(x,y,type='hunter'){enemies.push({x,y,type,hp:type==='sentry'?34:26,a:Math.random()*6.28,state:'patrol',cool:Math.random()*1.3,stun:0,strafe:Math.random()<.5?-1:1,seed:Math.random()*10,dead:false})}
function start(){reset();running=true;ui.start.classList.add('hidden');ui.end.classList.add('hidden');last=performance.now();event('RUN_START',{version:VERSION});requestAnimationFrame(loop)}
function end(win){running=false;ui.end.classList.remove('hidden');ui.endTitle.textContent=win?'EXTRACTION COMPLETE':'BODY LOST';const acc=run.shots?Math.round(run.hits/run.shots*100):0;ui.endText.textContent=`Score ${player.score} | ${run.kills} threats | ${acc}% contact | ${run.cores}/2 cores | ${run.phases} phases`;event('RUN_END',{win,score:player.score,accuracy:acc});if(win)sound('win')}
function updateHUD(){ui.score.textContent=String(player.score).padStart(6,'0');ui.cores.textContent=`${player.cores}/2`;ui.hpText.textContent=Math.max(0,Math.ceil(player.hp));ui.hpBar.style.width=Math.max(0,player.hp)+'%';ui.ammo.textContent=player.reload>0?'…':player.ammo;ui.phase.style.opacity=player.phase>0?'.42':'1';ui.scan.style.opacity=player.scanCd>0?'.42':'1';if(player.cores===0)ui.objective.innerHTML='FIND THE FIRST <b>TRACE CORE</b>';else if(player.cores===1)ui.objective.innerHTML='LOCATE THE SECOND <b>TRACE CORE</b>';else if(!extraction.active)ui.objective.innerHTML='BREACHING <b>EXTRACTION GATE</b>';else ui.objective.innerHTML='REACH THE <b>EXTRACTION FIELD</b>'}
function toast(text,color='#82ffd0'){ui.toast.textContent=text;ui.toast.style.color=color;ui.toast.classList.add('show');toastTimer=1.1}
function norm(x,y){const l=Math.hypot(x,y)||1;return[x/l,y/l]}
