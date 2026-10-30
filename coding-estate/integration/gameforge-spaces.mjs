// Additive spatial organ for the recovered GameForge receiver, not a new engine.
// Inherits GF.player/GF.step/GF.draw and native body/hazard consequences.
// Axis-separated blocking + bounded dt follows FTR v0.5.1 controls/world donors.
export function GameForgeSpaces(world,encounterFactory){
  const order=['tboys','burning','humanimals'],offset=order.indexOf(world.body);
  if(offset<0||world.spaces!==3)throw Error('SPACES_SPEC_HOLD');
  const spec=JSON.stringify({body:world.body,hazards:world.hazards,targetX:world.targetX,spaces:3});
  const encounter=typeof encounterFactory==='function'?encounterFactory():null;
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
    validateProgress(s);encounter?.validate(s);return s;
  }
  const progress=s=>s.progress||{powered:[],beacon:false,delivered:false};
  function validateProgress(s){const q=progress(s);if(!Array.isArray(q.powered)||new Set(q.powered).size!==q.powered.length||q.powered.some(i=>!Number.isInteger(i)||i<0||i>2||!s.collected.includes('key-'+i))||typeof q.beacon!=='boolean'||typeof q.delivered!=='boolean'||q.beacon&&q.powered.length!==3||q.delivered&&!q.beacon)throw Error('SPACES_OBJECTIVE_HOLD');return q;}
  function nearby(s,p){const q=progress(s);if(Math.hypot(p.x-650,p.y-450)<65&&!q.powered.includes(s.active))return {kind:'relay',locked:!s.collected.includes('key-'+s.active),label:'Power room relay'};if(s.active===2&&Math.hypot(p.x-720,p.y-110)<65&&!q.beacon)return {kind:'beacon',locked:q.powered.length!==3,label:'Take living beacon'};if(s.active===0&&Math.hypot(p.x-120,p.y-440)<65&&q.beacon&&!q.delivered)return {kind:'deliver',label:'Restore Crossing'};return nearbyDoor(s,p);}
  function nearbyDoor(s,p){const r=rooms[s.active];if(!s.collected.includes(r.key.id)&&Math.hypot(p.x-r.key.x,p.y-r.key.y)<65)return {kind:'collect',id:r.key.id,label:'Collect relay key'};const d=r.doors.find(d=>Math.hypot(p.x-d.x,p.y-d.y)<75);if(d)return {kind:'door',...d,locked:!s.opened.includes(d.edge)&&!s.collected.includes(r.key.id),label:'Enter '+rooms[d.to].name};return null;}
  // Pure authoritative next-goal readback. No new quest state or auto-routing.
  // A return objective is always a genuine GameForge contact point in this room.
  function objective(s){
    const room=rooms[s.active],q=progress(s),here=s.active;
    const at=(kind,label,x,y)=>({kind,label,room:here,x,y});
    if(!s.collected.includes(room.key.id))
      return at('key','Collect '+room.name+' key',room.key.x,room.key.y);
    if(!q.powered.includes(here))
      return at('relay','Power '+room.name+' relay',650,450);
    if(q.beacon&&here===0&&!q.delivered)
      return at('deliver','Restore Crossing',120,440);
    if(q.delivered)
      return {kind:'complete',label:'Crossing restored',room:here,x:null,y:null};
    if(here===2&&q.powered.length===3&&!q.beacon)
      return at('beacon','Claim living beacon',720,110);
    const back=q.beacon||(here===2&&q.powered.length<3)||
      (here===1&&!q.powered.includes(0));
    const door=room.doors.find(d=>back?d.to===here-1:d.to===here+1)
      ||room.doors.find(d=>d.to===here-1);
    if(door)return at('door','Enter '+rooms[door.to].name,door.x,door.y);
    return at('relay','Power room relay',650,450);
  }
  function interact(s,p){validate(s,false);const n=nearby(s,p);if(!n)return {kind:'none'};if(n.locked)return {kind:'locked'};if(['relay','beacon','deliver'].includes(n.kind)){s.progress=structuredClone(progress(s));if(n.kind==='relay')s.progress.powered.push(s.active);if(n.kind==='beacon')s.progress.beacon=true;if(n.kind==='deliver')s.progress.delivered=true;return n;}if(n.kind==='collect'){s.collected.push(n.id);return n;}if(n.locked)return {kind:'locked'};if(!s.opened.includes(n.edge))s.opened.push(n.edge);const from=s.active;s.active=n.to;s.rooms[n.to].visits++;s.transitions++;return {kind:'transition',from,to:n.to,spawn:{x:n.to>from?110:790,y:285}};}
  return {rooms,spec,create,validate,free,resolve,nearby,interact,progress,objective,encounter};
}

