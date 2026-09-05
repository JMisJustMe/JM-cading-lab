function drawRibCage(t){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 const bone='#d9c39a',boneHi='rgba(255,239,203,.48)',boneDark='rgba(55,45,31,.82)';
 // clavicles
 for(const side of [-1,1]){
   ctx.strokeStyle=boneDark;ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(360,244);ctx.quadraticCurveTo(360+side*105,218,360+side*195,260);ctx.stroke();
   ctx.strokeStyle=bone;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(360,244);ctx.quadraticCurveTo(360+side*105,218,360+side*195,260);ctx.stroke()
 }
 // sternum / vertebral keel
 ctx.strokeStyle=boneDark;ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(360,250);ctx.bezierCurveTo(350,350,372,470,358,592);ctx.stroke();
 ctx.strokeStyle=bone;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(360,250);ctx.bezierCurveTo(350,350,372,470,358,592);ctx.stroke();
 for(let i=0;i<7;i++){
   const y=275+i*47,x=360+(i%2?5:-5);
   ctx.beginPath();ctx.ellipse(x,y,12,8,i%2?.18:-.18,0,Math.PI*2);ctx.fillStyle=bone;ctx.fill();ctx.strokeStyle='rgba(83,60,33,.55)';ctx.lineWidth=2;ctx.stroke();
   ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);ctx.fillStyle=i%2?'#e1a34c':'#5de0d6';ctx.fill()
 }
 // six paired ribs, explicitly anatomical.
 for(let i=0;i<6;i++){
   const sy=295+i*48,ey=330+i*50,reach=205-i*9;
   for(const side of [-1,1]){
     const sx=360+side*7,ex=360+side*reach;
     const c1x=360+side*(85+i*3),c1y=sy-18;
     const c2x=360+side*(166-i*4),c2y=ey-4;
     ctx.strokeStyle=boneDark;ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,ex,ey);ctx.stroke();
     ctx.strokeStyle=bone;ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(c1x,c1y,c2x,c2y,ex,ey);ctx.stroke();
     ctx.strokeStyle=boneHi;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(sx+side*2,sy-2);ctx.bezierCurveTo(c1x,c1y-2,c2x,c2y-2,ex,ey-2);ctx.stroke()
   }
 }
 ctx.restore()
}

function drawFossils(t){
 fossils.forEach((f,i)=>{
  const teal=f.c==='teal',c=teal?'#49d4cd':'#eda14a',pulse=f.awake?1+.045*Math.sin(t/150+i):1+f.pulse*.12;
  ctx.save();ctx.translate(f.x,f.y);ctx.scale(pulse,pulse);
  // glass specimen case: brass museum housing + living internal light
  ctx.beginPath();ctx.arc(0,0,f.r+13,0,Math.PI*2);ctx.fillStyle='rgba(4,15,18,.96)';ctx.fill();ctx.strokeStyle='rgba(216,177,108,.62)';ctx.lineWidth=4;ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,f.r+9,0,Math.PI*2);ctx.strokeStyle=teal?'rgba(80,228,221,.18)':'rgba(243,169,71,.18)';ctx.lineWidth=7;ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,f.r+5,0,Math.PI*2);ctx.fillStyle=teal?'rgba(44,112,111,.15)':'rgba(151,92,36,.16)';ctx.fill();ctx.strokeStyle=teal?'rgba(85,221,213,.52)':'rgba(255,178,76,.52)';ctx.lineWidth=f.awake?4:2;ctx.stroke();
  // actual specimen silhouette: ribs on left/teal, vertebra/amber seed on right
  if(teal){
   ctx.strokeStyle=f.awake?'#aaf7ec':'#8dbbb5';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(0,17);ctx.stroke();
   for(let r=-10;r<=10;r+=5){ctx.beginPath();ctx.arc(-1,r,10+Math.abs(r)*.25,.1,Math.PI-.1);ctx.stroke()}
  }else{
   ctx.fillStyle=f.awake?'#ffd18a':'#b7925c';for(let y=-14;y<=14;y+=7){ctx.beginPath();ctx.ellipse(0,y,8,5,0,0,Math.PI*2);ctx.fill()}
   ctx.strokeStyle='#7fe5d9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(0,17);ctx.stroke();
  }
  if(f.awake){
    ctx.beginPath();ctx.arc(0,0,f.r+18+Math.sin(t/120+i)*3,0,Math.PI*2);ctx.strokeStyle=teal?'rgba(85,221,213,.33)':'rgba(255,178,76,.32)';ctx.lineWidth=3;ctx.stroke();
    for(let a=0;a<4;a++){const ang=a*Math.PI/2+t*.00022;ctx.save();ctx.rotate(ang);ctx.fillStyle=teal?'rgba(85,221,213,.38)':'rgba(255,178,76,.38)';ctx.fillRect(f.r+7,-3,22,6);ctx.beginPath();ctx.arc(f.r+30,0,5,0,Math.PI*2);ctx.fill();ctx.restore()}
    // Memory answer is part of the specimen's visible body.
    ctx.fillStyle='#ead8ad';ctx.font='800 7px system-ui';ctx.textAlign='center';ctx.fillText(f.memory||'AWAKE',0,f.r+28);
  }
  ctx.restore();
 })
}
function drawSediments(t){
 ctx.save();ctx.textAlign='center';
 sediments.forEach((s,i)=>{
   const y=s.y,ratio=s.hp/s.maxHp;
   if(s.broken){
     // excavated gap: fragments stay as history around the opening.
     ctx.fillStyle='rgba(118,94,60,.38)';
     for(let k=0;k<7;k++){const x=s.x1+20+k*((s.x2-s.x1-40)/6);ctx.save();ctx.translate(x,y+(k%2?8:-7));ctx.rotate((k-3)*.08);ctx.fillRect(-9,-3,18,6);ctx.restore()}
     ctx.fillStyle='rgba(82,225,215,.55)';ctx.font='800 7px system-ui';ctx.fillText('EXCAVATED · '+s.name,360,y+3);
     return
   }
   const pulse=.16+s.pulse*.22;
   const g=ctx.createLinearGradient(s.x1,y,s.x2,y);g.addColorStop(0,'#594632');g.addColorStop(.5,'#866b49');g.addColorStop(1,'#55422f');
   rr(s.x1,y-s.h/2,s.x2-s.x1,s.h,8,g,'rgba(222,196,142,.45)',2);
   // strata line + crack field
   ctx.strokeStyle='rgba(37,28,18,.65)';ctx.lineWidth=2;
   for(let x=s.x1+28;x<s.x2-20;x+=46){ctx.beginPath();ctx.moveTo(x,y-s.h/2+3);ctx.lineTo(x+8,y-1);ctx.lineTo(x-2,y+s.h/2-3);ctx.stroke()}
   // weak seam is visible and meaningful.
   ctx.strokeStyle=`rgba(80,228,221,${.48+pulse})`;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s.weakX-10,y-8);ctx.lineTo(s.weakX+2,y);ctx.lineTo(s.weakX-5,y+8);ctx.stroke();
   ctx.beginPath();ctx.arc(s.weakX,y,6+s.pulse*5,0,Math.PI*2);ctx.strokeStyle=`rgba(80,228,221,${.22+pulse})`;ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#ead8ad';ctx.font='800 7px system-ui';ctx.fillText('LAYER '+(i+1)+' · '+s.name,360,y-2);
   ctx.fillStyle='#84cbc5';ctx.font='700 6px system-ui';ctx.fillText(Math.ceil(s.hp)+' / '+s.maxHp,360,y+7);
 });
 ctx.restore()
}

