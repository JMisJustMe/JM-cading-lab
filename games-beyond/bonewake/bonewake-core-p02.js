const state={
 core:100,wake:0,phase:'sleep',leverDown:false,tension:0,reelUntil:0,reelTick:0,reelIndex:0,package:null,
 ancient:false,ancientUntil:0,deepUntil:0,breathUntil:0,cooldown:{deep:0,breath:0},left:false,right:false,aiming:false,
 aim:{x:360,y:900},main:null,echoes:[],particles:[],waves:[],chain:0,bestChain:0,contacts:0,lastContact:0,lastTime:0,
 shake:0,flash:0,boardReflex:null,audio:null,
 leaderIndex:0,wakeSerial:0,receivedEnergy:0,roomMemory:[],holdUsed:false,
 excavated:0,archiveMemory:null,reelChanges:0,contactReceipt:0,
 flipperState:{
  L:{held:false,pull:0,charge:0,lastRelease:0,flick:0,releaseCharge:0,holdStarted:0},
  R:{held:false,pull:0,charge:0,lastRelease:0,flick:0,releaseCharge:0,holdStarted:0}
 }
};
function say(text,type='good'){ui.feed.textContent=text;ui.feed.className='contactFeed show '+type;clearTimeout(say.t);say.t=setTimeout(()=>ui.feed.className='contactFeed',250)}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.remove('show'),950)}
function audio(){if(state.audio)return state.audio;try{state.audio=new (window.AudioContext||window.webkitAudioContext)()}catch{}return state.audio}
function tone(freq=320,dur=.05,type='sine',gain=.02,slide=0){const a=audio();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);if(slide)o.frequency.linearRampToValueAtTime(freq+slide,a.currentTime+dur);g.gain.setValueAtTime(gain,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+dur)}
function buzz(p){try{navigator.vibrate?.(p)}catch{}}
function syncUI(){
 document.documentElement.dataset.bonewakePhase=state.phase;
 ui.coreTop.textContent=Math.max(0,Math.round(state.core));ui.wakeTop.textContent=state.wake+'/5';ui.wakeMini.textContent=state.wake+'/5';ui.strataMini.textContent=state.excavated+'/4';ui.coreFill.style.width=clamp(state.core,0,100)+'%';
 ui.dots.forEach((d,i)=>d.classList.toggle('on',i<state.wake));ui.phase.textContent=phases[state.phase]||state.phase;ui.chain.textContent=state.chain;
 ui.ancientAuto.textContent=state.ancient?'ANCIENT WAKE LIVE':'AUTO AT 5/5';ui.ancientAuto.classList.toggle('live',state.ancient);
 const live=state.phase==='live';ui.left.disabled=!live;ui.right.disabled=!live;ui.deep.disabled=!live;ui.breath.disabled=!live;ui.lever.disabled=live||state.phase==='reel'||state.phase==='win';
 ui.left.classList.toggle('on',state.left);ui.right.classList.toggle('on',state.right);
 ui.left.innerHTML='← LEFT REFLEX<small style="display:block;color:#8fded7;font-size:10px;margin-top:4px">PULL '+Math.round(flipperPack('L').pull*100)+'% · CHARGE '+Math.round(Math.max(flipperPack('L').charge,flipperPack('L').releaseCharge)*100)+'%</small>';
 ui.right.innerHTML='RIGHT REFLEX →<small style="display:block;color:#efc47d;font-size:10px;margin-top:4px">CHARGE '+Math.round(Math.max(flipperPack('R').charge,flipperPack('R').releaseCharge)*100)+'% · PULL '+Math.round(flipperPack('R').pull*100)+'%</small>';
 const leader=leaders[state.leaderIndex];
 ui.leaderName.textContent=leader.name.toUpperCase();ui.leaderVerb.textContent=leader.verb+' · '+leader.line;
 ui.leaderBtn.disabled=!['sleep'].includes(state.phase);
 const weighted=Object.values(weights).filter(v=>v>1).length;ui.weightedRead.textContent=weighted;
 if(state.package){
   ui.dropName.textContent=state.package.creature.name;ui.speed.textContent='SHARD '+state.package.shard.short;ui.power.textContent='PATH '+state.package.path.short;ui.trait.textContent=state.package.creature.trait;
   ui.packageRead.textContent=state.package.instinct.short+' PRIMED';
   ui.answerMain.textContent=state.package.creature.name.toUpperCase();
   ui.answerSub.textContent=state.package.shard.short+' · '+state.package.path.short+' · '+state.package.instinct.short;
 } else {
   ui.dropName.textContent='Waiting';ui.speed.textContent='—';ui.power.textContent='—';ui.trait.textContent='—';ui.packageRead.textContent='THE PAST ANSWERS';
   ui.answerMain.textContent='NOT YET ANSWERED';ui.answerSub.textContent='build conditions · then pull';
 }
}
function buildPool(){
 ui.poolGrid.innerHTML='';for(const p of pieces){const b=document.createElement('button');b.className='poolPiece';b.innerHTML=`<b>${p.short}</b><small>${p.cat.toUpperCase()}</small>`;b.addEventListener('click',()=>{weights[p.id]=weights[p.id]===1?3:1;b.classList.toggle('weighted',weights[p.id]>1);toast(weights[p.id]>1?p.name+' weighted':p.name+' normal odds');syncUI()});ui.poolGrid.appendChild(b)}
}
function weightedPick(arr,volatility){const eff=arr.map(p=>({p,w:1+((weights[p.id]||1)-1)*(1-volatility)})),total=eff.reduce((a,b)=>a+b.w,0);let r=Math.random()*total;for(const it of eff){r-=it.w;if(r<=0)return it.p}return eff.at(-1).p}
function makePackage(){
 const volatility=clamp(state.tension*.72,.06,.78),L=leaders[state.leaderIndex];
 // Leader changes conditions after the answer; Wake Pool weights the odds. Neither hard-selects the result.
 return{creature:weightedPick(creatures,volatility),shard:weightedPick(shards,volatility),path:weightedPick(paths,volatility),instinct:weightedPick(instincts,volatility),tension:state.tension,leader:L}
}
function makeBody(x,y,main=false){
 const c=state.package?.creature||creatures[0],L=leaders[state.leaderIndex];
 const spinFactor=c.id==='c4'?.25:c.id==='c3'?.55:c.id==='c5'?1.15:.72;
 return{x,y,vx:0,vy:0,r:main?23:13,main,
  power:(main?c.power:Math.max(2,Math.round(c.power*.30)))*L.core,
  mass:(main?c.mass:Math.max(.42,c.mass*.68))*L.mass,
  gravity:c.gravity*L.gravity,restitution:clamp(c.restitution+L.restitution,.18,.94),drag:c.drag,tangent:c.tangent,maxSpeed:c.maxSpeed,
  spinCouple:c.spinCouple||0,spring:c.spring||0,glide:c.glide||0,skitter:c.skitter||0,
  spin:Math.random()*6.28,spinV:(Math.random()-.5)*.14*spinFactor,trail:[],dead:false,lastCore:0,
  squash:0,slip:null,pathTouch:{},lastSkitter:0,stored:0,holdUntil:0,holdVector:null,
  temperament:{
    bounce:(Math.random()-.5)*.10,
    lateral:(Math.random()-.5)*.20,
    damping:(Math.random()-.5)*.025,
    timing:.92+Math.random()*.16,
    seed:Math.random()*1000
  },
  contactSerial:0,lastFlipper:{L:0,R:0},contactReceipt:{}}
}
function resetBody(){
 state.main=makeBody(360,808,true);state.aim={x:360,y:900};state.aiming=false;
 sideOrgans.forEach(o=>{o.usedWake=false;o.pulse=0})
}
function holdLever(){if(['live','reel','win'].includes(state.phase))return;audio();state.leverDown=true;ui.lever.classList.add('on');ui.leverText.textContent='BUILDING TENSION';tone(180,.04,'sine',.018,70)}
