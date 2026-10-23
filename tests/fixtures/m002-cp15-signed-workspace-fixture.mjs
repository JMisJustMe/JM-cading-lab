// CP15 TEST FIXTURE ONLY: fake signed RouteVault wire protocol with persisted
// synthetic JSON and signer, never presented as original JM Cloud Server.
import http from 'node:http';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {generateKeyPairSync,createPrivateKey,createPublicKey,createHash,sign,randomUUID} from 'node:crypto';
import {canonical} from '../../unified-browser/jm-cloud-workspace-client.mjs';
const [statePath,keyPath,portText]=process.argv.slice(2);
if(!statePath||!keyPath||!portText)throw Error('FIXTURE_ARGUMENTS');
mkdirSync(dirname(statePath),{recursive:true});
let state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{workspaces:{},receipts:{},tokens:[]};
if(!existsSync(keyPath)){
 const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 writeFileSync(keyPath,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
}
const privateKey=createPrivateKey(readFileSync(keyPath));
const jwk=createPublicKey(privateKey).export({format:'jwk'});
const keyId='fixture-ec-p256';
const sha=s=>createHash('sha256').update(s).digest('hex');
const save=()=>writeFileSync(statePath,JSON.stringify(state));
const send=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj))};
const cloud=(spaceId,revision,workspaceId,contentHash)=>{
 const source={schema:'jm.cloud-contact.space-receipt/0.5',spaceId,revision,workspaceId,contentHash};
 const receiptHash=sha(canonical(source));
 const sig=sign('sha256',Buffer.from(receiptHash),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
 return {...source,receiptHash,publicSig:sig,publicKeyId:keyId,signatureAlgorithm:'ECDSA-P256-SHA256-P1363',claimBoundary:'TEST_FIXTURE_ONLY'};
};
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://127.0.0.1');
 const path=url.pathname,method=req.method;
 if(method==='GET'&&path==='/ready')return send(res,200,{ok:true});
 let payload={};
 if(method==='POST'){
  const parts=[];for await(const chunk of req){parts.push(chunk);if(Buffer.concat(parts).length>40000)return send(res,413,{error:'TOO_LARGE'})}
  payload=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');
 }
 if(method==='POST'&&path==='/mesh/v1/auth/register'){
  const token=('fixture_'+randomUUID().replaceAll('-','')).padEnd(27,'z');
  state.tokens.push(token);save();
  return send(res,200,{token,authuser:{authuserId:'au_'+randomUUID().slice(0,10)}});
 }
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(!state.tokens.includes(token))return send(res,401,{error:'SCOPED_CREDENTIAL_REQUIRED'});
 if(method==='GET'&&path==='/receipt-key')return send(res,200,{keyId,publicKeyJwk:jwk});
 if(method==='POST'&&path==='/mesh/v1/workspaces'){
  const workspaceId='ws_'+randomUUID().replaceAll('-','');
  state.workspaces[workspaceId]={workspaceId,revision:0,content:null,contentHash:null,cloudSpaceId:'cloud_'+randomUUID().replaceAll('-','')};save();
  return send(res,200,{workspace:{workspaceId}});
 }
 const match=path.match(/^\/mesh\/v1\/workspaces\/(ws_[A-Za-z0-9_-]{8,64})(\/save)?$/);
 if(match){
  const w=state.workspaces[match[1]];
  if(!w)return send(res,404,{error:'WORKSPACE_NOT_FOUND'});
  if(method==='GET'&&!match[2])return send(res,200,{workspace:w});
  if(method==='POST'&&match[2]){
   if(w.revision!==0)return send(res,409,{error:'WORKSPACE_ALREADY_WRITTEN'});
   w.revision=1;w.content=payload.content;w.contentHash=sha(JSON.stringify(payload.content));
   const c=cloud(w.cloudSpaceId,w.revision,w.workspaceId,w.contentHash);
   const cloudReceiptHash=c.receiptHash;
   const receipt={kind:'workspace.save',receiptHash:sha(JSON.stringify({workspaceId:w.workspaceId,contentHash:w.contentHash,cloudReceiptHash})),
     payload:{workspaceId:w.workspaceId,revision:1,contentHash:w.contentHash,cloudReceiptHash}};
   state.receipts[receipt.receiptHash]=receipt;state.receipts[c.receiptHash]=c;save();
   return send(res,200,{workspace:w,receipt,cloudReceipt:c});
  }
 }
 if(method==='POST'&&path==='/mesh/v1/verify'){
  const receipt=state.receipts[payload.receiptHash];
  return send(res,200,{valid:!!receipt,receipt:receipt||null});
 }
 if(method==='GET'&&path==='/mesh/v1/dashboard')return send(res,200,{dashboard:{latestReceipts:Object.values(state.receipts).filter(x=>x.kind==='workspace.save')}});
 return send(res,404,{error:'FIXTURE_ROUTE_NOT_FOUND'});
 }catch(e){send(res,400,{error:'FIXTURE_ERROR_'+String(e.message).slice(0,60)})}
});
server.listen(Number(portText),'127.0.0.1',()=>console.log('CP15_FIXTURE_READY'));
const stop=()=>server.close(()=>process.exit(0));
process.on('SIGTERM',stop);process.on('SIGINT',stop);
