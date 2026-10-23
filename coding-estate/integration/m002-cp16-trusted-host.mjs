/**
 * JM M002 CP16 — loopback authorised original JM CP14 execution host.
 * CP14 invokes original Python Intake/Assurance/Query + native CP13 recipients.
 * No arbitrary file paths, public internet listener, host commands or cloud
 * writes. Local file custody HMAC-sealed, revision-gated and atomically saved.
 */
import http from 'node:http';
import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {openSync,closeSync,writeSync,fsyncSync,readFileSync,existsSync,
 lstatSync,realpathSync,mkdirSync,renameSync,unlinkSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {executeAuthorityKnowledgeFederation,recoverAuthorityKnowledgeFederation}
 from './m002-cp14-authority-knowledge-fabric.mjs';

export const CP16_SCHEMA='jm.m002.cp16.custody/1';
const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const mac=(key,x)=>createHmac('sha256',key).update(x).digest('hex');
const hold=(what,status=409)=>{const e=Error('CP16_'+what+'_HOLD');e.status=status;throw e};
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&
 timingSafeEqual(Buffer.from(a),Buffer.from(b));
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const clone=x=>structuredClone(x);
function sourceCatalog(config){
 const root=realpathSync(config.sourceRoot),catalog=config.sources;
 if(!catalog||Array.isArray(catalog)||Object.keys(catalog).length<1||
  Object.keys(catalog).length>16)hold('CATALOG',500);
 const result={};
 for(const [id,rel] of Object.entries(catalog)){
  if(!/^[a-z][a-z0-9_-]{1,35}$/.test(id)||typeof rel!=='string'||rel.length>700)hold('SOURCE_ID',500);
  const path=resolve(root,rel);
  if(!path.startsWith(root+sep)||lstatSync(path).isSymbolicLink()||
    !lstatSync(path).isFile()||realpathSync(path)!==path||
    !/\.(md|txt|html|htm)$/.test(path))hold('SOURCE_PATH',500);
  result[id]=path;
 }
 return result;
}
function resolveSources(catalog,ids){
 if(!Array.isArray(ids)||ids.length<1||ids.length>4||new Set(ids).size!==ids.length||
   ids.some(id=>!Object.hasOwn(catalog,id)))hold('SOURCE_SELECTION',422);
 return ids.map(id=>{
  const path=catalog[id];
  if(lstatSync(path).isSymbolicLink()||realpathSync(path)!==path)hold('SOURCE_DRIFT');
  return path;
 });
}
const makeInitial=receivers=>({schema:CP16_SCHEMA,revision:0,
 receivers:clone(receivers),history:{},tip:'0'.repeat(64)});
const sealed=(state,key)=>{const raw=JSON.stringify(state);
 return JSON.stringify({schema:CP16_SCHEMA,raw,hmac:mac(key,raw)})};
function checkSealed(file,key){
 let obj;try{obj=JSON.parse(readFileSync(file,'utf8'))}catch{hold('DISK_JSON')}
 if(obj?.schema!==CP16_SCHEMA||typeof obj.raw!=='string'||!equal(obj.hmac,mac(key,obj.raw)))hold('DISK_HMAC');
 let state;try{state=JSON.parse(obj.raw)}catch{hold('DISK_CONTENT')}
 if(state.schema!==CP16_SCHEMA||!Number.isSafeInteger(state.revision)||
    state.revision<0||!state.receivers||!state.history||
    Object.keys(state.history).length!==state.revision)hold('DISK_SHAPE');
 let parent='0'.repeat(64);
 for(const entry of Object.values(state.history)){
  const {digest,...contents}=entry;
  if(entry.parent!==parent||!equal(digest,sha(contents)))hold('DISK_CHAIN');
  parent=digest;
 }
 if(!equal(parent,state.tip))hold('DISK_TIP');
 return state;
}
function atomic(file,value){
 const temp=file+'.tmp-'+randomUUID();let fd;
 try{
  fd=openSync(temp,'wx',0o600);writeSync(fd,value);fsyncSync(fd);closeSync(fd);fd=null;
  renameSync(temp,file);
  try{const dir=openSync(dirname(file),'r');try{fsyncSync(dir)}finally{closeSync(dir)}}catch{}
 }finally{if(fd!==null&&fd!==undefined)closeSync(fd);try{unlinkSync(temp)}catch{}}
}
function lock(path){
 let fd;const lockfile=path+'.lock';
 try{fd=openSync(lockfile,'wx',0o600)}catch{hold('CONCURRENT_EXECUTION')}
 return ()=>{closeSync(fd);unlinkSync(lockfile)};
}
const respond=(res,status,data)=>{res.writeHead(status,{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
 res.end(JSON.stringify(data))};
const checkCommand=b=>{
 if(!b||Array.isArray(b)||typeof b!=='object'||
  Object.keys(b).some(k=>!['operationId','expectedRevision','sourceIds','question','top','request'].includes(k)))
  hold('COMMAND_FIELDS',422);
 if(!uuid.test(b.operationId||'')||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0||
    typeof b.question!=='string'||!b.question.trim()||b.question.length>1200||
    b.top!==undefined&&(!Number.isInteger(b.top)||b.top<1||b.top>8)||
    b.request?.approval!=='EXPLICIT_LOCAL_EXECUTION_REQUEST')
  hold('COMMAND_SCOPE',422);
};
export function createTrustedEstateServer(config){
 if(config?.host!==undefined&&config.host!=='127.0.0.1')hold('LOOPBACK_ONLY',500);
 if(!config||typeof config.bearer!=='string'||config.bearer.length<32||
    typeof config.sealKey!=='string'||config.sealKey.length<32||
    config.bearer===config.sealKey||!config.mesh||!config.receivers||!config.registry||
    !config.stateFile||!config.sourceRoot)hold('HOST_BOOTSTRAP',500);
 const catalog=sourceCatalog(config),file=resolve(config.stateFile);
 mkdirSync(dirname(file),{recursive:true,mode:0o700});
 if(existsSync(file)&&lstatSync(file).isSymbolicLink())hold('DATA_SYMLINK',500);
 if(!existsSync(file))atomic(file,sealed(makeInitial(config.receivers),config.sealKey));
 const read=()=>checkSealed(file,config.sealKey);
 read();
 const meshDigest=sha(config.mesh);
 const server=http.createServer(async(req,res)=>{
  if(req.headers.origin||req.headers.cookie||req.headers['sec-fetch-site'])
   return respond(res,403,{ok:false,error:'CP16_NO_BROWSER_AMBIENT_AUTHORITY'});
  const header=req.headers.authorization||'';
  if(!header.startsWith('Bearer ')||!equal(header.slice(7),config.bearer))
   return respond(res,401,{ok:false,error:'CP16_AUTH_REQUIRED'});
  try{
   if(req.method==='GET'&&req.url==='/v1/state'){
    const current=read();
    return respond(res,200,{ok:true,revision:current.revision,tip:current.tip,
      count:Object.keys(current.history).length,host:'LOOPBACK_ORIGINAL_JM_RUNTIME',
      boundary:'local sealed state; no production cloud/device claim'});
   }
   if(req.method==='GET'&&/^\/v1\/recover\/[a-f0-9-]{36}$/i.test(req.url)){
    const id=req.url.split('/').at(-1),current=read(),row=current.history[id];
    if(!row)hold('RECORD_ABSENT',404);
    if(row.meshDigest!==meshDigest)hold('AUTHORITY_DRIFT');
    const paths=resolveSources(catalog,row.sourceIds);
    if(paths.some((p,i)=>sha(readFileSync(p))!==row.sourceHashes[i]))hold('SOURCE_CHANGED');
    const returned=recoverAuthorityKnowledgeFederation(row.envelope,{
      request:row.request,receivers:row.receiversBefore,registry:config.registry,
      sources:paths,question:row.question,top:row.top,routeExisting:true,mesh:config.mesh});
    if(returned.envelopeSha256!==row.envelope.sha256)hold('SOURCE_REPLAY');
    return respond(res,200,{ok:true,status:'ACTUAL_CP14_REPLAY_AND_CUSTODY_PASS',
      operationId:id,revision:row.revision,sha256:row.envelope.sha256,
      envelope:row.envelope,receipt:row.digest});
   }
   if(req.method==='POST'&&req.url==='/v1/execute'){
    if((req.headers['content-type']||'').split(';')[0]!=='application/json')hold('JSON_REQUIRED',415);
    if(Number(req.headers['content-length']||0)>24000)hold('INPUT_LARGE',413);
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>24000)hold('INPUT_LARGE',413)}
    let command;try{command=JSON.parse(raw)}catch{hold('INVALID_JSON',400)}
    checkCommand(command);
    const unlock=lock(file);
    try{
     const state=read(),existing=state.history[command.operationId];
     const requestDigest=sha(command);
     if(existing){
      if(existing.requestDigest!==requestDigest)hold('DUPLICATE_ID_CONFLICT');
      return respond(res,200,{ok:true,status:'PRIOR_COMMITTED_NO_REPLAY',
        operationId:existing.operationId,revision:existing.revision,
        sha256:existing.envelope.sha256,receipt:existing.digest});
     }
     if(command.expectedRevision!==state.revision)hold('REVISION_CONFLICT');
     const paths=resolveSources(catalog,command.sourceIds),hashes=paths.map(p=>sha(readFileSync(p)));
     const receiversBefore=clone(state.receivers);
     const inputs={request:command.request,receivers:receiversBefore,registry:config.registry,
       sources:paths,question:command.question,top:command.top||3,
       routeExisting:true,mesh:config.mesh};
     const made=executeAuthorityKnowledgeFederation(inputs);
     if(made.status!=='EXECUTED_SOURCE_QUALIFIED_NATIVE_FEDERATION')hold('SOURCE_EXECUTION');
     const recovered=recoverAuthorityKnowledgeFederation(made.envelope,inputs);
     if(recovered.envelopeSha256!==made.envelope.sha256||
        paths.some((p,i)=>sha(readFileSync(p))!==hashes[i]))hold('SOURCE_REPLAY_OR_DRIFT');
     const bodies=JSON.parse(JSON.parse(made.envelope.body).federationEnvelope.body);
     const row={schema:'jm.m002.cp16.record/1',operationId:command.operationId,
       revision:state.revision+1,parent:state.tip,requestDigest,sourceIds:command.sourceIds,
       sourceHashes:hashes,question:command.question,top:command.top||3,
       request:clone(command.request),meshDigest,receiversBefore,
       envelope:made.envelope,finalDigest:sha(bodies.finalReceivers)};
     row.digest=sha(row);
     state.history[row.operationId]=row;
     state.receivers=bodies.finalReceivers;state.revision=row.revision;state.tip=row.digest;
     atomic(file,sealed(state,config.sealKey));
     const reread=read();
     if(reread.revision!==row.revision||reread.tip!==row.digest)hold('COMMIT_READBACK');
     return respond(res,201,{ok:true,status:'CP14_EXECUTED_LOCAL_COMMITTED',
       operationId:row.operationId,revision:row.revision,sha256:row.envelope.sha256,
       receipt:row.digest,deviceProof:'NOT_TESTED'});
    }finally{unlock()}
   }
   return respond(res,404,{ok:false,error:'CP16_ROUTE_NOT_SUPPORTED'});
  }catch(e){
   const message=String(e.message||'').startsWith('CP16_')?String(e.message):'CP16_EXECUTION_OR_SOURCE_HOLD';
   return respond(res,e.status||409,{ok:false,error:message});
  }
 });
 return {server,
  listen:(port=0)=>new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,'127.0.0.1',()=>{
   server.off('error',bad);ok(server.address());
  })}),
  close:()=>new Promise(ok=>server.close(ok)),
  sourceIds:Object.keys(catalog),boundary:'LOCAL_ONLY_NO_CLOUD_OR_DEVICE_PROOF'};
}