export async function installGameForgeSpaces({GF,GFUX,GFPLAY,world,token,initialSnapshot,readArena,restoreArena,nativeStep,isPaused,resume,pause},factory,viewFactory,rendererFactory){
  const model=factory(world,window.JMGameForgeEncounter);
  let session=initialSnapshot||model.create();model.validate(session,Boolean(initialSnapshot));
  const events=[],keys=new Set();let goal=null,feedback=null,axis={x:0,y:0},last=performance.now(),persistError='',saveQueue=Promise.resolve();
  const camera={x:450,y:285,scale:1},canvas=GF.cv,ctx=GF.ctx,nativeDraw=GF.draw.bind(GF);
  const storage=window.JMWorldStorage;canvas.tabIndex=0;
  const slot='JM_GAMEFORGE_CONNECTED_WORLD_v1_'+world.body+'_'+world.hazards+'_'+world.targetX;
  // Retain the last observed durable bytes. Another tab, corrupt write or
  // external edit must not be silently repaired by a timer/lifecycle save.
  let durableValue=storage?storage.getItem(slot):null;
  const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(storage){const packed=storage.getItem(slot);if(packed){const e=JSON.parse(packed);if(e?.token!==token)throw Error('SPACES_STORAGE_TOKEN_HOLD');if(e?.schema!=='jm.gameforge.spaces-envelope/1'||typeof e.body!=='string'||await hash(e.body)!==e.sha256)throw Error('SPACES_STORAGE_HASH_HOLD');session=JSON.parse(e.body);model.validate(session);session.rooms.forEach((m,i)=>{if(m.snapshot)window.JMValidateArena(m.snapshot,model.rooms[i].world)});}}
  function applyRoom(spawn=null){
    const r=model.rooms[session.active],m=session.rooms[session.active];
    GF.applyBody(r.body,false);GFUX.start(false);
    GF.hazards=Array.from({length:world.hazards},(_,i)=>({x:285+i*50,y:150+(i%3)*105,r:18+i%3*2,type:r.body==='burning'?(i%2?'boost':'heat'):r.body==='humanimals'?'spirit':i%2?'mud':'bounce'}));
    // The donor CORE remains part of native GameForge, but no longer sits
    // directly on top of the real room RELAY + its objective waypoint.
    GF.coreObj.x=r.world.targetX;GF.coreObj.y=145;
    if(m.snapshot)restoreArena(m.snapshot);
    if(spawn){GF.player.x=spawn.x;GF.player.y=spawn.y;GF.player.vx=GF.player.vy=0;}else if(!m.snapshot){GF.player.x=120;GF.player.y=285;}
    GF.fx=[];GFPLAY.particles=[];GF.flash=0;GFUX.firstMove=true;
    document.getElementById('jm-world-title').textContent=r.name+' · '+GFUX.info().game;
    document.getElementById('jm-world-help').textContent='Move with arrows / WASD, hold the direction pad, or tap a destination. Collect keys, power room relays, claim the beacon in Living Reach and bring it home. Doors enter real rooms.';
    GF.renderCrew();GF.updateBg();GF.update();goal=null;camera.x=GF.player.x;camera.y=GF.player.y;
    events.push({kind:'room.entered',room:r.id,body:r.body,transitions:session.transitions});
  }
  function capture(){session.rooms[session.active].snapshot=readArena();return structuredClone(model.validate(session));}
  async function persist(){if(!storage)return;const body=JSON.stringify(capture());saveQueue=saveQueue.then(async()=>{
    const packed=JSON.stringify({schema:'jm.gameforge.spaces-envelope/1',token,body,sha256:await hash(body)});
    // Check after the asynchronous digest and immediately before the write.
    if(storage.getItem(slot)!==durableValue)throw Error('SPACES_STORAGE_CONFLICT_HOLD');
    storage.setItem(slot,packed);durableValue=packed;persistError='';
  }).catch(e=>{persistError=String(e.message||e)});return saveQueue;}
  function act(){canvas.focus({preventScroll:true});resume();session.rooms[session.active].snapshot=readArena();const result=model.interact(session,GF.player);const names={collect:'KEY ACQUIRED',relay:'RELAY ONLINE',beacon:'BEACON CLAIMED',deliver:'CROSSING RESTORED',transition:'NEW ROOM',locked:'LOCKED'};if(names[result.kind])feedback={kind:result.kind,text:names[result.kind],start:performance.now()};events.push({...result,room:session.active});if(events.length>48)events.shift();if(result.kind==='transition')applyRoom(result.spawn);if(result.kind==='relay'){GF.energyVal=Math.min(100,GF.energyVal+25);for(const h of GF.hazards)h.type='boost';}if(['collect','transition','relay','beacon','deliver'].includes(result.kind))persist();updateControls();requestAnimationFrame(()=>{GF.draw();parent.postMessage({type:'jm.gameforge.spaces.event/1',token,kind:result.kind,from:result.from,to:result.to,active:session.active,body:GF.body.id,transitions:session.transitions,keys:session.collected.length},'*')});}
  const controls=document.createElement('div');controls.id='jm-space-controls';
  controls.innerHTML='<div id="jm-space-pad" aria-label="Movement"><button data-move="0,-1" aria-label="Move up">▲</button><button data-move="-1,0" aria-label="Move left">◀</button><button data-move="0,1" aria-label="Move down">▼</button><button data-move="1,0" aria-label="Move right">▶</button></div><button id="jm-space-use">Explore</button><span id="jm-space-state"></span>';
  document.querySelector('.app').append(controls);
  const style=document.createElement('style');style.textContent='.cards,.matchResultPanel,#banner{display:none!important}#jm-space-controls{display:grid;grid-template-columns:minmax(185px,1.2fr) minmax(110px,1fr);gap:6px;flex:none}#jm-space-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}#jm-space-controls button{min-height:54px;min-width:44px;padding:6px;touch-action:none;background:#122b3a;color:#e5f6ff;border:1px solid #42677e;border-radius:10px;font:700 17px system-ui}#jm-space-use{font-size:14px!important}#jm-space-use{background:#285244!important}#jm-space-state{grid-column:1/-1;font:600 13px/1.4 system-ui;color:#bcd5da;min-height:20px}.arenaWrap{touch-action:none}.arenaWrap,#jm-space-controls{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}';document.head.append(style);
  for(const b of controls.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});resume();goal=null;const a=b.dataset.move.split(',').map(Number);axis={x:a[0],y:a[1]};});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>axis={x:0,y:0});}
  controls.addEventListener('contextmenu',e=>e.preventDefault());controls.addEventListener('selectstart',e=>e.preventDefault());canvas.parentElement.addEventListener('contextmenu',e=>e.preventDefault());
  const use=document.getElementById('jm-space-use');use.onclick=act;
  // Optional encounter controls sit with (not over) the native touch deck.
  const battle=document.createElement('div');battle.id='jm-space-battle';
  battle.innerHTML='<button id="jm-space-engage" type="button">Engage guardian</button><button id="jm-space-pulse" type="button" disabled>⚡ Pulse</button><span id="jm-space-battle-state" aria-live="polite">Optional encounters · no effect on relay quest</span>';
  controls.append(battle);
  const battleCSS=document.createElement('style');
  battleCSS.textContent='#jm-space-battle{grid-column:1/-1;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px;border:1px solid #4d6973;border-radius:10px;background:#0b2732}#jm-space-battle button{min-height:44px!important;min-width:98px!important;background:#27515c!important;color:#f6ffff!important;border:1px solid #78adbb!important;font-size:13px!important}#jm-space-battle button:disabled{opacity:.4}#jm-space-battle-state{font:600 12px/1.35 system-ui;color:#d2eeec;flex:1 1 170px}@media(max-width:420px){#jm-space-battle{flex-wrap:nowrap}#jm-space-battle button{min-width:0!important;flex:0 0 auto;padding:3px 7px!important;font-size:11px!important}#jm-space-battle-state{font-size:10px}}';
  document.head.append(battleCSS);
  const engageButton=battle.querySelector('#jm-space-engage'),pulseButton=battle.querySelector('#jm-space-pulse'),battleState=battle.querySelector('#jm-space-battle-state');
  function encounterAction(action){
    if(!model.encounter)return;
    canvas.focus({preventScroll:true});resume();session.rooms[session.active].snapshot=readArena();
    const result=action==='engage'?model.encounter.engage(session,GF.player,(x,y,r)=>model.free(model.rooms[session.active],x,y,r)):model.encounter.pulse(session,GF.player);
    events.push({...result,room:session.active});if(events.length>48)events.shift();
    const titles={'encounter-started':'GUARDIAN ACTIVE','pulse-hit':'PULSE HIT','pulse-miss':'PULSE OUT OF RANGE',
      'encounter-won':'GUARDIAN CLEARED','encounter-lost':'SHIELD DEPLETED',
      'pulse-cooling':'PULSE RECHARGING','encounter-already-won':'ROOM CLEARED'};
    if(titles[result.kind])feedback={kind:result.kind,text:titles[result.kind],start:performance.now()};
    if(['encounter-started','pulse-hit','pulse-miss','encounter-won'].includes(result.kind))persist();
    updateControls();
  }
  engageButton.onclick=()=>encounterAction('engage');
  pulseButton.onclick=()=>encounterAction('pulse');

  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','e','E',' ','f','F','g','G'].includes(e.key)){e.preventDefault();resume();keys.add(e.key.toLowerCase());goal=null;if((e.key.toLowerCase()==='e'||e.key===' ')&&!e.repeat)act();if(e.key.toLowerCase()==='f'&&!e.repeat)encounterAction('pulse');if(e.key.toLowerCase()==='g'&&!e.repeat)encounterAction('engage');}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();axis={x:0,y:0};});
  canvas.onpointerdown=e=>{e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);resume();if(spatial.isActive()){goal=spatial.pickGoal(e.clientX,e.clientY);return;}const box=canvas.getBoundingClientRect(),sx=(e.clientX-box.left)*canvas.width/box.width,sy=(e.clientY-box.top)*canvas.height/box.height;goal={x:(sx-canvas.width/2)/camera.scale+camera.x,y:(sy-canvas.height/2)/camera.scale+camera.y};};canvas.onpointermove=null;canvas.onpointerup=()=>{};canvas.onpointercancel=()=>goal=null;
  const spatial=viewFactory({GF,model,session,canvas,getGoal:()=>goal&&{...goal}},rendererFactory);
  function updateControls(){const n=model.nearby(session,GF.player),task=model.objective(session);use.textContent=n?(n.locked?'Key needed':n.label):'Explore';use.disabled=!n;document.getElementById('jm-space-state').textContent=persistError?'Persistence HOLD · '+persistError:'NEXT · '+task.label+' · Keys '+session.collected.length+'/3 · relays '+model.progress(session).powered.length+'/3 · '+(isPaused()?'Saved / paused — move to resume':'Live');const ec=model.encounter?.view(session);
    if(ec){
      engageButton.disabled=ec.phase==='won'||ec.phase==='active';
      engageButton.textContent=ec.phase==='won'?'Guardian cleared':ec.phase==='lost'?'Retry encounter':'Engage guardian';
      pulseButton.disabled=ec.phase!=='active'||ec.guardian.cooldown>.02;
      battleState.textContent=ec.phase==='active'?'SHIELD '+ec.shield+'/4 · Guardian '+ec.guardian.hp+'/3 · Victories '+ec.wins.length+'/3':
        ec.phase==='won'?'GUARDIAN CLEARED · Victories '+ec.wins.length+'/3':
        ec.phase==='lost'?'SHIELD LOST · retry any time':'Optional combat · F Pulse · G Engage';
    }}
  GF.step=function(){const now=performance.now(),dt=Math.min(.033,Math.max(0,(now-last)/1000));last=now;if(isPaused()){updateControls();return;}
    let x=axis.x+(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0),y=axis.y+(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
    if(goal&&!x&&!y){const dx=goal.x-GF.player.x,dy=goal.y-GF.player.y,d=Math.hypot(dx,dy);if(d<9)goal=null;else{x=dx/d;y=dy/d;}}
    const norm=Math.max(1,Math.hypot(x,y)),old={x:GF.player.x,y:GF.player.y};GF.player.vx=x/norm*230*dt;GF.player.vy=y/norm*230*dt;
    nativeStep();const p=model.resolve(model.rooms[session.active],old,GF.player,GF.player.r);GF.player.x=p.x;GF.player.y=p.y;
    const encounterResult=model.encounter?.step(session,GF.player,dt,(x,y,r)=>model.free(model.rooms[session.active],x,y,r));
    if(encounterResult){
      events.push({...encounterResult,room:session.active});
      feedback={kind:encounterResult.kind,text:encounterResult.kind==='encounter-lost'?'SHIELD LOST':'GUARDIAN HIT',start:performance.now()};
      persist();
    }
    const alpha=1-Math.exp(-10*dt);camera.x+=(GF.player.x-camera.x)*alpha;camera.y+=(GF.player.y-camera.y)*alpha;updateControls();
  };
  GF.draw=function(){
    const box=canvas.getBoundingClientRect();const h=Math.max(300,Math.min(1800,Math.round(900*box.height/Math.max(1,box.width))));if(canvas.width!==900||canvas.height!==h){canvas.width=900;canvas.height=h;}
    camera.scale=Math.max(canvas.width/560,canvas.height/500);const halfX=canvas.width/(2*camera.scale),halfY=canvas.height/(2*camera.scale);camera.x=Math.max(halfX,Math.min(900-halfX,camera.x));camera.y=Math.max(halfY,Math.min(570-halfY,camera.y));
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.x,-camera.y);nativeDraw();
    const r=model.rooms[session.active],palette=r.body==='burning'?['#251415','#704535','#efb560']:r.body==='humanimals'?['#102525','#326158','#a7ebba']:['#102236','#355b79','#85d6f1'];
    // An explicitly authored JM player, rather than inheriting GameForge's
    // animal emoji as the only visible character on owner phone screens.
    // This overlays the native sprite; it does not replace GF.player physics.
    ctx.save();ctx.translate(GF.player.x,GF.player.y);
    const speed=Math.hypot(GF.player.vx||0,GF.player.vy||0);
    const moving=Math.min(1,speed/3),gait=Math.sin(performance.now()*.018)*moving;
    const facing=speed>.1?Math.atan2(GF.player.vy,GF.player.vx)+Math.PI/2:0;
    ctx.rotate(facing);
    const tint=r.body==='burning'?'#f4a46a':r.body==='humanimals'?'#71ead0':'#86baff';
    ctx.fillStyle='#0a1d28';ctx.strokeStyle=tint;ctx.lineWidth=2.5;
    ctx.shadowColor=tint;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(0,0,GF.player.r+7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#20394c';ctx.strokeStyle='#8ed7e7';ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(-14,2);ctx.lineTo(-11,-7);ctx.lineTo(11,-7);ctx.lineTo(14,2);ctx.lineTo(9,17);ctx.lineTo(-9,17);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=tint;ctx.lineWidth=6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(-20,10+gait*5);ctx.moveTo(11,0);ctx.lineTo(20,10-gait*5);ctx.stroke();
    ctx.strokeStyle='#5a8cab';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-6,16);ctx.lineTo(-8,24+gait*4);ctx.moveTo(6,16);ctx.lineTo(8,24-gait*4);ctx.stroke();
    ctx.fillStyle='#d8e9dc';ctx.beginPath();ctx.arc(0,-12,9.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#122d3b';ctx.fillRect(-9,-15,18,6);
    ctx.fillStyle=tint;ctx.fillRect(-6,-14,12,2);
    ctx.fillStyle='#fbdb9a';ctx.beginPath();ctx.arc(0,5,3,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.save();ctx.globalCompositeOperation='destination-over';ctx.fillStyle=palette[0];ctx.fillRect(0,0,900,570);ctx.restore();
    // JM-authored 2D environmental dressing. These are visibly distinct
    // structures derived from each room's original GameForge body identity,
    // not a shared colour/image cover. Entirely visual: no phantom collision.
    ctx.save();ctx.beginPath();ctx.rect(0,0,900,570);ctx.clip();
    const visualTime=performance.now()*.001;
    const halo=(x,y,radius,color,intensity=.20)=>{
      ctx.save();ctx.globalAlpha=intensity;ctx.shadowColor=color;ctx.shadowBlur=12;
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
    };
    // Foreground grid anchors the spatial proportions even when the source
    // body uses its own internal background pattern.
    ctx.lineWidth=1;ctx.strokeStyle=palette[2];ctx.globalAlpha=.10;
    for(let x=45;x<900;x+=90){ctx.beginPath();ctx.moveTo(x,12);ctx.lineTo(x,558);ctx.stroke();}
    for(let y=35;y<570;y+=90){ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(888,y);ctx.stroke();}
    ctx.globalAlpha=1;
    if(r.body==='burning'){
      for(const [x,y] of [[76,92],[824,92],[76,490],[824,490]]){
        ctx.fillStyle='#402e2a';ctx.strokeStyle='#c98457';ctx.lineWidth=4;
        ctx.fillRect(x-23,y-22,46,44);ctx.strokeRect(x-20,y-20,40,40);
        ctx.fillStyle='#d88551';ctx.fillRect(x-14,y-7,28,5);ctx.fillRect(x-14,y+5,28,5);
        halo(x,y,10,'#ffb477',.27+.06*Math.sin(visualTime*2+x));
      }
      ctx.strokeStyle='#9a543f';ctx.lineWidth=7;ctx.globalAlpha=.50;
      for(const y of [18,555]){
        ctx.beginPath();ctx.moveTo(110,y);ctx.lineTo(790,y);ctx.stroke();
        ctx.strokeStyle='#ffaf68';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(110,y);ctx.lineTo(790,y);ctx.stroke();
      }
      ctx.globalAlpha=1;
      for(let i=0;i<13;i++){
        const x=50+i*68,y=26+9*Math.sin(visualTime*.6+i);
        halo(x,y,2.5,'#ffc68f',.16+.08*Math.sin(visualTime*1.4+i));
      }
    }else if(r.body==='humanimals'){
      for(const [x,y] of [[70,84],[825,84],[70,490],[825,490]]){
        ctx.save();ctx.globalAlpha=.84;ctx.fillStyle='#346e5b';
        ctx.fillRect(x-7,y-18,14,49);
        ctx.strokeStyle='#65ad8b';ctx.lineWidth=4;
        ctx.beginPath();ctx.moveTo(x,y+25);ctx.lineTo(x-23,y+39);ctx.moveTo(x,y+25);ctx.lineTo(x+22,y+40);ctx.stroke();
        for(const [dx,dy,rad] of [[0,-17,24],[-18,-7,19],[19,-7,18],[1,7,18]]){
          ctx.fillStyle='#467e67';ctx.beginPath();ctx.arc(x+dx,y+dy,rad,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#8ed6ab';ctx.lineWidth=2;ctx.stroke();
        }
        ctx.restore();
        halo(x,y-12,7,'#b8ffc6',.20+.06*Math.sin(visualTime*1.6+x));
      }
      for(let i=0;i<14;i++){
        const x=42+(i*79)%820,y=56+(i*91)%470;
        halo(x+Math.sin(visualTime+i)*6,y+Math.cos(visualTime*.8+i)*5,3,'#a7ffc4',.15+.09*Math.sin(visualTime+i));
      }
      ctx.strokeStyle='#6ba68a';ctx.lineWidth=2;ctx.globalAlpha=.22;
      for(let i=0;i<7;i++){
        const x=115+i*112;ctx.beginPath();ctx.moveTo(x,550);ctx.quadraticCurveTo(x-18,475,x+13,390);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }else{
      for(const [x,y] of [[74,85],[822,85],[74,487],[822,487]]){
        ctx.fillStyle='#274564';ctx.strokeStyle='#85c9e9';ctx.lineWidth=3;
        ctx.fillRect(x-18,y-28,36,57);ctx.strokeRect(x-18,y-28,36,57);
        ctx.fillStyle='#5fc9fb';ctx.fillRect(x-12,y-19,24,7);
        for(let j=0;j<3;j++)ctx.fillRect(x-12,y-5+j*9,13+j*4,2);
        halo(x,y-15,5,'#a2f4ff',.30+.06*Math.sin(visualTime*2+x));
      }
      ctx.strokeStyle='#4899d0';ctx.lineWidth=3;ctx.globalAlpha=.35;
      for(let j=0;j<4;j++){
        const y=40+j*163;ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(108,y);
        ctx.moveTo(790,y);ctx.lineTo(892,y);ctx.stroke();
      }
      ctx.globalAlpha=1;
      for(let i=0;i<8;i++)halo(130+i*95,35+Math.sin(visualTime+i)*6,2,'#7ad9ff',.23);
    }
    ctx.restore();
    for(const b of r.walls){ctx.fillStyle='#0008';ctx.fillRect(b.x+10,b.y+12,b.w,b.h);ctx.fillStyle=palette[1];ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle=palette[2];ctx.fillRect(b.x,b.y,b.w,5);ctx.strokeStyle='#ffffff22';ctx.strokeRect(b.x,b.y,b.w,b.h);}
    for(const d of r.doors){const open=session.opened.includes(d.edge);ctx.fillStyle=open?'#194e49':'#483421';ctx.fillRect(d.x-20,d.y-52,40,104);ctx.strokeStyle=open?'#9fffd1':'#f4c27c';ctx.lineWidth=4;ctx.strokeRect(d.x-22,d.y-54,44,108);ctx.fillStyle=open?'#9fffd1':'#f4c27c';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(d.to>session.active?'→':'←',d.x,d.y+4);}
    // One embodied guardian per native room: GameForge coordinates, real AI
    // movement, actual shield/Pulse contact and independently recoverable wins.
    const combat=model.encounter?.view(session);
    if(combat&&combat.phase!=='won'){
      const guardian=combat.guardian,active=combat.phase==='active',t=performance.now()*.001;
      ctx.save();ctx.translate(guardian.x,guardian.y);
      ctx.shadowColor=active?'#ff8592':'#6fcfdb';ctx.shadowBlur=active?15:8;
      ctx.strokeStyle=active?'#ffa0b0':'#6ea5ba';ctx.lineWidth=3;
      ctx.fillStyle=active?'#582b4a':'#163b4d';
      ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(25,-8);ctx.lineTo(20,19);
      ctx.lineTo(0,29);ctx.lineTo(-20,19);ctx.lineTo(-25,-8);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle=active?'#ffd5d9':'#7fd8e7';ctx.fillRect(-14,-5,9,5);ctx.fillRect(5,-5,9,5);
      ctx.strokeStyle=active?'#ffb0a0':'#8ab8ce';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,33+(active?Math.sin(t*4)*3:0),0,Math.PI*2);ctx.stroke();
      if(active){
        ctx.font='bold 11px system-ui';ctx.fillStyle='#fff5e5';ctx.textAlign='center';
        ctx.fillText('GUARDIAN '+guardian.hp+'/3',0,-42);
      }else{
        ctx.font='bold 10px system-ui';ctx.fillStyle='#c4efef';ctx.textAlign='center';
        ctx.fillText(combat.phase==='lost'?'RETRY AVAILABLE':'OPTIONAL GUARDIAN',0,-42);
      }
      ctx.restore();
    }
    if(feedback&&feedback.kind.startsWith('pulse-')){
      const age=(performance.now()-feedback.start)/550;
      if(age<1){ctx.save();ctx.strokeStyle=feedback.kind==='pulse-hit'?'#c1ffee':'#75d9e5';
        ctx.globalAlpha=1-age;ctx.lineWidth=8*(1-age)+1;ctx.beginPath();
        ctx.arc(GF.player.x,GF.player.y,25+150*age,0,Math.PI*2);ctx.stroke();ctx.restore();}
    }
    if(!session.collected.includes(r.key.id)){ctx.fillStyle='#fff0a0';ctx.shadowColor='#e7c46b';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(r.key.x,r.key.y,12,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#382508';ctx.fillRect(r.key.x-2,r.key.y-7,4,14);}
    const q=model.progress(session),powered=q.powered.includes(session.active);ctx.fillStyle=powered?'#64ffd0':'#9b7536';ctx.globalAlpha=.45;ctx.fillRect(630,430,40,40);ctx.globalAlpha=1;ctx.strokeStyle='#eeecd0';ctx.strokeRect(627,427,46,46);ctx.fillStyle='#edf9f2';ctx.font='14px system-ui';ctx.fillText(powered?'RELAY ON':'RELAY',620,490);
    if(session.active===2&&!q.beacon){ctx.fillStyle=q.powered.length===3?'#9affcf':'#5e6875';ctx.beginPath();ctx.arc(720,110,20,0,7);ctx.fill();}
    if(session.active===0){ctx.fillStyle=q.delivered?'#7affb9':'#325b77';ctx.lineWidth=4;ctx.strokeStyle=ctx.fillStyle;ctx.strokeRect(95,420,50,40);ctx.fillStyle='#fff';ctx.fillText(q.delivered?'RESTORED':'RETURN',90,480);}
    // Same authoritative goal as the perspective waypoint; overlay is purely visual.
    const next=model.objective(session);
    if(Number.isFinite(next.x)&&Number.isFinite(next.y)){
      ctx.save();ctx.strokeStyle='#fff7aa';ctx.fillStyle='#ffedaa';
      ctx.lineWidth=3;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(next.x,next.y,30,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      // Worded NEXT instructions belong in the fixed status bar. The world
      // marker itself must not sit on top of relay labels or collectable names.
      ctx.beginPath();ctx.moveTo(next.x,next.y-39);ctx.lineTo(next.x-8,next.y-51);ctx.lineTo(next.x+8,next.y-51);ctx.closePath();ctx.fill();ctx.restore();
    }
    // Immediate action feedback belongs to the presentation, not the saved
    // progression schema. Existing GameForge events remain the only authority.
    if(feedback){
      const age=(performance.now()-feedback.start)/1350;
      if(age>=1)feedback=null;
      else{
        const color=feedback.kind==='locked'?'#ffaf91':
          feedback.kind==='collect'?'#ffe3a6':
          feedback.kind==='relay'?'#84ffdb':'#abedff';
        ctx.save();ctx.globalAlpha=Math.max(0,1-age);ctx.textAlign='center';
        ctx.strokeStyle=color;ctx.lineWidth=3*(1-age)+1;
        ctx.beginPath();ctx.arc(GF.player.x,GF.player.y,GF.player.r+15+age*27,0,Math.PI*2);ctx.stroke();
        ctx.font='bold 13px system-ui';ctx.fillStyle=color;
        ctx.shadowColor='#000';ctx.shadowBlur=4;
        ctx.fillText(feedback.text,GF.player.x,GF.player.y-46-age*18);
        ctx.restore();
      }
    }
    ctx.textAlign='start';ctx.restore();spatial.frame();
  };
  applyRoom();if(initialSnapshot||session.rooms[session.active].snapshot)pause();updateControls();
  window.JMWorldSuspend=async()=>{pause();keys.clear();axis={x:0,y:0};goal=null;await persist();if(persistError)throw Error(persistError);return capture();};
  window.addEventListener('jm.host.pause',()=>{window.JMWorldSuspend().then(()=>window.JMHostPauseSaved=true).catch(e=>{window.JMHostPauseHold=String(e.message||e)})});
  window.addEventListener('jm.host.resume',()=>{keys.clear();axis={x:0,y:0};last=performance.now();});
  const suspendFromHost=()=>window.JMWorldSuspend().catch(e=>{window.JMHostPauseHold=String(e.message||e);updateControls();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendFromHost();});
  if(storage){window.addEventListener('pagehide',suspendFromHost);setInterval(persist,1800);}
  return {capture,read:()=>({session:capture(),camera:{...camera},objective:model.objective(session),requestedDestination:goal&&{...goal},spatial:spatial.proof(),room:structuredClone(model.rooms[session.active]),events:structuredClone(events),combat:model.encounter?.view(session)||null,feedback:feedback?{kind:feedback.kind,text:feedback.text}:null}),canSave:()=>true};
}
