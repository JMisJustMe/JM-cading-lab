function manualPushFossil(f,t){
 f.pulse=1;wave(f.x,f.y,f.c==='teal'?'teal':'amber');particles(f.x,f.y,8,f.c==='teal'?'teal':'amber');
 if(!f.awake){wakeThing(f,(f.c==='teal'?'MEMORY NODE':'SPECIES NODE'),f.x,f.y);return true}
 if(f.c==='teal'){
   if(state.package){const b=releaseStoredCreature(f.x,f.y+8,state.package.creature.id);b.vx+=(f.x<360?.7:-.7)}
   else spawnEcho(f.x,f.y,false);
   say('MEMORY PUSH','good')
 }else{
   const next=sediments.find(s=>!s.broken);
   if(next){next.weakX=clamp(f.x,next.x1+36,next.x2-36);next.hp=Math.max(0,next.hp-1.2);next.pulse=1}
   say('SPECIES PUSH','good')
 }
 tone(f.c==='teal'?272:168,.045,'triangle',.015,48);buzz(6);return true
}
function handleBoardPush(p){
 if(state.phase!=='live')return false;
 for(const o of sideOrgans){
   if(Math.hypot(p.x-o.x,p.y-o.y)<=o.r+16&&(o.awake||o.pulse>.06)){manualPushOrgan(o,p,now());return true}
 }
 for(const f of fossils){
   if(Math.hypot(p.x-f.x,p.y-f.y)<=f.hitR+12&&(f.awake||f.pulse>.06)){return manualPushFossil(f,now())}
 }
 return false
}
function spawnEcho(x,y,hard=false){
 if(state.echoes.length>=5)return;
 const e=makeBody(x,y,false),a=-Math.PI*.85+Math.random()*Math.PI*.70;
 const base=hard?5.7:4.25,heavy=Math.sqrt(Math.max(.62,e.mass));
 e.vx=Math.cos(a)*base/heavy;e.vy=Math.sin(a)*base/heavy-1.2;e.r=hard?13:10;
 e.restitution=Math.min(.86,e.restitution+.06);e.power=Math.max(2,e.power);
 state.echoes.push(e);wave(x,y,'teal')
}
function pathWakePoint(k){return k==='left'?{x:160,y:520}:k==='right'?{x:560,y:520}:k==='cross'?{x:360,y:490}:{x:360,y:390}}
function chooseMemory(obj){
 const L=leaders[state.leaderIndex],cycle=['GUIDE','RETURN','HOLD','SURGE','SINK','SLIP'];
 if(!state.roomMemory.length)return L.memory;
 const idx=(state.wakeSerial+fossils.indexOf(obj)+state.leaderIndex)%cycle.length;
 return cycle[idx]
}
function applyMemoryResponse(f,b,nx,ny,impact,t){
 const memory=f.memory;if(!memory)return;
 const mass=1/Math.pow(Math.max(.72,b.mass),.20),j=1+contactVariation(b,.035);
 if(memory==='RETURN'){
   const v=clamp(impact*.035,.08,.28)*mass*j;b.vx+=nx*v;b.vy+=ny*v;
   if(t-f.memoryCharge>1900&&impact>4.8){f.memoryCharge=t;spawnEcho(f.x,f.y)}
 }else if(memory==='RECEIVE'){
   b.stored=clamp((b.stored||0)+impact*.075,0,1.35);b.vx*=.94;b.vy*=.94
 }else if(memory==='GUIDE'){
   const tx=-ny,ty=nx,dir=(b.vx*tx+b.vy*ty)>=0?1:-1,guide=.22*mass*j;
   b.vx+=tx*dir*guide;b.vy+=ty*dir*guide
 }else if(memory==='SURGE'){
   const s=1+clamp(impact*.006,.025,.065);b.vx*=s;b.vy*=s;b.spinV+=.010*Math.sign(b.vx||1)
 }else if(memory==='SINK'){
   const d=clamp(.94-impact*.006,.88,.94);b.vx*=d;b.vy*=d;b.squash=Math.max(b.squash,.42)
 }else if(memory==='SLIP'){
   const tx=-ny,ty=nx,sign=(b.vx*tx+b.vy*ty)>=0?1:-1,sp=Math.max(2.4,Math.hypot(b.vx,b.vy)*.91);
   b.vx=tx*sign*sp;b.vy=ty*sign*sp
 }else if(memory==='HOLD'){
   if(!b.holdUntil&&impact>3.8){b.holdUntil=t+105;b.holdVector={vx:b.vx*.84,vy:-Math.max(1.6,Math.abs(b.vy)*.32)};b.vx*=.45;b.vy*=.45}
 }
}
function wakeThing(obj,label,x,y){
 if(obj.awake)return false;
 obj.awake=true;obj.pulse=1;obj.kickUntil=now()+1050;
 if('memory' in obj && !obj.memory){obj.memory=chooseMemory(obj);state.roomMemory.push({id:obj.id,memory:obj.memory});state.wakeSerial++}
 state.wake=clamp(state.wake+1,0,5);state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.lastContact=now();
 spawnEcho(x,y);say(label+('memory' in obj&&obj.memory?' · '+obj.memory:'')+' WOKE','good');tone(520+state.chain*28,.06,'sine',.026,100);buzz(15);particles(x,y,15,'teal');wave(x,y,obj.c||'teal');
 if(obj.link){
   const linked=bodypaths.find(p=>p.kind===obj.link);
   if(linked){linked.open=true;linked.pulse=1}
 }
 syncUI();if(state.wake>=5&&!state.ancient)startAncient();return true
}
function startAncient(){
 state.ancient=true;state.ancientUntil=now()+9200;state.wake=5;state.shake=14;state.flash=.8;
 say('ANCIENT WAKE · THE ROOM REMEMBERS','hit');toast('WHAT WOKE NOW ANSWERS TOGETHER');tone(140,.32,'sawtooth',.035,300);buzz([30,35,65]);
 const awake=fossils.filter(f=>f.awake);
 awake.slice(0,4).forEach((f,i)=>setTimeout(()=>{spawnEcho(f.x,f.y,true);f.pulse=1},120+i*130));
 bodypaths.forEach(p=>{if(p.open)p.awake=true;p.pulse=1});
 syncUI()
}
function coreHit(b){
 const t=now();if(t-b.lastCore<260)return;b.lastCore=t;
 const speed=Math.hypot(b.vx,b.vy),momentum=Math.sqrt(Math.max(.45,b.mass))*clamp(speed/8,.55,1.35);
 state.chain++;state.bestChain=Math.max(state.bestChain,state.chain);state.contacts++;state.lastContact=t;
 wave(core.x,core.y,'amber');particles(core.x,core.y,10,'amber');

 if(state.wake<2||state.excavated<1){
   state.shake=4;state.flash=.16;say(state.excavated<1?'CORE BURIED · BREAK STRATA':'CORE LISTENS · STILL SLEEPING','good');tone(125,.06,'sine',.018,35);buzz(8);syncUI();return
 }
 const excavationGate=[.24,.40,.58,.78,1][state.excavated]||.24;
 const wakeGate=state.ancient?1:state.wake>=4?.76:state.wake>=2?.52:.34;
 const gate=clamp(excavationGate*wakeGate,.16,1);
 const bonus=state.ancient?2:0,dmg=Math.max(1,Math.round((b.power*momentum+bonus)*gate));
 state.core=clamp(state.core-dmg,0,100);
 state.shake=clamp(4+dmg*.55,6,13);state.flash=.32;
 say((state.ancient?'ANCIENT CORE −':'CORE −')+dmg,'hit');tone(105+Math.min(50,b.mass*18),.07,'square',.033,75);buzz(18);
 if(state.package?.shard.effect==='charge'&&!b._charged){b._charged=true;if(state.wake<5){state.wake++;if(state.wake>=5&&!state.ancient)startAncient()}}
 if(state.core<=0)win();syncUI()
}
function win(){state.phase='win';state.shake=18;state.flash=1;if(state.main){state.main.vx=state.main.vy=0}state.echoes.forEach(e=>e.vx=e.vy=0);ui.center.textContent='CORE BROKEN · TAP BOARD TO WAKE AGAIN';ui.status.textContent=`FIRST WAKE COMPLETE · best chain ${state.bestChain} · contacts ${state.contacts}.`;tone(160,.4,'sawtooth',.045,430);buzz([40,30,90]);syncUI()}
function sleepfall(){
 if(state.phase!=='live')return;state.phase='sleep';state.main=null;state.echoes=[];state.package=null;state.chain=0;state.left=state.right=false;state.holdUsed=false;
 ui.leverText.textContent='HOLD → RELEASE';ui.center.textContent='SLEEPFALL · THE ROOM KEPT ITS MEMORY';
 ui.status.textContent='Sleepfall. Change conditions if you want; the Museum Bone Room keeps what already woke.';
 say('SLEEPFALL · MEMORY KEPT','bad');tone(170,.16,'sine',.025,-90);syncUI()
}
function newGame(){
 state.core=100;state.wake=0;state.phase='sleep';state.package=null;state.main=null;state.echoes=[];state.chain=0;state.bestChain=0;state.contacts=0;state.ancient=false;
 state.deepUntil=state.breathUntil=0;state.cooldown={deep:0,breath:0};state.roomMemory=[];state.wakeSerial=0;state.receivedEnergy=0;state.holdUsed=false;
 state.excavated=0;state.archiveMemory=null;state.reelChanges=0;state.contactReceipt=0;state.flipperState={L:{held:false,pull:0,charge:0,lastRelease:0,flick:0,releaseCharge:0,holdStarted:0},R:{held:false,pull:0,charge:0,lastRelease:0,flick:0,releaseCharge:0,holdStarted:0}};
 fossils.forEach(f=>{f.awake=false;f.pulse=0;f._charged=false;f.kickUntil=0;f.memory=null;f.memoryCharge=0});
 bodypaths.forEach(p=>{p.awake=false;p.open=false;p.pulse=0;p.kickUntil=0});
 sideOrgans.forEach(o=>{o.awake=false;o.pulse=0;o.cool=0;o.stored=null;o.storedCreature=null;o.usedWake=false});
 sediments.forEach((s,i)=>{s.hp=s.maxHp;s.broken=false;s.pulse=0;s.weakX=[334,418,296,385][i]});
 ui.leverText.textContent='HOLD → RELEASE';ui.center.textContent='BUILD CONDITIONS · EXCAVATE · WAKE THE ROOM';
 ui.status.textContent='JM32 FULL BODY: choose conditions, Wakeflick, use Reflex zones, side organs and sediment routes. The room remembers.';
 syncUI()
}
