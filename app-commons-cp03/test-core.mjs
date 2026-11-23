import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {inspect,compare,sha256,checked,createCapsule,validateCapsule} from './core.mjs';
const cases=['','abc','Hello 🌍','Line one\nLine two','é தமிழ் 你好','x'.repeat(9999),'\uD83D\uDE03'];
let count=0;
for(const s of cases){assert.equal(sha256(s),crypto.createHash('sha256').update(s,'utf8').digest('hex'));count++;}
assert.throws(()=>checked('x'.repeat(10001)),/HOLD/);count++;
assert.throws(()=>checked('a\u0000b'),/HOLD/);count++;
const text='# My app\n## Heading\n- [ ] Build route\nTODO: Validate output\nhttps://site.example/test';
const a=inspect(text);
assert.equal(a.headings,2);assert.equal(a.tasks,2);assert.equal(a.httpsLinks,1);count+=3;
const d=compare('alpha\nbeta\nlast','alpha\nnew\nlast');assert.equal(d.added,1);assert.equal(d.removed,1);assert.equal(d.unchanged,2);count+=3;
assert.throws(()=>compare('x\n'.repeat(161),'short'),/HOLD/);count++;
const project={name:'Original',source:text,snapshots:[{text,hash:sha256(text),created:'2026-10-26T13:00:00Z',label:'v0'}]};
const capsule=createCapsule(project), verified=validateCapsule(capsule);
assert.equal(verified.name,'Original');count++;
const changed=structuredClone(capsule);changed.payload.source+='x';assert.throws(()=>validateCapsule(changed),/HOLD/);count++;
const changed2=structuredClone(capsule);changed2.payload.snapshots[0].hash='0'.repeat(64);changed2.checksum=sha256(JSON.stringify(changed2.payload));assert.throws(()=>validateCapsule(changed2),/HOLD/);count++;
 const badMeta={...project,snapshots:[{...project.snapshots[0],created:'x'.repeat(65)}]};
 assert.throws(()=>createCapsule(badMeta),/HOLD/);count++;
 assert.throws(()=>createCapsule({name:'A',source:'abc',snapshots:Array.from({length:13},()=>project.snapshots[0])}),/HOLD/);count++;
function stdio(){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['mcp-stdio.mjs'],{cwd:import.meta.dirname});let data='';child.stdout.on('data',b=>data+=b.toString());child.on('error',reject);child.on('exit',()=>{
 try{const lines=data.trim().split('\n').map(JSON.parse);
 assert.equal(lines.length,7);assert.equal(lines[0].result.serverInfo.name,'JM App Commons — Original Workroom');
 assert.equal(lines[1].result.tools.length,6);assert.equal(JSON.parse(lines[2].result.content[0].text).hash,sha256('abc'));
 assert.equal(JSON.parse(lines[3].result.content[0].text).added,1);
 assert.equal(JSON.parse(lines[4].result.content[0].text).verified,true);
 assert.equal(JSON.parse(lines[5].result.content[0].text).payload.name,'Original');
 assert.equal(JSON.parse(lines[6].result.content[0].text).added,0);
 resolve(7);
 }catch(e){reject(e);}});
 const reqs=[
 {jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'JM-test',version:'1'}}},
 {jsonrpc:'2.0',id:2,method:'tools/list'},
 {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'jm_original_inspect',arguments:{source:'abc'}}},
 {jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'jm_original_compare',arguments:{before:'a',after:'b'}}},
 {jsonrpc:'2.0',id:5,method:'tools/call',params:{name:'jm_capsule_verify',arguments:{capsule}}},
 {jsonrpc:'2.0',id:6,method:'tools/call',params:{name:'jm_capsule_create',arguments:project}},
 {jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'jm_capsule_compare',arguments:{capsule}}}
 ]; child.stdin.end(reqs.map(x=>JSON.stringify(x)).join('\n')+'\n');
 });}
count+=await stdio();console.log(JSON.stringify({status:'PASS',coreAndProtocolAssertions:count}));
