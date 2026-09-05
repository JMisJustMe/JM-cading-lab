function meaningfulContact(b,key,t,gap=125){
 b.contactReceipt=b.contactReceipt||{};
 const prev=b.contactReceipt[key]||0;
 if(t-prev<gap)return false;
 b.contactReceipt[key]=t;
 state.contactReceipt++;
 return true
}
function contactVariation(b,scale=.05){
 b.contactSerial=(b.contactSerial||0)+1;
 const s=b.temperament?.seed||1,n=b.contactSerial;
 return Math.sin(s*12.9898+n*78.233)*scale;
}
function effectiveRestitution(b,base,impact=4){
 const temper=b.temperament?.bounce||0;
 const impactTrim=clamp((impact-5)*-.008,-.035,.025);
 return clamp(base+temper+contactVariation(b,.035)+impactTrim,.24,.82);
}
function postMaterialContact(b,nx,ny,t,hardness=1,impact=4){
 const tx=-ny,ty=nx,tv=b.vx*tx+b.vy*ty,L=leaders[state.leaderIndex];
 if(L.id==='elior'&&b.main){b.stored=clamp((b.stored||0)+Math.abs(tv)*.018,0,1.25)}

 const temperDamp=clamp((b.temperament?.damping||0),-.02,.02);
 const tangent=clamp(b.tangent+temperDamp,.80,.97);
 b.vx-=tx*tv*(1-tangent)*hardness;b.vy-=ty*tv*(1-tangent)*hardness;
 const normalSpeed=Math.abs(b.vx*nx+b.vy*ny);
 b.spinV+=tv*b.spinCouple*.008;

 // Traits bend the same physical event instead of replacing it with a scripted move.
 if(b.spring&&normalSpeed>2.8){
   const springLift=clamp((normalSpeed-2.8)*b.spring*.055,0,.42);
   b.vx+=nx*springLift;b.vy+=ny*springLift;b.squash=Math.max(b.squash,.45+springLift)
 }
 if(b.glide){
   const glide=clamp(Math.abs(tv)*b.glide*.025,0,.12);
   b.vx+=tx*Math.sign(tv||1)*glide;b.vy-=glide*.28
 }
 if(b.skitter&&t-b.lastSkitter>160&&normalSpeed>2.2){
   b.lastSkitter=t;
   const dir=contactVariation(b,1)>=0?1:-1,sk=clamp(normalSpeed*b.skitter*.025,.08,.28);
   b.vx+=tx*dir*sk;b.vy+=ty*dir*sk;b.spinV+=dir*.018
 }
 if(b.rebound){
   const rb=clamp(impact*b.rebound*.018,0,.24);
   b.vx+=nx*rb;b.vy+=ny*rb
 }
}
function reflectCircle(b,o,rest=null,onHit=null,hardness=1){
 const dx=b.x-o.x,dy=b.y-o.y,d=Math.hypot(dx,dy),min=b.r+o.r;if(d>=min||!d)return false;
 const nx=dx/d,ny=dy/d,over=min-d;b.x+=nx*over;b.y+=ny*over;
 const dot=b.vx*nx+b.vy*ny;
 if(dot<0){
   const impact=Math.abs(dot),base=rest==null?b.restitution:rest,e=effectiveRestitution(b,base,impact);
   const impulse=(1+e)*dot;b.vx-=impulse*nx;b.vy-=impulse*ny;
   postMaterialContact(b,nx,ny,now(),hardness,impact);
   if(onHit)onHit(nx,ny,impact)
 }
 return true
}
function distSeg(px,py,x1,y1,x2,y2){const vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1,c1=vx*wx+vy*wy,c2=vx*vx+vy*vy,t=c2?clamp(c1/c2,0,1):0,qx=x1+t*vx,qy=y1+t*vy;return{d:Math.hypot(px-qx,py-qy),qx,qy,t}}
function flippers(){
 // Dragdense Reflex: held = pulled down/back, release = flicked upward, charge remains in body memory.
 const lp={x:184,y:792},rp={x:536,y:792},L=138;
 const LF=flipperPack('L'),RF=flipperPack('R');
 const rest=.30,down=.02,up=1.10;
 const la=rest+(down-rest)*LF.pull+(up-rest)*LF.flick;
 const ra=rest+(down-rest)*RF.pull+(up-rest)*RF.flick;
 return{
  lp,rp,leftState:LF,rightState:RF,
  le:{x:lp.x+Math.cos(la)*L,y:lp.y-Math.sin(la)*L},
  re:{x:rp.x-Math.cos(ra)*L,y:rp.y-Math.sin(ra)*L}
 }
}
function collideFlipper(b,p,e,active,side){
 const q=distSeg(b.x,b.y,p.x,p.y,e.x,e.y),th=16;if(q.d>b.r+th)return;
 let nx=b.x-q.qx,ny=b.y-q.qy,m=Math.hypot(nx,ny)||1;nx/=m;ny/=m;
 b.x=q.qx+nx*(b.r+th);b.y=q.qy+ny*(b.r+th);

 const t=now(),last=b.lastFlipper?.[side]||0;if(t-last<70)return;b.lastFlipper[side]=t;
 const L=leaders[state.leaderIndex],incoming=clamp(Math.max(0,b.vy)/9,0,1),fs=flipperPack(side);
 const massComp=clamp(1.05/Math.pow(Math.max(.72,b.mass),.18),.94,1.10);
 const timing=b.temperament?.timing||1,jitter=1+contactVariation(b,.022);
 const zone=q.t<.34?'BASE':q.t<.70?'MID':'TIP';
 const dir=side==='L'?1:-1;
 let receiveBoost=(L.id==='elior'&&b.stored)?Math.min(1.15,b.stored):0;
 const held=fs.pull,flick=fs.flick,charge=Math.max(fs.releaseCharge,fs.charge);

 if(flick>.02){
   let lift,lateral,spinScale;
   if(zone==='BASE'){lift=5.25+incoming*1.00;lateral=1.72;spinScale=.22;b.vx*=.88}
   else if(zone==='MID'){lift=6.55+incoming*1.42;lateral=1.10;spinScale=.70}
   else{lift=8.10+incoming*1.82;lateral=.68;spinScale=1.22}
   const gain=massComp*L.reflex*timing*jitter*(.92+charge*.42);
   b.vy=Math.min(b.vy,-(lift*gain+receiveBoost));
   b.vx+=dir*lateral*gain+(b.temperament?.lateral||0)*.16;
   b.spinV+=dir*.024*spinScale*(.92+charge*.20);
   if(meaningfulContact(b,'flipper-'+side,t,105)){
     state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.lastContact=t;
     say(side+' '+zone+' FLICK · '+Math.round(charge*100)+'%','good');wave(q.qx,q.qy,side==='L'?'teal':'amber');buzz(zone==='TIP'?12:9)
   }
 }else if(held>.08){
   let clampV,lateral,dragDamp;
   if(zone==='BASE'){clampV=-2.9;lateral=1.34;dragDamp=.76}
   else if(zone==='MID'){clampV=-2.2;lateral=.88;dragDamp=.82}
   else{clampV=-1.5;lateral=.42;dragDamp=.90}
   const gain=massComp*(.82+held*.30)*timing;
   b.vy=Math.min(b.vy,clampV*gain);
   b.vx=(b.vx*dragDamp)+dir*lateral*gain+(b.temperament?.lateral||0)*.10;
   b.spinV+=dir*.010*(zone==='TIP'?1.1:.7);
   if(meaningfulContact(b,'drag-'+side,t,140)){say(side+' '+zone+' HOLD','good');wave(q.qx,q.qy,side==='L'?'teal':'amber')}
 }else{
   b.vy=Math.min(b.vy,-1.3*massComp);b.vx+=dir*.22*massComp
 }

 if(receiveBoost){b.stored=0;say('RECEIVE → RETURN','good');wave(p.x,p.y,side==='L'?'teal':'amber')}
}
function currentOpenPath(){
 const k=state.package?.path?.effect||'deep';
 return bodypaths.find(p=>p.kind===k)
}
function activateSideOrgan(b,o,t,impact=4){
 if(t<o.cool)return;o.cool=t+420;o.pulse=1;o.awake=true;
 const mass=1/Math.pow(Math.max(.72,b.mass),.18),j=1+contactVariation(b,.025);

 if(o.id==='archive'){
   if(!o.stored){
     o.stored=leaders[state.leaderIndex].memory;state.archiveMemory=o.stored;
     b.stored=clamp((b.stored||0)+.35,0,1.5);say('ARCHIVE STORED · '+o.stored,'good')
   }else{
     if(!o.usedWake){spawnEcho(o.x+36,o.y+12,false);o.usedWake=true}
     b.stored=clamp((b.stored||0)+.25,0,1.5);say('ARCHIVE RELEASE · '+o.stored,'good')
   }
   b.vx+=1.0*mass*j;b.vy-=1.45*mass*j
 }else if(o.id==='route'){
   const k=state.package?.path?.effect||'deep',p=currentOpenPath();
   if(p&&!p.awake){p.open=true;p.pulse=1}
   if(k==='left'){b.vx-=.75*mass*j;b.vy-=.55*mass*j}
   else if(k==='right'){b.vx+=.75*mass*j;b.vy-=.55*mass*j}
   else if(k==='cross'){b.vx*=-.86;b.vy-=.42*mass*j}
   else {b.vy-=.88*mass*j}
   say('ROUTE CONTROL · '+k.toUpperCase(),'good')
 }else if(o.id==='reel'){
   if(!o.usedWake&&state.package){
     const options=shards.filter(s=>s.id!==state.package.shard.id);
     state.package.shard=options[Math.floor(Math.random()*options.length)];
     o.usedWake=true;state.reelChanges++;
     say('FOSSIL REEL · '+state.package.shard.short,'good');syncUI()
   }else say('FOSSIL REEL · SPENT','good');
   b.vx-=1.0*mass*j;b.vy-=1.35*mass*j
 }else if(o.id==='port'){
   // Wake Port returns bodies upward and reveals a visible weak seam in the next unbroken layer.
   const layer=sediments.find(s=>!s.broken);
   if(layer){layer.weakX=clamp(b.x,layer.x1+36,layer.x2-36);layer.pulse=1}
   b.vx-=.45*mass*j;b.vy=-Math.max(5.2,Math.abs(b.vy)*.65+2.0)*mass*j;
   say(layer?'WAKE PORT · WEAK SEAM REVEALED':'WAKE PORT · DEEP RETURN','good')
 }
 wave(o.x,o.y,o.side==='L'?'teal':'amber');particles(o.x,o.y,8,o.side==='L'?'teal':'amber');tone(o.side==='L'?285:330,.055,'triangle',.018,45)
 if(meaningfulContact(b,'organ-'+o.id,t,250)){state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.lastContact=t}
}
