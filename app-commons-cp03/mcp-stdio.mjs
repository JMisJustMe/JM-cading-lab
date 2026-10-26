#!/usr/bin/env node
/* Independent local stdio MCP adapter. No host connection, tokens or network. */
import {createInterface} from 'node:readline';
import {inspect,compare,createCapsule,validateCapsule,parseStrictJSON} from './core.mjs';
const VERSION='0.3.0',SUPPORTED='2025-11-25';
const tools=[
 {name:'jm_original_inspect',description:'Inspect an original source locally using JM Original Structures aligned rules; read-only, not AI inference.',inputSchema:{type:'object',properties:{source:{type:'string',maxLength:10000}},required:['source'],additionalProperties:false}},
 {name:'jm_original_compare',description:'Compare two original source versions using bounded exact line LCS; read-only.',inputSchema:{type:'object',properties:{before:{type:'string',maxLength:10000},after:{type:'string',maxLength:10000}},required:['before','after'],additionalProperties:false}},
 {name:'jm_capsule_create',description:'Create a checksum-bound portable project capsule in memory (no write, export or transport). Caller retains all custody.',inputSchema:{type:'object',properties:{name:{type:'string',maxLength:80},source:{type:'string',maxLength:10000},snapshots:{type:'array',maxItems:12,items:{type:'object'}}},required:['name','source'],additionalProperties:false}},
 {name:'jm_capsule_verify',description:'Verify checksum, content digests and authority of portable JM App Commons capsule; does not import or write.',inputSchema:{type:'object',properties:{capsule:{type:'object'}},required:['capsule'],additionalProperties:false}},
 {name:'jm_capsule_compare',description:'Verify a project capsule, then compare its most recent preserved snapshot against the transported working source.',inputSchema:{type:'object',properties:{capsule:{type:'object'}},required:['capsule'],additionalProperties:false}},
 {name:'jm_workroom_open',description:'Get information about the independent offline HTML workroom; no privileged access.',inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
function handle(q){
  if(q.jsonrpc!=='2.0'||typeof q.method!=='string')throw {code:-32600,message:'Invalid JSON-RPC request'};
  const id=q.id;
  if(q.method==='notifications/initialized'||q.method==='ping/notify')return null;
  if(q.method==='initialize')return {jsonrpc:'2.0',id,result:{protocolVersion:SUPPORTED,capabilities:{tools:{listChanged:false}},serverInfo:{name:'JM App Commons — Original Workroom',version:VERSION}}};
  if(q.method==='ping')return {jsonrpc:'2.0',id,result:{}};
  if(q.method==='tools/list')return {jsonrpc:'2.0',id,result:{tools}};
  if(q.method==='tools/call'){
    const a=q.params?.arguments||{},name=q.params?.name;
    let out;
    try{
      switch(name){
        case 'jm_original_inspect':out=inspect(a.source);break;
        case 'jm_original_compare':out=compare(a.before,a.after);break;
        case 'jm_capsule_create':out=createCapsule(a);break;
        case 'jm_capsule_compare':{const c=validateCapsule(a.capsule);if(!c.snapshots.length)throw new Error('HOLD: no saved ancestor');out={...compare(c.snapshots[0].text,c.source),capsuleChecksum:c.checksum};break;}
        case 'jm_capsule_verify':{const c=validateCapsule(a.capsule);out={verified:true,name:c.name,checksum:c.checksum,reviewRequired:true};break;}
        case 'jm_workroom_open':out={name:'JM APP//COMMONS CP03',carrier:'JM_APP_COMMONS_CP03.html',status:'LOCAL_ONLY',transport:'stdio',hostEmbedding:'NOT_TESTED',features:['inspect','exact-line-compare','guarded-snapshots','portable-capsule','capsule-create','snapshot-compare','JVM-receiver']};break;
        default:throw new Error('Unknown JM tool');
      }
      return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(out)}],structuredContent:out,isError:false}};
    }catch(e){return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:String(e.message)}],isError:true}};}
  }
  return {jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}};
}
const rl=createInterface({input:process.stdin,crlfDelay:Infinity,terminal:false});
rl.on('line',line=>{if(!line.trim())return;let response;try{response=handle(parseStrictJSON(line,300000));}catch(e){response={jsonrpc:'2.0',id:null,error:{code:e.code||-32700,message:e.message||'Invalid JSON'}};}if(response!==null)process.stdout.write(JSON.stringify(response)+'\n');});
