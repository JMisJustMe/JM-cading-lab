'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../../games-beyond/app.js'),'utf8');
const start=source.indexOf('async function connectPhoneOriginal(){');
const end=source.indexOf('async function importOriginalHtml(file){',start);
assert(start>=0&&end>start,'Existing House contains explicit owner-gesture contact');
const method=source.slice(start,end);
const SHA='3b5b791c15ea82e6e240b55d690b6e034bbc6f61ce0143c6a9fb0156326ce242';
const ID='combound-original-v3-7-11-cp17';
const original=Buffer.alloc(1277449,65); // synthetic non-owner bytes only
class TestFile{
 constructor(chunks,name){this.bytes=Buffer.concat(chunks.map(b=>Buffer.from(b)));this.name=name;this.size=this.bytes.length}
 async text(){return this.bytes.toString('utf8')}
}
async function probe({status=200,raw=original,sourceHash=SHA}={}){
 const events=[],mounted=new Map();
 const deps={
  Request:class{constructor(url,options){this.url=url;this.options=options;events.push({type:'request',url,options})}},
  fetch:async request=>{events.push({type:'fetch',url:request.url});return{ok:status===200,status,arrayBuffer:async()=>Uint8Array.from(raw).buffer}},
  hash:async()=>sourceHash,
  File:TestFile,
  importOriginalHtml:async file=>{events.push({type:'import',size:file.size});mounted.set(ID,{id:ID,name:'COMBOUND CP17',html:await file.text()})},
  findBody:id=>mounted.get(id),
  receipt:async()=>events.push({type:'receipt'}),
  toast:message=>events.push({type:'toast',message})
 };
 const fn=new Function(...Object.keys(deps),method+';return connectPhoneOriginal;')(...Object.values(deps));
 await fn();
 return events;
}
test('owner gesture opens pinned loopback source with CORS and no-cache',async()=>{
 const events=await probe();
 const request=events.find(x=>x.type==='request');
 assert.equal(request.url,'http://127.0.0.1:8877/combound-cp17.html');
 assert.equal(request.options.targetAddressSpace,'loopback');
 assert.equal(request.options.mode,'cors');
 assert.equal(request.options.cache,'no-store');
 assert.equal(events.filter(x=>x.type==='import').length,1);
 assert.equal(events.filter(x=>x.type==='receipt').length,1);
});
test('wrong byte count fails closed without import',async()=>{
 const events=await probe({raw:original.subarray(0,original.length-1)});
 assert.equal(events.some(x=>x.type==='import'),false);
 assert.equal(events.some(x=>x.type==='toast'&&x.message.includes('HOLD')),true);
});
test('same-length wrong SHA fails closed without import',async()=>{
 const events=await probe({sourceHash:'0'.repeat(64)});
 assert.equal(events.some(x=>x.type==='import'),false);
 assert.equal(events.some(x=>x.type==='receipt'),false);
});
test('loopback HTTP or browser-denied failure preserves fallback',async()=>{
 const events=await probe({status:403});
 assert.equal(events.some(x=>x.type==='import'),false);
 assert.equal(events.some(x=>x.type==='toast'&&x.message.includes('Import Original HTML (Local)')),true);
});

const polishStart=source.indexOf('async function connectPhonePolish(){');
const polishEnd=source.indexOf('async function importOriginalHtml(file){',polishStart);
assert(polishStart>=0&&polishEnd>polishStart,'Optional CP21 source contact is present');
const polishMethod=source.slice(polishStart,polishEnd);
const CP21_SHA='7f576fba7109aa5b24a7031e8e88ad578356e25f524f8bf605bc3a79c6e648e8';
const CP21_ID='owner-jm-combound-original-v3-7-11-cp21-fold8-hud-7f576fba7109';
const polished=Buffer.alloc(1281903,65); // synthetic, never real owner source
async function probePolish({status=200,raw=polished,sourceHash=CP21_SHA}={}){
 const events=[],mounted=new Map();
 const deps={
  Request:class{constructor(url,options){this.url=url;this.options=options;events.push({type:'request',url,options})}},
  fetch:async request=>{events.push({type:'fetch',url:request.url});return{ok:status===200,status,arrayBuffer:async()=>Uint8Array.from(raw).buffer}},
  hash:async()=>sourceHash,
  File:TestFile,
  importOriginalHtml:async file=>{events.push({type:'import',size:file.size});mounted.set(CP21_ID,{id:CP21_ID,name:'COMBOUND CP21',html:await file.text()})},
  findBody:id=>mounted.get(id),
  receipt:async()=>events.push({type:'receipt'}),
  toast:message=>events.push({type:'toast',message})
 };
 const fn=new Function(...Object.keys(deps),polishMethod+';return connectPhonePolish;')(...Object.values(deps));
 await fn();
 return events;
}
test('CP21 candidate connects only after explicit button gesture and verifies exact owner source',async()=>{
 const events=await probePolish();
 const request=events.find(x=>x.type==='request');
 assert.equal(request.url,'http://127.0.0.1:8877/combound-cp21.html');
 assert.equal(request.options.targetAddressSpace,'loopback');
 assert.equal(request.options.mode,'cors');
 assert.equal(events.filter(x=>x.type==='import').length,1);
 assert.equal(events.filter(x=>x.type==='receipt').length,1);
});
test('CP21 bad byte length refuses import',async()=>{
 const events=await probePolish({raw:polished.subarray(0,polished.length-1)});
 assert.equal(events.some(x=>x.type==='import'),false);
});
test('CP21 bad hash refuses import',async()=>{
 const events=await probePolish({sourceHash:'0'.repeat(64)});
 assert.equal(events.some(x=>x.type==='import'),false);
 assert.equal(events.some(x=>x.type==='receipt'),false);
});
test('CP21 denied source preserves original CP17 fallback',async()=>{
 const events=await probePolish({status:403});
 assert.equal(events.some(x=>x.type==='import'),false);
 assert.equal(events.some(x=>x.type==='toast'&&x.message.includes('CP17 remains available')),true);
});
