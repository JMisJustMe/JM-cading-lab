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
  });
  function status(message){$('jmOperatorStatus').textContent=message}
  function trace(action,mode,state,receipt=''){
    const detail={mode,state,source:'JM Estate Native Operator',receipt:receipt?String(receipt).slice(0,64):undefined};
    const write=()=>window.JMEstateIntegration?.receipt?.(action,detail);
    if(!window.JMEstateIntegration)window.addEventListener('jm-estate-integration-ready',write,{once:true});
    else write();
  }
  function displayReturn(v,recovery=false){
    const option=$('jmOperatorMode').querySelector('option[value="'+v.mode+'"]');
    if(!option)throw Error('RETURN_LANE_NOT_MOUNTED');
    $('jmOperatorMode').value=v.mode;
    $('jmOperatorIntent').value=v.input;
    $('jmOperatorIntent').readOnly=['gamecore','os'].includes(v.mode);
    delivered=v.mode==='scene'?v.scene:null;
    $('jmOperatorPreview').hidden=!delivered;
    if(delivered)$('jmOperatorPreview').srcdoc=delivered;
    else $('jmOperatorPreview').srcdoc='';
    $('jmOperatorDownload').disabled=!delivered;
    latestReturn=v;
    status((recovery?'LOCAL RECOVERY VERIFIED · ':'')+v.summary);
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    $('jmOperatorRun').disabled=true;
    $('jmOperatorDownload').disabled=true;
    $('jmOperatorPreview').hidden=true;
    delivered=null;
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
    }catch(error){registryPromise=null;status('HOLD · '+String(error?.message||error)+' · no native execution success claimed.')}
    finally{$('jmOperatorRun').disabled=false}
  });
  $('jmOperatorSave').addEventListener('click',async()=>{
    if(!latestReturn){status('SAVE HOLD · No executed return to save.');return;}
    $('jmOperatorSave').disabled=true;
    try{
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
      displayReturn(recovered.value,true);
      trace('native.operator.local-recovery',recovered.value.mode,recovered.state,recovered.sha256);
    }catch(e){status('RECOVERY HOLD · '+String(e.message||e)+' · no recovery claimed.')}
    finally{$('jmOperatorRecover').disabled=false}
  });
  $('jmOperatorDownload').addEventListener('click',()=>{
    if(!delivered)return;
    const url=URL.createObjectURL(new Blob([delivered],{type:'text/html;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download='JM_AILatheo_Native_Living_Touch_OPEN_FIRST.html';
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
