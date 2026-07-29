/* JM Sovereign HTML Cartridge Adapter v0.1 */
(function(global){
'use strict';
const ADAPTER_STANDARD='JM-SOVEREIGN-HTML-CARTRIDGE/0.1';
const RUNTIME='JM-SOVEREIGN-HTML-ADAPTER/0.1';
const enc=new TextEncoder(),dec=new TextDecoder();
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
function sha256Fallback(ascii){function rr(v,a){return(v>>>a)|(v<<(32-a))}let mathPow=Math.pow,maxWord=mathPow(2,32),lengthProperty='length',i,j,result='',words=[],asciiBitLength=ascii[lengthProperty]*8,hash=sha256Fallback.h=sha256Fallback.h||[],k=sha256Fallback.k=sha256Fallback.k||[],primeCounter=k[lengthProperty],isComposite={};for(let candidate=2;primeCounter<64;candidate++){if(!isComposite[candidate]){for(i=0;i<313;i+=candidate)isComposite[i]=candidate;hash[primeCounter]=(mathPow(candidate,.5)*maxWord)|0;k[primeCounter++]=(mathPow(candidate,1/3)*maxWord)|0}}ascii+='\x80';while(ascii[lengthProperty]%64-56)ascii+='\x00';for(i=0;i<ascii[lengthProperty];i++){j=ascii.charCodeAt(i);if(j>>8)return null;words[i>>2]|=j<<((3-i)%4)*8}words[words[lengthProperty]]=(asciiBitLength/maxWord)|0;words[words[lengthProperty]]=asciiBitLength;for(j=0;j<words[lengthProperty];){let w=words.slice(j,j+=16),oldHash=hash.slice(0);for(i=0;i<64;i++){let w15=w[i-15],w2=w[i-2],a=hash[0],e=hash[4],temp1=hash[7]+(rr(e,6)^rr(e,11)^rr(e,25))+((e&hash[5])^((~e)&hash[6]))+k[i]+(w[i]=(i<16)?w[i]:(w[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+w[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0),temp2=(rr(a,2)^rr(a,13)^rr(a,22))+((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));hash=[(temp1+temp2)|0,a,hash[1],hash[2],(hash[3]+temp1)|0,e,hash[5],hash[6]]}for(i=0;i<8;i++)hash[i]=(hash[i]+oldHash[i])|0}for(i=0;i<8;i++)for(j=3;j+1;j--){let b=(hash[i]>>(j*8))&255;result+=(b<16?'0':'')+b.toString(16)}return result}async function sha256(text){if(global.crypto?.subtle)return hex(await global.crypto.subtle.digest('SHA-256',enc.encode(text)));return sha256Fallback(unescape(encodeURIComponent(text)))}
function fromB64(s){const bin=atob(s);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return dec.decode(a)}
function receipt(type,detail={}){return{time:new Date().toISOString(),type,detail}}
async function validate(pkg){
 const errors=[],warnings=[]; const donor=global.JMCartridgeSDK?.validate(pkg);
 if(!donor?.valid) errors.push(...(donor?.errors||['JM Cartridge SDK unavailable']));
 if(pkg?.runtime?.baseCartridge!=='sovereign-html-adapter')errors.push('baseCartridge must be sovereign-html-adapter');
 if(pkg?.runtime?.adapterStandard!==ADAPTER_STANDARD)errors.push('Unsupported sovereign adapter standard');
 if(pkg?.manifest?.trust!=='FIRST_PARTY')errors.push('v0.1 accepts FIRST_PARTY packages only');
 const source=pkg?.runtime?.source||{}; let html='';
 try{html=fromB64(source.bodyBase64||'')}catch(_){errors.push('Invalid source base64')}
 if(html){const actual=await sha256(html);if(actual!==source.sha256)errors.push('Source SHA-256 mismatch');if(enc.encode(html).length!==source.bytes)errors.push('Source byte count mismatch')}
 if(!pkg?.manifest?.saveNamespace)errors.push('saveNamespace required');
 return{valid:!errors.length,errors,warnings:[...(donor?.warnings||[]),...warnings],sourceSha256:source.sha256||null,decodedHtml:html,donorIntegrity:donor?.integrity||null};
}
function createRuntime({mount,trace}={}){
 const library=new Map(),sessions=new Map(),log=[];let currentId=null,sequence=0;
 const emit=(type,detail={})=>{const r=receipt(type,{sequence:++sequence,...detail});log.push(r);trace?.(r);return r};
 function hideCurrent(){if(currentId&&sessions.has(currentId))sessions.get(currentId).iframe.hidden=true}
 async function install(pkg){const v=await validate(pkg);if(!v.valid)throw new Error(v.errors.join('; '));library.set(pkg.manifest.id,structuredClone(pkg));emit('INSTALL',{id:pkg.manifest.id,version:pkg.manifest.version,sourceSha256:v.sourceSha256});return v}
 async function launch(id){if(!library.has(id))throw new Error('Cartridge not installed: '+id);hideCurrent();let s=sessions.get(id);if(s){s.iframe.hidden=false;s.held=false;currentId=id;emit('QUICK_RESUME',{id,sessionToken:s.token});dispatch('jm-console-resume',{id});return s}
 const pkg=library.get(id),v=await validate(pkg);if(!v.valid)throw new Error(v.errors.join('; '));const iframe=document.createElement('iframe');iframe.className='sovereignFrame';iframe.title=pkg.manifest.title;iframe.sandbox='allow-scripts allow-same-origin';iframe.dataset.cartridgeId=id;iframe.dataset.sessionToken='session-'+Math.random().toString(36).slice(2);mount.appendChild(iframe);await new Promise(r=>{iframe.onload=()=>r();iframe.src='about:blank'});
 const touched=new Map(),backing=new Map(),win=iframe.contentWindow;
 const storage={get length(){return backing.size},key(i){return [...backing.keys()][i]??null},getItem(k){k=String(k);return backing.has(k)?backing.get(k):null},setItem(k,val){k=String(k);val=String(val);const before=backing.has(k)?backing.get(k):null;backing.set(k,val);touched.set(k,{operation:'set',before,after:val});emit('SAVE_TOUCH',{id,key:k,operation:'set'});},removeItem(k){k=String(k);const before=backing.has(k)?backing.get(k):null;backing.delete(k);touched.set(k,{operation:'remove',before,after:null});emit('SAVE_TOUCH',{id,key:k,operation:'remove'});},clear(){const keys=[...backing.keys()];backing.clear();keys.forEach(k=>touched.set(k,{operation:'remove',before:null,after:null}));emit('SAVE_TOUCH',{id,key:'*',operation:'clear'});}};
 Object.defineProperty(win,'localStorage',{value:storage,configurable:true,enumerable:true});
 win.document.open();win.document.write(v.decodedHtml);win.document.close();s={id,pkg,iframe,token:iframe.dataset.sessionToken,touched,storage,vault:null,held:false,launchedAt:new Date().toISOString()};sessions.set(id,s);currentId=id;emit('BOOT',{id,sessionToken:s.token,sourceSha256:v.sourceSha256});return s}
 function dispatch(type,detail={}){const s=sessions.get(currentId);if(!s)return false;s.iframe.contentWindow.dispatchEvent(new s.iframe.contentWindow.CustomEvent(type,{detail}));emit('BRIDGE_EVENT',{id:currentId,event:type,detail});return true}
 function action(action,detail={}){return dispatch('jm-console-action',{action,...detail})}
 function hold(id=currentId){const s=sessions.get(id);if(!s)return false;s.held=true;s.iframe.hidden=true;if(currentId===id)currentId=null;s.iframe.contentWindow.dispatchEvent(new s.iframe.contentWindow.CustomEvent('jm-console-hold',{detail:{id}}));emit('SUSPEND',{id,sessionToken:s.token});return true}
 function resume(id){const s=sessions.get(id);if(!s)return false;hideCurrent();currentId=id;s.held=false;s.iframe.hidden=false;s.iframe.contentWindow.dispatchEvent(new s.iframe.contentWindow.CustomEvent('jm-console-resume',{detail:{id}}));emit('RESUME',{id,sessionToken:s.token});return true}
 function captureVault(id=currentId){const s=sessions.get(id);if(!s)throw new Error('No live session');const storage=s.storage,values={};for(const key of s.touched.keys())values[key]=storage.getItem(key);s.vault={schema:'JM.SaveVault/0.1',cartridgeId:id,saveNamespace:s.pkg.manifest.saveNamespace,capturedAt:new Date().toISOString(),keys:Object.keys(values).sort(),values};emit('SAVE_VAULT_CAPTURE',{id,keys:s.vault.keys});return structuredClone(s.vault)}
 function restoreVault(id=currentId){const s=sessions.get(id);if(!s?.vault)throw new Error('No vault');const storage=s.storage;for(const [k,v] of Object.entries(s.vault.values)){if(v===null)storage.removeItem(k);else storage.setItem(k,v)}emit('SAVE_VAULT_RESTORE',{id,keys:s.vault.keys});return true}
 function clearTouchedValues(id=currentId){const s=sessions.get(id);if(!s)return false;const storage=s.storage;for(const k of s.touched.keys())storage.removeItem(k);emit('SAVE_VALUES_CLEAR',{id,keys:[...s.touched.keys()]});return true}
 function inspect(id){const p=library.get(id),s=sessions.get(id);return{installed:!!p,manifest:p?.manifest||null,live:!!s,held:s?.held||false,sessionToken:s?.token||null,touchedKeys:s?[...s.touched.keys()]:[],vault:s?.vault?structuredClone(s.vault):null}}
 function proofReceipt(){return{schema:'JM.SovereignHTMLAdapter.ProofReceipt/0.1',adapterStandard:ADAPTER_STANDARD,runtime:RUNTIME,currentId,installed:[...library.keys()],sessions:[...sessions.keys()].map(inspect),trace:structuredClone(log)}}
 return{install,validate,launch,hold,resume,dispatch,action,captureVault,restoreVault,clearTouchedValues,inspect,proofReceipt,get currentId(){return currentId},get sessions(){return sessions},get library(){return library}};
}
global.JMSovereignHTMLAdapter={ADAPTER_STANDARD,RUNTIME,sha256,validate,createRuntime};
})(globalThis);
