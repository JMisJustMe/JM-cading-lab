
function collideSideOrgans(b,t){
 for(const o of sideOrgans){
   const hit={x:o.x,y:o.y,r:o.r};
   reflectCircle(b,hit,Math.min(.70,b.restitution+.04),(nx,ny,impact)=>activateSideOrgan(b,o,t,impact),.86)
 }
}

function pathContact(b,k){
 const selected=state.package?.path.effect===k,L=leaders[state.leaderIndex],w=(selected?36:25)+L.pathWidth;
 if(k==='left'){const x=126+(650-b.y)*.32;return b.y>285&&b.y<670&&Math.abs(b.x-x)<w}
 if(k==='right'){const x=594-(650-b.y)*.32;return b.y>285&&b.y<670&&Math.abs(b.x-x)<w}
 if(k==='cross'){const y=492+Math.sin((b.x-360)/88)*58;return b.x>155&&b.x<565&&Math.abs(b.y-y)<w}
 const deepX=356 + Math.sin((b.y-250)/375*Math.PI*1.15)*8;
 return b.y>250&&b.y<625&&Math.abs(b.x-deepX)<w
}
function awakePathResponse(b,k,dt,t){
 const p=bodypaths.find(x=>x.kind===k);if(!p?.awake||!pathContact(b,k))return;
 p.pulse=1;
 // Bodypaths answer contact locally; they never magnetise a body for the whole turn.
 const last=b.pathTouch[k]||0;if(t-last<220)return;b.pathTouch[k]=t;
 const mass=1/Math.pow(Math.max(.70,b.mass),.20),j=1+contactVariation(b,.035);
 if(k==='left'){b.vx+=.20*mass*j;b.vy-=.28*mass*j}
 else if(k==='right'){b.vx-=.20*mass*j;b.vy-=.28*mass*j}
 else if(k==='cross'){const dir=(b.vx>=0?1:-1);b.vx+=dir*.28*mass*j;b.vy-=.10*mass*j}
 else {b.vy-=.31*mass*j}
 b.spinV+=(k==='left'?-1:k==='right'?1:0)*.007;
}
function startBoneSlip(b,side,t){
 if(b.slip)return;
 b.slip={side,start:t,dur:560,fromX:b.x,fromY:b.y};b.vx=b.vy=0;
 state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.lastContact=t;
 wave(side==='L'?101:619,695,side==='L'?'teal':'amber');particles(side==='L'?101:619,695,10,side==='L'?'teal':'amber');
 say(side==='L'?'LEFT BONE SLIP':'RIGHT BONE SLIP','good');tone(side==='L'?250:300,.08,'triangle',.025,120);buzz(12)
}
function stepBoneSlip(b,t){
 if(!b.slip)return false;
 const s=b.slip,q=clamp((t-s.start)/s.dur,0,1),side=s.side;
 const pocketX=side==='L'?101:619,innerX=side==='L'?72:648,exitX=side==='L'?165:555;
 if(q<.34){const p=q/.34;b.x=s.fromX+(pocketX-s.fromX)*p;b.y=s.fromY+(695-s.fromY)*p}
 else if(q<.72){const p=(q-.34)/.38;b.x=pocketX+(innerX-pocketX)*Math.sin(p*Math.PI);b.y=695-135*Math.sin(p*Math.PI)}
 else {const p=(q-.72)/.28;b.x=pocketX+(exitX-pocketX)*p;b.y=695+(620-695)*p}
 b.spin+=.18;b.squash=.8;
 if(q>=1){
   b.slip=null;b.x=exitX;b.y=620;
   const L=leaders[state.leaderIndex],carry=L.slip/Math.pow(Math.max(.72,b.mass),.22),j=1+contactVariation(b,.04);b.vx=(side==='L'?3.9:-3.9)*carry*j;b.vy=-5.8*carry*j;
   state.lastContact=t;wave(b.x,b.y,side==='L'?'teal':'amber');particles(b.x,b.y,12,side==='L'?'teal':'amber');say('BONE SLIP RETURN','good');tone(390,.06,'sine',.024,130);return false
 }
 return true
}
function sedimentDamage(b,layer,impact,hitX,t){
 let dmg=impact*Math.sqrt(Math.max(.55,b.mass))*1.18;
 if(state.package?.shard?.effect==='boost')dmg*=1.18;
 if(state.package?.creature?.id==='c4')dmg*=1.12;
 const weak=Math.abs(hitX-layer.weakX)<34;
 if(weak)dmg*=1.55;
 dmg=clamp(dmg,1.2,10.5);
 layer.hp=Math.max(0,layer.hp-dmg);layer.pulse=1;

 if(layer.hp<=0&&!layer.broken){
   layer.broken=true;state.excavated=sediments.filter(s=>s.broken).length;
   say('STRATUM '+state.excavated+' BROKEN · '+layer.name,'hit');
   wave(hitX,layer.y,'amber');particles(hitX,layer.y,18,'amber');tone(135+state.excavated*45,.09,'square',.028,120);buzz(18);
   // Breaking through is a state change: let the body continue upward rather than bounce off a vanished wall.
   b.y=layer.y-layer.h/2-b.r-2;b.vy=-Math.max(3.2,Math.abs(b.vy)*.64);b.vx+=(hitX-layer.weakX)*.006;
   state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.lastContact=t;syncUI();return true
 }
 if(meaningfulContact(b,'sediment-'+layer.id,t,170)){
   state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.lastContact=t;
   say((weak?'WEAK SEAM ':'')+layer.name+' '+Math.ceil(layer.hp)+'/'+layer.maxHp,'good')
 }
 return false
}

