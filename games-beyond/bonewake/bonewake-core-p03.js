function releaseLever(){if(!state.leverDown)return;state.leverDown=false;ui.lever.classList.remove('on');state.phase='reel';state.reelUntil=now()+760;state.reelTick=0;state.reelIndex=0;ui.status.textContent=leaders[state.leaderIndex].name+' sets the movement condition. Bone Reel scans the fifteen-piece Wake Pool…';ui.center.textContent='CONDITIONS SET · ANSWER UNKNOWN';tone(230,.08,'triangle',.022,180);syncUI()}
function finishReel(){state.package=makePackage();state.phase='ready';resetBody();state.tension=0;ui.tension.style.width='0%';ui.leverText.textContent='WAKE READY';shardGates.forEach(g=>g.used=false);ui.status.textContent=`${state.package.creature.name} answered under ${state.package.leader.name}/${state.package.leader.verb}. ${state.package.shard.name} + ${state.package.path.name}. Drag low and release to Wakeflick.`;ui.center.textContent='PULL BACK · RELEASE TO WAKEFLICK';tone(470,.09,'sine',.028,170);toast(state.package.creature.name+' woke');syncUI()}
function point(e){const r=C.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
function beginAim(p){
 if(state.phase!=='ready'||!state.main)return false;
 const d=Math.hypot(p.x-state.main.x,p.y-state.main.y);
 if(d>state.main.r+52)return false;
 state.phase='aim';state.aiming=true;state.aim=p;
 ui.center.textContent='TOUCH → PULL BACK → RELEASE';
 syncUI();return true
}
function releaseAim(){
 if(!state.aiming||!state.main)return;
 state.aiming=false;
 const dx=state.main.x-state.aim.x,dy=state.main.y-state.aim.y,mag=Math.hypot(dx,dy);
 if(mag<30){state.phase='ready';ui.center.textContent='PULL BACK · RELEASE TO WAKEFLICK';syncUI();return}
 const p=clamp(mag/185,.25,1),nx=dx/mag,ny=Math.min(dy/mag,-.20),c=state.package.creature;
 // Lever type affects pressure, but body material decides how that pressure becomes movement.
 const force=(8.15+state.package.tension*2.45)*p*c.launch*leaders[state.leaderIndex].launch;
 state.main.vx=nx*force;state.main.vy=ny*force-2.75;
 const openingPath=state.package?.path?.effect;
 if(openingPath==='left')state.main.vx-=.42;
 else if(openingPath==='right')state.main.vx+=.42;
 else if(openingPath==='cross')state.main.vx+=Math.sign(state.main.vx||nx||1)*.28;
 else if(openingPath==='deep')state.main.vy-=.34;
 state.main.spinV+=nx*c.spinCouple*.34*(.55+p);
 state.phase='live';state.chain=0;state.lastContact=now();
 ui.center.textContent='EXCAVATE · WAKE · GUIDE · BREAK THE MARROW CORE';
 ui.status.textContent='Live Wake. Pull a Reflex down, hold to charge, then release to flick. Flashing organs and specimens can also be pushed directly to store, release or reroute effects.';
 tone(310,.05,'square',.02,250);syncUI()
}
function setReflex(side,on){
 if(state.phase!=='live')on=false;
 const f=flipperPack(side),t=now();
 if(on){
  if(!f.held){f.held=true;f.holdStarted=t}
 }else if(f.held){
  const held=t-f.holdStarted;
  f.held=false;f.lastRelease=t;f.releaseCharge=clamp(.36+held/420+f.charge*.55,.36,1.28);
  f.flick=1;f.charge=Math.min(1.12,f.charge+.08);tone(side==='L'?305:355,.035,'square',.018,72)
 }
 if(side==='L')state.left=on;else state.right=on;
 syncUI()
}
function fireInstinct(kind){if(state.phase!=='live'){toast('Instinct Calls fire during LIVE WAKE');return}const t=now(),primed=state.package?.instinct.effect===kind,boost=primed?1.35:1;if(kind==='deep'){if(t<state.cooldown.deep){toast('Deep Call recovering');return}state.deepUntil=t+4200*boost;state.cooldown.deep=t+(primed?5600:7600);say(primed?'PRIMED DEEP CALL':'DEEP CALL','good');tone(170,.12,'sine',.03,170)}else{if(t<state.cooldown.breath){toast('Breathgate recovering');return}state.breathUntil=t+5000*boost;state.cooldown.breath=t+(primed?6200:8200);say(primed?'PRIMED BREATHGATE':'BREATHGATE','good');tone(245,.12,'triangle',.03,-80)}}
function particles(x,y,n=10,c='teal'){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*5;state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,c})}}
function wave(x,y,c='teal'){
 state.waves.push({x,y,r:8,life:.58,c});
 if(state.waves.length>7)state.waves.splice(0,state.waves.length-7)
}

