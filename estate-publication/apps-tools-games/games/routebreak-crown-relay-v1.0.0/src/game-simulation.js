function chooseAITarget(f){
  const alive=game.fighters.filter(o=>o!==f&&!o.dead);
  if(!alive.length)return null;
  return alive.sort((a,b)=>Math.abs(a.x-f.x)-Math.abs(b.x-f.x))[0];
}

function updatePlatforms(dt){
  game.movingPlatforms.forEach(m=>{
    m.phase+=m.p.mover.speed*dt;
    if(m.p.mover.axis==='x')m.p.x=m.baseX+Math.sin(m.phase)*m.p.mover.range;
    else m.p.y=m.baseY+Math.sin(m.phase)*m.p.mover.range;
  });
}
function moveAndCollide(f,dt){
  f.x+=f.vx*dt;
  for(const p of game.arena.platforms){
    if(aabb(f,p)){
      if(f.vx>0)f.x=p.x-f.w/2; else if(f.vx<0)f.x=p.x+p.w+f.w/2; f.vx=0;
    }
  }
  const prevBottom=f.y+f.h/2;
  f.y+=f.vy*dt; f.grounded=false;
  for(const p of game.arena.platforms){
    if(aabb(f,p)){
      if(f.vy>=0 && prevBottom<=p.y+8){f.y=p.y-f.h/2;f.vy=0;f.grounded=true;}
      else if(f.vy<0){f.y=p.y+p.h+f.h/2;f.vy=0;}
    }
  }
}
function aabb(f,p){return f.x+f.w/2>p.x&&f.x-f.w/2<p.x+p.w&&f.y+f.h/2>p.y&&f.y-f.h/2<p.y+p.h;}

function resolveFighterContacts(){
  for(let i=0;i<game.fighters.length;i++)for(let j=i+1;j<game.fighters.length;j++){
    const a=game.fighters[i],b=game.fighters[j];if(a.dead||b.dead)continue;
    const dx=b.x-a.x,dy=b.y-a.y,min=(a.w+b.w)*.42;
    if(Math.abs(dx)<min&&Math.abs(dy)<(a.h+b.h)*.4){const push=(min-Math.abs(dx))*.5+1; const s=Math.sign(dx)||1;a.x-=push*s;b.x+=push*s;}
  }
}

function doAttack(f){
  f.attackCd=.31;f.energy=Math.max(0,f.energy-5);
  game.attacks.push({owner:f.id,x:f.x+f.facing*44,y:f.y-3,w:72,h:48,life:.12,damage:7,power:510*f.form.power,dir:f.facing,kind:'STRIKE',hit:new Set()});
  f.vx+=f.facing*60; burst(f.x+f.facing*30,f.y,f.color,5); tone(390,.025,.035); log('STRIKE',{body:f.id});
}
function doAbility(f){
  f.energy-=34; f.abilityCd=1.45;
  const kind=f.form.ability; log(kind,{body:f.id});
  if(kind==='BURST'){
    f.invuln=.18;f.vx=f.facing*1100;game.attacks.push({owner:f.id,x:f.x+f.facing*55,y:f.y,w:110,h:55,life:.18,damage:12,power:720,dir:f.facing,kind,hit:new Set()});
  } else if(kind==='QUAKE'){
    game.attacks.push({owner:f.id,x:f.x,y:f.y+18,w:240,h:120,life:.18,damage:14,power:820,dir:0,kind,hit:new Set()}); game.shake=.7;
  } else if(kind==='BOLT'){
    game.projectiles.push({owner:f.id,x:f.x+f.facing*34,y:f.y-8,vx:f.facing*720,vy:-30,r:12,life:1.4,damage:11,power:650,color:f.color,kind});
  } else if(kind==='BLINK'){
    const oldX=f.x;f.x=clamp(f.x+f.facing*250,55,W-55);f.invuln=.26;burst(oldX,f.y,f.color,14);burst(f.x,f.y,f.color,14);
    game.attacks.push({owner:f.id,x:f.x,y:f.y,w:115,h:75,life:.14,damage:10,power:620,dir:f.facing,kind,hit:new Set()});
  }
  tone(120,.08,.08);
}

