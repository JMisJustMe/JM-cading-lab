/* JM Form Forge → RouteOS bounded real geometry contact host v0.1
   Only the manually imported GLB reaches recipient. Private Forge v0.24 source never goes public.
   Native console records witnessed face contacts, not invented engine merger.
*/
(()=>{
'use strict';
if(window.JMFormForgeRouteOS)return;
const SHA='ddffeed1897e46215811623939068b794c6c0a5badf7afb6abf9042d3e6be3ba';
const CONTRACT='JM.FormForge.RouteOSHostContact/0.1';
const KINETIC='JM.FormForge.RouteOSKinetics/0.2';
const DUAL='JM.FormForge.DualActor/0.5',STATE='JM.FormForge.EncounterState/0.5';
const VALID=new Set(['MESH_ACCEPTED','FACE_CONTACT','CONTACT_DING']);
const source='../../../target-bridge/form-forge-routeos-v0-1/index.html';
let frame=null,surface=null,status=null,mesh=null,snapshot=null,contacts=new Set(),lastScore=0;
let activeShot=0,lastImpact=0,lastImpactStep=0,dualContact=0;
function info(s,bad=false){if(!status)return;status.textContent=s;status.style.color=bad?'#ff9ab1':'#a0efbb'}
function accepted(p){
 if(!p||p.schema!==CONTRACT||!VALID.has(p.event)||p.source!==SHA||
 !/^[a-f0-9]{64}$/.test(p.geometryHash||'')||!/^[a-f0-9]{8}$/.test(p.snapshotHash||'')||
 !Number.isInteger(p.contacts)||p.contacts<0||p.contacts>100000||
 !Number.isSafeInteger(p.score)||p.score<0||p.score>10000000)return false;
 if(p.event==='MESH_ACCEPTED')return p.contacts===0&&p.score===0;
 return Number.isInteger(p.face)&&p.face>=0&&p.face<=300000;
}
function handle(e){
 if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return;
 const p=e.data;
 if(p?.schema===DUAL){
  if(!mesh||p.source!==SHA||p.geometryHash!==mesh||p.snapshotHash!==snapshot||
   p.instances!==2||!Number.isInteger(p.contactCount)||p.contactCount<0||p.contactCount>100000||
   !Number.isInteger(p.sequence)||p.sequence!==p.contactCount||
   typeof p.actorX!=='number'||!Number.isFinite(p.actorX)||Math.abs(p.actorX)>100||
   typeof p.velocity!=='number'||!Number.isFinite(p.velocity)||Math.abs(p.velocity)>100)return;
  const record=window.JMRouteOSFormForgePort?.record,bus=window.JMAppsToolsSpine;
  if(p.event==='ACTOR_CONTACT'){
   if(p.contactMode!=='SOURCE_BOUNDS_PROXY'||p.contactCount!==dualContact+1||
    p.actors?.length!==2||p.actors[0]!=='original'||p.actors[1]!=='echo')return;
   const proof=record?.('FORGE_ACTOR_CONTACT',{...p,contacts:contacts.size,score:lastScore,actorContacts:p.contactCount,actorX:p.actorX});
   if(!proof){info('Native two-actor contact receipt HOLD',true);return}
   dualContact=p.contactCount;
   if(bus?.packet&&bus?.send&&Array.isArray(bus.read())&&bus.read().length<250){
    bus.send(bus.packet('jm.fieldform.dual-actor-contact','JM.RouteOS.FormContact',{
     source_sha256:SHA,mesh_sha256:mesh,snapshot_hash:snapshot,instances:2,
     actor_x:p.actorX,actor_contacts:p.contactCount,contact_sequence:p.sequence,
     collider:'SOURCE_BOUNDS_PROXY',threshold:p.threshold
    },{bridge:DUAL,private_mesh_bytes:false}));
    info('TWO ACTORS CONTACTED · native RouteOS + JM bus received source-bounded consequence.');
   }else info('Two-actor contact native receipt PASS; bus unavailable/full.');
   return;
  }
  if(p.event==='STATE_SAVE'){
   const cp=p.checkpoint;
   const actor=frame.contentWindow?.JMForgeDualActor;
   try{actor?.validate(cp)}catch(e){info('Encounter source-state HOLD: '+e.message,true);return}
   if(!cp||cp.schema!==STATE||cp.mesh!==mesh||cp.snapshot!==snapshot||cp.source!==SHA||
      cp.echo.contacts!==dualContact)return;
   if(!bus?.packet||!bus?.send||!Array.isArray(bus.read())||bus.read().length>=250){
    info('Native encounter still active; bus full/unavailable (no save claimed).',true);return;
   }
   const result=record?.('FORGE_ACTOR_STATE_SAVED',{...p,contacts:contacts.size,score:lastScore,actorContacts:dualContact,actorX:p.actorX});
   if(!result){info('Native encounter-save receipt HOLD',true);return}
   bus.send(bus.packet('jm.fieldform.dual-actor-checkpoint','JM.RouteOS.FormContact',{
     checkpoint:JSON.parse(JSON.stringify(cp)),source_sha256:SHA,mesh_sha256:mesh,snapshot_hash:snapshot,
     proof:'EXPLICIT_USER_SAVE_SOURCE_BOUNDED'
   },{bridge:DUAL,private_mesh_bytes:false}));
   info('Two-actor encounter checkpoint saved to existing JM bus. Manual device transfer supported.');
  }
  return;
 }
 if(p?.schema===KINETIC){
  if(!mesh||p.source!==SHA||p.geometryHash!==mesh||p.snapshotHash!==snapshot||
   !Number.isSafeInteger(p.shot)||p.shot<1||
   !Number.isSafeInteger(p.step)||p.step<0||
   !Number.isSafeInteger(p.impactCount)||p.impactCount<0||p.impactCount>10000)return;
  if(p.event==='PROBE_LAUNCH'){
   if(p.shot<=activeShot||p.face!==-1||p.impactCount!==lastImpact)return;
   activeShot=p.shot;lastImpactStep=0;
   const pass=window.JMRouteOSFormForgePort?.record('FORGE_PROBE_LAUNCH',{...p,contacts:contacts.size,score:lastScore});
   info(pass?'3D Forge probe launched: actual mesh triangle collision pending.':'RouteOS probe launch receipt HOLD.',!pass);
   return;
  }
  if(p.event==='SURFACE_IMPACT'){
   const vec=v=>Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<10000);
   if(p.shot!==activeShot||p.impactCount!==lastImpact+1||p.step<=lastImpactStep||
    !Number.isInteger(p.face)||p.face<0||p.face>300000||!vec(p.point)||!vec(p.normal))return;
   lastImpact=p.impactCount;lastImpactStep=p.step;
   const verified={...p,contacts:contacts.size,score:lastScore};
   const ok=window.JMRouteOSFormForgePort?.record('FORGE_SURFACE_IMPACT',verified);
   if(ok){
    const b=window.JMAppsToolsSpine;
    if(b?.packet&&b?.send&&Array.isArray(b.read())&&b.read().length<250){
     b.send(b.packet('jm.fieldform.kinetic-surface-impact','JM.RouteOS.FormContact',{
      source_sha256:SHA,mesh_sha256:mesh,snapshot_hash:snapshot,
      shot:p.shot,face:p.face,impact_count:p.impactCount,step:p.step,
      point:p.point,normal:p.normal,proof:'BROWSER_3D_SEGMENT_TRIANGLE_IMPACT_AND_NATIVE_HOST_RECEIPT'
     },{bridge:'JM.FormForge.RouteOSKinetics/0.2',private_geometry_bytes:false}));
     info('3D face '+p.face+' impacted · bounded native RouteOS receipt + JM bus packet.');
    }else info('3D face '+p.face+' impacted · native RouteOS receipt PASS; bus HOLD.');
     if(ok){
      try{
       const body=frame.contentWindow?.JMForgeEmbodiment;
       if(body?.schema!=='JM.FormForge.Embodiment/0.3')throw Error('v0.3 source-geometry response organ missing');
       const response=body.onImpact(p);
       if(response?.affected_vertices<1||response.max_offset<=0)throw Error('No measurable vertex movement');
       const physical={...p,contacts:contacts.size,score:lastScore,affectedVertices:response.affected_vertices,totalVertices:response.total_vertices,
        maxOffset:response.max_offset,responseSequence:response.impact_sequence};
       const recorded=window.JMRouteOSFormForgePort?.record('FORGE_SURFACE_RESPONSE',physical);
       if(recorded){
        try{
         const articulator=frame.contentWindow?.JMForgeArticulation;
         if(articulator?.schema!=='JM.FormForge.Articulation/0.4')throw Error('Original source articulation organ not yet running');
         const articulated=articulator.recoil(p);
         if(articulated.affectedVertices<1||articulated.offset<=0)throw Error('No verified coordinated body movement');
         const hostData={...p,contacts:contacts.size,score:lastScore,
          articulatedVertices:articulated.affectedVertices,poseOffset:articulated.offset,
          jointAngles:articulated.joints.map(j=>j.angle),poseSequence:articulated.impactSequence};
         const native=window.JMRouteOSFormForgePort?.record('FORGE_ARTICULATED_RECOIL',hostData);
         if(native){
          const shared=window.JMAppsToolsSpine;
          if(shared?.packet&&shared?.send&&Array.isArray(shared.read())&&shared.read().length<250){
           shared.send(shared.packet('jm.fieldform.articulated-recoil','JM.RouteOS.FormContact',{
            source_sha256:SHA,mesh_sha256:mesh,snapshot_hash:snapshot,face:p.face,shot:p.shot,
            root:'root',joints:articulated.joints.map(j=>({name:j.name,angle:j.angle})),
            affected_vertices:articulated.affectedVertices,pose_offset:articulated.offset,
            response_sequence:articulated.impactSequence,scope:'WEIGHTED_CONNECTED_VERTEX_HINGES'
           },{bridge:'JM.FormForge.Articulation/0.4',private_geometry_bytes:false}));
           info('COORDINATED BODY RESPONSE · '+articulated.affectedVertices+' vertices, 2 coupled joints · native RouteOS and JM packet PASS');
          }else info('Articulated pose and RouteOS receipt PASS; shared JM bus full/unavailable.');
         }else info('Articulation moved original vertices; native joint receipt HOLD.',true);
        }catch(artError){info('v0.3 source vertex deformation remains; v0.4 articulation HOLD: '+artError.message,true)}
        const b2=window.JMAppsToolsSpine;
        if(b2?.packet&&b2?.send&&Array.isArray(b2.read())&&b2.read().length<250){
         b2.send(b2.packet('jm.fieldform.embodied-surface-response','JM.RouteOS.FormContact',{
          source_sha256:SHA,mesh_sha256:mesh,snapshot_hash:snapshot,
          face:p.face,shot:p.shot,affected_vertices:response.affected_vertices,
          max_offset:response.max_offset,response_sequence:response.impact_sequence,
          state:'SOURCE_VERTICES_ACTUALLY_MOVED__RECOVERABLE'
         },{bridge:'JM.FormForge.Embodiment/0.3',private_geometry_bytes:false}));
         info('FORM REACTED · '+response.affected_vertices+' original mesh vertices moved, RouteOS receipt + JM bus proof.');
        }else info('Form moved and native receipt PASS; shared packet bus unavailable/full.');
       }else info('Form responded, RouteOS response receipt HOLD.',true);
      }catch(err){info('v0.2 impact preserved; v0.3 embodied response HOLD: '+err.message,true)}
     }
   }else info('Native Forge impact receipt HOLD',true);
   return;
  }
  return;
 }
 if(!accepted(p))return;
 if(p.event==='MESH_ACCEPTED'){
   mesh=p.geometryHash;snapshot=p.snapshotHash;contacts.clear();lastScore=0;activeShot=0;lastImpact=0;lastImpactStep=0;dualContact=0;
   try{frame.contentWindow?.JMForgeDualActor?.bindSource?.()}catch(e){info('Echo encounter bind HOLD: '+e.message,true)}
   frame.contentWindow?.JMForgeKinetics?.resetSourceSession?.();
   try{frame.contentWindow?.JMForgeEmbodiment?.bindSource?.()}catch(e){info('Mesh accepted, embodied response held: '+e.message,true)}
   const ok=window.JMRouteOSFormForgePort?.record('FORGE_MESH_ACCEPTED',p);
   info(ok?'Forge-sourced geometry arrived in RouteOS. Touch distinct mesh faces to play.':'Native recipient receipt HOLD.',!ok);
   return;
 }
 if(!mesh||mesh!==p.geometryHash||snapshot!==p.snapshotHash)return;
 if(p.event==='FACE_CONTACT'){
   if(contacts.has(p.face)||p.contacts!==contacts.size+1||p.score<=lastScore)return;
   contacts.add(p.face);lastScore=p.score;
   const ok=window.JMRouteOSFormForgePort?.record('FORGE_FACE_CONTACT',p);
   info(ok?'Mesh triangle '+p.face+' contacted · '+contacts.size+'/5 · Score '+p.score:'RouteOS receipt HOLD',!ok);
   return;
 }
 if(p.event==='CONTACT_DING'&&contacts.size>=5&&p.contacts===contacts.size&&p.score===lastScore){
   const ok=window.JMRouteOSFormForgePort?.record('FORGE_CONTACT_DING',p);
   if(ok){
     const b=window.JMAppsToolsSpine;
     if(b?.packet&&b?.send&&Array.isArray(b.read())&&b.read().length<250){
       const result=b.packet('jm.fieldform.game-contact.receipt','JM.RouteOS.FormContact',{
         source_sha256:p.source,mesh_sha256:p.geometryHash,forge_snapshot_hash:p.snapshotHash,
         contacts:contacts.size,face_ids:[...contacts],score:lastScore,
         receiver:'JM RouteOS v0.8.2',proof:'BROWSER_CONTACT_WITH_NATIVE_HOST_RECEIPT'
       },{source:'JM.FieldFormForge/0.24',bridge:'JM.FormForge.RouteOSHostContact/0.1',private_source_embedded:false});
       b.send(result);
       info('DING · RouteOS native receipt + existing JM Apps & Tools packet bus recorded real mesh-contact consequence.');
     }else info('RouteOS Ding earned; shared JM bus full/unavailable (no bus packet claimed).');
   }else info('Native Ding HOLD',true);
 }
}
function open(){
 if(surface){surface.hidden=false;return}
 surface=document.createElement('section');surface.id='jmForgeRouteOSHost';surface.setAttribute('aria-label','JM Form Forge contact game inside RouteOS');
 const bar=document.createElement('div');bar.className='jm-ffbar';
 const title=document.createElement('strong');title.textContent='ROUTEOS × FIELD/FORM FORGE · TWO ACTORS';
 const close=document.createElement('button');close.textContent='RETURN TO ROUTEOS';close.onclick=()=>{surface.hidden=true};
 bar.append(title,close);surface.append(bar);
 const restoreState=document.createElement('button');restoreState.id='jmRestoreDualState';
 restoreState.textContent='RESTORE LATEST JM ENCOUNTER';
 restoreState.style.cssText='margin:5px 0;min-height:40px;background:#153647;color:#fff;border:1px solid #558caf;border-radius:9px';
 restoreState.onclick=()=>{try{
  if(!mesh)throw Error('Load same verified geometry first');
  const spine=window.JMAppsToolsSpine;
  const list=spine?.read()?.filter(p=>p.kind==='jm.fieldform.dual-actor-checkpoint'&&
   p.payload?.checkpoint?.mesh===mesh&&p.payload?.checkpoint?.snapshot===snapshot&&p.payload?.checkpoint?.source===SHA)||[];
  if(!list.length)throw Error('No matching JM encounter checkpoint in this browser bus');
  const actor=frame.contentWindow?.JMForgeDualActor;
  const outcome=actor.restore(list[0].payload.checkpoint);
  dualContact=outcome.contacts;
  const native=window.JMRouteOSFormForgePort?.record('FORGE_ACTOR_STATE_RESTORED',{
   source:SHA,geometryHash:mesh,snapshotHash:snapshot,contacts:contacts.size,score:lastScore,
   actorContacts:dualContact,actorX:list[0].payload.checkpoint.echo.x
  });
  info(native?'Verified two-actor encounter restored through JM bus and RouteOS receipt.':'Encounter restored; native RouteOS receipt HOLD.',!native);
 }catch(e){info('Encounter RESTORE HOLD: '+e.message,true)}};
 surface.append(restoreState);
 status=document.createElement('p');status.setAttribute('role','status');status.textContent='Waiting for JM Forge geometry packet. Import using LOAD FORGE PACKET below.';surface.append(status);
 frame=document.createElement('iframe');frame.title='JM GameCore FORM CONTACT from user-supplied Form Forge geometry';frame.src=new URL(source,document.baseURI).href;frame.referrerPolicy='no-referrer';
 frame.addEventListener('load',()=>{
  try{
   const doc=frame.contentDocument;
   if(!doc?.defaultView?.JMForgeContact)throw Error('Original v0.1 Forge recipient not running');
   const s=doc.createElement('script');
   s.src=new URL('../../../target-bridge/form-forge-routeos-v0-2/JM_FORGE_SURFACE_KINETICS_v0_2.js',document.baseURI).href;
   s.onerror=()=>info('Surface Kinetics module could not mount; original contact remains available.',true);
   doc.body.append(s);
   s.addEventListener('load',()=>{
    const embodied=doc.createElement('script');
    embodied.src=new URL('../../../target-bridge/form-forge-routeos-v0-3/JM_FORGE_EMBODIED_RESPONSE_v0_3.js',document.baseURI).href;
    embodied.onerror=()=>info('Original v0.1 and kinetics v0.2 preserved; embodied response v0.3 HOLD.',true);
    doc.body.append(embodied);
    embodied.addEventListener('load',()=>{
     const articulated=doc.createElement('script');
     articulated.src=new URL('../../../target-bridge/form-forge-routeos-v0-4/JM_FORGE_ARTICULATED_BODY_v0_4.js',document.baseURI).href;
     articulated.onerror=()=>info('Inherited v0.3 embodiment remains playable; v0.4 articulation HOLD.',true);
     doc.body.append(articulated);
     articulated.addEventListener('load',()=>{
      const dual=doc.createElement('script');
      dual.src=new URL('../../../target-bridge/form-forge-routeos-v0-5/JM_FORGE_DUAL_ACTOR_v0_5.js',document.baseURI).href;
      dual.onerror=()=>info('Prior v0.4 articulation preserved; v0.5 dual actor HOLD.',true);
      doc.body.append(dual);
     },{once:true});
    },{once:true});
   },{once:true});
  }catch(e){info('Original Forge contact preserved; kinetic extension HOLD: '+e.message,true)}
 },{once:true});
 surface.append(frame);document.body.append(surface);
}
function mount(){
 const styles=document.createElement('style');
 styles.textContent='#jmForgeRouteOSHost{position:fixed;inset:0;z-index:2600;display:flex;flex-direction:column;box-sizing:border-box;max-height:100dvh;padding:env(safe-area-inset-top) 7px env(safe-area-inset-bottom);background:#06121d;color:white;font:12px system-ui}#jmForgeRouteOSHost[hidden]{display:none}.jm-ffbar{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#102b3c;padding:9px;border-radius:9px}.jm-ffbar button{min-height:40px;color:#dff9ff;border:1px solid #4d8295;background:#123447;border-radius:9px}#jmForgeRouteOSHost p{flex:none;margin:4px 0;padding:4px;color:#b5e5be}#jmForgeRouteOSHost iframe{width:100%;min-height:270px;height:100%;flex:1;border:1px solid #345f74;border-radius:10px;background:#071321}';
 document.head.append(styles);
 const bay=document.getElementById('screen-bay');if(!bay)return;
 const c=document.createElement('article');c.className='card';c.id='jmForgeGameCart';
 const h=document.createElement('h2');h.textContent='FIELD / FORM FORGE → GAMECORE CONTACT';c.append(h);
 const p=document.createElement('p');p.textContent='Import owner-exported Forge v0.24 geometry. Original five-face game remains; new moving 3D probe collides and rebounds on actual mesh triangles. RouteOS records real mesh contact and encounter state. Source stays private.';c.append(p);
 const btn=document.createElement('button');btn.id='jmForgeGameLaunch';btn.className='btn gold';btn.textContent='PLAY FORGE DUAL ACTOR';btn.onclick=open;c.append(btn);bay.append(c);
 window.addEventListener('message',handle);
}
Object.defineProperty(window,'JMFormForgeRouteOS',{value:Object.freeze({open,hasMesh:()=>!!mesh,snapshot:()=>snapshot,contactCount:()=>contacts.size}),configurable:false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();