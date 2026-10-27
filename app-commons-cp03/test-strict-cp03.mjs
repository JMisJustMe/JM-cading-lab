import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createCapsule,stableJSON,parseStrictJSON,receiveCapsuleJSON} from './core.mjs';
let passed=0;function ok(label,fn){fn();passed++;console.log('PASS',passed,label)};
const sample=stableJSON(createCapsule({name:'JM real 🌎',source:'# Source\n- [ ] Task\n',snapshots:[]}));
ok('strict parse valid canonical',()=>assert.equal(receiveCapsuleJSON(sample).name,'JM real 🌎'));
ok('strict parse whitespace valid',()=>assert.equal(receiveCapsuleJSON(' \n '+sample+'\r').name,'JM real 🌎'));
const bad=[
 ['duplicate envelope checksum',sample.replace('"checksum":','"checksum":"bad","checksum":')],
 ['duplicate payload project name',sample.replace('"name":"JM real 🌎"','"name":"Fake","name":"JM real 🌎"')],
 ['duplicate nested after escape normalization',sample.replace('"name":"JM real 🌎"','"name":"Fake","na\\u006de":"JM real 🌎"')],
 ['fraction revision',sample.replace('"revision":1','"revision":1.0')],
 ['exponent revision',sample.replace('"revision":1','"revision":1e0')],
 ['integer overflow',sample.replace('"revision":1','"revision":2147483648')],
 ['trailing token',sample+'[]'],
 ['invalid escape',sample.replace('JM real 🌎','JM real \\q')],
 ['max incoming size',sample+' '.repeat(201000)],
 ['trailing comma',sample.replace(/}}$/,',}}')],
 ['malformed nesting',sample.slice(0,-1)],
 ['leading zero integer',sample.replace('"revision":1','"revision":01')],
 ];
for(const [label,raw] of bad)ok(label,()=>assert.throws(()=>receiveCapsuleJSON(raw),/HOLD|SyntaxError/));
ok('stdio real initialize/inspect/verify',()=>{
 const calls=[{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}},{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'jm_capsule_verify',arguments:{capsule:parseStrictJSON(sample)}}}];
 const p=spawnSync('node',['mcp-stdio.mjs'],{input:calls.map(x=>JSON.stringify(x)).join('\n')+'\n',encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);const replies=p.stdout.trim().split('\n').map(JSON.parse);
 assert.equal(replies.length,2);assert.equal(replies[0].result.serverInfo.version,'0.3.0');assert.equal(replies[1].result.structuredContent.verified,true);
});
ok('stdio rejects duplicate protocol keys',()=>{
 const raw='{"jsonrpc":"2.0","id":7,"method":"ping","method":"tools/list"}\n';
 const p=spawnSync('node',['mcp-stdio.mjs'],{input:raw,encoding:'utf8'});
 assert.equal(JSON.parse(p.stdout.trim()).error.code,-32700);
});
console.log(JSON.stringify({status:'PASS',checks:passed}));
