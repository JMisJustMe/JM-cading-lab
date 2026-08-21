function render(){
  const dpr=1;ctx.save();
  const shake=!reducedMotion&&game.shake>0?game.shake*rand(-9,9):0;ctx.translate(shake,shake*.45);
  drawBackground();
  if(game.arena){drawGates();drawPlatforms();drawCore();drawProjectiles();drawAttacks();for(const f of game.fighters)drawFighter(f);drawParticles();}
  if(game.bannerTime>0)drawBanner(game.banner,game.bannerTime);
  if(game.flash>0){ctx.fillStyle=`rgba(255,255,255,${game.flash*.22})`;ctx.fillRect(0,0,W,H);}
  ctx.restore();
}
function drawBackground(){
  const sky=game.arena?.sky||['#172039','#060811'];const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,sky[0]);g.addColorStop(1,sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle=game.arena?.accent||'#8cf0d2';ctx.lineWidth=1;
  const t=game.elapsed*.2;for(let x=-H;x<W+H;x+=70){ctx.beginPath();ctx.moveTo(x+(t*35)%70,0);ctx.lineTo(x-H+(t*35)%70,H);ctx.stroke();}
  for(let y=80;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.04)';for(let i=0;i<22;i++){const x=((i*173+game.seed)%W);const y=((i*97+game.seed/3)%H);ctx.fillRect(x,y,2,2);}
}
function drawPlatforms(){
  for(const p of game.arena.platforms){
    const grad=ctx.createLinearGradient(0,p.y,0,p.y+p.h);grad.addColorStop(0,'rgba(255,255,255,.28)');grad.addColorStop(1,'rgba(0,0,0,.35)');ctx.fillStyle=grad;roundRect(p.x,p.y,p.w,p.h,9,true,false);
    ctx.strokeStyle=game.arena.accent;ctx.globalAlpha=.55;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x+10,p.y+2);ctx.lineTo(p.x+p.w-10,p.y+2);ctx.stroke();ctx.globalAlpha=1;
  }
}
function drawGates(){if(game.mode!=='RELAY')return;game.fighters.forEach(f=>{const g=getGate(f.id);ctx.save();ctx.globalAlpha=f.dead?.25:.8;ctx.strokeStyle=f.color;ctx.lineWidth=7;ctx.beginPath();ctx.arc(g.x,g.y,48,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.x,g.y,31,0,Math.PI*2);ctx.stroke();ctx.fillStyle=f.color;ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(String(f.score),g.x,g.y+5);ctx.restore();});}
function drawCore(){const c=game.core;if(!c||c.respawn>0)return;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(game.elapsed*1.4);ctx.shadowBlur=22;ctx.shadowColor='#ffd46d';ctx.fillStyle='#ffd46d';ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?10:20;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.restore();}
function drawFighter(f){if(f.dead)return;ctx.save();ctx.translate(f.x,f.y);if(f.invuln>0&&Math.floor(game.elapsed*18)%2===0)ctx.globalAlpha=.35;
  const tilt=clamp(f.vx/1400,-.22,.22);ctx.rotate(tilt);
  ctx.shadowBlur=f.carrying?18:0;ctx.shadowColor='#ffd46d';
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(0,f.h/2+7,30,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=f.color;roundRect(-f.w/2,-f.h/2,f.w,f.h,14,true,false);
  ctx.fillStyle='#0a0d16';roundRect(-15,-18,30,12,6,true,false);
  ctx.fillStyle='#fff';ctx.fillRect(f.facing>0?6:-10,-15,4,4);
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-12,8);ctx.lineTo(12,8);ctx.stroke();
  if(f.guard){ctx.strokeStyle='#fff';ctx.globalAlpha=.6;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,40,-1.2,1.2);ctx.stroke();}
  if(f.stun>0){ctx.fillStyle='#ffd46d';ctx.font='900 18px system-ui';ctx.fillText('✦',-7,-42);}
  ctx.restore();
  ctx.fillStyle='#fff';ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(`${Math.round(f.damage)}%`,f.x,f.y-f.h/2-10);
  if(f.formKey){ctx.fillStyle=f.color;ctx.font='800 10px system-ui';ctx.fillText(f.formKey,f.x,f.y+f.h/2+18);}
}
function drawAttacks(){ctx.save();ctx.globalCompositeOperation='screen';for(const a of game.attacks){ctx.globalAlpha=clamp(a.life*5,0,.55);ctx.fillStyle=game.fighters[a.owner]?.color||'#fff';roundRect(a.x-a.w/2,a.y-a.h/2,a.w,a.h,20,true,false);}ctx.restore();}
function drawProjectiles(){for(const p of game.projectiles){ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=18;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(-p.vx/18,0);ctx.lineTo(0,0);ctx.stroke();ctx.restore();}}
function drawParticles(){for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
function drawBanner(text,life){ctx.save();ctx.globalAlpha=clamp(life*1.6,0,1);ctx.textAlign='center';ctx.font='900 64px system-ui';ctx.fillStyle='#fff';ctx.shadowBlur=20;ctx.shadowColor=game.arena?.accent||'#8cf0d2';ctx.fillText(text,W/2,H*.28);ctx.restore();}
function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill)ctx.fill();if(stroke)ctx.stroke();}

