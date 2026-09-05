function drawEchoMemory(b,t,i){
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.spin*.45);ctx.globalAlpha=.56;
 const teal=(i%2===0),c=teal?'#78ddd5':'#d9b674';
 ctx.strokeStyle=c;ctx.lineWidth=2.4;ctx.fillStyle=teal?'rgba(84,221,213,.10)':'rgba(217,180,116,.10)';
 ctx.beginPath();ctx.ellipse(0,0,10,6,.25,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.arc(-3,0,7,Math.PI*.25,Math.PI*1.75);ctx.stroke();
 ctx.beginPath();ctx.arc(3,0,7,Math.PI*1.25,Math.PI*.75,true);ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,14+Math.sin(t/130+i)*1.5,0,Math.PI*2);ctx.strokeStyle=teal?'rgba(84,221,213,.14)':'rgba(217,180,116,.14)';ctx.lineWidth=1;ctx.stroke();
 ctx.restore()
}
function drawBodies(t){
 const main=state.main;
 if(main&&!main.dead){
   if(main.trail.length>1){ctx.save();ctx.lineCap='round';ctx.lineWidth=3;const start=Math.max(1,main.trail.length-6);for(let i=start;i<main.trail.length;i++){ctx.globalAlpha=(i-start+1)/(main.trail.length-start+1)*.13;ctx.strokeStyle='rgba(80,228,221,.72)';ctx.beginPath();ctx.moveTo(main.trail[i-1].x,main.trail[i-1].y);ctx.lineTo(main.trail[i].x,main.trail[i].y);ctx.stroke()}ctx.restore()}
   drawCreature(main,t)
 }
 state.echoes.filter(b=>!b.dead).forEach((b,i)=>drawEchoMemory(b,t,i))
}
function drawFlick(t){ctx.save();ctx.strokeStyle='rgba(215,179,111,.78)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(150,850);ctx.lineTo(570,850);ctx.stroke();ctx.fillStyle='#d9b46d';ctx.textAlign='center';ctx.font='900 14px system-ui';ctx.fillText('FLICKLINE',360,840);if(state.phase==='aim'&&state.main){const dx=state.main.x-state.aim.x,dy=state.main.y-state.aim.y,mag=Math.hypot(dx,dy),p=clamp(mag/185,0,1);ctx.strokeStyle=p>.7?'#ffb24c':'#55ddd5';ctx.lineWidth=4;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(state.main.x,state.main.y);ctx.lineTo(state.main.x+dx*1.2,state.main.y+dy*1.2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f3ecd9';ctx.font='800 11px system-ui';ctx.fillText('WAKEFLICK '+Math.round(p*100)+'%',360,890)}ctx.restore()}
function drawReel(){
 ctx.save();ctx.fillStyle='rgba(4,16,21,.58)';ctx.fillRect(0,0,W,H);
 // physical specimen-scanner / carousel
 rr(105,298,510,286,28,'#102a2d','rgba(217,180,109,.62)',3);rr(126,320,468,238,20,'#081e24','rgba(85,221,213,.22)',1);
 ctx.textAlign='center';ctx.fillStyle='#e2cf9b';ctx.font='700 22px Georgia';ctx.fillText('BONE REEL',360,355);ctx.fillStyle='#78dcd2';ctx.font='700 9px system-ui';ctx.fillText('MUSEUM BONE ROOM · SPECIMEN SCAN',360,376);ctx.fillStyle='#d9bd7f';ctx.font='800 8px system-ui';ctx.fillText('MOMENT CONDITION · '+leaders[state.leaderIndex].name.toUpperCase()+' / '+leaders[state.leaderIndex].verb,360,394);
 const labels=['CREATURE','FOSSIL','BODYPATH','INSTINCT'];
 for(let i=0;i<4;i++){
   const x=215+i*96,active=(state.reelIndex%4)===i;ctx.save();ctx.translate(x,435);ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.fillStyle=active?'rgba(255,178,76,.16)':'rgba(85,221,213,.08)';ctx.fill();ctx.strokeStyle=active?'#ffb24c':'rgba(217,180,109,.42)';ctx.lineWidth=active?4:2;ctx.stroke();
   ctx.fillStyle=active?'#ffd38f':'#c7b992';ctx.font='900 11px system-ui';ctx.fillText(['◉','◆','↯','≈'][i],0,5);ctx.restore();ctx.fillStyle='#aebdbc';ctx.font='700 7px system-ui';ctx.fillText(labels[i],x,485);
 }
 // scanner arm and reel axle
 ctx.strokeStyle='#b69458';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(150,515);ctx.lineTo(570,515);ctx.stroke();ctx.fillStyle='#55ddd5';ctx.beginPath();ctx.arc(360,515,9,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#f2ecd9';ctx.font='800 14px system-ui';ctx.fillText(ui.dropName.textContent,360,540);ctx.fillStyle='#a8bbbc';ctx.font='10px system-ui';ctx.fillText('prepared odds enter · awakening still answers back',360,565);
 ctx.restore()
}
function drawWin(){
 ctx.save();ctx.fillStyle='rgba(4,16,21,.70)';ctx.fillRect(0,0,W,H);rr(105,300,510,270,26,'#102b2e','rgba(217,180,109,.70)',3);
 ctx.textAlign='center';ctx.fillStyle='#e8d4a5';ctx.font='700 17px Georgia';ctx.fillText('MUSEUM BONE ROOM',360,346);ctx.fillStyle='#f2dfb5';ctx.font='700 36px Georgia';ctx.fillText('CORE BROKEN',360,402);ctx.fillStyle='#55ddd5';ctx.font='900 12px system-ui';ctx.fillText('FIRST WAKE COMPLETE',360,436);
 ctx.fillStyle='#a9bbbd';ctx.font='11px system-ui';ctx.fillText(`BEST CHAIN ${state.bestChain} · CONTACTS ${state.contacts}`,360,478);ctx.fillText('The room settles. The awakened board keeps its trace.',360,507);ctx.fillStyle='#d9c693';ctx.fillText('Tap the arena to wake another round.',360,540);ctx.restore()
}
