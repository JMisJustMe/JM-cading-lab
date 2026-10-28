/*
 * JM APP//COMMONS CP06 remote HTTP MCP carrier.
 * This file wraps, NEVER replaces, CP03's original mcp-stdio.mjs + core.mjs.
 * Every tool call is passed to one fresh authentic stdio process.
 * Requires an external bearer secret; no anonymous access to owner content.
 * No disk writes, output caching, arbitrary commands, or project publication.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';

const TOKEN = process.env.JM_COMMONS_TOKEN || '';
if (Buffer.byteLength(TOKEN) < 24) {
  console.error('HOLD: a JM_COMMONS_TOKEN of at least 24 bytes is required.');
  process.exit(1);
}
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || '10000');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) process.exit(1);
const ORIGIN = (process.env.JM_COMMONS_ORIGIN || '').replace(/\/$/,'');
const ALLOWED = new Set([ORIGIN, 'https://gemini.google.com', 'https://chatgpt.com'].filter(Boolean));
const MAX_BYTES = 65536;
const MAX_ACTIVE = 4;
const TOOLS = new Set(['jm_original_inspect','jm_original_compare','jm_capsule_create','jm_capsule_verify','jm_capsule_compare','jm_workroom_open']);
const RPC = new Set(['initialize','ping','tools/list','tools/call','notifications/initialized']);
let active = 0;

const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
function reply(res,status,body,extra={}) {
  const content = body === null ? '' : JSON.stringify(body);
  res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8',...extra});
  res.end(content);
}
function originHeaders(origin){
  return origin && ALLOWED.has(origin) ? {
    'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id',
    'Access-Control-Max-Age':'600',
    'Vary':'Origin'
  } : {};
}
function authorized(req) {
  const a = Buffer.from(req.headers.authorization || '');
  const b = Buffer.from('Bearer ' + TOKEN);
  return a.length === b.length && timingSafeEqual(a,b);
}
function invokeStdIo(request) {
  return new Promise((resolve,reject)=>{
    const child = spawn(process.execPath,['mcp-stdio.mjs'],{
      cwd:new URL('.', import.meta.url).pathname,
      env:{NODE_ENV:'production'},
      stdio:['pipe','pipe','ignore']
    });
    let buf='', settled=false;
    const timeout=setTimeout(()=>{child.kill();finish(new Error('TIMEOUT'));},8000);
    function finish(e,v){if(settled)return;settled=true;clearTimeout(timeout);e?reject(e):resolve(v);}
    child.on('error',e=>finish(e));
    child.stdout.on('data',chunk=>{buf+=chunk.toString('utf8');if(buf.length>1_000_000){child.kill();finish(new Error('OVERSIZED_OUTPUT'));}});
    child.on('close',code=>{
      if(code!==0)return finish(new Error('NATIVE_SUBPROCESS_HOLD'));
      if(!buf.trim())return finish(null,null);
      try{finish(null,JSON.parse(buf.trim()));}catch{finish(new Error('NATIVE_JSON_HOLD'));}
    });
    child.stdin.end(JSON.stringify(request)+'\n');
  });
}
const server=http.createServer(async(req,res)=>{
  const route=new URL(req.url||'/', 'http://localhost');
  if(route.search){return reply(res,400,{error:'QUERY_HOLD'});}
  if(req.method==='GET' && route.pathname==='/healthz')return reply(res,200,{
    name:'JM APP//COMMONS independent HTTP MCP', version:'0.6.0-cp06',
    source:'original CP03 stdio unchanged', state:'TOKEN_PROTECTED',
    tool_count:6, executable_carrier:'NODE_NATIVE_STDIO_BRIDGE',
    boundary:'No project storage, physical Fold proof, Gemini client proof or session state'
  });
  if(route.pathname!=='/mcp')return reply(res,404,{error:'NOT_FOUND'});
  const origin=req.headers.origin;
  if(origin && !ALLOWED.has(origin))return reply(res,403,{error:'ORIGIN_HOLD'});
  const cors=originHeaders(origin);
  if(req.method==='OPTIONS')return reply(res,204,null,cors);
  if(req.method!=='POST')return reply(res,405,{error:'METHOD_HOLD'},cors);
  if(!authorized(req))return reply(res,401,{error:'BEARER_REQUIRED'},cors);
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return reply(res,415,{error:'JSON_REQUIRED'},cors);
  if(active>=MAX_ACTIVE)return reply(res,429,{error:'CAPACITY_HOLD'},cors);
  let data='';let aborted=false;
  req.on('data',chunk=>{data+=chunk.toString('utf8');if(Buffer.byteLength(data)>MAX_BYTES){aborted=true;reply(res,413,{error:'BODY_LIMIT'},cors);req.destroy();}});
  req.on('end',async()=>{
    if(aborted)return;
    let r;try{r=JSON.parse(data);}catch{return reply(res,400,{error:'INVALID_JSON'},cors);}
    if(!r||typeof r!=='object'||Array.isArray(r)||r.jsonrpc!=='2.0'||!RPC.has(r.method))return reply(res,403,{error:'RPC_SCOPE_HOLD'},cors);
    if(r.method==='tools/call' && !TOOLS.has(r.params?.name))return reply(res,403,{error:'TOOL_SCOPE_HOLD'},cors);
    ++active;
    try{const result=await invokeStdIo(r);reply(res,result===null?202:200,result,cors);}
    catch{reply(res,502,{error:'NATIVE_EXECUTION_HOLD'},cors);}
    finally{--active;}
  });
});
server.listen(PORT,HOST,()=>console.log('JM_APP_COMMONS_CP06_HTTP_MCP_READY '+PORT));


/* Additional host-local verification only. Does not grant new tools or public routes.
   No bearer is printed, persisted or passed to any other service. */
if (process.env.JM_COMMONS_HOST_SELFTEST === '1') {
  server.on('listening', () => {
    setTimeout(async () => {
      try {
        const endpoint='http://127.0.0.1:'+PORT+'/mcp';
        async function realMcp(method,params) {
          const response=await fetch(endpoint,{method:'POST',headers:{
            'Content-Type':'application/json','Authorization':'Bearer '+TOKEN,
            'Accept':'application/json, text/event-stream'
          },body:JSON.stringify({jsonrpc:'2.0',id:32,method,params:params||{}})});
          if(response.status!==200)throw new Error('HTTP_'+response.status);
          const payload=await response.json();
          if(payload.error||!payload.result)throw new Error('BAD_RPC');
          return payload.result;
        }
        const listed=await realMcp('tools/list',{});
        if(listed.tools?.length!==6)throw new Error('SIX_TOOL_LINEAGE_MISMATCH');
        const output=await realMcp('tools/call',{name:'jm_original_inspect',arguments:{source:'# JM HOST SELF TEST'}});
        if(output.isError!==false||output.structuredContent?.headings!==1)throw new Error('NATIVE_CONSEQUENCE_MISMATCH');
        console.log('JM_CP06_HOSTED_AUTH_SELFTEST PASS 6 original tools plus real native inspect');
      }catch(error) {
        console.log('JM_CP06_HOSTED_AUTH_SELFTEST HOLD '+String(error.message).slice(0,65));
      }
    },500);
  });
}
