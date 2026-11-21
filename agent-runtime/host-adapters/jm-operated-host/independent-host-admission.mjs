// JM CP12 — explicit OWNER-HOST recovery admission, loopback-only by default.
// No production launch, DNS, billing, setup shell, device control or reverse-proxy install.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {JMNodeSupervisor} from './supervisor.mjs';
const DONOR='0921217d95285bcb21cda7a995d02f7ec0725810';
const names=['state.json','receipt-signing-key.pem','game-state.json','mesh-state.json','market-state.json','zezu-state.json'];
const fail=c=>{throw Error('CP12_'+c)};const insist=(v,c)=>{if(!v)fail(c)};
const isObject=j=>j!==null&&typeof j==='object'&&!Array.isArray(j);
// Donor authentic key ID is SHA256 of canonical *public* JWK, first 24 hex chars.
// No new signing identity is ever minted here; expectedKeyId must be separately pinned.
const canon=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canon).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';
export function pinRecoveredReceiptSigner({pemFile,expectedKeyId}){
 insist(typeof expectedKeyId==='string'&&/^[a-f0-9]{24}$/.test(expectedKeyId),'INDEPENDENT_SIGNER_PIN_REQUIRED');
 const f=safe(pemFile),st=fs.lstatSync(f);
 insist(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<32768,'SIGNER_PRIVATE_FILE_REQUIRED');
 if(process.platform!=='win32'){
  insist((st.mode&0o077)===0,'SIGNER_PERMISSIONS');
  insist(st.uid===process.getuid(),'SIGNER_OWNERSHIP');
 }
 let key,jwk;try{
  key=crypto.createPrivateKey(fs.readFileSync(f));
  jwk=crypto.createPublicKey(key).export({format:'jwk'});
 }catch{fail('INVALID_RECEIPT_SIGNER')}
 insist(key.asymmetricKeyType==='ec'&&key.asymmetricKeyDetails?.namedCurve==='prime256v1'&&jwk.kty==='EC'&&jwk.crv==='P-256','UNSUPPORTED_SIGNER_KEY');
 const keyId=crypto.createHash('sha256').update(canon(jwk)).digest('hex').slice(0,24);
 insist(keyId===expectedKeyId,'SIGNER_IDENTITY_CHANGED');
 return {ok:true,signerKeyId:keyId,claimBoundary:'INDEPENDENT_PIN_MATCH_ONLY_NOT_LIVE_PUBLIC_IDENTITY'};
}
function safe(str){insist(typeof str==='string'&&str.trim().length>0,'PATH_REQUIRED');const p=path.resolve(str),root=path.parse(p).root;let c=root;for(const v of p.slice(root.length).split(path.sep)){if(!v)continue;c=path.join(c,v);try{insist(!fs.lstatSync(c).isSymbolicLink(),'SYMLINK_REFUSED')}catch(e){if(e.code==='ENOENT')break;throw e}}return p}
function secretFile(f){const p=safe(f),s=fs.lstatSync(p);insist(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<32768,'INVALID_SECRET_FILE');if(process.platform!=='win32'){insist((s.mode&0o077)===0,'SECRET_PERMISSIONS');insist(s.uid===process.getuid(),'SECRET_OWNERSHIP')}const val=fs.readFileSync(p,'utf8').trim();insist(val.length>0,'EMPTY_SECRET');return val}
function jsonFile(f){const p=safe(f);let j;try{j=JSON.parse(fs.readFileSync(p,'utf8'))}catch{fail('JSON_CONFIG_INVALID')}insist(isObject(j),'JSON_CONFIG_INVALID');return j}
function inspectData(stateDir){const p=safe(stateDir),s=fs.lstatSync(p);insist(s.isDirectory()&&!s.isSymbolicLink(),'STATE_DIRECTORY_REQUIRED');const found=fs.readdirSync(p);for(const n of names)insist(found.includes(n),'MISSING_'+n.replace(/[^a-z]/gi,'_').toUpperCase());const valid=new Set([...names,'state.json.bak','JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json']);insist(found.every(n=>valid.has(n)),'UNEXPECTED_STATE_CARRIER');for(const n of found){const st=fs.lstatSync(path.join(p,n));insist(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=32*1024*1024,'UNSAFE_STATE_FILE')}
const market=jsonFile(path.join(p,'market-state.json'));insist(Array.isArray(market.snapshots)&&isObject(market.persistence),'INVALID_MARKET_STATE');return {mode:market.persistence.mode,durable:market.persistence.durable===true};}
function inspectOwnerHost(c){insist(isObject(c),'CONFIG_REQUIRED');const allowed=['donorRoot','stateDir','adminTokenFile','serverSecretFile','marketDatabaseUrlFile','port','allowedHttpsOrigin','expectedReceiptKeyId'];insist(Object.keys(c).every(x=>allowed.includes(x)),'CONFIG_UNKNOWN_FIELD');for(const key of ['donorRoot','stateDir','adminTokenFile','serverSecretFile','allowedHttpsOrigin'])insist(typeof c[key]==='string'&&c[key].trim().length>0,'REQUIRED_CONFIG_FIELDS');const donor=safe(c.donorRoot),state=safe(c.stateDir);
 insist(!state.startsWith(donor+path.sep)&&state!==donor,'STATE_INSIDE_DONOR');insist(fs.lstatSync(donor).isDirectory(),'DONOR_REQUIRED');const run=spawnSync('git',['-C',donor,'rev-parse','HEAD'],{encoding:'utf8',timeout:3000,shell:false});insist(run.status===0&&run.stdout.trim()===DONOR,'PINNED_DONOR_COMMIT_REQUIRED');
 for(const file of ['JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs','profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json','zezu/JM_ZEZU_HISTORY_ADMISSION_MANIFEST_CURRENT.json'])insist(fs.lstatSync(path.join(donor,file)).isFile(),'DONOR_ASSETS_INCOMPLETE');
 const data=inspectData(state),signerPin=pinRecoveredReceiptSigner({pemFile:path.join(state,'receipt-signing-key.pem'),expectedKeyId:c.expectedReceiptKeyId}),adminFile=safe(c.adminTokenFile),secretPath=safe(c.serverSecretFile);for(const p of [adminFile,secretPath])insist(!p.startsWith(state+path.sep)&&!p.startsWith(donor+path.sep),'SECRET_NOT_IN_SOVEREIGN_SOURCE');insist(adminFile!==secretPath,'SECRETS_NOT_INDEPENDENT');const admin=secretFile(adminFile),serverSecret=secretFile(secretPath);insist(admin.length>=32&&serverSecret.length>=32,'SECRET_TOO_SHORT');
 const pgPresent=typeof c.marketDatabaseUrlFile==='string'&&c.marketDatabaseUrlFile.trim().length>0;insist(pgPresent===(data.mode==='postgres'&&data.durable),'MARKET_POSTGRES_CUSTODY_MISMATCH');let pg='';if(pgPresent){const file=safe(c.marketDatabaseUrlFile);insist(!file.startsWith(state+path.sep)&&!file.startsWith(donor+path.sep),'DATABASE_SECRET_IN_SOURCE');pg=secretFile(file);insist(/^postgres(?:ql)?:\/\//.test(pg),'DATABASE_URL_REQUIRED')}
 insist(Number.isInteger(c.port)&&c.port>1024&&c.port<=65535,'PORT_INVALID');insist(typeof c.allowedHttpsOrigin==='string'&&/^https:\/\/[^\s/]+(?:\:[0-9]+)?$/.test(c.allowedHttpsOrigin),'TLS_ORIGIN_REQUIRED');
 return {ok:true,scope:'OWNER_HOST_SOURCE_STATE_AND_SECRET_ADMISSION_ONLY',sourceCommit:DONOR,port:c.port,marketMode:data.mode,signerKeyId:signerPin.signerKeyId,recipientCredentials:'SEPARATE_LOCAL_FILES',publicListen:'DISABLED_LOOPBACK_ONLY',_internal:{donor,state,admin,serverSecret,pg}};
}
export function preflightOwnerHost(c){const {_internal,...out}=inspectOwnerHost(c);return out}
export function launchOwnerHost(c){const a=inspectOwnerHost(c),{donor,state,admin,serverSecret,pg}=a._internal;
const env={JM_CLOUD_MODE:'production',JM_CLOUD_ADMIN_TOKEN:admin,JM_CLOUD_SERVER_SECRET:serverSecret,JM_CLOUD_ORIGINS:c.allowedHttpsOrigin,JM_CLOUD_DATA:path.join(state,'state.json'),JM_CLOUD_RECEIPT_SIGNING_KEY:path.join(state,'receipt-signing-key.pem'),JM_GAME_DATA:path.join(state,'game-state.json'),JM_SERVICE_MESH_DATA:path.join(state,'mesh-state.json'),JM_MARKET_DATA:path.join(state,'market-state.json'),JM_ZEZU_HISTORY_DATA:path.join(state,'zezu-state.json'),JM_CLOUD_PROFILE_DIR:path.join(donor,'profiles'),JM_CLOUD_PROFILE_MANIFEST:path.join(donor,'profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json'),JM_ZEZU_ADMISSION_MANIFEST:path.join(donor,'zezu/JM_ZEZU_HISTORY_ADMISSION_MANIFEST_CURRENT.json'),JM_MARKET_DATABASE_URL:pg,DATABASE_URL:'',JM_MARKET_PULSE_ENABLED:pg?'1':'0',JM_MARKET_PULSE_INTERVAL_MS:'3600000',JM_CLOUD_TURN_URLS:'',JM_CLOUD_TURN_SHARED_SECRET:''};
const supervisor=new JMNodeSupervisor({entry:path.join(donor,'JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs'),cwd:donor,port:c.port,maxRestarts:0,timeoutMs:18000,env});return{supervisor,admission:{ok:true,scope:a.scope,sourceCommit:a.sourceCommit,port:a.port,marketMode:a.marketMode,signerKeyId:a.signerKeyId,publicListen:'DISABLED_LOOPBACK_ONLY'}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
try{const [action,configPath]=process.argv.slice(2);const config=jsonFile(configPath);if(action==='preflight'){const p=preflightOwnerHost(config);console.log(JSON.stringify({...p,_internal:undefined}));}
else if(action==='run'||action==='smoke'){const {supervisor,admission}=launchOwnerHost(config);let shutting=false;const close=async()=>{if(shutting)return;shutting=true;await supervisor.stop()};process.on('SIGTERM',()=>close().then(()=>process.exit(0)));process.on('SIGINT',()=>close().then(()=>process.exit(0)));
await supervisor.start();console.log(JSON.stringify({...admission,ready:true,claim:'LOCAL_LOOPBACK_ONLY_NOT_PUBLISHED'}));
if(action==='smoke'){const base='http://127.0.0.1:'+config.port;const r=await fetch(base+'/ready',{signal:AbortSignal.timeout(2500)}),j=await r.json();if(!r.ok||!j.ready||j.version!=='0.5.1-hosted')fail('OWNER_HOST_REAL_SERVER_READINESS');const signerResponse=await (await fetch(base+'/receipt-key',{signal:AbortSignal.timeout(2500)})).json();if(!signerResponse.ok||signerResponse.keyId!==admission.signerKeyId)fail('LIVE_SIGNER_IDENTITY_MISMATCH');let m=await (await fetch(base+'/market/v1/persistence')).json();if(admission.marketMode==='postgres'){let good=m.durable&&m.ready;for(let i=0;i<40&&!good;i++){await new Promise(r=>setTimeout(r,100));m=await (await fetch(base+'/market/v1/persistence')).json();good=m.durable&&m.ready}if(!good)fail('MARKET_DB_NOT_READY')}await close();console.log(JSON.stringify({ok:true,scope:'GENUINE_HOSTED_V051_ISOLATED_LOOPBACK_CONTACT',marketMode:admission.marketMode,publicPublished:false}));}else await new Promise(()=>{});
}else fail('USAGE preflight|smoke|run <config-json-with-secret-file-paths>');}
catch(e){console.error(e.message);process.exitCode=1}}