function updateHud(){
  DOM.modeLabel.textContent=JM_BODY.modes[game.mode]?.label||'Menu';DOM.timer.textContent=formatTime(game.timeLeft);DOM.seed.textContent=game.seed?game.seed.toString(16).toUpperCase():'—';
  DOM.objective.textContent=game.mode==='RELAY'?`First to ${JM_BODY.modes.RELAY.target}`:'Last stock standing';
  DOM.fighterHud.innerHTML=game.fighters.map(f=>`<div class="fighter-card ${f.dead&&f.stocks<=0?'dead':''}"><div class="fighter-line"><span class="fighter-name" style="color:${f.color}">${f.human?'YOU':f.name} · ${f.formKey}</span><span>${game.mode==='CROWNFALL'?`<span class="stock-dots">${'◆'.repeat(Math.max(0,f.stocks))}</span>`:`${f.score}/${JM_BODY.modes.RELAY.target}`}</span></div><div class="fighter-line"><span class="damage">${Math.round(f.damage)}%</span><span>${Math.round(f.energy)}E</span></div><div class="meter"><span style="width:${f.energy}%"></span></div></div>`).join('');
}
function formatTime(t){const m=Math.floor(t/60),s=Math.floor(t%60);return `${m}:${String(s).padStart(2,'0')}`;}

function togglePause(){
  if(game.state==='playing'){game.state='paused';DOM.pause.classList.add('active');DOM.touch.classList.remove('active');log('PAUSE');}
  else if(game.state==='paused'){game.state='playing';DOM.pause.classList.remove('active');DOM.touch.classList.toggle('active',isTouch);lastFrame=now();log('RESUME');}
}
function returnMenu(){game.state='menu';cancelAnimationFrame(animationId);DOM.menu.classList.add('active');DOM.pause.classList.remove('active');DOM.end.classList.remove('active');DOM.hud.hidden=true;DOM.touch.classList.remove('active');DOM.pauseBtn.disabled=true;DOM.traceBtn.disabled=true;render();}

function exportReceipt(){
  const receipt={
    body:JM_BODY.meta,match:{id:game.matchId,mode:game.mode,arena:game.arenaKey,seed:game.seed,duration:+game.elapsed.toFixed(2),winner:game.winner?.id},
    fighters:game.fighters.map(f=>({id:f.id,human:f.human,form:f.formKey,stocks:f.stocks,score:f.score,damage:+f.damage.toFixed(1),stats:f.stats})),
    matchStats:game.matchStats,events:game.events,profile:{level:profile.level,xp:profile.xp,wins:profile.wins,matches:profile.matches},generated:new Date().toISOString()
  };
  const blob=new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${game.matchId||'ROUTEBREAK'}_RECEIPT.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);tone(720,.05,.05);
}

function unlockAudio(){if(navigator.userActivation && !navigator.userActivation.isActive)return;if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});}
function tone(freq=.0,dur=.05,vol=.05){if(!audioOn||!freq||!audioCtx||audioCtx.state!=='running')return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type='triangle';g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}catch{}}

