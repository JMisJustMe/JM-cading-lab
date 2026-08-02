function updateControlMode(){
  const flow=controlMode==='flow';
  $('joy').classList.toggle('flow',flow);
  $('joy').dataset.label=flow?'STEER / TEMPO':'MOVE';
  ui.flow.textContent=flow?'FREE':'FLOW';
  ui.flow.style.color=flow?'#ffd36d':'#e9fbff';
  event('CONTROL_MODE',{mode:controlMode});
}
function toggleFlow(){
  controlMode=controlMode==='free'?'flow':'free';
  updateControlMode();
  toast(controlMode==='flow'?'AUTO FLOW MOUNTED':'FREE BODY MOUNTED',controlMode==='flow'?'#ffd36d':'#65e7ff');
}
function updateInput(dt){
  let f,s,speed=2.7;
  if(controlMode==='flow'){
    const tempo=Math.max(.34,Math.min(1.55,1-joyState.y*.72));
    f=1;s=joyState.x*.62;speed=2.45*tempo;
    player.a+=joyState.x*dt*1.18;
  }else{
    f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joyState.y;
    s=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joyState.x;
    if(keys.ControlLeft||keys.ControlRight)speed=1.6;
  }
  const moving=Math.hypot(f,s)>.05;if(moving){const n=norm(f,s);f=n[0];s=n[1]}
  let dx=(Math.cos(player.a)*f+Math.cos(player.a+Math.PI/2)*s)*speed*dt;
  let dy=(Math.sin(player.a)*f+Math.sin(player.a+Math.PI/2)*s)*speed*dt;
  if(player.phase>0){dx*=2.7;dy*=2.7}
  if(circleFree(player.x+dx,player.y,.24))player.x+=dx;if(circleFree(player.x,player.y+dy,.24))player.y+=dy;
  if(moving){player.bob+=dt*(player.phase>0?15:8);player.step+=dt;if(player.step>.45){player.step=0;soundStep()}}else player.bob+=dt*2;
  if(keys.KeyE||interactHeld||interactTouch)doInteract(dt);else terminals.forEach(t=>{if(!t.active)t.progress=Math.max(0,t.progress-dt*.55)});
}
function soundStep(){}
function doInteract(dt){
  if(!promptTarget)return;
  if(promptTarget.kind==='terminal'){
    const t=promptTarget.ref;t.progress+=dt;if(t.progress>=1&&!t.active){t.active=true;t.progress=1;player.cores++;player.score+=750;run.cores++;event('CORE_MOUNT',{id:t.id});sound('core');vibrate([40,40,80]);toast(`TRACE CORE ${t.id} MOUNTED`);if(player.cores===1){doors[0].target=1;doors[1].locked=false}else if(player.cores===2){doors.forEach(d=>d.target=1);setTimeout(()=>extraction.active=true,700)}}
  }
}
function phase(){if(!running||player.phase>0)return;player.phase=.48;player.invuln=.55;run.phases++;player.score+=20;event('PHASE');sound('phase');vibrate(25);toast('PHASE ROUTE','#aa83ff')}
function scan(){if(!running||player.scanCd>0)return;player.scan=3;player.scanCd=7;run.scans++;event('SCAN');sound('scan');toast('PERCEPTION OPEN','#82ffd0')}
function switchSide(){player.side=player.side===1?-1:player.side===-1?0:1;event('EXTENSION_SIDE',{side:player.side});toast(player.side===0?'EXTENSION CENTRE':player.side<0?'EXTENSION LEFT':'EXTENSION RIGHT','#65e7ff')}
function fire(){
 if(!running||player.fireCd>0||player.reload>0)return;if(player.ammo<=0){reload();return}
 player.ammo--;player.fireCd=.13;player.aimKick=.08;player.shake=.045;run.shots++;sound('fire');vibrate(8);event('PULSE');
 let best=null,bestMetric=1e9,bestHead=false;
 for(const e of enemies){
   if(e.dead)continue;
   const p=projectSprite(e.x,e.y,.58);
   if(!p||!visibleAt(p)||!los(player.x,player.y,e.x,e.y))continue;
   const targetX=p.x,bodyY=p.y+p.size*.22,headY=p.y+p.size*.06;
   const dx=Math.abs(targetX-rw*.5),bodyDy=Math.abs(bodyY-rh*.5),headDy=Math.abs(headY-rh*.5);
   const xGate=Math.max(10,p.size*.17),yGate=Math.max(13,p.size*.24);
   if(dx<xGate&&bodyDy<yGate){const head=headDy<Math.max(8,p.size*.095);const metric=dx+bodyDy*.8+p.dist*.04;if(metric<bestMetric){bestMetric=metric;best=e;bestHead=head}}
 }
 if(best){const head=bestHead;const dmg=head?22:12;best.hp-=dmg;best.stun=.17;run.hits++;player.score+=head?90:45;event('HIT',{type:best.type,damage:dmg,critical:head,pitch:+player.pitch.toFixed(3)});sound('hit');spawnImpact(best.x,best.y,head?'#ffd36d':'#65e7ff');toast(head?'CRITICAL CONTACT':'CONTACT',head?'#ffd36d':'#82ffd0');if(best.hp<=0)killEnemy(best)}
 if(player.ammo===0)reload();updateHUD();
}
function reload(){if(player.reload>0)return;player.reload=1.05;event('RELOAD');toast('PULSE REFORMING','#8caab7')}
function killEnemy(e){e.dead=true;run.kills++;player.score+=260;event('THREAT_CLEARED',{type:e.type});pickups.push({x:e.x,y:e.y,life:14});spawnImpact(e.x,e.y,'#ff6f91',18)}
function spawnImpact(x,y,color,n=10){for(let i=0;i<n;i++)particles.push({x,y,z:.45+Math.random()*.7,vx:(Math.random()-.5)*1.8,vy:(Math.random()-.5)*1.8,vz:Math.random()*1.8,life:.45+Math.random()*.45,color})}
function enemyShoot(e){const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);projectiles.push({x:e.x,y:e.y,z:.52,vx:dx/d*3.4,vy:dy/d*3.4,life:3.2,owner:e});event('INCOMING',{type:e.type})}
