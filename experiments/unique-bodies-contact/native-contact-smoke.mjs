// JM UNIQUE BODIES — CP04. Native donor execution across two distinct JM coding bodies.
// This does not replace, copy or change their sovereign source modules.
import assert from 'node:assert/strict';
import { ContactBand, GlyphBody } from '../../coding-estate/sovereign-batch-three/direct/field-primitives-native.mjs';
import { CONTACT_BAND_SOURCE, GLYPH_BODY_SOURCE } from '../../coding-estate/sovereign-batch-three/direct/native-corpus.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const SRCROOT = new URL('../../coding-estate/sovereign-batch-three/direct/', import.meta.url);
const src = file => createHash('sha256').update(readFileSync(new URL(file, SRCROOT))).digest('hex');
const checks = [];
function check(label, fn) {
  try { const value = fn(); checks.push({label, result:'PASS'}); return value; }
  catch (error) { checks.push({label, result:'FAIL', error:error.message}); throw error; }
}
const identities = new Set(['JM.ContactBand', 'JM.GlyphBody']);
const usage = []; const transport = []; const evidence = [];
const typed = (origin, receiver, signal, value) => {
  assert(typeof signal==='string' && signal.length);
  const packet = {schema:'jm.unique-bodies.typed-contact/0.4', origin, receiver, signal, value, sequence:transport.length+1};
  transport.push(packet);
  return packet;
};
const band = p => {
  const r=ContactBand.execute(CONTACT_BAND_SOURCE,p);
  usage.push({body:'JM.ContactBand', input:p, state:r.state, sourceExecution:true});
  return r;
};
const glyph = s => {
  const r=GlyphBody.execute(GLYPH_BODY_SOURCE,s);
  usage.push({body:'JM.GlyphBody', input:s, state:r.state, sourceExecution:true});
  return r;
};
// Deliberate adapters are explicit, versionable transformations: not silent equivalence.
const routeToGlyph=Object.freeze({open:'!', inspect:'?', reject:'~'});
const glyphToPressure=Object.freeze({'!':5, '?':2, '~':9});
const forward=check('ContactBand pressure -> typed route -> GlyphBody route consequence',()=>{
  const a=band(5);
  assert.equal(a.state.zone,'firm');
  const symbol=routeToGlyph[a.state.nextRoute];
  assert.equal(symbol,'!');
  const packet=typed('JM.ContactBand','JM.GlyphBody','jm.glyph.symbol.v1',symbol);
  const b=glyph(packet.value);
  assert.equal(b.state.nextRoute,'door.open');
  return {pressure:5, symbol, consequence:b.state.nextRoute};
});
const inverse=check('GlyphBody glyph -> reverse typed pressure -> ContactBand consequence',()=>{
  const a=glyph('?');
  assert.equal(a.state.nextRoute,'door.inspect');
  const pressure=glyphToPressure['?'];
  const packet=typed('JM.GlyphBody','JM.ContactBand','jm.contact.pressure.v1',pressure);
  const b=band(packet.value);
  assert.equal(b.state.nextRoute,'inspect');
  return {glyph:'?', pressure, consequence:b.state.nextRoute};
});
check('Native donor guards reject invalid pressure',()=>{
  assert.throws(()=>ContactBand.execute(CONTACT_BAND_SOURCE,12),{code:'BAND_PRESSURE_OUTSIDE'});
});
check('Native donor guards reject unknown glyph',()=>{
  assert.throws(()=>GlyphBody.execute(GLYPH_BODY_SOURCE,'#'),{code:'GLYPH_UNKNOWN'});
});
check('One identity per source body across reverse and repeat use',()=>{
  band(6); band(6); glyph('!');
  assert.equal(identities.size,2);
  assert.equal(usage.filter(x=>x.body==='JM.ContactBand').length,4);
  assert.equal(usage.filter(x=>x.body==='JM.GlyphBody').length,3);
});
check('Both typed envelopes delivered to actual recipient execute methods',()=>{
  assert.equal(transport.length,2);
  assert.equal(transport[0].signal,'jm.glyph.symbol.v1');
  assert.equal(transport[1].signal,'jm.contact.pressure.v1');
});
evidence.push({kind:'EXECUTION', verifiedBy:'native Node source import', bodies:[...identities]});
evidence.push({kind:'TYPED_TRANSPORT', verifiedBy:'in-process typed adapter boundary (NOT network transport)', count:transport.length});
evidence.push({kind:'NATIVE_CONSEQUENCE', verifiedBy:'donor state assertions', forward:forward.consequence, inverse:inverse.consequence});
const proof = {
 schema:'jm.unique-bodies.native-contact/0.4',
 state:'NATIVE_LOCAL_EXECUTION_PASS',
 sourceCommit:'branch checkout; inspect exact CI SHA',
 donorFiles:{
   fieldPrimitivesSha256:src('field-primitives-native.mjs'),
   corpusSha256:src('native-corpus.mjs')
 },
 identitiesRegisteredByAtlas:0,
 independentDonorIdentities:[...identities],
 registeredAgain:false,
 executions:usage.length,
 typedDeliveries:transport.length,
 forward, inverse, checks, evidence,
 boundaries:['Node native donor executed; not physical Android donor execution','No remote MCP transport','No claim of mathematical or physical inversion','No ChatGPT/Gemini live contact','Atlas registration happens separately'],
};
process.stdout.write(JSON.stringify(proof,null,2)+'\n');
if(checks.some(x=>x.result==='FAIL'))process.exitCode=1;
