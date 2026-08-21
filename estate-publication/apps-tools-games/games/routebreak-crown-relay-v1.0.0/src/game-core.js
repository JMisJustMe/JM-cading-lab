'use strict';

const JM_BODY = {
  meta: {
    id: 'JM.GAME.ROUTEBREAK.CROWN_RELAY',
    title: 'ROUTEBREAK: Crown Relay',
    version: '1.0.0',
    status: 'FIRST_PLAYABLE_CROWN',
    law: 'DIFFERENCE + PRESERVED RELATION = MOVEMENT',
    sourceAuthority: 'JM body specification interpreted by the browser carrier'
  },
  forms: {
    RUSH:  { speed: 560, jump: 920, mass: .86, power: .90, ability: 'BURST',  note: 'Fast contact and route stealing.' },
    BRACE: { speed: 390, jump: 770, mass: 1.38, power: 1.28, ability: 'QUAKE',  note: 'Heavy pressure and field denial.' },
    ARC:   { speed: 455, jump: 845, mass: 1.00, power: 1.02, ability: 'BOLT',   note: 'Range, angles and interruption.' },
    SHIFT: { speed: 505, jump: 885, mass: .94, power: .96, ability: 'BLINK',  note: 'Position rewriting and recovery.' }
  },
  modes: {
    CROWNFALL: { label: 'Crownfall', win: 'Last route-body standing', stock: 3, timer: 180 },
    RELAY: { label: 'Crown Relay', win: 'Carry the crown shard to your gate', target: 5, timer: 210 }
  },
  arenas: {
    SPLIT_DECK: {
      label: 'Split Deck', sky: ['#131936','#060811'], accent: '#8cf0d2',
      platforms: [
        {x:120,y:595,w:1040,h:35}, {x:170,y:445,w:260,h:24}, {x:850,y:445,w:260,h:24}, {x:500,y:335,w:280,h:24}
      ]
    },
    RISE_WELL: {
      label: 'Rise Well', sky: ['#24122f','#070711'], accent: '#ff93be',
      platforms: [
        {x:100,y:610,w:1080,h:32}, {x:210,y:490,w:220,h:22}, {x:850,y:490,w:220,h:22}, {x:500,y:420,w:280,h:22}, {x:300,y:300,w:180,h:20}, {x:800,y:300,w:180,h:20}
      ]
    },
    DRIFT_RING: {
      label: 'Drift Ring', sky: ['#102c31','#05080a'], accent: '#ffd46d',
      platforms: [
        {x:175,y:600,w:930,h:34}, {x:240,y:430,w:220,h:22}, {x:820,y:430,w:220,h:22}, {x:520,y:300,w:240,h:22, mover:{axis:'x',range:180,speed:.75}}
      ]
    }
  }
};

const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const rand = (a,b) => a+Math.random()*(b-a);
const now = () => performance.now();
const isTouch = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;

const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d', { alpha:false });
const W = 1280, H = 720;
canvas.width = W; canvas.height = H;

const DOM = {
  menu: $('#menuScreen'), pause: $('#pauseScreen'), end: $('#endScreen'), help: $('#helpScreen'),
  hud: $('#hud'), touch: $('#touchControls'), trace: $('#traceDrawer'),
  mode: $('#modeSelect'), arena: $('#arenaSelect'), foes: $('#foesSelect'), difficulty: $('#difficultySelect'),
  start: $('#startBtn'), resume: $('#resumeBtn'), restart: $('#restartBtn'), menuBtn: $('#menuBtn'),
  pauseBtn: $('#pauseBtn'), traceBtn: $('#traceBtn'), soundBtn: $('#soundBtn'), helpBtn: $('#helpBtn'),
  closeHelp: $('#closeHelpBtn'), exportReceipt: $('#exportReceiptBtn'), endReplay: $('#endReplayBtn'), endMenu: $('#endMenuBtn'),
  formGrid: $('#formGrid'), modeLabel: $('#modeLabel'), timer: $('#timerLabel'), seed: $('#seedLabel'), objective: $('#objectiveLabel'),
  fighterHud: $('#fighterHud'), traceList: $('#traceList'), resultTitle: $('#resultTitle'), resultBody: $('#resultBody'),
  resultMetrics: $('#resultMetrics'), profileLine: $('#profileLine'), runtimeStatus: $('#runtimeStatus')
};

const profile = loadProfile();
let audioOn = profile.audioOn !== false;
let reducedMotion = profile.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
let selectedForm = profile.lastForm || 'RUSH';
let game = createEmptyGame();
let lastFrame = now();
let accumulator = 0;
let animationId = 0;
let audioCtx = null;

