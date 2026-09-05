'use strict';
function drawMuseumRoom(t){
 // Approved Museum Bone Room face: living natural-history machine, code-driven.
 ctx.save();
 // deep stone field
 const bg=ctx.createRadialGradient(360,420,70,360,430,520);
 bg.addColorStop(0,'#0b3032');bg.addColorStop(.38,'#08252a');bg.addColorStop(.74,'#06191e');bg.addColorStop(1,'#030e12');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 // fossil shadow strata
 for(let y=88;y<870;y+=38){ctx.strokeStyle='rgba(234,214,170,.025)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(54,y);ctx.bezierCurveTo(220,y-8,500,y+9,666,y);ctx.stroke()}
 // side museum columns / arch shoulders
 for(const side of [-1,1]){
   const x=side<0?55:665;
   ctx.fillStyle='rgba(70,55,35,.40)';ctx.strokeStyle='rgba(216,177,108,.25)';ctx.lineWidth=2;
   ctx.beginPath();ctx.roundRect(x-18,118,36,620,15);ctx.fill();ctx.stroke();
   for(let yy=165;yy<700;yy+=112){ctx.beginPath();ctx.arc(x,yy,9,0,Math.PI*2);ctx.fillStyle='rgba(243,169,71,.09)';ctx.fill();ctx.strokeStyle='rgba(216,177,108,.22)';ctx.stroke()}
 }
 // overhead fossil arch
 ctx.strokeStyle='rgba(216,177,108,.30)';ctx.lineWidth=12;ctx.beginPath();ctx.arc(360,228,252,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
 ctx.strokeStyle='rgba(80,228,221,.08)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(360,228,239,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
 // outer cabinet and inset brass tracks
 const wood=ctx.createLinearGradient(0,0,W,0);wood.addColorStop(0,'#2e261c');wood.addColorStop(.18,'#655034');wood.addColorStop(.5,'#2d2b25');wood.addColorStop(.82,'#6a5131');wood.addColorStop(1,'#2c251c');
 ctx.strokeStyle='#5d4a31';ctx.lineWidth=24;ctx.beginPath();ctx.roundRect(24,48,672,824,42);ctx.stroke();ctx.strokeStyle='rgba(232,201,137,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(34,58,652,804,36);ctx.stroke();
 if(state.ancient){
   ctx.strokeStyle=`rgba(255,178,76,${.18+.07*Math.sin(t/180)})`;ctx.lineWidth=7;
   ctx.beginPath();ctx.roundRect(41,65,638,790,31);ctx.stroke()
 }
 // subtle stone / museum floor panels
 for(let y=100;y<830;y+=58){ctx.strokeStyle='rgba(222,208,175,.035)';ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(650,y+((y/58)%2?8:-8));ctx.stroke()}
 // central specimen-spine chassis: segmented anatomy, not a straight gameplay rail.
 ctx.strokeStyle='rgba(217,180,109,.16)';ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(360,238);ctx.bezierCurveTo(347,340,374,480,356,610);ctx.stroke();
 for(let y=270,i=0;y<650;y+=54,i++){
   const x=360+(i%2?-7:7);
   ctx.beginPath();ctx.ellipse(x,y,7,5,(i%2?-.25:.25),0,Math.PI*2);ctx.fillStyle='rgba(127,107,69,.78)';ctx.fill();
   ctx.strokeStyle='rgba(85,221,213,.17)';ctx.lineWidth=1.5;ctx.stroke()
 }
 // rib galleries: repeated articulated ribs around the upper/mid field
 ctx.lineCap='round';
 for(let i=0;i<7;i++){
   const yy=245+i*62,spread=84+i*15;
   ctx.strokeStyle=i%2?'rgba(190,157,98,.34)':'rgba(221,191,126,.42)';ctx.lineWidth=7;
   ctx.beginPath();ctx.moveTo(360,yy-18);ctx.quadraticCurveTo(300-spread*.45,yy-8,135,yy+52);ctx.stroke();
   ctx.beginPath();ctx.moveTo(360,yy-18);ctx.quadraticCurveTo(420+spread*.45,yy-8,585,yy+52);ctx.stroke();
   ctx.strokeStyle='rgba(85,221,213,.08)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(360,yy-18);ctx.quadraticCurveTo(300-spread*.45,yy-8,135,yy+52);ctx.stroke();ctx.beginPath();ctx.moveTo(360,yy-18);ctx.quadraticCurveTo(420+spread*.45,yy-8,585,yy+52);ctx.stroke();
 }
 // museum display-case glints and amber preserved cells
 for(const [x,y] of [[95,210],[625,210],[92,565],[628,565]]){ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.fillStyle='rgba(255,178,76,.09)';ctx.fill();ctx.strokeStyle='rgba(217,180,109,.28)';ctx.stroke()}
 // Bone Slip side pockets are live capture/return organs.
 const slipL=[state.main,...state.echoes].filter(Boolean).some(b=>b.slip?.side==='L'),slipR=[state.main,...state.echoes].filter(Boolean).some(b=>b.slip?.side==='R');
 ctx.fillStyle='rgba(5,18,23,.80)';ctx.strokeStyle='rgba(217,180,109,.38)';ctx.lineWidth=2;
 rr(55,655,92,70,24,slipL?'rgba(39,103,104,.46)':'rgba(8,26,31,.82)',slipL?'rgba(85,221,213,.68)':'rgba(217,180,109,.32)',slipL?4:2);
 rr(573,655,92,70,24,slipR?'rgba(126,82,34,.46)':'rgba(8,26,31,.82)',slipR?'rgba(255,178,76,.70)':'rgba(217,180,109,.32)',slipR?4:2);
 if(slipL){ctx.strokeStyle='rgba(85,221,213,.40)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(101,690);ctx.quadraticCurveTo(55,585,165,620);ctx.stroke()}
 if(slipR){ctx.strokeStyle='rgba(255,178,76,.40)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(619,690);ctx.quadraticCurveTo(665,585,555,620);ctx.stroke()}
 ctx.fillStyle='#d8c48f';ctx.font='700 8px Georgia';ctx.textAlign='center';ctx.fillText('BONE SLIP',101,695);ctx.fillText('BONE SLIP',619,695);
 // Room plaques / anatomical language
 specimenPlaque(360,72,170,'MUSEUM BONE ROOM','FIRST WAKE');
 specimenPlaque(165,118,118,'RIB GALLERY');specimenPlaque(555,118,118,'SPINE RUN');
 specimenPlaque(360,715,120,'WAKE CHAMBER');
 // fossil fragments / specimens embedded in the lower room
 const debris=[[120,610,16,.3],[178,650,12,-.4],[240,625,10,.9],[302,675,14,.1],[420,650,12,-.7],[485,620,15,.5],[545,675,11,-.2],[605,610,13,.8]];
 for(const [x,y,s,a] of debris){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle='rgba(229,207,158,.28)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-s,0);ctx.quadraticCurveTo(0,-s*.45,s,0);ctx.quadraticCurveTo(0,s*.45,-s,0);ctx.stroke();ctx.restore()}
 // teal fault-light: the museum itself is under pressure.
 ctx.strokeStyle='rgba(80,228,221,.16)';ctx.lineWidth=3;
 for(const pts of [[[84,740],[115,705],[104,670],[136,642]],[[636,742],[604,710],[618,672],[590,640]],[[330,760],[348,724],[338,698],[356,666]]]){
   ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);ctx.stroke()
 }
 // accumulated fossil memory becomes visible archive marks in the room.
 if(state.roomMemory.length){
   ctx.textAlign='left';ctx.font='800 7px system-ui';
   state.roomMemory.slice(0,5).forEach((m,i)=>{
     const y=180+i*28;ctx.fillStyle=i%2?'rgba(243,169,71,.62)':'rgba(80,228,221,.62)';
     ctx.fillText('MEMORY '+(i+1)+' · '+m.memory,72,y)
   })
 }
 // little accession ticks around cabinet
 ctx.strokeStyle='rgba(217,180,109,.22)';ctx.lineWidth=1;for(let y=140;y<760;y+=54){ctx.beginPath();ctx.moveTo(44,y);ctx.lineTo(57,y);ctx.stroke();ctx.beginPath();ctx.moveTo(663,y);ctx.lineTo(676,y);ctx.stroke()}
 ctx.restore();
}
function drawPaths(t){
 const selected=state.package?.path.effect;ctx.save();ctx.lineCap='round';
 const route=(k,c,fn)=>{const p=bodypaths.find(x=>x.kind===k),on=p.awake||p.open||selected===k;
   ctx.strokeStyle='rgba(23,42,42,.95)';ctx.lineWidth=20;ctx.setLineDash([]);ctx.beginPath();fn();ctx.stroke();
   ctx.strokeStyle='rgba(217,180,109,.30)';ctx.lineWidth=12;ctx.beginPath();fn();ctx.stroke();
   if(p.awake){ctx.strokeStyle=c.replace('.70','.15');ctx.lineWidth=16+Math.sin(t/120)*2;ctx.beginPath();fn();ctx.stroke()}
   ctx.strokeStyle=on?c:c.replace('.70','.18');ctx.lineWidth=p.awake?7:on?5:2;ctx.setLineDash(p.awake?[]:[7,9]);ctx.lineDashOffset=p.awake?0:-t*.03;ctx.beginPath();fn();ctx.stroke();
 };
 route('left','rgba(84,221,213,.70)',()=>{ctx.moveTo(126,650);ctx.quadraticCurveTo(106,430,256,246)});
 route('right','rgba(255,178,76,.70)',()=>{ctx.moveTo(594,650);ctx.quadraticCurveTo(614,430,464,246)});
 route('cross','rgba(217,180,111,.70)',()=>{ctx.moveTo(178,492);ctx.bezierCurveTo(260,400,460,560,542,492)});
 route('deep','rgba(84,221,213,.70)',()=>{ctx.moveTo(352,602);ctx.bezierCurveTo(346,510,368,385,360,274)});
 // joints make the route read as a bodypath rather than a line graph
 const joints=[[154,560],[190,438],[232,330],[566,560],[530,438],[488,330],[255,460],[360,492],[465,520],[360,360],[360,550]];
 for(const [x,y] of joints){ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle='#8e7650';ctx.fill();ctx.strokeStyle='rgba(85,221,213,.24)';ctx.lineWidth=2;ctx.stroke()}
 ctx.restore()
}
