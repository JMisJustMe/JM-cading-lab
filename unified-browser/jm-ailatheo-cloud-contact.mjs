import {createCloudWorkspaceClient,httpRequest} from './jm-cloud-workspace-client.mjs';
const KEY='jm.ailatheo.cloud-contact.v1',TOKEN=KEY+'.credential';
const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function mount(){
  const proof=$('proofBtn');if(!proof)return;
  // Extend the existing drawer; no new front door or overlapping touch controls.
  proof.addEventListener('click',()=>{
    const drawer=$('drawerBody');if(!drawer||$('cloudContact'))return;
    const panel=document.createElement('section');panel.id='cloudContact';
    const style=document.createElement('style');
    style.textContent='#cloudContact{display:grid;gap:10px;padding:14px 0;border-top:1px solid #26384d}#cloudContact h4,#cloudContact p{margin:0}#cloudContact label{display:grid;gap:5px;font-size:.8rem}#cloudContact input{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:9px;border:1px solid #426078;border-radius:10px;color:#f4f7fb;background:#0a1420;font:inherit}#cloudContact button{min-height:44px}#cloudContact pre{overflow-wrap:anywhere}';panel.append(style);
    panel.innerHTML='<h4>Cloud workspace</h4><p>Save this intention to your scoped RouteVault workspace. Cloud storage currently survives client re-entry; service replacement may lose it. Keep your recovery key privately.</p><label>Connection handle <input id="cloudHandle" autocomplete="off" maxlength="24" placeholder="3–24 letters, digits, _ or -"></label><label> Recovery key <input id="cloudToken" type="password" autocomplete="off" placeholder="Existing scoped key"></label><label> Import private recovery <input id="cloudImport" type="file" accept="application/json,.json"></label><button class="round" id="cloudConnect">Create connection</button><button class="round" id="cloudSave">Save intention to cloud</button><button class="round" id="cloudRecover">Recover cloud result</button><button class="round" id="cloudExport">Download recovery</button><pre id="cloudStatus" role="status">No cloud operation performed.</pre>';
    panel.prepend(style);drawer.append(panel);
    let client,clientToken;
    const status=text=>$('cloudStatus').textContent=text;
    const getClient=()=>{
      const token=$('cloudToken').value.trim()||sessionStorage.getItem(TOKEN)||'';
      if(!client||token!==clientToken){client=createCloudWorkspaceClient({request:httpRequest(new URL('../api/estate-contact',import.meta.url).href,{relay:true}),token,checkpoint:load(),onCheckpoint:cp=>localStorage.setItem(KEY,JSON.stringify(cp))});clientToken=token}
      return client;
    };
    async function run(fn){
      for(const b of panel.querySelectorAll('button'))b.disabled=true;
      try{await fn()}catch(e){status('HOLD — '+e.message+' · no success claimed. Recover an uncertain attempt before submitting again.')}
      finally{const cp=client?.checkpoint();if(cp)localStorage.setItem(KEY,JSON.stringify(cp));for(const b of panel.querySelectorAll('button'))b.disabled=false}
    }
    $('cloudConnect').onclick=()=>run(async()=>{
      const result=await getClient().register($('cloudHandle').value.trim());
      sessionStorage.setItem(TOKEN,result.token);clientToken=result.token;status('Connection created. Download recovery before closing this browser session. No intention sent.');
    });
    $('cloudSave').onclick=()=>run(async()=>{const result=await getClient().saveIntent($('contact').value);status('CLOUD READBACK VERIFIED · '+result.checkpoint.workspaceId+' · revision '+result.checkpoint.revision+' · signature verified. '+result.boundary)});
    $('cloudRecover').onclick=()=>run(async()=>{const result=await getClient().recover();status('CLOUD RECOVERY VERIFIED · '+result.checkpoint.operationId+' · '+result.content.intent)});
    $('cloudImport').onchange=()=>run(async()=>{
      const file=$('cloudImport').files[0];if(!file||file.size>16384)throw Error('INVALID_RECOVERY_FILE');
      const data=JSON.parse(await file.text());
      if(data.schema!=='JM.AILatheo.CloudRecovery/1'||!data.checkpoint)throw Error('RECOVERY_SCHEMA_REQUIRED');
      const candidate=createCloudWorkspaceClient({request:httpRequest(new URL('../api/estate-contact',import.meta.url).href,{relay:true}),token:data.credential,checkpoint:data.checkpoint});
      const result=await candidate.recover();
      client=candidate;clientToken=data.credential;sessionStorage.setItem(TOKEN,data.credential);$('cloudToken').value='';
      status('IMPORTED RECOVERY VERIFIED · '+result.checkpoint.operationId);
    });
    $('cloudExport').onclick=()=>run(async()=>{
      const token=$('cloudToken').value.trim()||sessionStorage.getItem(TOKEN);if(!token)throw Error('RECOVERY_KEY_REQUIRED');
      const blob=new Blob([JSON.stringify({schema:'JM.AILatheo.CloudRecovery/1',credential:token,checkpoint:client?.checkpoint()||load()},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='JM-AILatheo-private-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status('Private recovery downloaded. It contains your scoped key; store it privately.');
    });
    const cp=load();if(cp)status('Retained operation '+cp.operationId+'. Enter your scoped recovery key if this is a new session, then recover.');
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
