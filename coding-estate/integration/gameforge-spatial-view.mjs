// Shared JM Actual 3D view of authoritative GameForge Spaces; no second game state.
export function installGameForgeSpatialView({GF,model,session,canvas},rendererFactory){
  let renderer=null,view=null,active=false,lastSignature='',error='',layout=null,cameraMode='FOLLOW';
  const controls=document.getElementById('jm-space-controls');
  const button=document.createElement('button');button.id='jm-space-dimension';
  button.textContent='View in 3D';button.style.gridColumn='1/2';controls.append(button);
  const cameraButton=document.createElement('button');cameraButton.id='jm-space-camera';
  cameraButton.textContent='Orbit camera';cameraButton.style.gridColumn='2/3';
  cameraButton.disabled=true;controls.append(cameraButton);
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
    // Exact same source/output grammar in HTML, browser and APK; no hand-placed cover art.
    const current=window.JMSpatialRoom(room,session,o,point);
    if(current.signature!==lastSignature){
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
      canvas.style.visibility='visible';button.textContent='3D HOLD · 2D ready';
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
      button.textContent=active?'Return to 2D':'View in 3D';
      if(active)frame();
    }catch(e){
      error=String(e.message||e);active=false;cameraButton.disabled=true;
      if(view){view.hidden=true;view.style.setProperty('display','none','important');}
      canvas.style.visibility='visible';button.textContent='3D HOLD · 2D available';
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
      architecture:layout,cameraMode,player:point(GF.player.x,GF.player.y),
      pixelDigest:(hash>>>0).toString(16),variation,error};
  }
  return {frame,proof};
}
