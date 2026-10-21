import {loadGameForgeDonor,makeGameForgeWorld,readWorldBoot,withWorldSnapshot,waitWorldReturn} from '../../coding-estate/integration/gameforge-world-carrier.mjs';
import {runNativeOperatorLane,OPERATOR_LANES} from './execution-lanes.mjs';
import {saveLocalReturn,recoverLocalReturn} from './return-checkpoint.mjs';
// JM Estate Native Operator v0.2 — extends the existing canonical integration door.
// Only the existing JM Coding Estate / AILatheo execution path is invoked here.
// No owner credentials, arbitrary target URLs, background writes, or production claims.
export function assembleRegistry(manifest, parts=[]) {
  if (!manifest || typeof manifest !== 'object') throw Error('REGISTRY_MANIFEST_MISSING');
  if (!manifest.bodies && (!Array.isArray(manifest.parts) || manifest.parts.length!==parts.length)) throw Error('REGISTRY_PARTS_INCOMPLETE');
  if (!Array.isArray(parts) || parts.some(p=>!Array.isArray(p.bodies))) throw Error('REGISTRY_PART_INVALID');
  const registry=manifest.bodies?manifest:{...manifest,bodies:parts.flatMap(part=>part.bodies)};
  if (!Array.isArray(registry.bodies) || registry.bodies.length!==manifest.count) throw Error('REGISTRY_COUNT_MISMATCH');
  return registry;
}
async function checkedJSON(url,request) {
  const response=await request(url,{cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok) throw Error('REGISTRY_HTTP_'+response.status);
  return response.json();
}
export async function loadNativeRegistry(request=fetch) {
  const base=new URL('../../coding-estate/integration/REGISTRY.json',import.meta.url);
  const manifest=await checkedJSON(base,request);
  if(manifest.bodies) return assembleRegistry(manifest);
  if(manifest.parts.length>25 || manifest.parts.some(p=>!/^registry-parts\/[a-zA-Z0-9_-]+\.json$/.test(p))) throw Error('REGISTRY_PART_PATH_HOLD');
  const parts=await Promise.all(manifest.parts.map(p=>checkedJSON(new URL(p,base),request)));
  return assembleRegistry(manifest,parts);
}
export async function executeNativeContact(intent,registry) {
  if(typeof intent!=='string'||!intent.trim()||intent.length>2000) throw Error('CONTACT_REQUIRED_OR_TOO_LONG');
  const [{validateRegistry},{executeAILatheoCreation}]=await Promise.all([
    import('../../coding-estate/integration/router-core.mjs'),
    import('../../unified-browser/ailatheo-creation-runtime.mjs')
  ]);
  const check=validateRegistry(registry);
  if(!check.valid)throw Error('REGISTRY_VALIDATION_HOLD:'+check.failures.slice(0,5).join(','));
  const result=executeAILatheoCreation(intent.trim(),registry);
  if(result.schema!=='jm.ailatheo.creation-execution/0.3'||!result.passed
    ||!result.carrier?.html?.includes('<!doctype html>')
    ||!result.delivery?.sha256
    ||!result.receipts?.length) throw Error('NATIVE_EXECUTION_HOLD');
  return result;
}
export async function probePublicContact(request=fetch) {
  const url=new URL('../../api/estate-contact?route=%2Fready',import.meta.url);
  const response=await request(url,{cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok)throw Error('PUBLIC_CONTACT_HTTP_'+response.status);
  const data=await response.json();
  if(!data || typeof data!=='object'||data.ok===false)throw Error('PUBLIC_CONTACT_TARGET_HOLD');
  return {http:response.status,state:'PUBLIC_READ_RESPONSE',data};
}
function mount() {
  const form=document.getElementById('jmOperatorForm');
  if(!form)return;
  const $=id=>document.getElementById(id);
  let delivered=null;
  let latestReturn=null;
  let registryPromise=null;
  let donorPromise=null;
  let worldLive=null;
  const defaultSceneIntent='Build a touch visual game with drag aim, browser and Android delivery';
  $('jmOperatorMode').addEventListener('change',()=>{
    const mode=$('jmOperatorMode').value;
    $('jmOperatorIntent').value=mode==='scene'?defaultSceneIntent:OPERATOR_LANES[mode]?.input||'';
    $('jmOperatorIntent').readOnly=mode==='gamecore'||mode==='os';
    $('jmOperatorStatus').textContent=mode==='scene'
      ? 'Native AILatheo sample: the scene is a fixed donor demonstration, not arbitrary text-to-game generation.'
      : 'Lane selected: '+(OPERATOR_LANES[mode]?.label||'UNKNOWN')+' · no contact executed yet.';
    $('jmOperatorPreview').hidden=true;
    $('jmOperatorDownload').disabled=true;
    delivered=null;
    worldLive=null;
    $('jmOperatorPreview').srcdoc='';
    latestReturn=null;
  });
  function status(message){$('jmOperatorStatus').textContent=message}
  function trace(action,mode,state,receipt=''){
    const detail={mode,state,source:'JM Estate Native Operator',receipt:receipt?String(receipt).slice(0,64):undefined};
    const write=()=>window.JMEstateIntegration?.receipt?.(action,detail);
    if(!window.JMEstateIntegration)window.addEventListener('jm-estate-integration-ready',write,{once:true});
    else write();
  }
  async function mountWorld(scene){
    const boot=readWorldBoot(scene),frame=$('jmOperatorPreview');
    const pending=waitWorldReturn(frame,boot.token,boot.world);
    frame.title='Live resultant GameForge world';frame.hidden=false;frame.srcdoc=scene;
    const readback=await pending;
    if(boot.snapshot&&JSON.stringify(boot.snapshot)!==JSON.stringify(readback.snapshot))throw Error('WORLD_RECOVERY_READBACK_HOLD');
    worldLive=boot;
    return readback;
  }
  async function captureWorld(){
    if(!worldLive)throw Error('WORLD_NOT_RENDERED');
    const r=await waitWorldReturn($('jmOperatorPreview'),worldLive.token,worldLive.world,'snapshot',crypto.randomUUID());
    delivered=withWorldSnapshot(delivered,r.snapshot);
    latestReturn={...latestReturn,scene:delivered,summary:latestReturn.summary.split('\nLatest saved world readback:')[0]+'\nLatest saved world readback:\n'+JSON.stringify(r.snapshot,null,2)};
    return r;
  }
  async function displayReturn(v,recovery=false){
    const option=$('jmOperatorMode').querySelector('option[value="'+v.mode+'"]');
    if(!option)throw Error('RETURN_LANE_NOT_MOUNTED');
    $('jmOperatorMode').value=v.mode;
    $('jmOperatorIntent').value=v.input;
    $('jmOperatorIntent').readOnly=['gamecore','os'].includes(v.mode);
    delivered=['scene','native-world'].includes(v.mode)?v.scene:null;
    worldLive=null;
    $('jmOperatorPreview').hidden=!delivered;
    if(v.mode==='native-world')await mountWorld(delivered);
    else if(delivered)$('jmOperatorPreview').srcdoc=delivered;
    else $('jmOperatorPreview').srcdoc='';
    $('jmOperatorDownload').disabled=!delivered;
    latestReturn=v;
    status((recovery?'LOCAL RECOVERY VERIFIED · ':'')+v.summary);
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    $('jmOperatorRun').disabled=true;
    $('jmOperatorMode').disabled=true;
    $('jmOperatorSave').disabled=true;
    $('jmOperatorRecover').disabled=true;
    $('jmOperatorDownload').disabled=true;
    $('jmOperatorPreview').hidden=true;
    delivered=null;
    worldLive=null;
    $('jmOperatorPreview').srcdoc='';
    latestReturn=null;
    status('CONTACT · Resolving the native coding registry and executing JM bodies…');
    try{
      registryPromise??=loadNativeRegistry();
      const registry=await registryPromise;
      const mode=$('jmOperatorMode').value;
      if(mode==='scene'){
        const result=await executeNativeContact($('jmOperatorIntent').value,registry);
        delivered=result.carrier.html;
        $('jmOperatorPreview').srcdoc=delivered;
        $('jmOperatorPreview').hidden=false;
        $('jmOperatorDownload').disabled=false;
        const summary='NATIVE EXECUTION PASS (existing fixed AILatheo touch scene)\n'
          +'Executed: '+result.executedBodies.join(' · ')+'\n'
          +'Native receipt digests: '+result.receipts.length
          +'\nDelivery source digest (non-cryptographic): '+result.delivery.sha256
          +'\nPlan routes: '+result.plan.route.length
          +'\nThe intention selects JM bodies; the returned scene is the same bounded donor demonstration, not generated uniquely from the text. '
          +'Export this standalone HTML for owner-device testing. Android build, cloud save and whole-Estate proof remain open.';
        latestReturn={schema:'jm.estate.operator.local-return/0.2',mode,input:$('jmOperatorIntent').value,summary,scene:delivered};
        status(summary);
        trace('native.operator.pass',mode,'NATIVE_SCENE_EXECUTED',result.receipts.length);
      }else if(mode==='native-world'){
        const input=$('jmOperatorIntent').value;
        const result=runNativeOperatorLane(mode,input,registry);
        donorPromise??=loadGameForgeDonor();
        delivered=makeGameForgeWorld(await donorPromise,result.result.receiver.world,crypto.randomUUID());
        const render=await mountWorld(delivered);
        const summary='WORLD_RENDERED · native-chain → GameCore → GameForge v3.16\n'
          +'Executed: '+result.executedBodies.join(' · ')+'\n'
          +'Actual renderer readback:\n'+JSON.stringify({world:render.world,pixels:render.pixels,snapshot:render.snapshot,nativeReceipts:result.result.receiver.receipts,chainStages:result.result.chain.stages},null,2)+'\n'
          +'Boundary: 2D playable native GameForge worlds (tboys / burning / humanimals), authored object count and target geometry. Browser result; no open-ended world generation, physical Android or cloud claim.';
        latestReturn={schema:'jm.estate.operator.local-return/0.2',mode,input,summary,scene:delivered};
        $('jmOperatorDownload').disabled=false;
        status(summary);
        trace('native.operator.pass',mode,'WORLD_RENDERED',result.result.receiptDigest);
        trace('native.operator.render',mode,'CANVAS_READBACK',render.pixels.digest);
      }else{
        const result=runNativeOperatorLane(mode,$('jmOperatorIntent').value,registry);
        const summary=result.state+' · '+result.mode+'\n'
          +'Executed: '+result.executedBodies.join(' · ')+'\n'
          +'Changed: '+result.changed+'\n'
          +'Result:\n'+JSON.stringify(result.result,null,2)+'\n'
          +'Boundary: '+result.boundary;
        latestReturn={schema:'jm.estate.operator.local-return/0.2',mode,input:$('jmOperatorIntent').value,summary};
        status(summary);
        trace(result.state==='PLAN_ONLY'?'native.operator.plan':'native.operator.pass',mode,result.state,result.result?.receiptDigest||'');
      }
    }catch(error){registryPromise=null;donorPromise=null;worldLive=null;delivered=null;$('jmOperatorPreview').hidden=true;$('jmOperatorPreview').srcdoc='';status('HOLD · '+String(error?.message||error)+' · no native execution success claimed.')}
    finally{$('jmOperatorRun').disabled=false;$('jmOperatorMode').disabled=false;$('jmOperatorSave').disabled=false;$('jmOperatorRecover').disabled=false}
  });
  $('jmOperatorSave').addEventListener('click',async()=>{
    if(!latestReturn){status('SAVE HOLD · No executed return to save.');return;}
    $('jmOperatorSave').disabled=true;
    try{
      if(latestReturn.mode==='native-world')await captureWorld();
      const saved=await saveLocalReturn(localStorage,latestReturn);
      status(saved.state+' · '+latestReturn.mode+' · SHA-256 '+saved.sha256.slice(0,16)+'…\n'+latestReturn.summary);
      trace('native.operator.local-save',latestReturn.mode,saved.state,saved.sha256);
    }catch(e){status('SAVE HOLD · '+String(e.message||e)+' · no persistence claimed.')}
    finally{$('jmOperatorSave').disabled=false}
  });
  $('jmOperatorRecover').addEventListener('click',async()=>{
    $('jmOperatorRecover').disabled=true;
    try{
      const recovered=await recoverLocalReturn(localStorage);
      await displayReturn(recovered.value,true);
      trace('native.operator.local-recovery',recovered.value.mode,recovered.state,recovered.sha256);
    }catch(e){latestReturn=null;worldLive=null;delivered=null;$('jmOperatorPreview').hidden=true;$('jmOperatorPreview').srcdoc='';$('jmOperatorDownload').disabled=true;status('RECOVERY HOLD · '+String(e.message||e)+' · no recovery claimed.')}
    finally{$('jmOperatorRecover').disabled=false}
  });
  $('jmOperatorDownload').addEventListener('click',async()=>{
    if(!delivered)return;
    try{if(latestReturn?.mode==='native-world')await captureWorld()}catch(e){status('EXPORT HOLD · '+e.message);return;}
    const url=URL.createObjectURL(new Blob([delivered],{type:'text/html;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download=latestReturn?.mode==='native-world'?'JM_GameForge_Resultant_World_OPEN_FIRST.html':'JM_AILatheo_Native_Living_Touch_OPEN_FIRST.html';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    status($('jmOperatorStatus').textContent+'\nStandalone scene exported locally; device opening and persistence remain owner-test gates.');
  });
  $('jmOperatorProbe').addEventListener('click',async()=>{
    $('jmOperatorProbe').disabled=true;
    $('jmOperatorCloud').textContent='Checking the existing public cloud relay…';
    try{const r=await probePublicContact();$('jmOperatorCloud').textContent='PUBLIC CONTACT RESPONSE · HTTP '+r.http+' · existing cloud relay answered. No workspace write or durable-storage claim.'}
    catch(e){$('jmOperatorCloud').textContent='PUBLIC CONTACT HOLD · '+String(e?.message||e)}
    finally{$('jmOperatorProbe').disabled=false}
  });
}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
