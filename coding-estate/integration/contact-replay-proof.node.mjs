// JM CP41: replay verified, host-signed persistent Contact Lab custody.
// Windows DPAPI key remains local. No physical-input/remote attestation claimed.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createHash,generateKeyPairSync,sign,verify} from 'node:crypto';
const EXPECT='ed72ec0880af89925ab78fe0de125f47613217a3758d9a744dd08420e00c3310';
const digest=b=>createHash('sha256').update(b).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const error=s=>{throw Error(s)};
function engine(file){
 const b=fs.readFileSync(file);if(digest(b)!==EXPECT)error('SOURCE_SHA');
 const js=b.toString('utf8').match(/<script>([\s\S]*?)<\/script>/)?.[1];
 const split=js?.indexOf('  let world=makeWorld()');
 if(split===undefined||split<0)error('SOURCE_SEAM');
 const context=vm.createContext({structuredClone,JSON,Math,Set,Error,Array,String,Number,Boolean});
 vm.runInContext(js.slice(0,split)+'globalThis.LAB={BANDS,makeWorld,act,recover,replay,runQATests};})();',context,{timeout:5000});
 return context.LAB;
}
function inspect(source,trace){
 const stats=fs.statSync(trace);if(stats.size>5e6)error('TRACE_TOO_LARGE');
 const x=JSON.parse(fs.readFileSync(trace,'utf8')),e=engine(source),w=e.makeWorld();
 if(x.protocol!=='JM32-1DA-contact-lab-v0.1')error('PROTOCOL');
 if(x.laneMapping!=='local deterministic hash (not canonical semantic lanes)'||!equal(x.canonicalBands,e.BANDS))error('BANDS');
 if(!Array.isArray(x.intents)||!x.intents.length||x.intents.length>10000)error('INTENTS_COUNT');
 for(const i of x.intents){
  if(i.kind==='recover'&&Object.keys(i).length===1)e.recover(w,true);
  else if(i.kind==='move' && equal(Object.keys(i).sort(),['dx','dy','kind','mode'].sort())&&
      Number.isInteger(i.dx)&&Number.isInteger(i.dy)&&Math.abs(i.dx)+Math.abs(i.dy)===1 &&
      ['step','impact'].includes(i.mode))e.act(w,i.dx,i.dy,i.mode,true);
  else error('INTENT_INVALID');
 }
 for(const [field,value] of Object.entries({body:w.body,tiles:w.tiles,sequence:w.sequence,receipts:w.ledger,lattice:w.lattice})){
  if(!equal(x[field],value))error('REPLAY_MISMATCH_'+field.toUpperCase());
 }
 if(x.qa!=null && !equal(x.qa,e.runQATests()))error('BAD_QA');
 if(x.replay!=null && !equal(x.replay,e.replay(w)))error('BAD_REPLAY');
 return {schema:'jm.contact.replay-verified/1',sourceSha256:EXPECT,traceSha256:digest(fs.readFileSync(trace)),
    intents:x.intents.length,receipts:w.ledger.length,finalPosition:w.body.x+','+w.body.y,
    eventDigest:digest(JSON.stringify(w.ledger))};
}
const pubName='JM_CONTACT_ED25519_PUBLIC.pem',privName='JM_CONTACT_ED25519_PRIVATE.dpapi',chainName='JM_CONTACT_PROOF_CHAIN.json';
function dpapi(mode,buffer){
 if(process.platform!=='win32')error('DPAPI_WINDOWS_ONLY');
 const c='Add-Type -AssemblyName System.Security;' +
 '$t=[Console]::In.ReadToEnd().Trim();$a=[Convert]::FromBase64String($t);'+
 '$o=[System.Security.Cryptography.ProtectedData]::'+mode+'($a,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);'+
 '[Console]::Out.Write([Convert]::ToBase64String($o))';
 const p=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',c],{
   input:buffer.toString('base64'),encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
 if(p.status!==0||!p.stdout?.trim())error('DPAPI_'+mode+'_FAILED');
 return Buffer.from(p.stdout.trim(),'base64');
}
function keys(dir){
 fs.mkdirSync(dir,{recursive:true});
 const pub=path.join(dir,pubName),priv=path.join(dir,privName);
 if(fs.existsSync(pub)!==fs.existsSync(priv))error('INCOMPLETE_KEY_PAIR');
 if(!fs.existsSync(pub)){
  const p=generateKeyPairSync('ed25519');
  const clear=Buffer.from(p.privateKey.export({type:'pkcs8',format:'pem'}));
  const encrypted=dpapi('Protect',clear);clear.fill(0);
  fs.writeFileSync(priv,encrypted,{flag:'wx',mode:0o600});
  fs.writeFileSync(pub,p.publicKey.export({type:'spki',format:'pem'}),{flag:'wx'});
 }
 const protectedBytes=fs.readFileSync(priv);
 return {privatePem:dpapi('Unprotect',protectedBytes),publicPem:fs.readFileSync(pub,'utf8'),pubFile:pub};
}
const recordHash=r=>digest(JSON.stringify(r.payload)+'\n'+r.signature);
function verifyOne(r,pem){
 if(r.schema!=='jm.contact.signed-replay/1'||typeof r.signature!=='string')error('RECORD_SCHEMA');
 if(!verify(null,Buffer.from(JSON.stringify(r.payload)),pem,Buffer.from(r.signature,'base64')))error('RECORD_SIGNATURE');
 return recordHash(r);
}
function chainCheck(dir){
 const c=JSON.parse(fs.readFileSync(path.join(dir,chainName),'utf8'));
 const pub=fs.readFileSync(path.join(dir,pubName),'utf8');
 if(c.schema!=='jm.contact.chain/1'||c.publicSha256!==digest(pub))error('CHAIN_HEADER');
 let prev='GENESIS';
 for(const r of c.entries){if(r.payload.previousEntry!==prev)error('CHAIN_FORK');prev=verifyOne(r,pub)}
 if(prev!==c.head)error('CHAIN_HEAD');
 return {records:c.entries.length,head:prev,publicKeySha256:digest(pub)};
}
function signTrace(source,trace,dir,out){
 const proof=inspect(source,trace),k=keys(dir),chainPath=path.join(dir,chainName);
 const exists=fs.existsSync(chainPath);
 if(exists)chainCheck(dir);
 const c=exists?JSON.parse(fs.readFileSync(chainPath,'utf8')):{
  schema:'jm.contact.chain/1',publicSha256:digest(k.publicPem),entries:[],head:'GENESIS'};
 const payload={...proof,timestamp:new Date().toISOString(),previousEntry:c.head,publicKeySha256:digest(k.publicPem),
    authority:'GroundZeroJM Windows CurrentUser DPAPI Ed25519'};
 const sig=sign(null,Buffer.from(JSON.stringify(payload)),k.privatePem).toString('base64');
 k.privatePem.fill(0);
 const record={schema:'jm.contact.signed-replay/1',payload,signature:sig};
 verifyOne(record,k.publicPem);
 // Separate private custody chain; this file stores no private key.
 fs.writeFileSync(out,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
 c.entries.push(record);c.head=recordHash(record);
 const staged=chainPath+'.stage-'+process.pid;
 fs.writeFileSync(staged,JSON.stringify(c,null,2)+'\n',{flag:'wx'});
 fs.renameSync(staged,chainPath);
 return {attestation:out,records:c.entries.length,head:c.head,publicKeyFile:k.pubFile,...proof};
}
function fixture(source,out){
 const e=engine(source),w=e.makeWorld();
 e.act(w,1,0,'step');e.recover(w);e.act(w,-1,0,'step');e.act(w,0,1,'impact');
 const x={protocol:'JM32-1DA-contact-lab-v0.1',canonicalBands:e.BANDS,
 laneMapping:'local deterministic hash (not canonical semantic lanes)',body:w.body,tiles:w.tiles,
 sequence:w.sequence,intents:w.intentJournal,receipts:w.ledger,lattice:w.lattice,
 qa:e.runQATests(),replay:e.replay(w)};
 fs.writeFileSync(out,JSON.stringify(x,null,2)+'\n',{flag:'wx'});return inspect(source,out);
}
const [action,...args]=process.argv.slice(2);
try{
 let r;
 if(action==='fixture')r=fixture(...args);
 else if(action==='inspect')r=inspect(...args);
 else if(action==='sign')r=signTrace(...args);
 else if(action==='verify-chain')r=chainCheck(...args);
 else if(action==='verify-signature'){
  const [src,t,att,pub]=args,record=JSON.parse(fs.readFileSync(att,'utf8'));
  const p=inspect(src,t),actual=Object.fromEntries(Object.entries(record.payload).filter(([k])=>k in p));
  if(!equal(p,actual))error('SIGNED_TRACE_NOT_REPLAY');
  r={recordHash:verifyOne(record,fs.readFileSync(pub,'utf8')),...p};
 } else error('UNKNOWN_COMMAND');
 console.log(JSON.stringify({status:'PASS',...r},null,2));
}catch(e){console.error(JSON.stringify({status:'HOLD',reason:e.message}));process.exitCode=1}
