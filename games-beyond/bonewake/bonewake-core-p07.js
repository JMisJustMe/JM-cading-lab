function update(dt,t){
 updateFlipperState(dt,t);
 if(state.leverDown){state.tension=clamp(state.tension+.010*dt,0,1);ui.tension.style.width=(state.tension*100)+'%';ui.leverText.textContent=state.tension<.34?'LOW TENSION':state.tension<.67?'MID TENSION':'HIGH TENSION'}
 if(state.phase==='reel'){if(t>=state.reelUntil)finishReel();else if(t-state.reelTick>85){state.reelTick=t;const groups=[creatures,shards,paths,instincts],g=groups[state.reelIndex++%4],p=weightedPick(g,.88);ui.dropName.textContent=p.name;ui.speed.textContent='SCANNING';ui.power.textContent='REEL';ui.trait.textContent='…'}}
 if(state.ancient&&t>=state.ancientUntil){state.ancient=false;state.wake=5;toast('Ancient Wake settled · room memory remains');syncUI()}
 if(state.phase==='live'){
  const bodies=[state.main,...state.echoes].filter(Boolean).filter(b=>!b.dead);bodies.forEach(b=>stepBody(b,dt,t));state.echoes=state.echoes.filter(b=>!b.dead);if(state.main?.dead)state.main=null;
  if(state.chain&&t-state.lastContact>2850)state.chain=0;if(!state.main&&state.echoes.length===0)sleepfall();
 }
 fossils.forEach(f=>f.pulse=Math.max(0,f.pulse-.035*dt));bodypaths.forEach(p=>p.pulse=Math.max(0,p.pulse-.035*dt));sideOrgans.forEach(o=>o.pulse=Math.max(0,o.pulse-.04*dt));sediments.forEach(s=>s.pulse=Math.max(0,s.pulse-.035*dt));state.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.05*dt;p.life-=.035*dt});state.particles=state.particles.filter(p=>p.life>0);state.waves.forEach(w=>{w.r+=6*dt;w.life-=.045*dt});state.waves=state.waves.filter(w=>w.life>0);state.shake*=Math.pow(.88,dt);state.flash*=Math.pow(.86,dt);
 const deepR=Math.max(0,state.cooldown.deep-t),breathR=Math.max(0,state.cooldown.breath-t);ui.deepMeter.style.width=(deepR?100*(1-deepR/7600):100)+'%';ui.breathMeter.style.width=(breathR?100*(1-breathR/8200):100)+'%';ui.deep.classList.toggle('active',t<state.deepUntil);ui.breath.classList.toggle('active',t<state.breathUntil);syncUI();
}
function rr(x,y,w,h,r,fill,stroke,lw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function draw(t){
 const sx=state.shake?(Math.random()-.5)*state.shake:0,sy=state.shake?(Math.random()-.5)*state.shake:0;
 ctx.save();ctx.translate(sx,sy);
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,state.ancient?'#17302c':'#11282b');bg.addColorStop(.48,'#0a2228');bg.addColorStop(1,'#06151b');ctx.fillStyle=bg;ctx.fillRect(-20,-20,W+40,H+40);
 drawMuseumRoom(t);drawRibCage(t);drawPaths(t);drawSediments(t);drawFossils(t);drawSideOrgans(t);drawCore(t);drawEffects(t);drawFlippers(t);drawBodies(t);drawFlick(t);
 if(state.phase==='reel')drawReel();if(state.phase==='win')drawWin();ctx.restore();
 if(state.flash>.01){ctx.fillStyle=`rgba(255,198,113,${state.flash*.16})`;ctx.fillRect(0,0,W,H)}
}
function specimenPlaque(x,y,w,label,sub=''){
 ctx.save();rr(x-w/2,y,w,24,7,'rgba(29,37,32,.88)','rgba(217,180,109,.34)',1);ctx.textAlign='center';ctx.fillStyle='#e2d3aa';ctx.font='700 9px Georgia';ctx.fillText(label,x,y+10);if(sub){ctx.fillStyle='#88cfc8';ctx.font='600 6px system-ui';ctx.fillText(sub,x,y+19)}ctx.restore()
}