function createEmptyGame(){
  return {
    state:'menu', mode:'CROWNFALL', arenaKey:'SPLIT_DECK', arena:null, difficulty:2,
    seed:0, rng:Math.random, elapsed:0, timeLeft:180, fighters:[], particles:[], attacks:[], projectiles:[],
    core:null, events:[], matchId:'', winner:null, frame:0, shake:0, flash:0, banner:'', bannerTime:0,
    inputs:{}, gamepad:{}, matchStats:{hits:0,outs:0,cores:0,maxDamage:0}, movingPlatforms:[], selfTests:[]
  };
}

function loadProfile(){
  try {
    return Object.assign({xp:0,level:1,wins:0,matches:0,bestStreak:0,audioOn:true,reducedMotion:false,lastForm:'RUSH'}, JSON.parse(localStorage.getItem('routebreak.profile')||'{}'));
  } catch { return {xp:0,level:1,wins:0,matches:0,bestStreak:0,audioOn:true,reducedMotion:false,lastForm:'RUSH'}; }
}
function saveProfile(){
  profile.audioOn=audioOn; profile.reducedMotion=reducedMotion; profile.lastForm=selectedForm;
  localStorage.setItem('routebreak.profile',JSON.stringify(profile));
  updateProfileLine();
}
function updateProfileLine(){ DOM.profileLine.textContent=`JM route profile · Level ${profile.level} · ${profile.xp} XP · ${profile.wins} crowns`; }

