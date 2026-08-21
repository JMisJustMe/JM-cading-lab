function updateWorld(dt){
 time+=dt;toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');
 player.fireCd=Math.max(0,player.fireCd-dt);player.scan=Math.max(0,player.scan-dt);player.scanCd=Math.max(0,player.scanCd-dt);player.phase=Math.max(0,player.phase-dt);player.invuln=Math.max(0,player.invuln-dt);player.shake=Math.max(0,player.shake-dt);player.aimKick=Math.max(0,player.aimKick-dt);
 if(player.reload>0){player.reload-=dt;if(player.reload<=0){player.ammo=20;toast('PULSE READY')}}
 doors.forEach(d=>{d.open+=(d.target-d.open)*Math.min(1,dt*3.4)});
 promptTarget=null;let nearest=9;
 terminals.forEach(t=>{if(t.active)return;const d=Math.hypot(t.x-player.x,t.y-player.y);if(d<1.35&&d<nearest){nearest=d;promptTarget={kind:'terminal',ref:t}}});
 if(promptTarget){ui.prompt.textContent=`HOLD TRACE | ${Math.round(promptTarget.ref.progress*100)}%`;ui.prompt.classList.add('show');ui.act.style.display='block'}else{ui.prompt.classList.remove('show');ui.act.style.display='none'}
 if(extraction.active&&Math.hypot(extraction.x-player.x,extraction.y-player.y)<.85){player.score+=1200;end(true);return}
 for(const e of enemies){if(e.dead)continue;if(testFreeze)continue;e.cool-=dt;e.stun=Math.max(0,e.stun-dt);const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy),see=d<9.5&&los(e.x,e.y,player.x,player.y);if(see)e.state='engage';else if(d<6)e.state='seek';
   if(e.stun<=0){let mx=0,my=0;if(e.state==='engage'){
      if(e.type==='sentry'){if(d>5.3){mx=dx/d;my=dy/d}else if(d<3.5){mx=-dx/d;my=-dy/d}}
      else if(e.type==='flanker'){const ideal=3.4;mx=dx/d*.32+(-dy/d)*e.strafe*.88;my=dy/d*.32+(dx/d)*e.strafe*.88;if(d<ideal){mx-=dx/d*.6;my-=dy/d*.6}}
      else {mx=dx/d;my=dy/d;if(d<2.2){mx*=.2;my*=.2}}
      if(e.cool<=0&&d<8.5){enemyShoot(e);e.cool=e.type==='sentry'?1.15:1.5+Math.random()*.55}
    } else {mx=Math.cos(time*.4+e.seed)*.25;my=Math.sin(time*.37+e.seed)*.25}
    const sp=e.type==='flanker'?1.16:.82;const nx=e.x+mx*sp*dt,ny=e.y+my*sp*dt;if(circleFree(nx,e.y,.2))e.x=nx;else e.strafe*=-1;if(circleFree(e.x,ny,.2))e.y=ny;else e.strafe*=-1;
   }
   if(d<.48&&player.invuln<=0){damage(14);e.x-=dx/d*.8;e.y-=dy/d*.8}
 }
 for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0||solid(p.x,p.y)){projectiles.splice(i,1);continue}if(Math.hypot(p.x-player.x,p.y-player.y)<.28){if(player.invuln>0){player.score+=35;event('PHASE_DEFLECT');spawnImpact(p.x,p.y,'#aa83ff',6)}else damage(9);projectiles.splice(i,1)}}
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;if(Math.hypot(p.x-player.x,p.y-player.y)<.55){player.ammo=Math.min(20,player.ammo+5);player.hp=Math.min(100,player.hp+4);player.score+=80;event('PICKUP');sound('core');pickups.splice(i,1);continue}if(p.life<=0)pickups.splice(i,1)}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=3*dt;if(p.z<0){p.z=0;p.vz*=-.25}if(p.life<=0)particles.splice(i,1)}
 updateHUD();
}
function damage(n){if(player.invuln>0)return;player.hp-=n;player.invuln=.22;player.shake=.13;run.damage+=n;event('DAMAGE',{amount:n});sound('hurt');vibrate([30,30,30]);toast(`INTEGRITY -${n}`,'#ff6f91');if(player.hp<=0)end(false)}
