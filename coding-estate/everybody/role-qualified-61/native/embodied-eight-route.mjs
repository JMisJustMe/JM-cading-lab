import { CommandGlyphs, ContactCode, MudraCode, PatternTapping } from './embodied-contact-four.mjs';
import { FlowTalkBodyRoute, NoncodingCode, SpeakGate, SpeechCode } from './speech-meaning-four.mjs';

export const EMBODIED_EIGHT_BOUNDARY = Object.freeze({
  schema: 'jm.embodied-eight-route/1.0',
  historicalRecoveryClaim: false,
  bodies: ['Pattern-Tapping','Mudra Code','ContactCode','Command Glyphs','Speech-Code','SpeakGate','FlowTalk Body Route','Noncoding-Code'],
  law: 'MESH != MERGE; embodied, glyph, speech and meaning code retain separate source grammars and runtime identities.'
});

export const EMBODIED_EIGHT_SOURCES = Object.freeze({
  pattern: `patterntapping Rhythm {\npattern wake = 0,120,240 tolerance 20 signal "wake"\n}`,
  mudra: `mudracode Hands {\nsequence choose = open > pinch > open signal "select"\n}`,
  contact: `contactcode Contact {\ncontact confirm kind physical pressure 2..5 signal "confirm"\ncontact bind kind logical signal "bind"\n}`,
  glyph: `commandglyphs Commands {\nglyph LISTEN = "→" pressure 1..4 route speech.listen\n}`,
  speech: `speechcode Voice {\nphrase "open gate" intent open\npermission open allow\nroute open gate.open\n}`,
  gate: `speakgate Guard {\nidentity owner\nambiguity exact\npermit open\ndeny wipe\n}`,
  flow: `flowbodyroute BodyRoute {\nintent open route gate.open output "Opening gate"\n}`,
  noncoding: `noncodingcode MeaningRoute {\nmeaning "gate.open" signal "green" route accepted.route\n}`
});

export function runEmbodiedEight(options = {}) {
  const source = { ...EMBODIED_EIGHT_SOURCES, ...(options.sources ?? {}) };
  const pattern = PatternTapping.execute(source.pattern, 'wake', options.tapTimes ?? [1000,1120,1240]);
  const mudra = MudraCode.execute(source.mudra, 'choose', options.poses ?? ['open','pinch','open']);
  const contact = ContactCode.execute(source.contact, options.contact ?? { name: 'confirm', kind: 'physical', pressure: 3 });
  const glyph = CommandGlyphs.execute(source.glyph, options.glyph ?? '→', options.glyphPressure ?? 2);

  const prerequisites = pattern.runtime.matched && mudra.runtime.matched && contact.runtime.matched && glyph.runtime.matched;
  const speech = SpeechCode.execute(source.speech, prerequisites ? (options.utterance ?? 'open gate') : '');
  const gate = SpeakGate.execute(source.gate, speech.runtime, options.identity ?? 'owner');
  const flow = FlowTalkBodyRoute.execute(source.flow, options.utterance ?? 'open gate', gate.runtime.permitted ? gate.runtime.intent : null);
  const noncoding = NoncodingCode.execute(source.noncoding, flow.runtime.route);

  return {
    type: 'EmbodiedEightRouteResult',
    boundary: EMBODIED_EIGHT_BOUNDARY,
    stages: { pattern, mudra, contact, glyph, speech, gate, flow, noncoding },
    outcome: {
      prerequisites,
      patternSignal: pattern.runtime.signal,
      mudraSignal: mudra.runtime.signal,
      contactSignal: contact.runtime.signal,
      glyphRoute: glyph.runtime.route,
      speechIntent: speech.runtime.intent,
      permitted: gate.runtime.permitted,
      bodyRoute: flow.runtime.route,
      finalSignal: noncoding.runtime.signal,
      finalRoute: noncoding.runtime.action?.route ?? null
    },
    identities: [
      ['Pattern-Tapping', pattern.ast.type, pattern.ir.type, pattern.runtime.type],
      ['Mudra Code', mudra.ast.type, mudra.ir.type, mudra.runtime.type],
      ['ContactCode', contact.ast.type, contact.ir.type, contact.runtime.type],
      ['Command Glyphs', glyph.ast.type, glyph.ir.type, glyph.runtime.type],
      ['Speech-Code', speech.ast.type, speech.ir.type, speech.runtime.type],
      ['SpeakGate', gate.ast.type, gate.ir.type, gate.runtime.type],
      ['FlowTalk Body Route', flow.ast.type, flow.ir.type, flow.runtime.type],
      ['Noncoding-Code', noncoding.ast.type, noncoding.ir.type, noncoding.runtime.type]
    ]
  };
}