function seeded(seed){
  let s=seed>>>0;
  return ()=>{ s += 0x6D2B79F5; let t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
}
function log(type, payload={}){
  const e={t:+game.elapsed.toFixed(3),frame:game.frame,type,...payload};
  game.events.push(e); if(game.events.length>240) game.events.shift();
  if(DOM.trace.classList.contains('active')) renderTrace();
}
function renderTrace(){
  DOM.traceList.innerHTML=game.events.slice(-60).reverse().map(e=>`<div class="trace-row"><b>${e.type}</b> · ${e.t.toFixed(2)}s ${Object.entries(e).filter(([k])=>!['type','t','frame'].includes(k)).map(([k,v])=>`${k}:${String(v)}`).join(' ')}</div>`).join('') || '<div class="trace-row">No contact yet.</div>';
}

function buildFormChoices(){
  DOM.formGrid.innerHTML='';
  Object.entries(JM_BODY.forms).forEach(([key,f])=>{
    const b=document.createElement('button'); b.className='form-choice'+(key===selectedForm?' active':''); b.type='button';
    const speed=Math.round(f.speed/120), power=Math.round(f.power*4), mass=Math.round(f.mass*3);
    b.innerHTML=`<strong>${key}</strong><small>${f.note}</small><div class="statline" aria-label="Speed ${speed} of 5">${[1,2,3,4,5].map(i=>`<i class="${i<=speed?'on':''}"></i>`).join('')}</div><small>${f.ability} · P${power} · M${mass}</small>`;
    b.addEventListener('click',()=>{selectedForm=key; saveProfile(); buildFormChoices(); tone(520,.04,.04);});
    DOM.formGrid.appendChild(b);
  });
}

function startMatch(){
  unlockAudio();
  game=createEmptyGame();
  game.state='playing'; game.mode=DOM.mode.value; game.arenaKey=DOM.arena.value; game.arena=structuredClone(JM_BODY.arenas[game.arenaKey]);
  game.difficulty=+DOM.difficulty.value; game.seed=(Date.now()^(Math.random()*1e9))>>>0; game.rng=seeded(game.seed);
  game.matchId=`RB-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}-${game.seed.toString(16).slice(-4).toUpperCase()}`;
  game.timeLeft=JM_BODY.modes[game.mode].timer;
  game.movingPlatforms=game.arena.platforms.filter(p=>p.mover).map(p=>({p,baseX:p.x,baseY:p.y,phase:game.rng()*Math.PI*2}));
  const count=1+(+DOM.foes.value);
  const forms=['RUSH','BRACE','ARC','SHIFT'];
  const spawns=[[220,240],[1060,240],[420,150],[860,150]];
  for(let i=0;i<count;i++){
    const form=i===0?selectedForm:forms[(i+Math.floor(game.rng()*3))%forms.length];
    game.fighters.push(makeFighter(i,form,spawns[i][0],spawns[i][1],i===0));
  }
  if(game.mode==='RELAY') spawnCore();
  DOM.menu.classList.remove('active'); DOM.end.classList.remove('active'); DOM.pause.classList.remove('active'); DOM.help.classList.remove('active');
  DOM.hud.hidden=false; DOM.pauseBtn.disabled=false; DOM.traceBtn.disabled=false;
  DOM.touch.classList.toggle('active',isTouch); game.banner='ROUTEBREAK'; game.bannerTime=1.4;
  log('IGNITION',{match:game.matchId,mode:game.mode,arena:game.arenaKey,seed:game.seed,bodies:count});
  runRuntimeTests();
  updateHud();
  lastFrame=now(); accumulator=0;
  cancelAnimationFrame(animationId); animationId=requestAnimationFrame(loop);
}

function makeFighter(id, formKey, x, y, human){
  const f=JM_BODY.forms[formKey];
  return {
    id,name:human?'YOU':`CPU ${id}`,formKey,form:f,human,x,y,vx:0,vy:0,w:46,h:62,facing:id%2? -1:1,
    damage:0,stocks:JM_BODY.modes.CROWNFALL.stock,score:0,energy:100,grounded:false,coyote:0,
    attackCd:0,abilityCd:0,dashCd:0,guard:false,guardStart:-9,stun:0,invuln:1.2,respawn:0,dead:false,
    aiThink:0,aiIntent:{move:0,jump:false,attack:false,ability:false,guard:false,dash:false},
    color:['#8cf0d2','#ff8fb3','#ffd46d','#9da7ff'][id],stats:{dealt:0,taken:0,outs:0,falls:0,cores:0,parries:0},
    carrying:false,lastHitBy:null,combo:0,comboTime:0
  };
}

function spawnCore(){
  game.core={x:640,y:210,vx:0,vy:0,r:18,holder:null,respawn:0,pulse:0};
  log('CORE_SPAWN');
}

function loop(ts){
  const dt=Math.min(.05,(ts-lastFrame)/1000); lastFrame=ts;
  if(game.state==='playing'){
    accumulator+=dt;
    while(accumulator>=1/60){ update(1/60); accumulator-=1/60; }
  }
  render(accumulator/(1/60));
  animationId=requestAnimationFrame(loop);
}

function update(dt){
  game.frame++; game.elapsed+=dt; game.timeLeft=Math.max(0,game.timeLeft-dt);
  game.bannerTime=Math.max(0,game.bannerTime-dt); game.flash=Math.max(0,game.flash-dt*4); game.shake=Math.max(0,game.shake-dt*6);
  updateInputs(); updatePlatforms(dt);
  for(const f of game.fighters) updateFighter(f,dt);
  resolveFighterContacts();
  updateAttacks(dt); updateProjectiles(dt); updateParticles(dt);
  if(game.mode==='RELAY') updateCore(dt);
  if(game.timeLeft<=0) endByTime();
  checkWin();
  if(game.frame%6===0) updateHud();
}

const keyState={};
addEventListener('keydown',e=>{
  keyState[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if(e.code==='Escape'||e.code==='KeyP') togglePause();
  if(e.code==='Backquote') DOM.trace.classList.toggle('active');
});
addEventListener('keyup',e=>{keyState[e.code]=false;});

function updateInputs(){
  const p=game.fighters[0]; if(!p) return;
  const gp=navigator.getGamepads?.()[0];
  const touch=touchState;
  game.inputs={
    left:!!keyState.KeyA || !!keyState.ArrowLeft || touch.left || (gp&&gp.axes[0]<-.35),
    right:!!keyState.KeyD || !!keyState.ArrowRight || touch.right || (gp&&gp.axes[0]>.35),
    down:!!keyState.KeyS || !!keyState.ArrowDown || touch.down || (gp&&gp.axes[1]>.55),
    jump:edge('jump',!!keyState.KeyW||!!keyState.Space||!!keyState.ArrowUp||touch.jump||(gp&&gp.buttons[0].pressed)),
    attack:edge('attack',!!keyState.KeyJ||touch.attack||(gp&&gp.buttons[2].pressed)),
    ability:edge('ability',!!keyState.KeyK||touch.ability||(gp&&gp.buttons[3].pressed)),
    guard:!!keyState.KeyL||touch.guard||(gp&&gp.buttons[4].pressed),
    dash:edge('dash',!!keyState.ShiftLeft||!!keyState.ShiftRight||touch.dash||(gp&&gp.buttons[1].pressed))
  };
  touch.jump=touch.attack=touch.ability=touch.dash=false;
}
const edgeMemory={};
function edge(key,v){const hit=v&&!edgeMemory[key]; edgeMemory[key]=v; return hit;}

function updateFighter(f,dt){
  if(f.dead){
    f.respawn-=dt;
    if(f.respawn<=0 && f.stocks>0) respawnFighter(f);
    return;
  }
  f.attackCd=Math.max(0,f.attackCd-dt); f.abilityCd=Math.max(0,f.abilityCd-dt); f.dashCd=Math.max(0,f.dashCd-dt);
  f.invuln=Math.max(0,f.invuln-dt); f.stun=Math.max(0,f.stun-dt); f.comboTime=Math.max(0,f.comboTime-dt); if(f.comboTime===0)f.combo=0;
  f.energy=clamp(f.energy+18*dt,0,100); f.coyote=f.grounded?.11:Math.max(0,f.coyote-dt);
  const input=f.human?game.inputs:getAIInput(f,dt);
  f.guard=!!input.guard && f.stun<=0 && f.energy>0;
  if(f.guard){f.energy=Math.max(0,f.energy-13*dt); if(game.elapsed-f.guardStart>1 && input.guard){} }
  if(input.guard && !f._guardPrev) f.guardStart=game.elapsed;
  f._guardPrev=!!input.guard;
  if(f.stun<=0){
    let move=(input.left?-1:0)+(input.right?1:0);
    if(move){f.facing=Math.sign(move); const accel=f.grounded?3300:1800; f.vx=moveTowards(f.vx,move*f.form.speed,accel*dt);} else {f.vx=moveTowards(f.vx,0,(f.grounded?2600:420)*dt);}
    if(input.jump && f.coyote>0){f.vy=-f.form.jump;f.grounded=false;f.coyote=0;burst(f.x,f.y+f.h/2,f.color,8);tone(260,.045,.045);log('JUMP',{body:f.id});}
    if(input.dash && f.dashCd<=0 && f.energy>=18){
      f.energy-=18;f.dashCd=.72;f.invuln=Math.max(f.invuln,.12);f.vx=f.facing*820;f.vy*=.35;burst(f.x,f.y,f.color,10);tone(160,.05,.06);log('DASH',{body:f.id});
    }
    if(input.attack && f.attackCd<=0) doAttack(f);
    if(input.ability && f.abilityCd<=0 && f.energy>=34) doAbility(f);
  }
  f.vy+=2050*dt;
  f.vy=Math.min(f.vy,1400);
  moveAndCollide(f,dt);
  if(f.x<-170||f.x>W+170||f.y>H+170||f.y<-330) ringOut(f);
}
function moveTowards(v,target,maxDelta){return v<target?Math.min(v+maxDelta,target):Math.max(v-maxDelta,target);}

function getAIInput(f,dt){
  f.aiThink-=dt;
  if(f.aiThink<=0){
    f.aiThink=rand(.08,.18)/(game.difficulty*.25+.55);
    const target=chooseAITarget(f);
    const dx=target?target.x-f.x:640-f.x, dy=target?target.y-f.y:0;
    const danger=f.y>560 || f.x<120 || f.x>1160;
    const intent={move:Math.abs(dx)>55?Math.sign(dx):0,jump:false,attack:false,ability:false,guard:false,dash:false};
    if(dy<-75 || danger) intent.jump=game.rng()<(.42+.12*game.difficulty);
    if(target && Math.abs(dx)<105 && Math.abs(dy)<95){intent.attack=game.rng()<(.42+.1*game.difficulty);intent.guard=game.rng()<(.08+.05*game.difficulty);}
    if(target && Math.abs(dx)<360 && f.energy>45) intent.ability=game.rng()<(.05+.055*game.difficulty);
    if(Math.abs(dx)>330 && f.energy>30) intent.dash=game.rng()<(.04+.035*game.difficulty);
    if(game.mode==='RELAY'&&game.core){
      if(game.core.holder===f.id){const gate=getGate(f.id);intent.move=Math.sign(gate.x-f.x);if(gate.y<f.y-70)intent.jump=true;}
      else if(game.core.holder==null){intent.move=Math.sign(game.core.x-f.x);if(game.core.y<f.y-70)intent.jump=true;}
    }
    f.aiIntent=intent;
  }
  const i=f.aiIntent;
  const out={left:i.move<0,right:i.move>0,down:false,jump:i.jump,attack:i.attack,ability:i.ability,guard:i.guard,dash:i.dash};
  i.jump=i.attack=i.ability=i.dash=false;
  return out;
}