function collideSediments(b,t){
 for(const layer of sediments){
   if(layer.broken)continue;
   const left=layer.x1,right=layer.x2,top=layer.y-layer.h/2,bottom=layer.y+layer.h/2;
   if(b.x+b.r<left||b.x-b.r>right||b.y+b.r<top||b.y-b.r>bottom)continue;

   // Nearest face, with a preference for vertical collision because layers are horizontal geology.
   const fromAbove=Math.abs((b.y+b.r)-top)<Math.abs((b.y-b.r)-bottom);
   const ny=fromAbove?-1:1,nx=0,impact=Math.abs(b.vy);
   const broke=sedimentDamage(b,layer,impact,b.x,t);
   if(broke)continue;

   if(fromAbove){b.y=top-b.r-1;b.vy=-Math.abs(b.vy)*effectiveRestitution(b,.42,impact)}
   else{b.y=bottom+b.r+1;b.vy=Math.abs(b.vy)*effectiveRestitution(b,.42,impact)}
   postMaterialContact(b,nx,ny,t,.86,impact)
 }
}

function stepBody(b,dt,t){
 if(stepBoneSlip(b,t)){b.trail.push({x:b.x,y:b.y});if(b.trail.length>10)b.trail.shift();return}
 if(b.holdUntil){
   if(t<b.holdUntil){b.spin+=.02*dt;b.squash=.82;return}
   if(b.holdVector){b.vx=b.holdVector.vx;b.vy=b.holdVector.vy;b.holdVector=null}
   b.holdUntil=0
 }

 const c=state.package?.creature||creatures[0];
 if(t<state.deepUntil){
   const dx=core.x-b.x,dy=core.y-b.y,d=Math.hypot(dx,dy)||1;
   const pull=.017/Math.pow(Math.max(.72,b.mass),.20);
   // Deep Call remains deliberate player pressure, but mostly vertical/deep rather than centre snap.
   b.vx+=dx/d*pull*.28*dt;
   b.vy+=dy/d*pull*1.05*dt;
 }
 if(t<state.breathUntil){
   const breath=.024/Math.pow(Math.max(.72,b.mass),.20);b.vx+=Math.sin(t/500+b.temperament.seed)*breath*dt
 }
 if(state.package?.shard.effect==='curve')b.vx+=Math.sin((b.y+t*.045)/82)*.006*dt;

 // Body-specific free motion.
 if(c.id==='c3'&&b.glide){ // Gust Ribbit glides; it does not ping-pong.
   b.vy+=b.gravity*.72*dt;
   if(Math.abs(b.vx)<1.1)b.vx+=Math.sin(t*.008+b.y*.02)*b.glide*dt;
 }else b.vy+=b.gravity*dt;

 // Temperament is sampled once per body: subtle, correlated variation rather than frame-random noise.
 const drift=(b.temperament?.lateral||0)*.0018*Math.sin(t*.0017+(b.temperament?.seed||0));
 b.vx+=drift*dt;
 const drag=Math.pow(clamp(b.drag+(b.temperament?.damping||0)*.02,.975,.9992),dt);b.vx*=drag;b.vy*=drag;
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=b.spinV*dt;
 b.trail.push({x:b.x,y:b.y});if(b.trail.length>10)b.trail.shift();

 const inset=58+Math.max(0,(500-b.y)*.12);
 const wallBounce=(nx,ny)=>{
   const dot=b.vx*nx+b.vy*ny;if(dot<0){
     const impact=Math.abs(dot),e=effectiveRestitution(b,b.restitution,impact),imp=(1+e)*dot;
     b.vx-=imp*nx;b.vy-=imp*ny;postMaterialContact(b,nx,ny,t,.72,impact);b.squash=Math.max(b.squash,clamp(impact/12,.22,.60))
   }
 };
 if(b.x<inset+b.r){b.x=inset+b.r;wallBounce(1,0)}
 if(b.x>W-inset-b.r){b.x=W-inset-b.r;wallBounce(-1,0)}
 if(b.y<62+b.r){b.y=62+b.r;wallBounce(0,1)}

 fossils.forEach(f=>{
   const hitObj={x:f.x,y:f.y,r:f.hitR||f.r};
   const caseRest=f.awake?Math.min(.90,b.restitution+.08):b.restitution;
   if(reflectCircle(b,hitObj,caseRest,(nx,ny,impact)=>{
     if(meaningfulContact(b,'fossil-'+f.id,t,145)){state.contacts++;state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.lastContact=t}f.pulse=1;
     b.squash=Math.max(b.squash,clamp(impact/8,.35,.92));
     if(!f.awake){
       wakeThing(f,(f.c==='teal'?'MEMORY NODE':'SPECIES NODE'),f.x,f.y);
       if(f.c==='amber'){
         const next=sediments.find(s=>!s.broken);
         if(next){next.weakX=clamp(f.x,next.x1+38,next.x2-38);next.pulse=1}
       }
     }else{
       applyMemoryResponse(f,b,nx,ny,impact,t);
       if(f.c==='teal'&&impact>4.6)b.stored=clamp((b.stored||0)+.12,0,1.5);
       if(f.c==='amber'&&impact>4.2){
         const next=sediments.find(s=>!s.broken);
         if(next){next.hp=Math.max(0,next.hp-.65);next.pulse=1}
       }
       if(t<f.kickUntil){const kick=.10/Math.pow(Math.max(.72,b.mass),.20);b.vx+=nx*kick;b.vy+=ny*kick}
     }
     if(state.package?.shard.effect==='split'&&!b._split){b._split=true;spawnEcho(f.x,f.y)}
   },.9)){}
 });
 collideSideOrgans(b,t);
 collideSediments(b,t);

 ['left','right','cross','deep'].forEach((k,i)=>{
   if(pathContact(b,k)&&!bodypaths[i].awake){const pt=pathWakePoint(k);wakeThing(bodypaths[i],k.toUpperCase()+' BODYPATH',pt.x,pt.y)}
   awakePathResponse(b,k,dt,t);
 });

 // The selected Bodypath changes route availability/odds, not continuous movement.
 const pe=state.package?.path.effect;

 if(reflectCircle(b,core,state.ancient?Math.min(.78,b.restitution+.06):Math.min(.72,b.restitution+.025),()=>{b.squash=1;coreHit(b)},1.0)){}

 if(state.package?.shard.effect==='boost'){
   for(const g of shardGates){
     if(g.used)continue;const o={x:g.x,y:g.y,r:22};
     if(reflectCircle(b,o,Math.min(.91,b.restitution+.12),()=>{
       g.used=true;
       const boost=1.08/Math.sqrt(Math.max(.70,b.mass));
       b.vx*=boost;b.vy*=boost;b.squash=.72;state.chain++;state.lastContact=t;say('SPINESHARD CHAIN','hit');wave(g.x,g.y,'amber')
     },.95))break
   }
 }

 const fs=flippers();collideFlipper(b,fs.lp,fs.le,state.left,'L');collideFlipper(b,fs.rp,fs.re,state.right,'R');

 if(!b.slip&&b.vy>0&&b.y>640&&b.y<790&&b.x<160)startBoneSlip(b,'L',t);
 if(!b.slip&&b.vy>0&&b.y>640&&b.y<790&&b.x>560)startBoneSlip(b,'R',t);

 const sp=Math.hypot(b.vx,b.vy),cap=b.maxSpeed*(state.ancient?1.08:1);
 if(sp>cap){b.vx*=cap/sp;b.vy*=cap/sp}
 b.squash*=Math.pow(.84,dt);
 if(b.y>945){
   const L=leaders[state.leaderIndex];
   if(b.main&&L.id==='mara'&&!state.holdUsed){
     state.holdUsed=true;b.y=795;b.x=360;b.vy=-5.4;b.vx*=.35;b.dead=false;say('MARA · HOLD','good');wave(360,805,'teal');tone(205,.08,'sine',.024,80)
   }else b.dead=true
 }
}
