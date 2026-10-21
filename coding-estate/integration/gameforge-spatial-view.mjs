// Recipient adapter to the recovered JM Actual renderer; game state stays in GameForge.
export function installGameForgeSpatialView({GF,model,session,canvas},rendererFactory){
  let renderer=null,view=null,active=false,lastRoom=-1,lastPower=-1,error='';
  const button=document.createElement('button');button.id='jm-space-dimension';button.textContent='View in 3D';button.style.gridColumn='1/-1';document.getElementById('jm-space-controls').append(button);
  const point=(x,y)=>({x:(x-450)/18,z:(y-285)/18});
  function frame(){if(!active||!renderer)return;
    const room=model.rooms[session.active],power=session.progress?.powered?.includes(session.active)||false,o=window.JM_RAIN_RENDER.object;
    const color=room.body==='burning'?'#7b4331':room.body==='humanimals'?'#255950':'#244868';
    if(lastRoom!==session.active||lastPower!==Number(power)){
      const objects=[o('cube',0,-.3,0,25,.3,16,color)];
      for(const w of room.walls){const p=point(w.x+w.w/2,w.y+w.h/2);objects.push(o('cube',p.x,1.4,p.z,w.w/36,1.4,w.h/36,'#4e7687'));}
      for(const d of room.doors){const p=point(d.x,d.y);for(const side of [-1,1])objects.push(o('cube',p.x+side*.8,1.6,p.z,.14,1.6,.35,'#69d8bd'));objects.push(o('cube',p.x,3.1,p.z,.9,.15,.35,'#69d8bd'));}
      const p=point(650,450);objects.push(o('hex',p.x,.5,p.z,1,.5,1,power?'#6fffd0':'#d09f50',power?.5:0));
      renderer.staticScene(objects);lastRoom=session.active;lastPower=Number(power);
    }
    const p=point(GF.player.x,GF.player.y);
    const dynamic=()=>{const objects=[o('sphere',p.x,.9,p.z,.9,.9,.9,'#8ce8ff',.15)];
      for(const h of GF.hazards){const q=point(h.x,h.y);objects.push(o('octa',q.x,.6,q.z,h.r/18,.6,h.r/18,h.type==='heat'?'#fb7860':'#c3a764',.1));}
      if(!session.collected.includes(room.key.id)){const q=point(room.key.x,room.key.y);objects.push(o('octa',q.x,1.2,q.z,.55,1,.55,'#ffdf8c',.6));}
      return objects;};
    renderer.frame({player:p,camera:'FOLLOW',sceneObjects:dynamic},{scene_hash:model.spec+':'+session.active},performance.now()/1000);
    if(renderer.gl.getError()!==renderer.gl.NO_ERROR){error='WEBGL_DRAW_HOLD';active=false;view.hidden=true;canvas.hidden=false;button.textContent='3D HOLD · return to 2D';}
  }
  button.onclick=()=>{try{
    if(!renderer){rendererFactory();view=document.createElement('canvas');view.id='jm-spatial-canvas';view.style.cssText='position:absolute;inset:0;width:100%;height:100%;touch-action:none';view.setAttribute('aria-label','JM Actual 3D connected world');canvas.parentElement.style.position='relative';canvas.parentElement.append(view);renderer=new window.JM_RAIN_RENDER.Renderer(view);if(renderer.error)throw Error(renderer.error);}
    active=!active;view.hidden=!active;view.style.setProperty('display',active?'block':'none','important');view.style.pointerEvents=active?'auto':'none';canvas.style.visibility=active?'hidden':'visible';button.textContent=active?'Return to 2D':'View in 3D';frame();
  }catch(e){error=String(e.message||e);active=false;if(view){view.hidden=true;view.style.setProperty('display','none','important');view.style.pointerEvents='none';}canvas.style.visibility='visible';button.textContent='3D HOLD · 2D available';}};
  function proof(){if(!active||!renderer)return {active:false,error};frame();const gl=renderer.gl,bytes=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let hash=2166136261,variation=0;for(let i=0;i<bytes.length;i+=16){hash=Math.imul(hash^bytes[i],16777619);if(bytes[i]!==bytes[0])variation++;}return {active:true,...renderer.proof(),room:session.active,player:point(GF.player.x,GF.player.y),pixelDigest:(hash>>>0).toString(16),variation,error};}
  return {frame,proof};
}
