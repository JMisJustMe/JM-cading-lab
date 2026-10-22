// Shared JM Actual 3D view of authoritative GameForge Spaces; no second game state.
export function installGameForgeSpatialView({GF,model,session,canvas,getGoal},rendererFactory){
  let renderer=null,view=null,active=false,lastSignature='',error='',layout=null,cameraMode='FOLLOW';
  // Owner-device correction: switching dimension must be visible BEFORE the
  // game canvas, not appended after a tall portrait arena and hidden below fold.
  const toolbar=document.createElement('div');toolbar.id='jm-space-view-toolbar';
  toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Game viewing modes');
  const label=document.createElement('span');label.id='jm-space-view-label';label.textContent='VIEW · 2D';
  const button=document.createElement('button');button.id='jm-space-dimension';
  button.textContent='Switch to 3D';button.setAttribute('aria-pressed','false');
  const cameraButton=document.createElement('button');cameraButton.id='jm-space-camera';
  cameraButton.textContent='Orbit camera';cameraButton.disabled=true;
  toolbar.append(label,button,cameraButton);
  canvas.parentElement.before(toolbar);
  const style=document.createElement('style');
  style.textContent='#jm-space-view-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:7px 9px;border:1px solid #416474;border-radius:12px;background:#102b33;color:#e3fcff;font:600 13px system-ui}#jm-space-view-label{margin-right:auto;letter-spacing:.09em}#jm-space-view-toolbar button{min-height:44px;padding:7px 12px;border:1px solid #66a5c3;border-radius:10px;background:#143d51;color:#fff;font:600 13px system-ui;touch-action:manipulation}#jm-space-view-toolbar button:disabled{opacity:.44}#jm-space-view-toolbar #jm-space-dimension[aria-pressed="true"]{background:#256456;border-color:#94ffd7}@media(max-width:420px){#jm-space-view-toolbar{flex-wrap:nowrap;gap:4px;padding:4px 5px}#jm-space-view-label{white-space:nowrap;flex:0 0 auto;font-size:11px;margin-right:2px}#jm-space-view-toolbar button{flex:1;min-width:0;font-size:11px;padding:7px 4px}}';
  document.head.append(style);
  const point=(x,y)=>({x:(x-450)/18,z:(y-285)/18});
  cameraButton.onclick=()=>{
    if(!active)return;
    cameraMode=cameraMode==='FOLLOW'?'ORBIT':'FOLLOW';
    cameraButton.textContent=cameraMode==='FOLLOW'?'Orbit camera':'Follow camera';
    frame();
  };
  function frame(){
    if(!active||!renderer)return;
    const room=model.rooms[session.active],o=window.JM_RAIN_RENDER.object;
    // Static room geometry is reconstructed only on real state changes.
    // Actor/collectible animation below remains live on every frame.
    const signature=room.body+':'+room.id+':'+Number(!!session.progress?.powered?.includes(room.id))+':'+session.opened.join('|');
    if(signature!==lastSignature){
      const current=window.JMSpatialRoom(room,session,o,point);
      if(current.signature!==signature)throw Error('JM_SPATIAL_SCENE_SIGNATURE_HOLD');
      renderer.staticScene(current.models);
      layout={signature:current.signature,features:current.features,objectCount:current.models.length};
      lastSignature=current.signature;
    }
    const p=point(GF.player.x,GF.player.y),now=performance.now()/1000;
    const motion=Math.min(1,Math.hypot(GF.player.vx||0,GF.player.vy||0)/3);
    const gait=Math.sin(now*9)*motion;
    const heading=Math.atan2(GF.player.vx||0,GF.player.vy||1);
    const dynamic=()=>{
      const models=[
        o('ring',p.x,.055,p.z,.79,.04,.79,'#317b90',.10),
        o('hex',p.x,1.15+Math.abs(gait)*.06,p.z,.48,.65,.36,'#6cd3ea',.18,heading),
        o('sphere',p.x,2.12+Math.abs(gait)*.06,p.z,.36,.38,.36,'#bbeeff',.18),
        o('cube',p.x-.48,1.24,p.z,.15,.48,.15,'#70a4c5',.02),
        o('cube',p.x+.48,1.24,p.z,.15,.48,.15,'#70a4c5',.02),
        o('cube',p.x-.22,.42+gait*.12,p.z+.04,.16,.43,.19,'#376e95',.02),
        o('cube',p.x+.22,.42-gait*.12,p.z-.04,.16,.43,.19,'#376e95',.02),
        o('octa',p.x,1.52,p.z-.38,.20,.20,.15,'#fff2b7',.58)
      ];
      for(const [i,h] of GF.hazards.entries()){
        const q=point(h.x,h.y),bob=.56+Math.sin(now*2.3+i)*.13;
        models.push(o('octa',q.x,bob,q.z,h.r/18,.58,h.r/18,
          h.type==='heat'?'#ff7655':h.type==='boost'?'#71ffbb':room.body==='humanimals'?'#a7e5a6':'#d2bd79',.32));
        models.push(o('ring',q.x,.075,q.z,h.r/18*1.20,.035,h.r/18*1.2,
          h.type==='heat'?'#e77f59':h.type==='boost'?'#80ffc7':'#8fbdb1',.16));
      }
      if(!session.collected.includes(room.key.id)){
        const q=point(room.key.x,room.key.y);
        models.push(o('octa',q.x,1.35+Math.sin(now*2)*.20,q.z,.53,.68,.53,'#ffe39a',.86));
        models.push(o('ring',q.x,.09,q.z,.86,.055,.86,'#ffdc80',.45));
      }
      const combat= model.encounter?.view(session);
      if(combat&&combat.phase!=='won'&&combat.guardian){
        const r=combat.guardian,g=point(r.x,r.y),awake=combat.phase==='active';
        const bodyColor=awake?'#d77b96':'#65a6c7';
        models.push(o('ring',g.x,.11,g.z,1.15,.075,1.15,awake?'#ff98a8':'#74b9d4',awake?.58:.28));
        models.push(o('hex',g.x,1.20+Math.sin(now*3)*.12,g.z,.66,.88,.52,bodyColor,awake?.45:.14));
        models.push(o('octa',g.x,2.35+Math.sin(now*3)*.12,g.z,.60,.62,.60,awake?'#ffd2d5':'#a5deec',awake?.33:.18));
        models.push(o('cube',g.x-.46,1.55,g.z,.18,.42,.20,bodyColor));
        models.push(o('cube',g.x+.46,1.55,g.z,.18,.42,.20,bodyColor));
        for(let hp=0;hp<r.hp;hp++)
          models.push(o('octa',g.x+(hp-1)*.34,3.30,g.z,.12,.16,.12,'#ffcfad',.75));
      }
      const destination=typeof getGoal==='function'?getGoal():null;
      if(destination&&Number.isFinite(destination.x)&&Number.isFinite(destination.y)){
        const target=point(destination.x,destination.y);
        models.push(o('ring',target.x,.09,target.z,.76,.045,.76,'#94faff',.48));
        models.push(o('octa',target.x,.45+Math.sin(now*3)*.09,target.z,.18,.30,.18,'#b5ffff',.44));
      }
      const next=model.objective(session);
      if(Number.isFinite(next.x)&&Number.isFinite(next.y)){
        const t=point(next.x,next.y);
        const glow=next.kind==='door'?'#8afad5':next.kind==='key'?'#ffdb8b':
          next.kind==='relay'?'#8dceff':next.kind==='beacon'?'#c7ffaa':'#a4ffcb';
        models.push(o('ring',t.x,.11,t.z,1.11,.085,1.11,glow,.67));
        models.push(o('octa',t.x,2.45+Math.sin(now*2.7)*.25,t.z,.35,.51,.35,glow,.82));
        models.push(o('cube',t.x,1.1,t.z,.08,1.12,.08,glow,.29));
      }
      const progression=model.progress(session);
      if(session.active===2&&!progression.beacon){
        const q=point(720,110);
        models.push(o('octa',q.x,1.85+Math.sin(now*1.7)*.14,q.z,.84,1.12,.84,
          progression.powered.length===3?'#a1ffcf':'#576575',progression.powered.length===3?.95:.10));
      }
      if(session.active===0){
        const q=point(120,440);
        models.push(o('hex',q.x,.33,q.z,1.5,.30,1.20,
          progression.delivered?'#76ffc5':'#42667e',progression.delivered?.56:.12));
      }
      return models;
    };
    renderer.frame({player:p,camera:cameraMode,sceneObjects:dynamic},
      {scene_hash:layout?.signature||model.spec+':'+session.active},now);
    if(renderer.gl.getError()!==renderer.gl.NO_ERROR){
      error='WEBGL_DRAW_HOLD';active=false;view.hidden=true;
      view.style.setProperty('display','none','important');cameraButton.disabled=true;
      canvas.style.visibility='visible';button.textContent='3D unavailable';button.setAttribute('aria-pressed','false');label.textContent='VIEW · 2D';
    }
  }
  button.onclick=()=>{
    try{
      if(!renderer){
        rendererFactory();
        view=document.createElement('canvas');view.id='jm-spatial-canvas';
        // Let the *original GameForge canvas* retain touch/goal authority.
        // The opaque 3D canvas only changes the presentation; it does not intercept input.
        view.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none';
        view.setAttribute('aria-label','JM Actual 3D connected world');
        canvas.parentElement.style.position='relative';canvas.parentElement.append(view);
        renderer=new window.JM_RAIN_RENDER.Renderer(view);
        if(renderer.error)throw Error(renderer.error);
      }
      active=!active;view.hidden=!active;
      view.style.setProperty('display',active?'block':'none','important');
      cameraButton.disabled=!active;
      // Do not hide the 2D authority or move its touch targets under 3D.
      canvas.style.visibility='visible';
      button.textContent=active?'Switch to 2D':'Switch to 3D';
      button.setAttribute('aria-pressed',String(active));
      label.textContent=active?'VIEW · 3D':'VIEW · 2D';
      if(active)frame();
    }catch(e){
      error=String(e.message||e);active=false;cameraButton.disabled=true;
      if(view){view.hidden=true;view.style.setProperty('display','none','important');}
      canvas.style.visibility='visible';button.textContent='3D unavailable';button.setAttribute('aria-pressed','false');label.textContent='VIEW · 2D';
    }
  };
  function proof(){
    if(!active||!renderer)return {active:false,error};
    frame();if(!active)return {active:false,error};
    const gl=renderer.gl,bytes=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
    gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
    let hash=2166136261,variation=0;
    for(let i=0;i<bytes.length;i+=16){hash=Math.imul(hash^bytes[i],16777619);if(bytes[i]!==bytes[0])variation++;}
    return {active:true,...renderer.proof(),room:session.active,roomBody:model.rooms[session.active].body,
      architecture:layout,cameraMode,objective:model.objective(session),combat:model.encounter?.view(session)||null,player:point(GF.player.x,GF.player.y),
      pixelDigest:(hash>>>0).toString(16),variation,error};
  }
  function isActive(){return active;}
  function pickGoal(clientX,clientY){
    if(!active||!renderer)return null;
    const hit=renderer.pickGround(clientX,clientY);
    if(!hit)return null;
    const x=450+hit.x*18,y=285+hit.z*18;
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<24||x>876||y<24||y>546)return null;
    return {x,y};
  }
  return {frame,proof,isActive,pickGoal};
}
