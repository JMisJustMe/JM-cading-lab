'use strict';
C.addEventListener('pointerdown',e=>{
 audio();const p=point(e);
 if(state.phase==='win'){newGame();return}
 if(state.phase==='ready'){
   e.preventDefault();
   if(beginAim(p))C.setPointerCapture?.(e.pointerId);
   return
 }
 if(state.phase==='live'&&handleBoardPush(p)){e.preventDefault();return}
 if(state.phase==='live'&&p.y>650){
   e.preventDefault();state.boardReflex=p.x<W/2?'L':'R';
   setReflex(state.boardReflex,true);C.setPointerCapture?.(e.pointerId)
 }
});
C.addEventListener('pointermove',e=>{
 if(!state.aiming)return;
 e.preventDefault();state.aim=point(e)
});
C.addEventListener('pointerup',e=>{
 if(state.aiming){
   e.preventDefault();state.aim=point(e);releaseAim();return
 }
 if(state.boardReflex){setReflex(state.boardReflex,false);state.boardReflex=null}
});
// CP25: interrupted pointer contact must never create an earned Wakeflick or Reflex flick.
function abortAimContact(){
 if(state.aiming){state.aiming=false;state.phase='ready';state.aim={x:360,y:900};ui.center.textContent='TOUCH DROPWAKE · PULL BACK · RELEASE'}
}
function abortReflexContact(){
 if(!state.boardReflex)return;
 const side=state.boardReflex,flipper=flipperPack(side);
 flipper.held=false;flipper.pull=0;flipper.flick=0;flipper.charge=0;flipper.releaseCharge=0;
 if(side==='L')state.left=false;else state.right=false;
 state.boardReflex=null;
}
C.addEventListener('pointercancel',()=>{abortAimContact();abortReflexContact();syncUI()});
C.addEventListener('lostpointercapture',()=>{abortAimContact();abortReflexContact();syncUI()});
ui.leaderBtn.addEventListener('click',()=>{
 if(state.phase!=='sleep'){toast('Choose Moment Leader before the Wake Lever');return}
 state.leaderIndex=(state.leaderIndex+1)%leaders.length;
 const L=leaders[state.leaderIndex];toast(L.name+' · '+L.verb);tone(250+state.leaderIndex*18,.04,'sine',.014,45);syncUI()
});
ui.poolBtn.addEventListener('click',()=>{
 ui.wakePool.open=!ui.wakePool.open;
 if(ui.wakePool.open)setTimeout(()=>ui.wakePool.scrollIntoView?.({behavior:'smooth',block:'nearest'}),0)
});
ui.lever.addEventListener('pointerdown',e=>{e.preventDefault();ui.lever.setPointerCapture?.(e.pointerId);holdLever()});
function abortLeverContact(){
 state.leverDown=false;
 ui.lever.classList.remove('on');
 ui.leverText.textContent='HOLD → RELEASE';
 state.tension=0;ui.tension.style.width='0%';
}
ui.lever.addEventListener('pointerup',e=>{e.preventDefault();releaseLever()});
['pointercancel','lostpointercapture'].forEach(ev=>ui.lever.addEventListener(ev,e=>{
 e.preventDefault();if(state.leverDown)abortLeverContact();
}));
[['L',ui.left],['R',ui.right]].forEach(([s,b])=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();audio();setReflex(s,true)});
 b.addEventListener('pointerup',e=>{e.preventDefault();setReflex(s,false)});
 ['pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,e=>{
   e.preventDefault();
   const f=flipperPack(s);f.held=false;f.pull=0;f.flick=0;f.charge=0;f.releaseCharge=0;
   if(s==='L')state.left=false;else state.right=false;syncUI()
 }))
});
ui.deep.addEventListener('click',()=>fireInstinct('deep'));ui.breath.addEventListener('click',()=>fireInstinct('breath'));
// CP25 keyboard is another contact route into the SAME original Bone Reel,
// Wakeflick, instinct and Reflex mechanics. Never a second simulation.
let keyAngle=0,keyPull=155;
const heldKeys=new Set();
const isTyping=e=>e.target?.closest?.('input,textarea,select,button,a,[contenteditable="true"]');
const keyName=e=>e.key===' ' ? 'space' : String(e.key).toLowerCase();
function keyboardAimPoint(){
 if(!state.main)return;
 state.aim={x:state.main.x-Math.sin(keyAngle)*keyPull,y:state.main.y+Math.cos(keyAngle)*keyPull};
 ui.center.textContent='WAKEFLICK · '+Math.round((keyAngle*180/Math.PI))+'° · '+Math.round(keyPull/235*100)+'% · ENTER TO RELEASE';
}
function cancelHeldKeys(){
 heldKeys.clear();
 abortAimContact();abortReflexContact();
 if(state.leverDown)abortLeverContact();
 for(const side of ['L','R']){const f=flipperPack(side);if(f.held){f.held=false;f.pull=0;f.flick=0;f.charge=0;f.releaseCharge=0;}}
 state.left=state.right=false;syncUI();
}
window.addEventListener('keydown',e=>{
 if(isTyping(e)||e.altKey||e.ctrlKey||e.metaKey)return;
 const k=keyName(e),phase=state.phase;
 const relevant=['space','enter','arrowleft','arrowright','arrowup','arrowdown','a','d','w','s','q','e'].includes(k);
 if(!relevant)return;
 // Other game states and text fields retain their usual keyboard behaviour.
 if(phase==='win'||phase==='reel')return;
 e.preventDefault();
 if(!e.repeat)heldKeys.add(k);
 if(phase==='sleep'&&k==='space'){if(!e.repeat)holdLever();return}
 if(phase==='ready'&&k==='enter'){
   if(beginAim({x:state.main.x,y:state.main.y}))keyboardAimPoint();
   return;
 }
 if(phase==='aim'){
   if(k==='enter'||k==='space'){releaseAim();return}
   if(k==='arrowleft'||k==='a')keyAngle=clamp(keyAngle-.065,-1.05,1.05);
   if(k==='arrowright'||k==='d')keyAngle=clamp(keyAngle+.065,-1.05,1.05);
   if(k==='arrowup'||k==='w')keyPull=clamp(keyPull+14,40,235);
   if(k==='arrowdown'||k==='s')keyPull=clamp(keyPull-14,40,235);
   keyboardAimPoint();return;
 }
 if(phase==='live'){
   if((k==='arrowleft'||k==='a')&&!e.repeat)setReflex('L',true);
   if((k==='arrowright'||k==='d')&&!e.repeat)setReflex('R',true);
   if(k==='q'&&!e.repeat)fireInstinct('deep');
   if(k==='e'&&!e.repeat)fireInstinct('breath');
 }
});
window.addEventListener('keyup',e=>{
 const k=keyName(e);
 if(!heldKeys.has(k))return;
 heldKeys.delete(k);
 if(k==='space'&&state.phase==='sleep'&&state.leverDown)releaseLever();
 if(state.phase==='live'){
   if(k==='arrowleft'||k==='a')setReflex('L',false);
   if(k==='arrowright'||k==='d')setReflex('R',false);
 }
});
window.addEventListener('blur',cancelHeldKeys);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHeldKeys()});
function frame(t){const dt=state.lastTime?clamp((t-state.lastTime)/16.67,.2,2):1;state.lastTime=t;update(dt,t);draw(t);requestAnimationFrame(frame)}
buildPool();newGame();requestAnimationFrame(frame);
