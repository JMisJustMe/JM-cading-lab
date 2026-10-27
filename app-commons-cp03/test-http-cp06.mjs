import assert from 'node:assert/strict';
import {test,before,after} from 'node:test';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';

const TOKEN='CP06_TEST_ONLY_TOKEN_1234567890abcdef';
let child,base;
let next=1;
async function freePort(){
  return new Promise((resolve,reject)=>{
    const s=createServer();
    s.once('error',reject);
    s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
  });
}
async function post(payload,{token=TOKEN,origin='',path='/mcp',method='POST',contentType='application/json'}={}){
  const headers={'Content-Type':contentType};
  if(token!==null)headers.Authorization='Bearer '+token;
  if(origin)headers.Origin=origin;
  const r=await fetch(base+path,{method,headers,body:method==='POST'?(typeof payload==='string'?payload:JSON.stringify(payload)):undefined});
  let body=null;try{body=await r.json();}catch{}
  return {status:r.status,data:body,headers:r.headers};
}
function rpc(method,params={}){return {jsonrpc:'2.0',id:next++,method,params};}
function invoke(name,args){
  return post(rpc('tools/call',{name,arguments:args}));
}
before(async()=>{
  const port=await freePort();
  base='http://127.0.0.1:'+port;
  child=spawn(process.execPath,['app-commons-cp03/http-mcp-cp06.mjs'],{
    cwd:new URL('../../../',import.meta.url).pathname,
    env:{...process.env,HOST:'127.0.0.1',PORT:String(port),JM_COMMONS_TOKEN:TOKEN,JM_COMMONS_ORIGIN:base},
    stdio:['ignore','pipe','pipe']
  });
  let stderr='';
  child.stderr.on('data',b=>stderr+=b.toString());
  for(let n=0;n<100;n++){
    if(child.exitCode!==null)throw Error('service exited: '+stderr);
    try{const r=await fetch(base+'/healthz');if(r.ok)return;}catch{}
    await new Promise(done=>setTimeout(done,40));
  }
  throw Error('JM CP06 HTTP server did not become ready: '+stderr);
});
after(()=>{if(child)child.kill('SIGTERM');});
test('public readiness is bounded and correctly identifies original stdio adapter',async()=>{
 const r=await fetch(base+'/healthz');assert.equal(r.status,200);
 const j=await r.json();assert.equal(j.tool_count,6);assert.equal(j.state,'TOKEN_PROTECTED');
 assert.match(j.source,/CP03/);
});
test('missing bearer blocked',async()=>assert.equal((await post(rpc('tools/list'),{token:null})).status,401));
test('incorrect bearer blocked',async()=>assert.equal((await post(rpc('tools/list'),{token:'wrong'})).status,401));
test('unsafe Origin blocked',async()=>assert.equal((await post(rpc('tools/list'),{origin:'https://gemini.google.com.attacker.test'})).status,403));
test('literal null Origin blocked',async()=>assert.equal((await post(rpc('tools/list'),{origin:'null'})).status,403));
test('allowed Gemini preflight is bounded',async()=>{
 const r=await fetch(base+'/mcp',{method:'OPTIONS',headers:{Origin:'https://gemini.google.com','Access-Control-Request-Method':'POST'}});
 assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'https://gemini.google.com');
});
test('unknown tool blocked before dispatch',async()=>assert.equal((await invoke('shell_exec',{})).status,403));
test('unknown JSONRPC method blocked',async()=>assert.equal((await post(rpc('root/access'))).status,403));
test('extra query disabled',async()=>assert.equal((await post(rpc('tools/list'),{path:'/mcp?token=test'})).status,400));
test('malformed JSON rejected',async()=>assert.equal((await post('{bad')).status,400));
test('wrong content type rejected',async()=>assert.equal((await post(rpc('tools/list'),{contentType:'text/plain'})).status,415));
test('HTTP initialize actually reaches original stdio MCP',async()=>{
 const r=await post(rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'JM TEST',version:'1'}}));
 assert.equal(r.status,200);assert.equal(r.data.result.serverInfo.version,'0.3.0');
});
test('HTTP tools list is six original definitions',async()=>{
 const r=await post(rpc('tools/list'));assert.equal(r.status,200);
 assert.deepEqual(r.data.result.tools.map(x=>x.name).sort(),
 ['jm_capsule_compare','jm_capsule_create','jm_capsule_verify','jm_original_compare','jm_original_inspect','jm_workroom_open']);
});
test('unknown owner file contents are not mounted',async()=>{
 const r=await invoke('jm_workroom_open',{});
 assert.equal(r.status,200);assert.equal(r.data.result.isError,false);
 assert.equal(r.data.result.structuredContent.status,'LOCAL_ONLY');
});
test('original source inspection executes',async()=>{
 const r=await invoke('jm_original_inspect',{source:'const jm = 32;'});
 assert.equal(r.status,200);assert.equal(r.data.result.isError,false);
});
test('original compare executes',async()=>{
 const r=await invoke('jm_original_compare',{before:'let score=1;',after:'let score=2;'});
 assert.equal(r.status,200);assert.equal(r.data.result.isError,false);
});
test('32 fresh HTTP -> authentic stdio tool calls',async()=>{
 for(let i=0;i<32;i++){
   const r=await invoke('jm_workroom_open',{});
   assert.equal(r.status,200,'request '+i);
   assert.equal(r.data.result.structuredContent.carrier,'JM_APP_COMMONS_CP03.html');
   assert.equal(r.data.result.isError,false);
 }
});