function updateAttacks(dt){
  for(const a of game.attacks){
    a.life-=dt; const owner=game.fighters[a.owner]; if(owner&&!owner.dead){a.x=owner.x+(a.dir||owner.facing)*44;a.y=owner.y;}
    for(const f of game.fighters){
      if(f.id===a.owner||f.dead||a.hit.has(f.id)||f.invuln>0)continue;
      if(Math.abs(f.x-a.x)<a.w/2+f.w/2&&Math.abs(f.y-a.y)<a.h/2+f.h/2){a.hit.add(f.id);applyHit(game.fighters[a.owner],f,a.damage,a.power,a.dir||Math.sign(f.x-a.x)||1,a.kind);}
    }
  }
  game.attacks=game.attacks.filter(a=>a.life>0);
}
function updateProjectiles(dt){
  for(const p of game.projectiles){
    p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;
    for(const f of game.fighters){if(f.id===p.owner||f.dead||f.invuln>0)continue;if(Math.hypot(f.x-p.x,f.y-p.y)<f.w*.45+p.r){applyHit(game.fighters[p.owner],f,p.damage,p.power,Math.sign(p.vx),p.kind);p.life=0;break;}}
  }
  game.projectiles=game.projectiles.filter(p=>p.life>0&&p.x>-80&&p.x<W+80);
}
function applyHit(attacker,target,damage,power,dir,kind){
  if(target.guard){
    const parry=game.elapsed-target.guardStart<.14;
    if(parry){attacker.stun=.42;target.stats.parries++;target.energy=Math.min(100,target.energy+16);game.flash=.22;game.shake=.25;tone(880,.06,.04);log('PARRY',{by:target.id,against:attacker.id});return;}
    damage*=.28;power*=.35;target.energy=Math.max(0,target.energy-18);
  }
  const scaled=power*(1+target.damage/115)/target.form.mass;
  target.damage+=damage; target.vx=dir*scaled;target.vy=-scaled*.55-Math.min(300,target.damage*2.2);target.stun=clamp(.08+target.damage/800,.08,.38);target.lastHitBy=attacker.id;
  attacker.stats.dealt+=damage;target.stats.taken+=damage;attacker.combo++;attacker.comboTime=1.2;
  game.matchStats.hits++;game.matchStats.maxDamage=Math.max(game.matchStats.maxDamage,target.damage);game.shake=Math.min(1,game.shake+scaled/1600);game.flash=.08;
  burst(target.x,target.y,target.color,Math.round(8+damage/2));tone(160+damage*8,.035,.04);log('CONTACT',{from:attacker.id,to:target.id,kind,damage:+damage.toFixed(1),field:+target.damage.toFixed(1)});
  if(game.mode==='RELAY'&&target.carrying) dropCore(target);
}

function ringOut(f){
  if(f.dead)return;f.dead=true;f.stats.falls++;game.matchStats.outs++;
  if(game.mode==='CROWNFALL')f.stocks--;
  if(f.lastHitBy!=null){const a=game.fighters[f.lastHitBy];if(a){a.stats.outs++;if(game.mode==='RELAY')a.score++;}}
  if(f.carrying)dropCore(f,true);
  f.respawn=game.mode==='CROWNFALL'&&f.stocks<=0?999:1.45;burst(clamp(f.x,0,W),clamp(f.y,0,H),f.color,26);game.shake=1;tone(75,.18,.12);log('RING_OUT',{body:f.id,stocks:f.stocks,credited:f.lastHitBy});
}
function respawnFighter(f){
  const spawns=[[220,180],[1060,180],[420,120],[860,120]][f.id];
  f.x=spawns[0];f.y=spawns[1];f.vx=f.vy=0;f.damage=0;f.dead=false;f.invuln=1.7;f.lastHitBy=null;f.energy=Math.max(f.energy,60);log('RECOVERY_BODY',{body:f.id});
}

