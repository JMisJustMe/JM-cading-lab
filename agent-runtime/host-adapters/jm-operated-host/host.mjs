// JM-owned static-release adapter. Adds capability; does not replace Cloud Contact.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=message=>{throw Error(message)};
const nameOK=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9-]{0,47}$/.test(s);
const guard=file=>{let cursor=path.parse(path.resolve(file)).root;for(const part of path.resolve(file).slice(cursor.length).split(path.sep)){cursor=path.join(cursor,part);try{if(fs.lstatSync(cursor).isSymbolicLink())fail('UNSAFE_STORE_PATH')}catch(e){if(e.code==='ENOENT')break;throw e}}};
const appDir=(store,name)=>{const dir=path.join(path.resolve(store),'apps',nameOK(name)?name:fail('INVALID_APP_NAME'));guard(dir);return dir};
const safe=s=>typeof s==='string'&&s.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!p.includes('\\')&&!p.includes('\0'));
const atomic=(file,value)=>{
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 const tmp=file+'.tmp-'+crypto.randomBytes(6).toString('hex'),fd=fs.openSync(tmp,'wx',0o600);
 try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
 fs.renameSync(tmp,file);
};
const read=file=>{guard(file);if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())fail('INVALID_STATE_CARRIER');return JSON.parse(fs.readFileSync(file))};
const releaseDir=(store,name,id)=>path.join(appDir(store,name),'releases',/^[0-9a-f]{64}$/.test(id)?id:fail('BAD_RELEASE_ID'));
function state(store,name){
 const file=path.join(appDir(store,name),'state.json');if(!fs.existsSync(file))fail('APP_NOT_DEPLOYED');
 const obj=read(file);if(obj.schema!=='JM.HostState/1'||obj.app!==name||!Array.isArray(obj.history)||!obj.history.includes(obj.current))fail('INVALID_STATE');return obj;
}
function scan(root){
 if(!fs.lstatSync(root).isDirectory()||fs.lstatSync(root).isSymbolicLink())fail('BAD_SOURCE_DIRECTORY');
 const entries=[];let total=0;
 function walk(dir,rel){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const child=path.join(dir,e.name),name=rel?rel+'/'+e.name:e.name,st=fs.lstatSync(child);
  if(st.isSymbolicLink())fail('SOURCE_SYMLINK_REFUSED');
  if(st.isDirectory()){walk(child,name);continue}
  if(!st.isFile()||!safe(name))fail('BAD_SOURCE_ENTRY');
  total+=st.size;if(st.size>16*1024*1024||total>64*1024*1024||entries.length>=1000)fail('SOURCE_LIMIT');
  entries.push({file:name,size:st.size,sha256:sha(fs.readFileSync(child))});
 }}walk(root,'');if(!entries.length)fail('EMPTY_SOURCE');return entries.sort((a,b)=>a.file.localeCompare(b.file));
}
function manifest(store,name,id){
 const obj=read(path.join(releaseDir(store,name,id),'manifest.json'));
 if(obj.schema!=='JM.HostManifest/1'||obj.app!==name||!Array.isArray(obj.entries)||sha(JSON.stringify(obj.entries))!==id)fail('BAD_RELEASE_MANIFEST');
 return obj;
}
function asset(store,name,id,logical){
 const m=manifest(store,name,id),entry=m.entries.find(e=>e.file===logical);if(!entry)return null;
 if(!safe(logical))fail('BAD_ASSET_PATH');const root=path.join(releaseDir(store,name,id),'site');let parent=root;
 for(const segment of logical.split('/').slice(0,-1)){parent=path.join(parent,segment);const st=fs.lstatSync(parent);if(!st.isDirectory()||st.isSymbolicLink())fail('ASSET_DIRECTORY_TAMPER')}
 const file=path.join(root,...logical.split('/'));guard(file);const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size!==entry.size)fail('ASSET_TAMPER');
 const bytes=fs.readFileSync(file);if(sha(bytes)!==entry.sha256)fail('ASSET_TAMPER');return bytes;
}
export function verifyRelease(store,name,id){const m=manifest(store,name,id);for(const e of m.entries){if(!safe(e.file)||asset(store,name,id,e.file)===null)fail('ASSET_MISSING')}return {ok:true,app:name,release:id,files:m.entries.length}}
export function deploy(store,name,source){
 const home=appDir(store,name),root=path.resolve(source),stored=path.resolve(store);
 if(root===stored||root.startsWith(stored+path.sep))fail('SOURCE_INSIDE_STORE');
 if(stored.startsWith(root+path.sep))fail('SOURCE_STORE_OVERLAP');
 const entries=scan(root),id=sha(JSON.stringify(entries)),dest=releaseDir(store,name,id);
 fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
 if(!fs.existsSync(dest)){
  const stage=fs.mkdtempSync(path.join(home,'.staging-'));
  try{const site=path.join(stage,'site');fs.mkdirSync(site,{mode:0o700});
   for(const e of entries){const from=path.join(root,...e.file.split('/')),to=path.join(site,...e.file.split('/'));
    const st=fs.lstatSync(from);if(!st.isFile()||st.isSymbolicLink())fail('SOURCE_CHANGED');
    const bytes=fs.readFileSync(from);if(bytes.length!==e.size||sha(bytes)!==e.sha256)fail('SOURCE_CHANGED');
    fs.mkdirSync(path.dirname(to),{recursive:true,mode:0o700});fs.writeFileSync(to,bytes,{flag:'wx',mode:0o600});
   }
   atomic(path.join(stage,'manifest.json'),{schema:'JM.HostManifest/1',app:name,entries});fs.renameSync(stage,dest);
  }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true})}
 }
 verifyRelease(store,name,id);
 let before=null;try{before=state(store,name)}catch(e){if(e.message!=='APP_NOT_DEPLOYED')throw e}
 const history=[...(before?.history||[])];if(history.at(-1)!==id)history.push(id);
 atomic(path.join(home,'state.json'),{schema:'JM.HostState/1',app:name,current:id,history,updatedAt:new Date().toISOString()});
 return {ok:true,app:name,release:id,previous:before?.current||null,files:entries.length,change:before?.current===id?'UNCHANGED':'DEPLOYED'};
}
export function rollback(store,name){const old=state(store,name);if(old.history.length<2)fail('NO_PRIOR_RELEASE');const previous=old.history.at(-2);
 verifyRelease(store,name,previous);atomic(path.join(appDir(store,name),'state.json'),{...old,current:previous,history:[...old.history,previous],updatedAt:new Date().toISOString()});
 return {ok:true,app:name,release:previous,rolledBackFrom:old.current};}
