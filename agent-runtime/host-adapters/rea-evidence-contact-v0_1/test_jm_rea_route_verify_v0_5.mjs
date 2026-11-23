import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {verifyRouteConsequences,invalidBytecodeProof,loopProtection} from './jm_rea_route_verify_v0_5.mjs';
import {independentRouteRun} from './jm_rea_route_consequence_v0_5.mjs';
import {RouteScript,RouteVM,RouteOS} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';

test('actual native JM route script + bytecode + OS state consequences match independent interpreter',()=>{
 const r=verifyRouteConsequences();
 assert.equal(r.cases,120);
 assert.equal(r.failed,0);
 assert.equal(r.passed,120);
 assert.equal(r.trace_events,120);
 assert.equal(r.scenario_families.length,7);
 assert.ok(r.state_digest_examples.length>0);
 assert.equal(r.gate.executed,true);
 assert.equal(r.gate.promotable,false);
 assert.equal(r.claims.full_jm32_1da_2_2_1_compiler,false);
 assert.equal(r.claims.owner_device,false);
});
test('deliberately damaged independent state reconstruction exposes divergence',()=>{
 const r=verifyRouteConsequences({replica:(...args)=>{
  const out=independentRouteRun(...args);
  out.state.drift='intentionally-broken';
  return out;
 }});
 assert.equal(r.passed,0);
 assert.equal(r.failed,120);
 assert.equal(r.mismatches.length,16);
 assert.equal(r.gate.promotable,false);
});
test('actual native RouteVM checksum rejects forged bytecode',()=>{
 const r=invalidBytecodeProof();
 assert.deepEqual(r,{rejected:true,code:'RVM_BAD_CHECKSUM'});
});
test('native and independent runners both bound infinite routes',()=>{
 const r=loopProtection();
 assert.equal(r.both_protected,true);
 assert.equal(r.original,'RS_ROUTE_LOOP');
});
test('native RouteScript rejects unknown route targets before state execution',()=>{
 const src=['route Unknown {','start:','  goto nonexistant','}'].join('\n');
 assert.throws(()=>RouteScript.parse(src),e=>e.code==='RS_UNKNOWN_TARGET');
});
test('native RouteOS refuses to mount a route under incorrect service name',()=>{
 const src=['route Original {','start:','  end','}'].join('\n');
 const graph=RouteScript.lower(RouteScript.parse(src)).graphs[0],bytecode=RouteVM.compile(graph);
 const os=new RouteOS();
 assert.throws(()=>os.registerRoute('Renamed',bytecode,graph),e=>e.code==='ROS_ROUTE_IDENTITY');
});

test('offline v0.5 CLI runs exact JM sources, creates receipt and refuses overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-rea-v05-'));
 try{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const script=path.join(here,'jm_rea_route_verify_cli_v0_5.mjs');
  const native=path.resolve(here,'../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs');
  const expected=crypto.createHash('sha256').update(fs.readFileSync(native)).digest('hex');
  const output=path.join(dir,'one-native-receipt.json');
  const args=[script,'--output',output,'--expect-route-sha256',expected];
  const first=spawnSync(process.execPath,args,{encoding:'utf8',timeout:45000});
  assert.equal(first.status,0,first.stderr);
  const report=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(report.compared.cases,120);
  assert.equal(report.compared.passed,120);
  assert.equal(report.status,'SCOPED_ROUTE_EXECUTION_PASS');
  assert.equal(report.source_digests['coding-estate/sovereign-ten/direct/route-proof-native.mjs'],expected);
  assert.equal(report.original_source_changed,false);
  const previous=fs.readFileSync(output,'utf8');
  const second=spawnSync(process.execPath,args,{encoding:'utf8',timeout:45000});
  assert.notEqual(second.status,0);
  assert.equal(fs.readFileSync(output,'utf8'),previous);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('offline v0.5 CLI requires exact expected original source hash',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-rea-v05-'));
 try{
  const script=path.join(path.dirname(fileURLToPath(import.meta.url)),'jm_rea_route_verify_cli_v0_5.mjs');
  const output=path.join(dir,'rejected.json');
  const run=spawnSync(process.execPath,[script,'--output',output,'--expect-route-sha256','0'.repeat(64)],
    {encoding:'utf8',timeout:45000});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/ORIGINAL_SOURCE_HASH_HOLD/);
  assert.equal(fs.existsSync(output),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
