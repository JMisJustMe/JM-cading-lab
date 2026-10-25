/**
 * JM ECOSTATE CP01.1 — public-safe CI Web Worker browser capability proof.
 * Donor: already-public JM Coding Estate v0.4.1 exact runtime from the source import branch.
 * Worker adapters below are CI fixtures, NOT the byte-identical private CP01.1 sidecars.
 * No server deployment: local HTTP listener inside GitHub Actions ephemeral runner.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const donorPath=resolve(root,'JM_ESTATE_SOURCE/Gold Mode Coding Hub/Kading/JM Coding Estate/v0.4.1/JM_CODING_ESTATE_REAL_BUILD_v0_4_1.mjs');
const donor=readFileSync(donorPath);
const donorHash=createHash('sha256').update(donor).digest('hex');
assert.equal(donorHash,'806c92df4af58810611fc2ecc7134e86efc86e815d9c335fe48f2a66020054fc','exact PUBLIC original donor');

const sender=`import {createEstate,EXAMPLES} from '/runtime.mjs';
const estate=createEstate(); const {runtime}=estate.mountSource('kading',EXAMPLES.kading.source);
let seq=0; const checksum=o=>{let h=0x811c9dc5;for(const c of JSON.stringify(o)){h=Math.imul(h^c.charCodeAt(0),0x01000193)>>>0}return h.toString(16).padStart(8,'0')};
self.postMessage({type:'ready',body:'kading',module:import.meta.url});
self.onmessage=({data:m})=>{if(m.type!=='emit')return;const profile=runtime.run({flow:'UserToProfile',sources:{User:{fullName:m.name,age:m.age}}});
const env={schema:'JM.ECOSTATE.TypedContact.Profile/1',from:'kading',to:'flowtalk',seq:++seq,nonce:'ci-contact-'+seq,channel:'event',payload:profile};
const sent=estate.delivery.send('event',{...env,checksum:checksum(env)},{from:'kading',to:'flowtalk'});
self.postMessage({type:'emitted',wire:JSON.stringify(sent.value),profile,sourceEvents:runtime.trace.events.length});};`;
const receiver=`import {createEstate,JMContractRegistry} from '/runtime.mjs';
const estate=createEstate(),flow=\`flow ProfileContact {
 step Start {
  say "Profile: {Profile.name}, age {Profile.age}"
  if Profile.adult goto Adult
  goto Junior
 }
 step Adult { say "Adult route accepted"; ding "adult-contact" }
 step Junior { say "Junior route accepted"; ding "junior-contact" }
}\`;
const ir=estate.getBody('flowtalk').compile(flow),seen=new Set();let applied=0;
const checksum=o=>{let h=0x811c9dc5;for(const c of JSON.stringify(o)){h=Math.imul(h^c.charCodeAt(0),0x01000193)>>>0}return h.toString(16).padStart(8,'0')};
self.postMessage({type:'ready',body:'flowtalk',module:import.meta.url});
self.onmessage=({data:m})=>{if(m.type!=='receive')return;try{
const p=JSON.parse(m.wire); if(p.schema!=='JM.ECOSTATE.TypedContact.Profile/1'||p.from!=='kading'||p.to!=='flowtalk'||p.channel!=='event')throw Error('HOLD_ROUTE');
if(typeof p.nonce!=='string'||!Number.isSafeInteger(p.seq)||p.seq<=0)throw Error('HOLD_SEQUENCE');
const v=p.payload;if(!v||typeof v.name!=='string'||!Number.isSafeInteger(v.age)||v.age<0||v.age>120||v.adult!==(v.age>=18))throw Error('HOLD_TYPE');
const {checksum:proof,...body}=p;if(checksum(body)!==proof)throw Error('HOLD_INTEGRITY');
const key=p.nonce+':'+p.seq;if(seen.has(key))throw Error('HOLD_REPLAY');
const contracts=new JMContractRegistry(); contracts.register({body:'flowtalk',input:'map',effects:['say','ding']});if(contracts.verify('flowtalk',v).status!=='PASS')throw Error('HOLD_CONTRACT');
const rt=estate.getBody('flowtalk').createRuntime(ir,estate);rt.membrane.receive('route',p);const result=rt.run({flow:'ProfileContact',context:{Profile:v}});
const route=v.adult?'Adult':'Junior';if(result.visited.join('>')!=='Start>'+route)throw Error('HOLD_RECEIVER_EFFECT');
seen.add(key);applied++;self.postMessage({type:'decision',status:'PASS',route,applied,words:result.output.map(x=>x.value),membraneIn:rt.membrane.route.inbound.length,receiverTrace:rt.trace.events.length});
}catch(e){self.postMessage({type:'decision',status:'HOLD',reason:String(e.message),applied});}};`;
const html=`<!doctype html><meta charset='utf-8'><title>JM CP01.1 CI isolated Workers</title><body><output id='state'>PENDING</output><script type='module'>
const origin=location.origin; const w1=new Worker('/kading.mjs',{type:'module',name:'JM-Kading-CI'}),w2=new Worker('/flowtalk.mjs',{type:'module',name:'JM-FlowTalk-CI'});
let callbacks={kading:[],flowtalk:[]};
w1.onmessage=e=>callbacks.kading.shift()?.(e.data);w2.onmessage=e=>callbacks.flowtalk.shift()?.(e.data);
function next(k){return new Promise((resolve,reject)=>{let id=setTimeout(()=>reject(Error('WORKER_TIMEOUT:'+k)),12000); callbacks[k].push(m=>{clearTimeout(id);resolve(m)})})}
async function run(){const [a,b]=await Promise.all([next('kading'),next('flowtalk')]);if(a.type!=='ready'||b.type!=='ready'||a.body!=='kading'||b.body!=='flowtalk')throw Error('NOT_READY');
const emit=async(name,age)=>{let p=next('kading');w1.postMessage({type:'emit',name,age});let o=await p;if(o.type!=='emitted')throw Error('NOT_EMITTED');return o};
const receive=async wire=>{let p=next('flowtalk');w2.postMessage({type:'receive',wire});return await p};
const adult=await emit('Krix',58);const adultResult=await receive(adult.wire);const replay=await receive(adult.wire);
let t=JSON.parse(adult.wire);t.payload.name="Tampered";const tamper=await receive(JSON.stringify(t));
const junior=await emit('Krix',12);const juniorResult=await receive(junior.wire);
const result={ready:[a,b],adult:adultResult,junior:juniorResult,replay,tamper,workerTypes:['module','module'],origin,strictOriginalDonor:true};
window.__jmResult=result;document.getElementById('state').textContent='DONE';return result;
}
run().catch(e=>{window.__jmError=String(e.stack||e);document.getElementById('state').textContent='FAILED';});
</script>`;
const artifacts={'/':'text/html; charset=utf-8','/runtime.mjs':'text/javascript; charset=utf-8','/kading.mjs':'text/javascript; charset=utf-8','/flowtalk.mjs':'text/javascript; charset=utf-8'};
const payloads={'/':html,'/runtime.mjs':donor,'/kading.mjs':sender,'/flowtalk.mjs':receiver};
const server=createServer((req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(!(path in payloads)){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'Content-Type':artifacts[path],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(payloads[path])});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const addr=server.address();let browser,receipt={name:'JM CP01.1 CI Browser Module Workers',scope:'public-safe CI derivative fixture not byte-identical private CP01.1 sidecars',originalRuntimeSha256:donorHash,assertions:[],state:'HOLD'};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:${addr.port}/`,{waitUntil:'domcontentloaded',timeout:15000});
 await page.waitForFunction(()=>window.__jmResult||window.__jmError,{timeout:45000});
 const r=await page.evaluate(()=>({result:window.__jmResult,error:window.__jmError}));if(r.error)throw Error(r.error);
 const checks=[
 ['two-real-browser-workers',r.result.ready.length===2&&r.result.ready.every(v=>v.type==='ready'&&v.module.includes('/'))],
 ['kading-body-ready',r.result.ready.some(v=>v.body==='kading')],
 ['flowtalk-body-ready',r.result.ready.some(v=>v.body==='flowtalk')],
 ['same-served-origin',r.result.origin.startsWith('http://127.0.0.1:')],
 ['adult-receiver-pass',r.result.adult.status==='PASS'&&r.result.adult.route==='Adult'&&r.result.adult.applied===1],
 ['junior-receiver-pass',r.result.junior.status==='PASS'&&r.result.junior.route==='Junior'&&r.result.junior.applied===2],
 ['tamper-held-no-effect',r.result.tamper.status==='HOLD'&&r.result.tamper.reason==='HOLD_INTEGRITY'&&r.result.tamper.applied===1],
 ['replay-held-no-effect',r.result.replay.status==='HOLD'&&r.result.replay.reason==='HOLD_REPLAY'&&r.result.replay.applied===1],
 ['receiver-membrane-contact',r.result.adult.membraneIn>0&&r.result.junior.membraneIn>0],
 ['receiver-execution-trace',r.result.adult.receiverTrace>0&&r.result.junior.receiverTrace>0],
 ['zero-browser-errors',errors.length===0]
 ];
 for(const [name,pass] of checks){receipt.assertions.push({name,status:pass?'PASS':'FAIL'});assert.ok(pass,name)}
 receipt.state='PASS_BROWSER_WEBWORKER_CI_FIXTURE';receipt.results=r.result;receipt.errors=errors;
 console.log(JSON.stringify({state:receipt.state,passed:checks.length,failed:0,adult:r.result.adult,replay:r.result.replay,tamper:r.result.tamper,junior:r.result.junior},null,2));
}catch(e){receipt.error=String(e.stack||e);console.error(receipt.error);process.exitCode=1;
}finally{try{writeFileSync('/tmp/jm-cp011-browser-worker-receipt.json',JSON.stringify(receipt,null,2))}catch{}await browser?.close();await new Promise(resolve=>server.close(resolve));}