function updateCore(dt){
  const c=game.core;if(!c)return;c.pulse+=dt;
  if(c.respawn>0){c.respawn-=dt;if(c.respawn<=0){c.x=640;c.y=180;c.vx=c.vy=0;c.holder=null;log('CORE_RETURN');}return;}
  if(c.holder!=null){const f=game.fighters[c.holder];if(!f||f.dead){c.holder=null;}else{c.x=lerp(c.x,f.x,.35);c.y=lerp(c.y,f.y-48,.35);const gate=getGate(f.id);if(Math.hypot(c.x-gate.x,c.y-gate.y)<70){scoreCore(f);}}}
  else {
    c.vy+=900*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=.992;
    for(const p of game.arena.platforms){if(c.x+c.r>p.x&&c.x-c.r<p.x+p.w&&c.y+c.r>p.y&&c.y-c.r<p.y+p.h&&c.vy>0){c.y=p.y-c.r;c.vy*=-.25;}}
    if(c.y>H+80){c.x=640;c.y=130;c.vx=0;c.vy=0;}
    for(const f of game.fighters){if(!f.dead&&Math.hypot(f.x-c.x,f.y-c.y)<55){c.holder=f.id;f.carrying=true;log('CORE_CARRY',{body:f.id});tone(620,.08,.05);break;}}
  }
}
function getGate(id){return [{x:90,y:520},{x:1190,y:520},{x:350,y:110},{x:930,y:110}][id];}
function dropCore(f,hard=false){const c=game.core;if(!c)return;c.holder=null;c.x=f.x;c.y=f.y-20;c.vx=(hard?rand(-500,500):-f.vx*.5);c.vy=-280;f.carrying=false;log('CORE_DROP',{body:f.id});}
function scoreCore(f){f.score++;f.stats.cores++;game.matchStats.cores++;f.carrying=false;game.core.holder=null;game.core.respawn=1.1;game.core.x=-100;game.core.y=-100;game.banner=`${f.human?'YOU':f.name} +1`;game.bannerTime=1.2;game.shake=.6;burst(getGate(f.id).x,getGate(f.id).y,f.color,30);tone(980,.15,.12);log('CORE_SCORE',{body:f.id,score:f.score});}

function checkWin(){
  if(game.state!=='playing')return;
  if(game.mode==='CROWNFALL'){
    const alive=game.fighters.filter(f=>f.stocks>0);
    if(alive.length===1&&game.fighters.length>1)finishMatch(alive[0]);
  } else {
    const winner=game.fighters.find(f=>f.score>=JM_BODY.modes.RELAY.target);if(winner)finishMatch(winner);
  }
}
function endByTime(){
  const sorted=[...game.fighters].sort((a,b)=>game.mode==='CROWNFALL'?(b.stocks-a.stocks)||(a.damage-b.damage):(b.score-a.score)||(b.stats.outs-a.stats.outs));finishMatch(sorted[0],true);
}
function finishMatch(winner,time=false){
  if(game.state!=='playing')return;game.state='ended';game.winner=winner;
  const human=game.fighters[0];const won=winner?.id===0;const gained=35+(won?70:15)+human.stats.outs*8+human.stats.cores*15;
  profile.matches++;profile.xp+=gained;if(won)profile.wins++;profile.level=1+Math.floor(profile.xp/300);profile.bestStreak=Math.max(profile.bestStreak,human.combo);saveProfile();
  log('MATCH_RECEIPT',{winner:winner?.id,won,xp:gained,timeExpired:time});
  DOM.resultTitle.textContent=won?'CROWN HELD':'ROUTE BROKEN';
  DOM.resultBody.textContent=`${winner?.human?'You':winner?.name} won ${JM_BODY.modes[game.mode].label}. Match ${game.matchId}.`;
  DOM.resultMetrics.innerHTML=`<div class="metric"><span>XP returned</span><strong>+${gained}</strong></div><div class="metric"><span>Contacts</span><strong>${game.matchStats.hits}</strong></div><div class="metric"><span>Ring-outs</span><strong>${human.stats.outs}</strong></div>`;
  DOM.end.classList.add('active');DOM.touch.classList.remove('active');tone(won?740:120,.3,.14);
}

function updateParticles(dt){
  for(const p of game.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;p.vx*=.97;}
  game.particles=game.particles.filter(p=>p.life>0);
}
function burst(x,y,color,n){if(reducedMotion)n=Math.ceil(n*.35);for(let i=0;i<n;i++)game.particles.push({x,y,vx:rand(-420,420),vy:rand(-420,120),life:rand(.25,.7),max:.7,r:rand(2,7),color});}
