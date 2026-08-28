import assert from 'node:assert/strict';
import { CommandGlyphs, ContactCode, EMBODIED_CONTACT_BRIDGES, MudraCode, PatternTapping } from './embodied-contact-four.mjs';
import { FlowTalkBodyRoute, NoncodingCode, SPEECH_MEANING_BRIDGES, SpeakGate, SpeechCode } from './speech-meaning-four.mjs';
import { EMBODIED_EIGHT_BOUNDARY, EMBODIED_EIGHT_SOURCES, runEmbodiedEight } from './embodied-eight-route.mjs';

const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: { name: error.name, code: error.code, message: error.message } }); }
}

check('all eight bodies declare current-native bridge boundary', () => {
  for (const bridge of [...Object.values(EMBODIED_CONTACT_BRIDGES), ...Object.values(SPEECH_MEANING_BRIDGES)]) {
    assert.equal(bridge.status, 'AUTHORISED_FORWARD_NATIVE_BRIDGE');
    assert.equal(bridge.historicalRecoveryClaim, false);
  }
  assert.equal(EMBODIED_EIGHT_BOUNDARY.historicalRecoveryClaim, false);
});
check('Pattern-Tapping matches temporal body contact', () => {
  const result = PatternTapping.execute(EMBODIED_EIGHT_SOURCES.pattern, 'wake', [500,620,740]);
  assert.equal(result.runtime.matched, true);
  assert.equal(result.runtime.signal, 'wake');
});
check('Pattern-Tapping rejects wrong event count', () => {
  assert.throws(() => PatternTapping.execute(EMBODIED_EIGHT_SOURCES.pattern, 'wake', [0,120]), error => error.code === 'PT_EVENT_COUNT');
});
check('Mudra Code matches ordered hand-form transitions', () => {
  const result = MudraCode.execute(EMBODIED_EIGHT_SOURCES.mudra, 'choose', ['open','pinch','open']);
  assert.equal(result.runtime.signal, 'select');
  assert.equal(result.runtime.matched, true);
});
check('Mudra Code preserves mismatch without false signal', () => {
  const result = MudraCode.execute(EMBODIED_EIGHT_SOURCES.mudra, 'choose', ['open','open','pinch']);
  assert.equal(result.runtime.matched, false);
  assert.equal(result.runtime.signal, null);
});
check('ContactCode turns bounded physical contact into code signal', () => {
  const result = ContactCode.execute(EMBODIED_EIGHT_SOURCES.contact, { name: 'confirm', kind: 'physical', pressure: 4 });
  assert.equal(result.runtime.matched, true);
  assert.equal(result.runtime.signal, 'confirm');
});
check('ContactCode does not promote out-of-band pressure', () => {
  const result = ContactCode.execute(EMBODIED_EIGHT_SOURCES.contact, { name: 'confirm', kind: 'physical', pressure: 9 });
  assert.equal(result.runtime.matched, false);
});
check('Command Glyphs binds glyph plus pressure to route action', () => {
  const result = CommandGlyphs.execute(EMBODIED_EIGHT_SOURCES.glyph, '→', 2);
  assert.equal(result.runtime.command, 'LISTEN');
  assert.equal(result.runtime.route, 'speech.listen');
});
check('Speech-Code resolves exact utterance through intent permission and route', () => {
  const result = SpeechCode.execute(EMBODIED_EIGHT_SOURCES.speech, '  OPEN   GATE ');
  assert.equal(result.runtime.intent, 'open');
  assert.equal(result.runtime.permission, 'allow');
  assert.equal(result.runtime.route, 'gate.open');
});
check('SpeakGate requires both known identity and executable permission', () => {
  const speech = SpeechCode.execute(EMBODIED_EIGHT_SOURCES.speech, 'open gate');
  assert.equal(SpeakGate.execute(EMBODIED_EIGHT_SOURCES.gate, speech.runtime, 'owner').runtime.permitted, true);
  assert.equal(SpeakGate.execute(EMBODIED_EIGHT_SOURCES.gate, speech.runtime, 'stranger').runtime.permitted, false);
});
check('FlowTalk Body Route preserves source wording and body meaning', () => {
  const result = FlowTalkBodyRoute.execute(EMBODIED_EIGHT_SOURCES.flow, 'open gate', 'open');
  assert.equal(result.runtime.sourceWording, 'open gate');
  assert.equal(result.runtime.bodyMeaning, 'open');
  assert.equal(result.runtime.route, 'gate.open');
  assert.equal(result.runtime.output, 'Opening gate');
});
check('Noncoding-Code carries meaning through signal action and trace', () => {
  const result = NoncodingCode.execute(EMBODIED_EIGHT_SOURCES.noncoding, 'gate.open');
  assert.equal(result.runtime.signal, 'green');
  assert.deepEqual(result.runtime.action, { type: 'route', route: 'accepted.route' });
  assert.ok(result.runtime.proof);
});
check('eight-body mesh reaches final route only through all embodied gates', () => {
  const result = runEmbodiedEight();
  assert.deepEqual(result.outcome, {
    prerequisites: true,
    patternSignal: 'wake',
    mudraSignal: 'select',
    contactSignal: 'confirm',
    glyphRoute: 'speech.listen',
    speechIntent: 'open',
    permitted: true,
    bodyRoute: 'gate.open',
    finalSignal: 'green',
    finalRoute: 'accepted.route'
  });
});
check('identity failure blocks downstream speech execution', () => {
  const result = runEmbodiedEight({ identity: 'stranger' });
  assert.equal(result.outcome.permitted, false);
  assert.equal(result.outcome.bodyRoute, null);
  assert.equal(result.outcome.finalRoute, null);
});
check('all eight AST IR runtime identities remain distinct', () => {
  const result = runEmbodiedEight();
  assert.deepEqual(result.identities, [
    ['Pattern-Tapping','PatternTappingProgram','TapTemporalIR','PatternTappingRuntimeResult'],
    ['Mudra Code','MudraCodeProgram','MudraSequenceIR','MudraCodeRuntimeResult'],
    ['ContactCode','ContactCodeProgram','ContactEventIR','ContactCodeRuntimeResult'],
    ['Command Glyphs','CommandGlyphProgram','CommandGlyphIR','CommandGlyphRuntimeResult'],
    ['Speech-Code','SpeechCodeProgram','SpeechIntentIR','SpeechCodeRuntimeResult'],
    ['SpeakGate','SpeakGateProgram','SpeakGateIR','SpeakGateRuntimeResult'],
    ['FlowTalk Body Route','FlowTalkBodyRouteProgram','FlowTalkBodyRouteIR','FlowTalkBodyRouteRuntimeResult'],
    ['Noncoding-Code','NoncodingCodeProgram','NoncodingMeaningSignalIR','NoncodingCodeRuntimeResult']
  ]);
});
check('equal embodied input is deterministic at outcome level', () => {
  assert.deepEqual(runEmbodiedEight().outcome, runEmbodiedEight().outcome);
});

const passed = checks.filter(item => item.passed).length;
const failed = checks.length - passed;
console.log(JSON.stringify({ schema: 'jm.embodied-eight.selftest/1.0', bodies: EMBODIED_EIGHT_BOUNDARY.bodies, historicalRecoveryClaim: false, passed, failed, checks, status: failed ? 'EMBODIED_EIGHT_FAIL' : 'EMBODIED_EIGHT_PASS' }, null, 2));
if (failed) process.exit(1);