const touchState={left:false,right:false,down:false,jump:false,attack:false,ability:false,guard:false,dash:false};
$$('.touch-btn').forEach(btn=>{
  const a=btn.dataset.action;const press=e=>{e.preventDefault();touchState[a]=true;btn.classList.add('on');};const release=e=>{e.preventDefault();if(!['jump','attack','ability','dash'].includes(a))touchState[a]=false;btn.classList.remove('on');};
  btn.addEventListener('pointerdown',press);btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',release);btn.addEventListener('pointerleave',release);
});

function runRuntimeTests(){
  const tests=[];const test=(name,fn)=>{try{tests.push({name,pass:!!fn()});}catch(e){tests.push({name,pass:false,error:e.message});}};
  test('canvas context',()=>!!ctx);test('four forms',()=>Object.keys(JM_BODY.forms).length===4);test('two modes',()=>Object.keys(JM_BODY.modes).length===2);test('three arenas',()=>Object.keys(JM_BODY.arenas).length===3);
  test('human spawned',()=>game.fighters[0]?.human===true);test('AI spawned',()=>game.fighters.slice(1).every(f=>!f.human));test('arena platforms',()=>game.arena.platforms.length>=4);test('fixed world',()=>canvas.width===1280&&canvas.height===720);
  test('seeded rng',()=>{const a=seeded(4),b=seeded(4);return a()===b();});test('receipt route',()=>typeof exportReceipt==='function');test('save route',()=>typeof localStorage!=='undefined');test('touch map',()=>Object.keys(touchState).length===8);
  test('action separation',()=>typeof doAttack==='function'&&typeof doAbility==='function');test('simulation/render separation',()=>typeof update==='function'&&typeof render==='function');test('trace active',()=>Array.isArray(game.events));test('profile persisted',()=>profile.level>=1);
  test('unique abilities',()=>new Set(Object.values(JM_BODY.forms).map(f=>f.ability)).size===4);test('finite form stats',()=>Object.values(JM_BODY.forms).every(f=>[f.speed,f.jump,f.mass,f.power].every(Number.isFinite)));
  test('crownfall contract',()=>JM_BODY.modes.CROWNFALL.stock===3&&JM_BODY.modes.CROWNFALL.timer>0);test('relay contract',()=>JM_BODY.modes.RELAY.target===5&&JM_BODY.modes.RELAY.timer>0);
  test('moving field route',()=>Object.values(JM_BODY.arenas).some(a=>a.platforms.some(p=>p.mover)));test('touch controls present',()=>document.querySelectorAll('.touch-btn').length===8);
  test('gamepad route present',()=>typeof navigator.getGamepads==='function');test('recovery body present',()=>typeof respawnFighter==='function'&&typeof ringOut==='function');
  game.selfTests=tests;const passed=tests.filter(t=>t.pass).length;DOM.runtimeStatus.textContent=`Runtime gate ${passed}/${tests.length} PASS`;DOM.runtimeStatus.style.color=passed===tests.length?'var(--safe)':'var(--danger)';log('RUNTIME_GATE',{passed,total:tests.length});
}

DOM.start.addEventListener('click',startMatch);DOM.resume.addEventListener('click',togglePause);DOM.restart.addEventListener('click',startMatch);DOM.menuBtn.addEventListener('click',returnMenu);DOM.pauseBtn.addEventListener('click',togglePause);
DOM.traceBtn.addEventListener('click',()=>{DOM.trace.classList.toggle('active');renderTrace();});DOM.soundBtn.addEventListener('click',()=>{audioOn=!audioOn;DOM.soundBtn.querySelector('span').textContent=audioOn?'Sound':'Muted';saveProfile();tone(620,.06,.04);});
DOM.helpBtn.addEventListener('click',()=>DOM.help.classList.add('active'));DOM.closeHelp.addEventListener('click',()=>DOM.help.classList.remove('active'));DOM.exportReceipt.addEventListener('click',exportReceipt);DOM.endReplay.addEventListener('click',startMatch);DOM.endMenu.addEventListener('click',returnMenu);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.state==='playing')togglePause();});

function init(){
  buildFormChoices();updateProfileLine();DOM.soundBtn.querySelector('span').textContent=audioOn?'Sound':'Muted';DOM.hud.hidden=true;DOM.pauseBtn.disabled=true;DOM.traceBtn.disabled=true;
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  render();
}
init();
