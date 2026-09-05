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
C.addEventListener('pointercancel',e=>{
 if(state.aiming){state.aiming=false;state.phase='ready';ui.center.textContent='TOUCH DROPWAKE · PULL BACK · RELEASE';syncUI()}
 if(state.boardReflex){setReflex(state.boardReflex,false);state.boardReflex=null}
});
C.addEventListener('lostpointercapture',()=>{
 if(state.boardReflex){setReflex(state.boardReflex,false);state.boardReflex=null}
});
ui.leaderBtn.addEventListener('click',()=>{
 if(state.phase!=='sleep'){toast('Choose Moment Leader before the Wake Lever');return}
 state.leaderIndex=(state.leaderIndex+1)%leaders.length;
 const L=leaders[state.leaderIndex];toast(L.name+' · '+L.verb);tone(250+state.leaderIndex*18,.04,'sine',.014,45);syncUI()
});
ui.poolBtn.addEventListener('click',()=>{
 ui.wakePool.open=!ui.wakePool.open;
 if(ui.wakePool.open)setTimeout(()=>ui.wakePool.scrollIntoView?.({behavior:'smooth',block:'nearest'}),0)
});
ui.lever.addEventListener('pointerdown',e=>{e.preventDefault();ui.lever.setPointerCapture?.(e.pointerId);holdLever()});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>ui.lever.addEventListener(ev,e=>{e.preventDefault();releaseLever()}));
[['L',ui.left],['R',ui.right]].forEach(([s,b])=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();audio();setReflex(s,true)});
 ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();setReflex(s,false)}))
});
ui.deep.addEventListener('click',()=>fireInstinct('deep'));ui.breath.addEventListener('click',()=>fireInstinct('breath'));
window.addEventListener('keydown',e=>{
 if(e.key==='ArrowLeft')setReflex('L',true);
 if(e.key==='ArrowRight')setReflex('R',true)
});
window.addEventListener('keyup',e=>{
 if(e.key==='ArrowLeft')setReflex('L',false);
 if(e.key==='ArrowRight')setReflex('R',false)
});
function frame(t){const dt=state.lastTime?clamp((t-state.lastTime)/16.67,.2,2):1;state.lastTime=t;update(dt,t);draw(t);requestAnimationFrame(frame)}
buildPool();newGame();requestAnimationFrame(frame);
