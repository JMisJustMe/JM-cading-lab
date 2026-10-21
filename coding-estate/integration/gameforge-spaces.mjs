// Additive spatial organ for the recovered GameForge receiver, not a new engine.
// Inherits GF.player/GF.step/GF.draw and native body/hazard consequences.
// Axis-separated blocking + bounded dt follows FTR v0.5.1 controls/world donors.
export function GameForgeSpaces(world){
  const order=['tboys','burning','humanimals'],offset=order.indexOf(world.body);
  if(offset<0||world.spaces!==3)throw Error('SPACES_SPEC_HOLD');
  const spec=JSON.stringify({body:world.body,hazards:world.hazards,targetX:world.targetX,spaces:3});
  const rooms=Array.from({length:3},(_,i)=>({id:i,body:order[(offset+i)%3],name:['Crossing','Relay Hall','Living Reach'][i],
    world:{body:order[(offset+i)%3],hazards:world.hazards,targetX:Math.max(500,Math.min(780,world.targetX-i*55)),entered:true},
    walls:i===1?[{x:340,y:125,w:75,h:310},{x:590,y:340,w:130,h:50}]:[{x:380+i*45,y:185-i*35,w:65,h:240}],
    key:{id:'key-'+i,x:210+i*15,y:130},doors:[...(i>0?[{x:50,y:285,to:i-1,edge:(i-1)+'-'+i}]:[]),...(i<2?[{x:850,y:285,to:i+1,edge:i+'-'+(i+1)}]:[])]}));
  const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
  const free=(room,x,y,r=24)=>finite(x,r,900-r)&&finite(y,r,570-r)&&!room.walls.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);
  function resolve(room,old,next,r=24){
    let x=old.x,y=old.y;const steps=Math.max(1,Math.ceil(Math.max(Math.abs(next.x-x),Math.abs(next.y-y))/8));
    for(let i=0;i<steps;i++){const nx=x+(next.x-old.x)/steps,ny=y+(next.y-old.y)/steps;if(free(room,nx,y,r))x=nx;if(free(room,x,ny,r))y=ny;}
    return {x,y};
  }
  function create(){return {schema:'jm.gameforge.connected-snapshot/1',spec,active:0,transitions:0,collected:[],opened:[],rooms:rooms.map((r,i)=>({visits:i===0?1:0,snapshot:null}))};}
  function validate(s,requireCurrent=true){
    const scan=v=>{if(v&&typeof v==='object')for(const [key,value] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(key))throw Error('SPACES_UNSAFE_KEY_HOLD');scan(value)}};scan(s);
    if(!s||s.schema!=='jm.gameforge.connected-snapshot/1'||s.spec!==spec||!Number.isInteger(s.active)||s.active<0||s.active>2||!Number.isInteger(s.transitions)||s.transitions<0||s.transitions>100000)throw Error('SPACES_SESSION_HOLD');
    if(!Array.isArray(s.rooms)||s.rooms.length!==3||!Array.isArray(s.collected)||!Array.isArray(s.opened)||new Set(s.collected).size!==s.collected.length||new Set(s.opened).size!==s.opened.length)throw Error('SPACES_MEMORY_HOLD');
    if(s.collected.some(x=>!['key-0','key-1','key-2'].includes(x))||s.opened.some(x=>!['0-1','1-2'].includes(x)))throw Error('SPACES_PROGRESSION_HOLD');
    if(s.opened.some(x=>!s.collected.includes('key-'+x[0]))||s.active>0&&!s.opened.includes((s.active-1)+'-'+s.active))throw Error('SPACES_DOOR_AUTHORITY_HOLD');
    s.rooms.forEach((m,i)=>{if(!Number.isInteger(m.visits)||m.visits<0||m.visits>100000)throw Error('SPACES_VISITS_HOLD');if(m.snapshot&&(!m.snapshot.player||!free(rooms[i],m.snapshot.player.x,m.snapshot.player.y,m.snapshot.player.r)))throw Error('SPACES_SAVED_COLLISION_HOLD');});
    if(s.rooms.reduce((n,m)=>n+m.visits,0)!==s.transitions+1||s.rooms[s.active].visits<1||s.collected.some(k=>s.rooms[Number(k.slice(-1))].visits<1)||s.opened.some(e=>s.rooms[Number(e[0])].visits<1||s.rooms[Number(e[2])].visits<1))throw Error('SPACES_LINEAGE_HOLD');
    if(requireCurrent&&s.rooms.some(m=>m.visits>0&&!m.snapshot))throw Error('SPACES_VISITED_MEMORY_MISSING');
    if(requireCurrent&&!s.rooms[s.active].snapshot)throw Error('SPACES_CURRENT_STATE_MISSING');
    validateProgress(s);return s;
  }
  const progress=s=>s.progress||{powered:[],beacon:false,delivered:false};
  function validateProgress(s){const q=progress(s);if(!Array.isArray(q.powered)||new Set(q.powered).size!==q.powered.length||q.powered.some(i=>!Number.isInteger(i)||i<0||i>2||!s.collected.includes('key-'+i))||typeof q.beacon!=='boolean'||typeof q.delivered!=='boolean'||q.beacon&&q.powered.length!==3||q.delivered&&!q.beacon)throw Error('SPACES_OBJECTIVE_HOLD');return q;}
  function nearby(s,p){const q=progress(s);if(Math.hypot(p.x-650,p.y-450)<65&&!q.powered.includes(s.active))return {kind:'relay',locked:!s.collected.includes('key-'+s.active),label:'Power room relay'};if(s.active===2&&Math.hypot(p.x-720,p.y-110)<65&&!q.beacon)return {kind:'beacon',locked:q.powered.length!==3,label:'Take living beacon'};if(s.active===0&&Math.hypot(p.x-120,p.y-440)<65&&q.beacon&&!q.delivered)return {kind:'deliver',label:'Restore Crossing'};return nearbyDoor(s,p);}
  function nearbyDoor(s,p){const r=rooms[s.active];if(!s.collected.includes(r.key.id)&&Math.hypot(p.x-r.key.x,p.y-r.key.y)<65)return {kind:'collect',id:r.key.id,label:'Collect relay key'};const d=r.doors.find(d=>Math.hypot(p.x-d.x,p.y-d.y)<75);if(d)return {kind:'door',...d,locked:!s.opened.includes(d.edge)&&!s.collected.includes(r.key.id),label:'Enter '+rooms[d.to].name};return null;}
  function interact(s,p){validate(s,false);const n=nearby(s,p);if(!n)return {kind:'none'};if(n.locked)return {kind:'locked'};if(['relay','beacon','deliver'].includes(n.kind)){s.progress=structuredClone(progress(s));if(n.kind==='relay')s.progress.powered.push(s.active);if(n.kind==='beacon')s.progress.beacon=true;if(n.kind==='deliver')s.progress.delivered=true;return n;}if(n.kind==='collect'){s.collected.push(n.id);return n;}if(n.locked)return {kind:'locked'};if(!s.opened.includes(n.edge))s.opened.push(n.edge);const from=s.active;s.active=n.to;s.rooms[n.to].visits++;s.transitions++;return {kind:'transition',from,to:n.to,spawn:{x:n.to>from?110:790,y:285}};}
  return {rooms,spec,create,validate,free,resolve,nearby,interact,progress};
}