export function inspect(store,name){const s=state(store,name);return {...verifyRelease(store,name,s.current),history:s.history,current:s.current,updatedAt:s.updatedAt}}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.wasm':'application/wasm','.pdf':'application/pdf','.woff2':'font/woff2'};
export function createServer(store){return http.createServer((req,res)=>{
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'};
 const end=(code,data,type='application/json')=>{res.writeHead(code,{...headers,'Content-Type':type,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data)};
 try{if(!['GET','HEAD'].includes(req.method))return end(405,Buffer.from('{"error":"READ_ONLY_HTTP"}'));
  const raw=(req.url||'/').split('?')[0];if(/%2f|%5c|%00/i.test(raw))return end(400,Buffer.from('{"error":"INVALID_PATH"}'));
  let uri;try{uri=decodeURIComponent(raw)}catch{return end(400,Buffer.from('{"error":"INVALID_ENCODING"}'))}
  if(uri.includes('\\')||uri.split('/').some(p=>p==='..'||p==='.'))return end(400,Buffer.from('{"error":"INVALID_PATH"}'));
  if(uri==='/_jm/ready')return end(200,Buffer.from('{"ok":true,"scope":"JM_LOCAL_STATIC_HOST"}'));
  const m=/^\/apps\/([a-z0-9][a-z0-9-]{0,47})\/(.*)$/.exec(uri);
  if(!m)return end(404,Buffer.from('{"error":"ROUTE_NOT_FOUND"}'));
  const logical=m[2]||'index.html';if(!safe(logical))return end(400,Buffer.from('{"error":"BAD_ASSET_PATH"}'));
  let s;try{s=state(store,m[1])}catch(e){if(e.message==='APP_NOT_DEPLOYED')return end(404,Buffer.from('{"error":"APP_NOT_FOUND"}'));throw e}
  const bytes=asset(store,m[1],s.current,logical);if(!bytes)return end(404,Buffer.from('{"error":"ASSET_NOT_FOUND"}'));
  return end(200,bytes,types[path.extname(logical).toLowerCase()]||'application/octet-stream');
 }catch(e){return end(503,Buffer.from(JSON.stringify({error:'INTEGRITY_HOLD',detail:'RELEASE_VERIFICATION_FAILED'})))}}
)}
export async function cli(argv=process.argv.slice(2)){
 const [cmd,a,b,c]=argv;
 if(cmd==='deploy')return console.log(JSON.stringify(deploy(c||'./.jm-host',a,b)));
 if(cmd==='inspect')return console.log(JSON.stringify(inspect(b||'./.jm-host',a)));
 if(cmd==='rollback')return console.log(JSON.stringify(rollback(b||'./.jm-host',a)));
 if(cmd==='serve'){
  const host=process.env.JM_HOST_BIND||'127.0.0.1',port=Number(process.env.PORT||8795);
  if(!['127.0.0.1','::1','localhost'].includes(host)&&process.env.JM_HOST_ALLOW_LAN!=='1')fail('NON_LOOPBACK_NEEDS_OPT_IN');
  if(!Number.isInteger(port)||port<0||port>65535)fail('INVALID_PORT');
  const server=createServer(a||'./.jm-host');return server.listen(port,host,()=>console.log(JSON.stringify({ok:true,host,port:server.address().port,warning:host==='127.0.0.1'?'LOOPBACK_ONLY':'LAN_HTTP_NOT_FOR_PUBLIC_INTERNET'})));
 }
 fail('USAGE deploy <app> <folder> [store] | inspect <app> [store] | rollback <app> [store] | serve [store]');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error(e.message);process.exitCode=1});
