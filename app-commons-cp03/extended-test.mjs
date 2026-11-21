import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {sha256,checked,inspect,compare,createCapsule,validateCapsule,stableJSON} from './core.mjs';
const dir='extended-fixtures';mkdirSync(dir,{recursive:true});
let hashChecks=0,validCapsules=0,negative=0;
let rng=0x26a11;
function rand(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return rng>>>0;}
const alphabet=['A','z','0','α','β','猫','🌍','🤗','é','\n','\t',' ','中','𐐷','-','∅','⬆️'];
for(let i=0;i<256;i++){
 const text=Array.from({length:rand()%320},()=>alphabet[rand()%alphabet.length]).join('');
 assert.equal(sha256(text),crypto.createHash('sha256').update(text,'utf8').digest('hex'),`digest seed ${i}`);hashChecks++;
 if(i<64){
  const source='# JM '+i+' 🌍\n'+text+'\n- [ ] stage '+i;
  const snapshot='# JM '+i+' 🌍\n'+text;
  const cap=createCapsule({name:'JM '+i+' 🌍',source,snapshots:[{text:snapshot,hash:sha256(snapshot),created:'2026-10-26T20:27:00Z',label:'snap '+i}]});
  assert.equal(validateCapsule(cap).source,source);
  writeFileSync(`${dir}/js-${String(i).padStart(2,'0')}.json`,stableJSON(cap));validCapsules++;
 }
}
for(const s of ['\uD800','\uDC00','a\uDBFF','a\uDC00b']){assert.throws(()=>checked(s),/HOLD/);negative++;}
for(const fake of [null,{}, {payload:{}}, {payload:{},checksum:'0'.repeat(64)}]){assert.throws(()=>validateCapsule(fake),/HOLD/);negative++;}
const c=createCapsule({name:'A',source:'text'});
for(const method of [
 cp=>cp.payload.revision=2,
 cp=>cp.payload.authority='AUTO_WRITE',
 cp=>cp.payload.origin='FAKE',
 cp=>cp.payload.source='tamper',
 cp=>cp.payload.unknown='field',
 cp=>cp.checksum='0'.repeat(64),
 cp=>cp.payload.snapshots='invalid',
]){let cc=structuredClone(c);method(cc);assert.throws(()=>validateCapsule(cc),/HOLD/);negative++;}
assert.throws(()=>createCapsule({name:'🤗',source:'a',snapshots:Array.from({length:13},(_,i)=>({text:'a',hash:sha256('a'),created:'0',label:''}))}),/HOLD/);negative++;
console.log(JSON.stringify({hashChecks,jsToJavaCapsules:validCapsules,negativeChecks:negative,allPassed:true}));