export async function installGameForgeSpaces({GF,GFUX,GFPLAY,world,token,initialSnapshot,readArena,restoreArena,nativeStep,isPaused,resume,pause},factory,viewFactory,rendererFactory){
  const model=factory(world);
  let session=initialSnapshot||model.create();model.validate(session,Boolean(initialSnapshot));
  const events=[],keys=new Set();let goal=null,axis={x:0,y:0},last=performance.now(),persistError='',saveQueue=Promise.resolve();
  const camera={x:450,y:285,scale:1},canvas=GF.cv,ctx=GF.ctx,nativeDraw=GF.draw.bind(GF);
  const storage=window.JMWorldStorage;canvas.tabIndex=0;
  const slot='JM_GAMEFORGE_CONNECTED_WORLD_v1_'+world.body+'_'+world.hazards+'_'+world.targetX;
  const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(storage){const packed=storage.getItem(slot);if(packed){const e=JSON.parse(packed);if(e.token===token){if(e?.schema!=='jm.gameforge.spaces-envelope/1'||typeof e.body!=='string'||await hash(e.body)!==e.sha256)throw Error('SPACES_STORAGE_HASH_HOLD');session=JSON.parse(e.body);model.validate(session);session.rooms.forEach((m,i)=>{if(m.snapshot)window.JMValidateArena(m.snapshot,model.rooms[i].world)});}}}
  function applyRoom(spawn=null){
    const r=model.rooms[session.active],m=session.rooms[session.active];
    GF.applyBody(r.body,false);GFUX.start(false);
    GF.hazards=Array.from({length:world.hazards},(_,i)=>({x:285+i*50,y:150+(i%3)*105,r:18+i%3*2,type:r.body==='burning'?(i%2?'boost':'heat'):r.body==='humanimals'?'spirit':i%2?'mud':'bounce'}));
    GF.coreObj.x=r.world.targetX;GF.coreObj.y=460;
    if(m.snapshot)restoreArena(m.snapshot);
    if(spawn){GF.player.x=spawn.x;GF.player.y=spawn.y;GF.player.vx=GF.player.vy=0;}else if(!m.snapshot){GF.player.x=120;GF.player.y=285;}
    GF.fx=[];GFPLAY.particles=[];GF.flash=0;GFUX.firstMove=true;
    document.getElementById('jm-world-title').textContent=r.name+' · '+GFUX.info().game;
    document.getElementById('jm-world-help').textContent='Move with arrows / WASD, hold the direction pad, or tap a destination. Collect keys, power room relays, claim the beacon in Living Reach and bring it home. Doors enter real rooms.';
    GF.renderCrew();GF.updateBg();GF.update();goal=null;camera.x=GF.player.x;camera.y=GF.player.y;
    events.push({kind:'room.entered',room:r.id,body:r.body,transitions:session.transitions});
  }
  function capture(){session.rooms[session.active].snapshot=readArena();return structuredClone(model.validate(session));}
  async function persist(){if(!storage)return;const body=JSON.stringify(capture());saveQueue=saveQueue.then(async()=>{storage.setItem(slot,JSON.stringify({schema:'jm.gameforge.spaces-envelope/1',token,body,sha256:await hash(body)}));persistError='';}).catch(e=>{persistError=String(e.message||e)});return saveQueue;}
  function act(){canvas.focus({preventScroll:true});resume();session.rooms[session.active].snapshot=readArena();const result=model.interact(session,GF.player);events.push({...result,room:session.active});if(events.length>48)events.shift();if(result.kind==='transition')applyRoom(result.spawn);if(result.kind==='relay'){GF.energyVal=Math.min(100,GF.energyVal+25);for(const h of GF.hazards)h.type='boost';}if(['collect','transition','relay','beacon','deliver'].includes(result.kind))persist();updateControls();requestAnimationFrame(()=>{GF.draw();parent.postMessage({type:'jm.gameforge.spaces.event/1',token,kind:result.kind,from:result.from,to:result.to,active:session.active,body:GF.body.id,transitions:session.transitions,keys:session.collected.length},'*')});}
  const controls=document.createElement('div');controls.id='jm-space-controls';
  controls.innerHTML='<div id="jm-space-pad" aria-label="Movement"><button data-move="0,-1" aria-label="Move up">▲</button><button data-move="-1,0" aria-label="Move left">◀</button><button data-move="0,1" aria-label="Move down">▼</button><button data-move="1,0" aria-label="Move right">▶</button></div><button id="jm-space-use">Explore</button><span id="jm-space-state"></span>';
  document.querySelector('.app').append(controls);
  const style=document.createElement('style');style.textContent='.cards,.matchResultPanel,#banner{display:none!important}#jm-space-controls{display:grid;grid-template-columns:minmax(185px,1.2fr) minmax(110px,1fr);gap:6px;flex:none}#jm-space-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}#jm-space-controls button{min-height:48px;min-width:44px;padding:4px;touch-action:none;background:#122b3a;color:#e5f6ff;border:1px solid #42677e;border-radius:10px}#jm-space-use{background:#285244!important}#jm-space-state{grid-column:1/-1;font:11px system-ui;color:#bcd5da;min-height:16px}.arenaWrap{touch-action:none}.arenaWrap,#jm-space-controls{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}';document.head.append(style);
  for(const b of controls.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});resume();goal=null;const a=b.dataset.move.split(',').map(Number);axis={x:a[0],y:a[1]};});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>axis={x:0,y:0});}
  controls.addEventListener('contextmenu',e=>e.preventDefault());controls.addEventListener('selectstart',e=>e.preventDefault());canvas.parentElement.addEventListener('contextmenu',e=>e.preventDefault());
  const use=document.getElementById('jm-space-use');use.onclick=act;
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','e','E',' '].includes(e.key)){e.preventDefault();resume();keys.add(e.key.toLowerCase());goal=null;if((e.key.toLowerCase()==='e'||e.key===' ')&&!e.repeat)act();}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();axis={x:0,y:0};});
  canvas.onpointerdown=e=>{e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);resume();const box=canvas.getBoundingClientRect(),sx=(e.clientX-box.left)*canvas.width/box.width,sy=(e.clientY-box.top)*canvas.height/box.height;goal={x:(sx-canvas.width/2)/camera.scale+camera.x,y:(sy-canvas.height/2)/camera.scale+camera.y};};canvas.onpointermove=null;canvas.onpointerup=()=>{};canvas.onpointercancel=()=>goal=null;
  const spatial=viewFactory({GF,model,session,canvas},rendererFactory);
  function updateControls(){const n=model.nearby(session,GF.player);use.textContent=n?(n.locked?'Key needed':n.label):'Explore';use.disabled=!n;document.getElementById('jm-space-state').textContent=persistError?'Persistence HOLD · '+persistError:'Keys '+session.collected.length+'/3 · relays '+model.progress(session).powered.length+'/3 · '+(model.progress(session).delivered?'Crossing restored':model.progress(session).beacon?'Return beacon to Crossing':'Power relays → claim beacon → return')+' · '+(isPaused()?'Saved / paused — move to resume':'Live');}
  GF.step=function(){const now=performance.now(),dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;if(isPaused()){updateControls();return;}
    let x=axis.x+(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0),y=axis.y+(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
    if(goal&&!x&&!y){const dx=goal.x-GF.player.x,dy=goal.y-GF.player.y,d=Math.hypot(dx,dy);if(d<9)goal=null;else{x=dx/d;y=dy/d;}}
    const norm=Math.max(1,Math.hypot(x,y)),old={x:GF.player.x,y:GF.player.y};GF.player.vx=x/norm*230*dt;GF.player.vy=y/norm*230*dt;
    nativeStep();const p=model.resolve(model.rooms[session.active],old,GF.player,GF.player.r);GF.player.x=p.x;GF.player.y=p.y;
    const alpha=1-Math.exp(-10*dt);camera.x+=(GF.player.x-camera.x)*alpha;camera.y+=(GF.player.y-camera.y)*alpha;updateControls();
  };
  GF.draw=function(){
    const box=canvas.getBoundingClientRect();const h=Math.max(300,Math.min(1800,Math.round(900*box.height/Math.max(1,box.width))));if(canvas.width!==900||canvas.height!==h){canvas.width=900;canvas.height=h;}
    camera.scale=Math.max(canvas.width/560,canvas.height/500);const halfX=canvas.width/(2*camera.scale),halfY=canvas.height/(2*camera.scale);camera.x=Math.max(halfX,Math.min(900-halfX,camera.x));camera.y=Math.max(halfY,Math.min(570-halfY,camera.y));
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.x,-camera.y);nativeDraw();
    const r=model.rooms[session.active],palette=r.body==='burning'?['#251415','#704535','#efb560']:r.body==='humanimals'?['#102525','#326158','#a7ebba']:['#102236','#355b79','#85d6f1'];
    ctx.save();ctx.globalCompositeOperation='destination-over';ctx.fillStyle=palette[0];ctx.fillRect(0,0,900,570);ctx.restore();
    for(const b of r.walls){ctx.fillStyle='#0008';ctx.fillRect(b.x+10,b.y+12,b.w,b.h);ctx.fillStyle=palette[1];ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle=palette[2];ctx.fillRect(b.x,b.y,b.w,5);ctx.strokeStyle='#ffffff22';ctx.strokeRect(b.x,b.y,b.w,b.h);}
    for(const d of r.doors){const open=session.opened.includes(d.edge);ctx.fillStyle=open?'#194e49':'#483421';ctx.fillRect(d.x-20,d.y-52,40,104);ctx.strokeStyle=open?'#9fffd1':'#f4c27c';ctx.lineWidth=4;ctx.strokeRect(d.x-22,d.y-54,44,108);ctx.fillStyle=open?'#9fffd1':'#f4c27c';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(d.to>session.active?'→':'←',d.x,d.y+4);}
    if(!session.collected.includes(r.key.id)){ctx.fillStyle='#fff0a0';ctx.shadowColor='#e7c46b';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(r.key.x,r.key.y,12,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#382508';ctx.fillRect(r.key.x-2,r.key.y-7,4,14);}
    const q=model.progress(session),powered=q.powered.includes(session.active);ctx.fillStyle=powered?'#64ffd0':'#9b7536';ctx.globalAlpha=.45;ctx.fillRect(630,430,40,40);ctx.globalAlpha=1;ctx.strokeStyle='#eeecd0';ctx.strokeRect(627,427,46,46);ctx.fillStyle='#edf9f2';ctx.font='14px system-ui';ctx.fillText(powered?'RELAY ON':'RELAY',620,490);
    if(session.active===2&&!q.beacon){ctx.fillStyle=q.powered.length===3?'#9affcf':'#5e6875';ctx.beginPath();ctx.arc(720,110,20,0,7);ctx.fill();}
    if(session.active===0){ctx.fillStyle=q.delivered?'#7affb9':'#325b77';ctx.lineWidth=4;ctx.strokeStyle=ctx.fillStyle;ctx.strokeRect(95,420,50,40);ctx.fillStyle='#fff';ctx.fillText(q.delivered?'RESTORED':'RETURN',90,480);}
    ctx.textAlign='start';ctx.restore();spatial.frame();
  };
  applyRoom();if(initialSnapshot||session.rooms[session.active].snapshot)pause();updateControls();
  window.JMWorldSuspend=async()=>{pause();keys.clear();axis={x:0,y:0};goal=null;await persist();if(persistError)throw Error(persistError);return capture();};
  window.addEventListener('jm.host.pause',()=>{window.JMWorldSuspend().then(()=>window.JMHostPauseSaved=true).catch(e=>{window.JMHostPauseHold=String(e.message||e)})});
  window.addEventListener('jm.host.resume',()=>{keys.clear();axis={x:0,y:0};last=performance.now();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)window.JMWorldSuspend();});
  if(storage){window.addEventListener('pagehide',()=>window.JMWorldSuspend());setInterval(persist,1800);}
  return {capture,read:()=>({session:capture(),camera:{...camera},spatial:spatial.proof(),room:structuredClone(model.rooms[session.active]),events:structuredClone(events)}),canSave:()=>true};
}
