
function drawCore(t){
 const health=clamp(state.core/100,0,1),wakeOpen=state.ancient?.42:state.wake>=4?.26:state.wake>=2?.12:0,open=(1-health)*.30+wakeOpen,pulse=1+(state.ancient?.05*Math.sin(t/90):.012*Math.sin(t/230));
 ctx.save();ctx.translate(core.x,core.y);ctx.scale(pulse,pulse);

 // Vertebral cage around a living amber marrow core — bone identity without skull/horror.
 ctx.beginPath();ctx.arc(0,0,64,0,Math.PI*2);ctx.fillStyle='#061a1e';ctx.fill();ctx.strokeStyle='rgba(216,177,108,.66)';ctx.lineWidth=4;ctx.stroke();
 for(let i=0;i<6;i++){
   const a=i*Math.PI/3,rad=42+open*10;ctx.save();ctx.rotate(a);ctx.translate(rad,0);
   ctx.fillStyle='#d9c39a';ctx.strokeStyle='rgba(72,52,31,.72)';ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(0,0,14,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(-5,-8);ctx.lineTo(0,-17-open*6);ctx.lineTo(5,-8);ctx.stroke();
   ctx.restore()
 }
 const g=ctx.createRadialGradient(-7,-9,2,0,0,29);g.addColorStop(0,'#fff0b6');g.addColorStop(.28,'#ffb24c');g.addColorStop(.68,'#ce633d');g.addColorStop(1,'#5a2c24');
 ctx.beginPath();ctx.ellipse(0,0,24,31,0,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,202,108,.75)';ctx.lineWidth=3;ctx.stroke();
 // marrow fissure
 ctx.strokeStyle='#55ddd5';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(-4,-7);ctx.lineTo(3,4);ctx.lineTo(-2,19);ctx.stroke();
 ctx.restore();

 const buried=state.excavated<1?'BURIED':state.ancient?'ANCIENT OPEN':state.wake<2?'STILL SLEEPING':state.wake<4?'LISTENING':'MARROW EXPOSED';
 specimenPlaque(core.x,core.y+75,102,'ENEMY MARROW CORE',buried);
}
function drawEffects(t){
 if(t<state.deepUntil){
   ctx.save();ctx.strokeStyle='rgba(84,221,213,.28)';ctx.setLineDash([5,10]);ctx.lineWidth=1.5;
   for(const b of [state.main,...state.echoes].filter(Boolean)){ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(core.x,core.y);ctx.stroke()}
   ctx.restore()
 }
 if(t<state.breathUntil){
   ctx.save();ctx.strokeStyle='rgba(84,221,213,.20)';ctx.fillStyle='rgba(84,221,213,.28)';const dir=Math.sin(t/420)>0?1:-1;
   for(let y=320;y<620;y+=105)for(let x=145;x<610;x+=155){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dir*24,y);ctx.stroke();ctx.beginPath();ctx.moveTo(x+dir*24,y);ctx.lineTo(x+dir*17,y-4);ctx.lineTo(x+dir*17,y+4);ctx.closePath();ctx.fill()}
   ctx.restore()
 }
 if(state.package?.shard.effect==='boost'&&state.phase==='live'){
   shardGates.forEach(g=>{if(g.used)return;ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.ang);ctx.fillStyle='#e4bd74';ctx.strokeStyle='rgba(255,178,76,.62)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(10,13);ctx.lineTo(0,8);ctx.lineTo(-10,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()})
 }
 if(state.ancient){
   // Ancient Wake lives in the room: rising fossil-light, not generic target rings.
   ctx.save();
   const pulse=.24+.08*Math.sin(t/190);
   ctx.strokeStyle=`rgba(255,178,76,${pulse})`;ctx.lineWidth=5;ctx.lineCap='round';
   for(const [x0,y0,cx,cy,x1,y1] of [[84,710,120,610,155,540],[636,710,600,610,565,540],[118,300,210,210,300,190],[602,300,510,210,420,190]]){
     ctx.beginPath();ctx.moveTo(x0,y0);ctx.quadraticCurveTo(cx,cy,x1,y1);ctx.stroke()
   }
   ctx.fillStyle=`rgba(255,178,76,${.09+.04*Math.sin(t/150)})`;
   ctx.beginPath();ctx.ellipse(360,455,210,285,0,0,Math.PI*2);ctx.fill();
   ctx.restore()
 }
 state.waves.forEach(w=>{
   if(w.r>86)return;
   ctx.save();ctx.globalAlpha=w.life*.42;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);
   ctx.strokeStyle=w.c==='amber'?'#f0aa50':'#55ddd5';ctx.lineWidth=1.5;ctx.stroke();ctx.restore()
 });
 state.particles.forEach(p=>{ctx.save();ctx.globalAlpha=p.life*.72;ctx.fillStyle=p.c==='amber'?'#ffb24c':'#55ddd5';ctx.beginPath();ctx.arc(p.x,p.y,2.1,0,Math.PI*2);ctx.fill();ctx.restore()})
}
function drawFlippers(t){
 const f=flippers();
 const one=(p,e,left,fs)=>{
   const color=left?'#50e4dd':'#f3a947',bone='#e6d5ae';
   ctx.save();ctx.lineCap='round';
   const dx=e.x-p.x,dy=e.y-p.y;
   ctx.lineWidth=29;ctx.strokeStyle='rgba(4,17,21,.98)';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(e.x,e.y);ctx.stroke();
   const zones=[
     {a:0,b:.34,w:16,c:left?'#70d9d5':'#dca654'},
     {a:.34,b:.70,w:17,c:left?'#a8dfc8':'#e5bd72'},
     {a:.70,b:1,w:18,c:left?'#d7eee2':'#f1d7a1'}
   ];
   zones.forEach(z=>{ctx.strokeStyle=z.c;ctx.lineWidth=z.w;ctx.beginPath();ctx.moveTo(p.x+dx*z.a,p.y+dy*z.a);ctx.lineTo(p.x+dx*z.b,p.y+dy*z.b);ctx.stroke()});
   ctx.strokeStyle=bone;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(e.x,e.y);ctx.stroke();
   for(const z of [.34,.70]){const x=p.x+dx*z,y=p.y+dy*z;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fillStyle='#0d272c';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke()}
   ctx.beginPath();ctx.arc(p.x,p.y,17,0,Math.PI*2);ctx.fillStyle='#0d272c';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
   ctx.beginPath();ctx.arc(e.x,e.y,8,0,Math.PI*2);ctx.fillStyle='#0d272c';ctx.fill();ctx.stroke();
   const pullX=p.x+dx*.08,pullY=p.y+dy*.08;rr(pullX-15,pullY-6,30,7,4,'rgba(3,16,20,.95)','rgba(216,177,108,.28)',1);rr(pullX-14,pullY-5,28*fs.pull,5,3,left?'rgba(85,221,213,.8)':'rgba(243,169,71,.8)','transparent',0);
   const chargeX=p.x+dx*.52,chargeY=p.y+dy*.52;rr(chargeX-18,chargeY-5,36,6,3,'rgba(3,16,20,.92)','rgba(216,177,108,.22)',1);rr(chargeX-17,chargeY-4,34*Math.min(1,Math.max(fs.charge,fs.releaseCharge)),4,2,left?'rgba(125,237,230,.8)':'rgba(255,201,110,.8)','transparent',0);
   if(fs.flick>.02){ctx.beginPath();ctx.arc(e.x,e.y,20+Math.sin(t/80)*2+fs.flick*4,0,Math.PI*2);ctx.strokeStyle=left?'rgba(85,221,213,.34)':'rgba(255,178,76,.34)';ctx.lineWidth=2;ctx.stroke()}
   ctx.restore()
 };
 one(f.lp,f.le,true,f.leftState);one(f.rp,f.re,false,f.rightState);

 ctx.save();ctx.font='800 6px system-ui';ctx.textAlign='center';
 ctx.fillStyle='#9fc9c4';ctx.fillText('BASE CONTROL',190,842);ctx.fillText('MID REBOUND',270,842);ctx.fillText('TIP SPEED',335,842);
 ctx.fillStyle='#e6bd72';ctx.fillText('TIP SPEED',385,842);ctx.fillText('MID REBOUND',455,842);ctx.fillText('BASE CONTROL',530,842);
 ctx.fillStyle='#7fd7cf';ctx.fillText('PULL',170,854);ctx.fillText('CHARGE',250,854);
 ctx.fillStyle='#e6bd72';ctx.fillText('CHARGE',470,854);ctx.fillText('PULL',550,854);
 ctx.restore();
}
function drawCreature(b,t){
 const sc=b.main?1.28:.88,c=state.package?.creature,kind=c?.id||'c1',speed=Math.hypot(b.vx,b.vy);ctx.save();ctx.translate(b.x,b.y);
 let sx=1,sy=1,rot=b.spin;
 if(kind==='c1'){sx=1+.06*Math.sin(t*.018);sy=1-.04*Math.sin(t*.018)}
 else if(kind==='c2'){const flex=.11*Math.sin(t*.026+speed*.18);sx=1-flex;sy=1+flex;rot*=.68}
 else if(kind==='c3'){sx=1+.09*Math.sin(t*.035);sy=.94;rot+=Math.sin(t*.02)*.16}
 else if(kind==='c4'){sx=.98;sy=1.05;rot*=.30}
 else {ctx.translate(Math.sin(t*.05)*2.2,Math.cos(t*.043)*1.5);rot+=Math.sin(t*.04)*.12}
 const impact=b.squash||0;sx*=1+impact*.15;sy*=1-impact*.12;ctx.rotate(rot);ctx.scale(sc*sx,sc*sy);
 ctx.strokeStyle='rgba(255,239,205,.80)';ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';
 if(kind==='c1'){ // Rib Bouncer: barrel body wrapped by ribs
   ctx.fillStyle='#c89550';ctx.beginPath();ctx.ellipse(0,0,18,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#e3c28a';for(let x=-10;x<=10;x+=5){ctx.beginPath();ctx.arc(x,0,8,Math.PI*.35,Math.PI*1.65);ctx.stroke()}ctx.fillStyle='#55ddd5';ctx.beginPath();ctx.arc(8,-3,2.5,0,Math.PI*2);ctx.fill();
 }else if(kind==='c2'){ // Spine Toad: squat body with vertebrae ridge
   ctx.fillStyle='#789b61';ctx.beginPath();ctx.ellipse(0,2,20,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#d5bd79';for(let x=-10;x<=10;x+=5){ctx.beginPath();ctx.ellipse(x,-8,4,3,0,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#55ddd5';ctx.beginPath();ctx.arc(8,-1,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-8,-1,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#789b61';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-14,9);ctx.lineTo(-23,15);ctx.moveTo(14,9);ctx.lineTo(23,15);ctx.stroke();
 }else if(kind==='c3'){ // Gust Ribbit: light finned body
   ctx.fillStyle='#59c8bf';ctx.beginPath();ctx.ellipse(0,0,17,11,.2,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#bcefe5';ctx.beginPath();ctx.moveTo(-6,-8);ctx.lineTo(-20,-20);ctx.lineTo(-17,0);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(6,8);ctx.lineTo(20,20);ctx.lineTo(17,0);ctx.closePath();ctx.fill();ctx.fillStyle='#0b2730';ctx.beginPath();ctx.arc(8,-2,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffcf73';ctx.beginPath();ctx.arc(8,-2,1.4,0,Math.PI*2);ctx.fill();
 }else if(kind==='c4'){ // Shellwake: armored seed
   ctx.fillStyle='#c88e45';ctx.beginPath();ctx.ellipse(0,0,20,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#f0d294';ctx.lineWidth=3;for(let r=5;r<=15;r+=5){ctx.beginPath();ctx.arc(-3,0,r,-1.3,1.3);ctx.stroke()}ctx.fillStyle='#55ddd5';ctx.beginPath();ctx.arc(10,-3,2.5,0,Math.PI*2);ctx.fill();
 }else{ // Fossil Skitter: segmented bug/bodypath runner
   ctx.fillStyle='#baa968';for(let x=-13;x<=13;x+=7){ctx.beginPath();ctx.ellipse(x,0,6,8,0,0,Math.PI*2);ctx.fill();ctx.stroke()}ctx.strokeStyle='#d8c58a';ctx.lineWidth=3;for(const x of [-10,0,10]){ctx.beginPath();ctx.moveTo(x,6);ctx.lineTo(x-7,14);ctx.moveTo(x,6);ctx.lineTo(x+7,14);ctx.stroke()}ctx.fillStyle='#55ddd5';ctx.beginPath();ctx.arc(15,-2,2.5,0,Math.PI*2);ctx.fill();
 }
 // wake halo + movement-language crest: the art exposes the selected body law.
 if(b.main){
   ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.strokeStyle='rgba(85,221,213,.18)';ctx.lineWidth=1.5;ctx.stroke();
   ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.strokeStyle='rgba(239,211,156,.12)';ctx.stroke();
   const L=leaders[state.leaderIndex];ctx.rotate(-rot);ctx.fillStyle='rgba(3,16,20,.80)';ctx.strokeStyle='rgba(216,177,108,.38)';ctx.lineWidth=1;
   ctx.beginPath();ctx.roundRect(-18,19,36,11,5);ctx.fill();ctx.stroke();ctx.fillStyle='#e4c98e';ctx.font='800 6px system-ui';ctx.textAlign='center';ctx.fillText(L.verb,0,27)
 }
 ctx.restore()
}
