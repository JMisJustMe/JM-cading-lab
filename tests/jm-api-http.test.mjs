import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const PORT=18788;
const origin='http://127.0.0.1:'+PORT;
const child=spawn(process.execPath,['jm-api/server.mjs'],{cwd:path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),env:{...process.env,JM_API_PORT:String(PORT)},stdio:'pipe'});
const checks=[];
try {
  let ready=false;
  for(let n=0;n<60;n++){
    try { const r=await fetch(origin+'/api/jm/v1/health');if(r.ok){ready=true;break;} } catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert(ready,'Local API server did not start');checks.push('local-server-start');
  const status=await (await fetch(origin+'/api/jm/v1/health')).json();
  assert.equal(status.state,'HANDLER_RESPONDING');checks.push('local-http-health');
  const openapi=await (await fetch(origin+'/api/jm/v1/openapi.json')).json();
  assert.equal(openapi.servers[0].url,origin);checks.push('local-http-openapi');
  const plan=await fetch(origin+'/api/jm/v1/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'compose',subject:'JM game'})});
  assert.equal(plan.status,200);
  assert.equal((await plan.json()).contact.id,'workshop');checks.push('local-http-plan');
  const deny=await fetch(origin+'/api/jm/v1/admin',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(deny.status,403);checks.push('local-http-mutation-deny');
  console.log('JM API HTTP: '+checks.length+'/'+checks.length+' PASS '+checks.join(','));
} finally { child.kill('SIGTERM'); }