function drawSideOrgans(t){
 ctx.save();ctx.textAlign='center';
 for(const o of sideOrgans){
   const teal=o.side==='L',c=teal?'#55ddd5':'#f3a947',glow=o.awake?.34:.12;
   ctx.beginPath();ctx.arc(o.x,o.y,o.r+7,0,Math.PI*2);ctx.fillStyle='rgba(3,15,19,.94)';ctx.fill();ctx.strokeStyle='rgba(216,177,108,.46)';ctx.lineWidth=3;ctx.stroke();
   ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.strokeStyle=c;ctx.lineWidth=o.awake?4:2;ctx.globalAlpha=.55+o.pulse*.35;ctx.stroke();ctx.globalAlpha=1;
   // functional glyphs
   ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=2.5;
   if(o.id==='archive'){ctx.beginPath();ctx.arc(o.x,o.y,10,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(o.x-9,o.y);ctx.lineTo(o.x+9,o.y);ctx.moveTo(o.x,o.y-9);ctx.lineTo(o.x,o.y+9);ctx.stroke()}
   else if(o.id==='route'){ctx.beginPath();ctx.moveTo(o.x-11,o.y+7);ctx.quadraticCurveTo(o.x,o.y-12,o.x+11,o.y+5);ctx.stroke();ctx.beginPath();ctx.moveTo(o.x+5,o.y-1);ctx.lineTo(o.x+11,o.y+5);ctx.lineTo(o.x+4,o.y+8);ctx.stroke()}
   else if(o.id==='reel'){for(let a=0;a<6;a++){ctx.beginPath();ctx.arc(o.x+Math.cos(a*Math.PI/3)*7,o.y+Math.sin(a*Math.PI/3)*7,3,0,Math.PI*2);ctx.fill()}}
   else {ctx.beginPath();ctx.moveTo(o.x,o.y+12);ctx.lineTo(o.x,o.y-12);ctx.moveTo(o.x,o.y-12);ctx.lineTo(o.x-7,o.y-4);ctx.moveTo(o.x,o.y-12);ctx.lineTo(o.x+7,o.y-4);ctx.stroke()}
   ctx.fillStyle='#e6d4aa';ctx.font='800 6.5px system-ui';ctx.fillText(o.label,o.x,o.y+o.r+17);
   ctx.fillStyle='#80b9b5';ctx.font='600 5.5px system-ui';ctx.fillText(o.sub,o.x,o.y+o.r+26);if(o.storedCreature){ctx.beginPath();ctx.arc(o.x+o.r-3,o.y-o.r+3,5,0,Math.PI*2);ctx.fillStyle='#f3d28f';ctx.fill();ctx.strokeStyle='rgba(4,18,22,.9)';ctx.lineWidth=1.2;ctx.stroke();}
 }
 ctx.restore()
}
