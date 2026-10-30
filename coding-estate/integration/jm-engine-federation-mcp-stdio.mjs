#!/usr/bin/env node
// Optional local MCP stdio contact for the EXISTING JM Build Mesh; no web host,
// provider secrets, private Library ingestion, duplicate engine or public door.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import readline from 'node:readline';
import {JM_ENGINE_MCP_TOOLS,callJMEngineMcpTool} from './jm-engine-federation.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const master=read('coding-estate/integration/REGISTRY.json');
const registry={...master,bodies:master.parts.flatMap(p=>read('coding-estate/integration/'+p).bodies)};
const current64=read('coding-estate/JM_CODING_ESTATE_CURRENT_64.json');
const send=message=>process.stdout.write(JSON.stringify(message)+'\n');
const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
let queue=Promise.resolve();
async function answer(request){
 if(!request||request.jsonrpc!=='2.0'||typeof request.method!=='string')return;
 const id=request.id;
 if(id===undefined)return;
 let result;
 try {
  switch(request.method){
   case 'initialize':
    result={protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},
      serverInfo:{name:'JM ECOSTATE Build Mesh / native game-engine host adapter',version:'0.1.0'}};break;
   case 'ping':result={};break;
   case 'tools/list':result={tools:JM_ENGINE_MCP_TOOLS};break;
   case 'tools/call':{
    const name=request.params?.name;
    const args=request.params?.arguments??{};
    const routed=name==='jm_engine_plan'?{...args,current64}:args;
    const response=await callJMEngineMcpTool(name,routed,registry);
    result={content:[{type:'text',text:JSON.stringify(response)}],isError:false};break;
   }
   default:send({jsonrpc:'2.0',id,error:{code:-32601,message:'JM_ENGINE_METHOD_NOT_FOUND'}});return;
  }
  send({jsonrpc:'2.0',id,result});
 }catch(error){
  if(request.method==='tools/call'){
   send({jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:String(error?.message??'JM_ENGINE_HOLD').slice(0,220)}]}});
  }else send({jsonrpc:'2.0',id,error:{code:-32603,message:'JM_ENGINE_INTERNAL_HOLD'}});
 }
}
input.on('line',line=>{
 if(!line.trim())return;
 queue=queue.then(async()=>{
  try{await answer(JSON.parse(line))}
  catch(e){send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'JSON_PARSE_HOLD'}})}
 });
});
