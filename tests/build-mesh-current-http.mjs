import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
const dir=path.resolve('services/jm-ecostate-build-mesh-mcp-v0_5');
const python=process.env.JM_PYTHON||'python3';
const child=spawn(python,[path.join(dir,'server.py')],{env:{...process.env,HOST:'127.0.0.1',PORT:'18989'},stdio:'ignore'});
const base='http://127.0.0.1:18989';
async function rpc(method,params){const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(25000)});assert.equal(r.status,200);const j=await r.json();assert.ok(!j.error);return j.result}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const listed=await rpc('tools/list',{});assert.ok(listed.tools.some(t=>t.name==='plan_relationship_operation'));
 const queries={search_builds:{query:'JM LLM Core',limit:2},recover_build:{name:'JM ECOSTATE Build Mesh'},resolve_current_head:{name:'JM LLM Core'},proof_state:{name:'JM LLM Core'},trace_lineage:{name:'JM Target Bridge',limit:2},continue_build_plan:{name:'JM LLM Core',objective:'recover current proof'},build_mesh_status:{probe_navigator:false},batch_recover_builds:{names:['JM ECOSTATE Build Mesh','JM LLM Core']},find_capability_donors:{objective:'persist trace and recover',limit:2},compare_builds:{builds:['JM LLM Core','JM Target Bridge']},build_capability_mesh:{builds:['JM LLM Core','JM Target Bridge']},detect_propagation_gaps:{target:'JM LLM Core',objective:'recovery',limit:2},plan_capability_inheritance:{target:'JM LLM Core',objective:'preserve recovery'},build_sync_contract:{name:'JM ECOSTATE Build Mesh'},estate_keeper_contract:{changed_count:0},plan_artifact_route:{target:'JM Target Bridge',artifact_type:'app'},prepare_operation_gate:{target:'JM LLM Core',objective:'read current proof'}};
 const passed=[];
 for(const [name,args] of Object.entries(queries)){
  const r=await rpc('tools/call',{name,arguments:args});assert.ok(!r.isError,name+': '+JSON.stringify(r));
  const data=r.structuredContent||JSON.parse(r.content[0].text);
  if(name==='build_mesh_status'){
   assert.equal(data.current_registry_sha256,'7debfd83bb13ccebc94acf96978e567ceaf8772272cb1ccbcd0c6931850a5d31');
   assert.equal(data.current_project_records,22);assert.equal(data.capability_profiles,34);
  }
  passed.push(name);
 }
 for(const operation of ['SEPARATE','MESH','MERGE','TRANSFORM','BREAKAWAY']){
  const r=await rpc('tools/call',{name:'plan_relationship_operation',arguments:{operation,objective:'preserve source identity',bodies:['JM LLM Core','JM Target Bridge']}});
  assert.ok(!r.isError);const d=r.structuredContent||JSON.parse(r.content[0].text);assert.equal(d.mutation_performed,false);assert.equal(d.recipient_proof_transferred,false);passed.push(operation+'-plan-only');
 }
 const proof={at:new Date().toISOString(),state:'PASS',version:'0.8.6-candidate',registry:'0.24',registrySha256:'7debfd83bb13ccebc94acf96978e567ceaf8772272cb1ccbcd0c6931850a5d31',passed,boundary:'Actual local HTTP MCP with exact hosted registry and profiles. Hosted service remains v0.8.5; no production promotion or universal execution claim.'};
 const output=process.env.JM_PROOF_DIR||path.resolve('../../outputs');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'build-mesh-candidate-http-proof.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}finally{child.kill()}
