// CP06: EXECUTE ORIGINAL JM DONOR SOURCE. No reinterpretation/reimplementation.
// Original modules: JM Sovereign Batch Three, untouched and pinned in vendor/.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const digest = data=>createHash('sha256').update(data).digest('hex');
const original = file => digest(readFileSync(new URL('./vendor/jm-sovereign-batch-three/'+file,import.meta.url)));
const allowed={'field-primitives-native.mjs':'ed63ceeb77ba88395eda7aa9f753eddf75e7bf34de5107321dc94e8b068f21c2','native-corpus.mjs':'287f92439d34b71f2e1487ee2b96af069c7542b32397b99a0065463bc0f8fc07','native-core.mjs':'b794c4612a7ef69751270b7ea223894526216233414ef70c3845229d043d44a4'};
for(const [f,h] of Object.entries(allowed))if(original(f)!==h)throw Error('VERBATIM_SOURCE_TAMPER:'+f);
// Dynamically import only AFTER verifying the original source files (fail-closed).
const { ContactBand, GlyphBody }=await import('./vendor/jm-sovereign-batch-three/field-primitives-native.mjs');
const { CONTACT_BAND_SOURCE, GLYPH_BODY_SOURCE }=await import('./vendor/jm-sovereign-batch-three/native-corpus.mjs');
const args=JSON.parse(readFileSync(0,'utf8')||'{}');
const mode=args.mode;
if(!['BOTH','FORWARD','INVERSE'].includes(mode))throw Error('INVALID_DIRECTION');
const receipts=[];
function forward(pressure){
 if(typeof pressure!=='number'||!Number.isInteger(pressure)||pressure<0||pressure>10)throw Error('INVALID_PRESSURE');
 const a=ContactBand.execute(CONTACT_BAND_SOURCE,pressure);
 const mapping={inspect:'?',open:'!'};
 if(!Object.hasOwn(mapping,a.state.nextRoute))return {direction:'FORWARD',stage:'HOLD',reason:'NO_SAFE_GLYPH_ADAPTER',contactBand:a.state};
 const token=mapping[a.state.nextRoute];
 const b=GlyphBody.execute(GLYPH_BODY_SOURCE,token);
 return {direction:'FORWARD',stage:'EXECUTED_NATIVE',contactBand:a.state,typedEnvelope:{schema:'jm.unique-bodies.native-typed/0.6',type:'jm.glyph.symbol.v1',value:token},glyphBody:b.state,consequence:b.state.nextRoute,donorReceipts:{ContactBand:a.receipt,GlyphBody:b.receipt}};
}
function inverse(glyph){
 if(typeof glyph!=='string'||glyph.length!==1)throw Error('INVALID_GLYPH');
 const a=GlyphBody.execute(GLYPH_BODY_SOURCE,glyph);
 const mapping={'?':2,'!':5};
 if(!Object.hasOwn(mapping,glyph))return {direction:'INVERSE',stage:'HOLD',reason:'NO_SAFE_PRESSURE_ADAPTER',glyphBody:a.state};
 const p=mapping[glyph];
 const b=ContactBand.execute(CONTACT_BAND_SOURCE,p);
 return {direction:'INVERSE',stage:'EXECUTED_NATIVE',glyphBody:a.state,typedEnvelope:{schema:'jm.unique-bodies.native-typed/0.6',type:'jm.contact.pressure.v1',value:p},contactBand:b.state,consequence:b.state.nextRoute,donorReceipts:{GlyphBody:a.receipt,ContactBand:b.receipt}};
}
if(mode==='BOTH'||mode==='FORWARD')receipts.push(forward(args.pressure??5));
if(mode==='BOTH'||mode==='INVERSE')receipts.push(inverse(args.glyph??'?'));
const result={schema:'JM.UniqueBodies.NativeDonor/0.6',stage:receipts.every(r=>r.stage==='EXECUTED_NATIVE')?'EXECUTED_NATIVE':'PARTIAL_HOLD',source:'JM Sovereign Batch Three — independently preserved modules',sourceSha256:allowed,donors:['ContactBand','GlyphBody'],executions:receipts,registrationCountDelta:0,proofScope:'Actual original JM Node donor execution, typed in-process adapter; Atlas delivery must be separately confirmed'};
result.receiptSha256=digest(JSON.stringify(result));
process.stdout.write(JSON.stringify(result)+'\n');
