// input
addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);visualViewport?.addEventListener('scroll',resize);addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'){e.preventDefault();fire()}if(e.code==='KeyQ'&&!e.repeat)switchSide();if(e.code==='KeyF'&&!e.repeat)scan();if(e.code==='KeyR'&&!e.repeat)toggleFlow();if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat)phase()});addEventListener('keyup',e=>keys[e.code]=false);
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){mouseDown=true;fire()}});addEventListener('pointerup',()=>mouseDown=false);addEventListener('mousemove',e=>{if(running&&(document.pointerLockElement===canvas||mouseDown)){player.a+=e.movementX*.0032;player.pitch=Math.max(-.68,Math.min(.68,player.pitch+e.movementY*.0026))}});canvas.addEventListener('dblclick',()=>canvas.requestPointerLock?.());
$('lookZone').addEventListener('pointerdown',e=>{e.preventDefault();lookState={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)});$('lookZone').addEventListener('pointermove',e=>{if(e.pointerId!==lookState.id)return;e.preventDefault();const dx=e.clientX-lookState.x,dy=e.clientY-lookState.y;player.a+=dx*.0075;player.pitch=Math.max(-.68,Math.min(.68,player.pitch+dy*.0062));lookState.x=e.clientX;lookState.y=e.clientY});const endLook=e=>{if(e.pointerId===lookState.id)lookState={id:null,x:0,y:0}};$('lookZone').addEventListener('pointerup',endLook);$('lookZone').addEventListener('pointercancel',endLook);
const joy=$('joy'),stick=$('stick');function joyMove(e){const r=joy.getBoundingClientRect();if(joyState.id===null){joyState.id=e.pointerId;joyState.cx=r.left+r.width/2;joyState.cy=r.top+r.height/2;joy.setPointerCapture(e.pointerId)}let dx=e.clientX-joyState.cx,dy=e.clientY-joyState.cy;const max=r.width*.3,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max}joyState.x=dx/max;joyState.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`}joy.addEventListener('pointerdown',joyMove);joy.addEventListener('pointermove',e=>{if(e.pointerId===joyState.id)joyMove(e)});function joyEnd(e){if(e.pointerId!==joyState.id)return;joyState={id:null,cx:0,cy:0,x:0,y:0};stick.style.transform='translate(0,0)'}joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);

const fireDeck=$('fire');
fireDeck.addEventListener('pointerdown',e=>{
  e.preventDefault();
  deckState={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,startT:performance.now(),moved:false,pulseTimer:null};
  fireDeck.setPointerCapture(e.pointerId);fireDeck.classList.add('deck-active');
  deckState.pulseTimer=setTimeout(()=>{if(deckState.id===e.pointerId){fire();deckState.pulseTimer=setInterval(fire,145)}},320);
});
fireDeck.addEventListener('pointermove',e=>{
  if(e.pointerId!==deckState.id)return;
  const dx=e.clientX-deckState.x,dy=e.clientY-deckState.y;
  if(Math.hypot(e.clientX-deckState.startX,e.clientY-deckState.startY)>7)deckState.moved=true;
  player.a+=dx*.0105;
  player.pitch=Math.max(-.68,Math.min(.68,player.pitch+dy*.0085));
  deckState.x=e.clientX;deckState.y=e.clientY;
});
function endDeck(e){
  if(e.pointerId!==deckState.id)return;
  const duration=performance.now()-deckState.startT;
  if(deckState.pulseTimer){clearTimeout(deckState.pulseTimer);clearInterval(deckState.pulseTimer)}
  if(!deckState.moved&&duration<320)fire();
  fireDeck.classList.remove('deck-active');
  deckState={id:null,x:0,y:0,startX:0,startY:0,startT:0,moved:false,pulseTimer:null};
}
fireDeck.addEventListener('pointerup',endDeck);fireDeck.addEventListener('pointercancel',endDeck);
$('flow').addEventListener('click',toggleFlow);$('phase').addEventListener('click',phase);$('scan').addEventListener('click',scan);$('side').addEventListener('click',switchSide);$('act').addEventListener('pointerdown',()=>interactTouch=true);$('act').addEventListener('pointerup',()=>interactTouch=false);$('act').addEventListener('pointercancel',()=>interactTouch=false);
$('startBtn').addEventListener('click',start);$('restartBtn').addEventListener('click',start);$('receiptBtn').addEventListener('click',async()=>{const receipt=JSON.stringify({version:VERSION,...run,score:player.score},null,2);try{await navigator.clipboard.writeText(receipt);toast('RECEIPT COPIED')}catch(_){ui.endText.textContent=receipt}});

// The phone is a controller, never a selectable document during play.
['contextmenu','selectstart','dragstart'].forEach(type=>addEventListener(type,e=>e.preventDefault(),{passive:false}));
addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
addEventListener('touchmove',e=>{if(running)e.preventDefault()},{passive:false});

// test and Forge/Gardles bridge
window.FTR={version:VERSION,start,fire,scan,phase,switchSide,state:()=>({running,time,controlMode,player:{...player},cores:terminals.map(t=>({id:t.id,active:t.active,progress:t.progress})),doors:doors.map(d=>({...d})),enemies:enemies.filter(e=>!e.dead).length,projectiles:projectiles.length,prompt:promptTarget?.kind||null,run:{...run}}),command(cmd,payload={}){if(cmd==='START')start();else if(cmd==='FIRE')fire();else if(cmd==='SCAN')scan();else if(cmd==='PHASE')phase();else if(cmd==='SIDE')switchSide();else if(cmd==='FLOW')toggleFlow();else if(cmd==='MOVE'){joyState.x=payload.x||0;joyState.y=-(payload.y||0)}else if(cmd==='LOOK'){player.a+=payload.x??payload.delta??0;player.pitch=Math.max(-.68,Math.min(.68,player.pitch+(payload.y||0)))}else if(cmd==='INTERACT')interactTouch=!!payload.down},test:{setPlayer(x,y,a=player.a,pitch=player.pitch){player.x=x;player.y=y;player.a=a;player.pitch=pitch},freezeEnemies(v=true){testFreeze=!!v},setEnemy(i,x,y,hp=26){if(enemies[i])Object.assign(enemies[i],{x,y,hp,dead:false,stun:0,cool:99})},activateCore(i){terminals[i].active=true;player.cores=terminals.filter(t=>t.active).length;run.cores=player.cores;if(player.cores===1){doors[0].target=1;doors[1].locked=false}if(player.cores===2){doors.forEach(d=>d.target=1);extraction.active=true}},damage,los,tileAt,canvasMetrics(){const r=canvas.getBoundingClientRect();return{version:VERSION,dpr:renderDpr,backingWidth:canvas.width,backingHeight:canvas.height,cssWidth:r.width,cssHeight:r.height,scaleX,scaleY,coverageX:canvas.width/(r.width||1),coverageY:canvas.height/(r.height||1)}}}};
resize();reset();render();
if(location.search.includes('autostart=1'))start();