function flipperPack(side){return state.flipperState[side]}
function updateFlipperState(dt,t){
 ['L','R'].forEach(side=>{
   const f=flipperPack(side);
   if(f.held){
     f.pull=clamp(f.pull+0.14*dt,0,1);
     f.charge=clamp(f.charge+0.020*dt,0,1.12);
     f.flick=0;
   }else{
     f.pull=Math.max(0,f.pull-0.16*dt);
     const age=t-f.lastRelease;
     f.flick=age<170?(1-age/170):0;
     if(age>260)f.releaseCharge*=.985;
   }
 })
}
function releaseStoredCreature(x,y,id){
 const base=creatures.find(c=>c.id===id)||creatures[0],b=makeBody(x,y,false,base);
 b.r=Math.max(11,base.id==='c4'?15:12);b.mass*=.88;b.vx+=(x<360?1:-1)*(2.1+Math.random()*1.3);b.vy=-(4.5+Math.random()*1.5);
 b.life=5200;b.helper=true;b.fromArchive=true;state.echoes.push(b);
 if(state.echoes.length>9)state.echoes.shift();
 return b
}
function manualPushOrgan(o,p,t){
 o.pulse=1;o.awake=true;wave(o.x,o.y,o.side==='L'?'teal':'amber');particles(o.x,o.y,9,o.side==='L'?'teal':'amber');tone(o.side==='L'?295:335,.045,'triangle',.018,36);
 if(o.id==='archive'){
   if(state.package && !o.storedCreature){
     o.storedCreature=state.package.creature.id;o.stored=state.package.creature.name;say('ARCHIVE STORED · '+state.package.creature.name,'good')
   }else if(o.storedCreature){
     const helper=releaseStoredCreature(o.x+(o.side==='L'?34:-34),o.y-10,o.storedCreature);
     say('ARCHIVE RELEASE · '+(o.stored||helper.name),'hit');o.storedCreature=null;o.stored=null
   }else say('ARCHIVE EMPTY','good')
 }else if(o.id==='route'){
   const order=['left','cross','right','deep'],cur=state.package?.path?.effect||'deep',next=order[(order.indexOf(cur)+1)%order.length];
   if(state.package){const pth=bodypaths.find(x=>x.kind===next);if(pth){state.package.path=pth;pth.open=true;pth.pulse=1}}
   say('ROUTE PUSH · '+next.toUpperCase(),'good')
 }else if(o.id==='reel'){
   if(state.package){
     const options=shards.filter(s=>s.id!==state.package.shard.id);state.package.shard=options[Math.floor(Math.random()*options.length)];
     say('REEL PUSH · '+state.package.shard.short,'good')
   }else say('REEL IDLE','good')
 }else if(o.id==='port'){
   const layer=sediments.find(s=>!s.broken);
   if(layer){layer.weakX=clamp(p.x,layer.x1+34,layer.x2-34);layer.pulse=1}
   if(state.main&&state.phase==='live'){state.main.vy=-Math.max(5.0,Math.abs(state.main.vy)*.45+2.0);state.main.vx+=(state.main.x<360?.5:-.5)}
   say(layer?'WAKE PORT · SEAM MOVED':'WAKE PORT · RETURN','good')
 }
 syncUI();buzz(7)
}
