/* Pattern-Tapping / Mudra Code / ContactCode / Command Glyphs — declared current-native descendants. */
import { Trace, digest } from '../../../sovereign-ten/direct/native-core.mjs';

function makeError(name) { return class extends Error { constructor(code, message) { super(message); this.name = name; this.code = code; } }; }
const PatternError = makeError('PatternTappingError');
const MudraError = makeError('MudraCodeError');
const ContactError = makeError('ContactCodeError');
const GlyphError = makeError('CommandGlyphError');
function need(ok, E, code, message) { if (!ok) throw new E(code, message); }
function outer(source, keyword, E, code) { const m = String(source ?? '').match(new RegExp(`\\b${keyword}\\s+([A-Za-z_][\\w.-]*)\\s*\\{([\\s\\S]*)\\}\\s*$`)); need(m, E, code, `${keyword} NAME { ... } required.`); return { name: m[1], body: m[2] }; }
function lines(body) { return body.replace(/\r/g, '').split('\n').map(line => line.replace(/\s*(?:#|\/\/).*$/, '').trim()).filter(Boolean); }

export const EMBODIED_CONTACT_BRIDGES = Object.freeze({
  patternTapping: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Patterned body contact is a first-class input language.' },
  mudraCode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Hand forms and transitions are executable symbols with bodily context.' },
  contactCode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Physical or logical contact is explicit code input.' },
  commandGlyphs: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Meaning -> Glyph -> Pressure -> Route Action.' }
});

export const PatternTapping = {
  parse(source) {
    const { name, body } = outer(source, 'patterntapping', PatternError, 'PT_BODY_REQUIRED');
    const patterns = []; const unknown = [];
    for (const line of lines(body)) {
      const m = line.match(/^pattern\s+([A-Za-z_][\w.-]*)\s*=\s*([0-9,\s.-]+)\s+tolerance\s+(\d+(?:\.\d+)?)\s+signal\s+("(?:\\.|[^"\\])*")$/);
      if (m) { patterns.push({ type: 'TapPattern', name: m[1], times: m[2].split(',').map(x => Number(x.trim())), tolerance: Number(m[3]), signal: JSON.parse(m[4]) }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && patterns.length > 0, PatternError, 'PT_INVALID_DECLARATION', `Invalid Pattern-Tapping declaration: ${unknown[0] ?? 'no patterns'}`);
    const names = new Set(); for (const p of patterns) { need(p.times.length > 0 && p.times.every(Number.isFinite), PatternError, 'PT_BAD_TIMES', `Bad pattern ${p.name}.`); need(!names.has(p.name), PatternError, 'PT_DUPLICATE_PATTERN', `Duplicate pattern ${p.name}.`); names.add(p.name); }
    return { type: 'PatternTappingProgram', name, patterns, bridge: EMBODIED_CONTACT_BRIDGES.patternTapping };
  },
  lower(program) { return { type: 'TapTemporalIR', patternNodes: program.patterns.map((p, i) => ({ id: `pattern:${i}:${p.name}`, ...p })) }; },
  match(program, name, observedTimes) {
    const pattern = program.patterns.find(p => p.name === name); need(pattern, PatternError, 'PT_UNKNOWN_PATTERN', `Unknown pattern ${name}.`);
    need(Array.isArray(observedTimes) && observedTimes.length === pattern.times.length, PatternError, 'PT_EVENT_COUNT', 'Observed tap count does not match pattern.');
    const base = observedTimes[0] ?? 0; const normalized = observedTimes.map(v => v - base);
    const matched = normalized.every((v, i) => Math.abs(v - pattern.times[i]) <= pattern.tolerance);
    const trace = new Trace('Pattern-Tapping'); trace.emit('pattern.checked', { pattern: name, normalized, matched });
    const result = { type: 'PatternTappingRuntimeResult', pattern: name, matched, signal: matched ? pattern.signal : null, normalized };
    return { ...result, trace: trace.events, receipt: trace.receipt('match temporal body-contact pattern', result) };
  },
  execute(source, name, observedTimes) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.match(ast, name, observedTimes) }; }
};

export const MudraCode = {
  parse(source) {
    const { name, body } = outer(source, 'mudracode', MudraError, 'MUDRA_BODY_REQUIRED');
    const sequences = []; const unknown = [];
    for (const line of lines(body)) {
      const m = line.match(/^sequence\s+([A-Za-z_][\w.-]*)\s*=\s*([A-Za-z_][\w.-]*(?:\s*>\s*[A-Za-z_][\w.-]*)*)\s+signal\s+("(?:\\.|[^"\\])*")$/);
      if (m) { sequences.push({ type: 'MudraSequence', name: m[1], poses: m[2].split('>').map(x => x.trim()), signal: JSON.parse(m[3]) }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && sequences.length > 0, MudraError, 'MUDRA_INVALID_DECLARATION', `Invalid Mudra Code declaration: ${unknown[0] ?? 'no sequences'}`);
    return { type: 'MudraCodeProgram', name, sequences, bridge: EMBODIED_CONTACT_BRIDGES.mudraCode };
  },
  lower(program) { return { type: 'MudraSequenceIR', sequenceNodes: program.sequences.map((s, i) => ({ id: `mudra:${i}:${s.name}`, ...s })), transitionEdges: program.sequences.flatMap(s => s.poses.slice(1).map((pose, i) => ({ from: `${s.name}:${s.poses[i]}`, to: `${s.name}:${pose}`, kind: 'pose-transition' }))) }; },
  match(program, name, observedPoses) {
    const sequence = program.sequences.find(s => s.name === name); need(sequence, MudraError, 'MUDRA_UNKNOWN_SEQUENCE', `Unknown sequence ${name}.`);
    const matched = Array.isArray(observedPoses) && observedPoses.length === sequence.poses.length && observedPoses.every((pose, i) => pose === sequence.poses[i]);
    const trace = new Trace('Mudra Code'); trace.emit('sequence.checked', { sequence: name, observedPoses, matched });
    const result = { type: 'MudraCodeRuntimeResult', sequence: name, matched, signal: matched ? sequence.signal : null };
    return { ...result, trace: trace.events, receipt: trace.receipt('match hand-form transition sequence', result) };
  },
  execute(source, name, observedPoses) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.match(ast, name, observedPoses) }; }
};

export const ContactCode = {
  parse(source) {
    const { name, body } = outer(source, 'contactcode', ContactError, 'CC_BODY_REQUIRED');
    const contacts = []; const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^contact\s+([A-Za-z_][\w.-]*)\s+kind\s+(physical|logical)\s+pressure\s+(-?(?:\d+(?:\.\d+)?|\.\d+))\.\.(-?(?:\d+(?:\.\d+)?|\.\d+))\s+signal\s+("(?:\\.|[^"\\])*")$/);
      if (m) { contacts.push({ type: 'ContactRule', name: m[1], kind: m[2], min: Number(m[3]), max: Number(m[4]), signal: JSON.parse(m[5]) }); continue; }
      m = line.match(/^contact\s+([A-Za-z_][\w.-]*)\s+kind\s+(logical)\s+signal\s+("(?:\\.|[^"\\])*")$/);
      if (m) { contacts.push({ type: 'ContactRule', name: m[1], kind: m[2], min: null, max: null, signal: JSON.parse(m[3]) }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && contacts.length > 0, ContactError, 'CC_INVALID_DECLARATION', `Invalid ContactCode declaration: ${unknown[0] ?? 'no contacts'}`);
    return { type: 'ContactCodeProgram', name, contacts, bridge: EMBODIED_CONTACT_BRIDGES.contactCode };
  },
  lower(program) { return { type: 'ContactEventIR', contactNodes: program.contacts.map((c, i) => ({ id: `contact:${i}:${c.name}`, ...c })) }; },
  contact(program, event) {
    const rule = program.contacts.find(c => c.name === event?.name && c.kind === event?.kind && (c.kind === 'logical' || (typeof event.pressure === 'number' && event.pressure >= c.min && event.pressure <= c.max))) ?? null;
    const trace = new Trace('ContactCode'); trace.emit('contact.checked', { event, matched: rule?.name ?? null });
    const result = { type: 'ContactCodeRuntimeResult', matched: Boolean(rule), contact: rule?.name ?? null, signal: rule?.signal ?? null, event: structuredClone(event) };
    return { ...result, trace: trace.events, receipt: trace.receipt('execute explicit contact input', result) };
  },
  execute(source, event) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.contact(ast, event) }; }
};

export const CommandGlyphs = {
  parse(source) {
    const { name, body } = outer(source, 'commandglyphs', GlyphError, 'CG_BODY_REQUIRED');
    const glyphs = []; const unknown = [];
    for (const line of lines(body)) {
      const m = line.match(/^glyph\s+([A-Za-z_][\w.-]*)\s*=\s*("(?:\\.|[^"\\])*")\s+pressure\s+(-?(?:\d+(?:\.\d+)?|\.\d+))\.\.(-?(?:\d+(?:\.\d+)?|\.\d+))\s+route\s+([A-Za-z_][\w.-]*)$/);
      if (m) { glyphs.push({ type: 'CommandGlyph', name: m[1], glyph: JSON.parse(m[2]), min: Number(m[3]), max: Number(m[4]), route: m[5] }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && glyphs.length > 0, GlyphError, 'CG_INVALID_DECLARATION', `Invalid Command Glyph declaration: ${unknown[0] ?? 'no glyphs'}`);
    const seen = new Set(); for (const g of glyphs) { need(g.min <= g.max, GlyphError, 'CG_BAD_RANGE', `Bad pressure range ${g.name}.`); need(!seen.has(g.glyph), GlyphError, 'CG_DUPLICATE_GLYPH', `Duplicate command glyph ${g.glyph}.`); seen.add(g.glyph); }
    return { type: 'CommandGlyphProgram', name, glyphs, bridge: EMBODIED_CONTACT_BRIDGES.commandGlyphs };
  },
  lower(program) { return { type: 'CommandGlyphIR', glyphNodes: program.glyphs.map((g, i) => ({ id: `glyph:${i}:${g.name}`, ...g })) }; },
  invoke(program, glyph, pressure) {
    const command = program.glyphs.find(g => g.glyph === glyph && pressure >= g.min && pressure <= g.max) ?? null;
    const trace = new Trace('Command Glyphs'); trace.emit('glyph.invoked', { glyph, pressure, command: command?.name ?? null });
    const result = { type: 'CommandGlyphRuntimeResult', matched: Boolean(command), command: command?.name ?? null, route: command?.route ?? null, proof: command ? digest({ glyph, pressure, route: command.route }) : null };
    return { ...result, trace: trace.events, receipt: trace.receipt('invoke pressure-bound command glyph', result) };
  },
  execute(source, glyph, pressure) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.invoke(ast, glyph, pressure) }; }
};
