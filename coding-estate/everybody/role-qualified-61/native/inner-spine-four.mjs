/*
 * JM Inner Coding Spine — four distinct authorised forward descendants.
 * PunctBody / RouteFrame / StateField / ContactBand retain separate grammars,
 * IRs, runtimes and receipts. Historical exact source remains open for each.
 */
import { Trace, applyAction, digest, evaluate, parseAction, parseExpr, valueOf } from '../../../sovereign-ten/direct/native-core.mjs';

function makeError(name) {
  return class extends Error { constructor(code, message) { super(message); this.name = name; this.code = code; } };
}
const PunctError = makeError('PunctBodyError');
const RouteFrameError = makeError('RouteFrameError');
const StateFieldError = makeError('StateFieldError');
const ContactBandError = makeError('ContactBandError');
function need(ok, ErrorType, code, message) { if (!ok) throw new ErrorType(code, message); }
function outer(source, keyword, ErrorType, code) {
  const re = new RegExp(`\\b${keyword}\\s+([A-Za-z_][\\w.-]*)\\s*\\{([\\s\\S]*)\\}\\s*$`);
  const match = String(source ?? '').match(re);
  need(match, ErrorType, code, `${keyword} NAME { ... } required.`);
  return { name: match[1], body: match[2] };
}
function cleanLines(body) { return body.replace(/\r/g, '').split('\n').map(line => line.replace(/\s*(?:#|\/\/).*$/, '').trim()).filter(Boolean); }

export const INNER_SPINE_BRIDGES = Object.freeze({
  punctbody: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Punctuation changes route and completion state rather than merely formatting text.' },
  routeframe: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Control flow is represented as routes with visible entry, transition and recovery.' },
  statefield: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'State exists in a field with contact and consequence.' },
  contactband: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Contact joins source, state and consequence within bounded bands.' }
});

export const PunctBody = {
  parse(source) {
    const { name, body } = outer(source, 'punctbody', PunctError, 'PUNCT_BODY_REQUIRED');
    const operators = [];
    const programs = [];
    const unknown = [];
    for (const line of cleanLines(body)) {
      let m = line.match(/^op\s+([A-Za-z_][\w.-]*)\s+("(?:\\.|[^"\\])*")\s+precedence\s+(\d+)\s+effect\s+(continue|foolstop|fullstop|hold)$/);
      if (m) { operators.push({ type: 'PunctOperator', name: m[1], glyph: JSON.parse(m[2]), precedence: Number(m[3]), effect: m[4] }); continue; }
      m = line.match(/^program\s+([A-Za-z_][\w.-]*)\s*=\s*("(?:\\.|[^"\\])*")$/);
      if (m) { programs.push({ type: 'PunctProgramSource', name: m[1], source: JSON.parse(m[2]) }); continue; }
      unknown.push(line);
    }
    need(!unknown.length, PunctError, 'PUNCT_UNKNOWN_DECLARATION', `Unknown PunctBody declaration: ${unknown[0]}`);
    need(operators.length > 0 && programs.length > 0, PunctError, 'PUNCT_CORE_REQUIRED', 'PunctBody requires operators and programs.');
    const names = new Set(); const glyphs = new Set();
    for (const op of operators) { need(op.glyph.length > 0, PunctError, 'PUNCT_EMPTY_GLYPH', 'Punctuation glyph cannot be empty.'); need(!names.has(op.name), PunctError, 'PUNCT_DUPLICATE_NAME', `Duplicate operator ${op.name}.`); need(!glyphs.has(op.glyph), PunctError, 'PUNCT_DUPLICATE_GLYPH', `Duplicate glyph ${op.glyph}.`); names.add(op.name); glyphs.add(op.glyph); }
    return { type: 'PunctBodyProgram', name, operators, programs, bridge: INNER_SPINE_BRIDGES.punctbody };
  },
  lex(program, programName) {
    const source = (program.programs.find(item => item.name === programName) ?? program.programs[0])?.source;
    need(source !== undefined, PunctError, 'PUNCT_UNKNOWN_PROGRAM', `Unknown program ${programName}.`);
    const ordered = [...program.operators].sort((a, b) => b.glyph.length - a.glyph.length || b.precedence - a.precedence);
    const tokens = []; let offset = 0; let text = '';
    const flush = () => { if (text) { tokens.push({ type: 'PunctText', value: text }); text = ''; } };
    while (offset < source.length) {
      const op = ordered.find(candidate => source.startsWith(candidate.glyph, offset));
      if (op) { flush(); tokens.push({ type: 'PunctToken', operator: op.name, glyph: op.glyph, precedence: op.precedence, effect: op.effect }); offset += op.glyph.length; }
      else { text += source[offset]; offset += 1; }
    }
    flush();
    return { type: 'PunctTokenStream', source, tokens };
  },
  lower(program, stream) {
    return { type: 'PunctOperatorIR', operatorNodes: program.operators.map(op => ({ id: `op:${op.name}`, ...op })), tokens: structuredClone(stream.tokens), precedenceOrder: [...program.operators].sort((a, b) => b.precedence - a.precedence).map(op => op.name) };
  },
  run(program, programName) {
    const stream = this.lex(program, programName);
    const ir = this.lower(program, stream);
    const trace = new Trace('PunctBody');
    const state = { completion: 'open', routePressure: 0, held: false, segments: [] };
    for (const token of stream.tokens) {
      if (token.type === 'PunctText') { state.segments.push(token.value); trace.emit('text', { value: token.value }); continue; }
      if (token.effect === 'continue') state.routePressure += 1;
      else if (token.effect === 'foolstop') state.completion = 'foolstopped';
      else if (token.effect === 'fullstop') state.completion = 'fullstopped';
      else if (token.effect === 'hold') state.held = true;
      trace.emit('operator', { operator: token.operator, effect: token.effect, state: structuredClone(state) });
    }
    const ding = state.completion === 'fullstopped' ? { body: 'PunctBody', state: 'FULLSTOPPED', digest: digest(state) } : null;
    return { type: 'PunctRuntimeResult', state, ding, trace: trace.events, receipt: trace.receipt('execute punctuation state', { state, ding }) };
  },
  execute(source, programName) { const ast = this.parse(source); return { ast, ir: this.lower(ast, this.lex(ast, programName)), runtime: this.run(ast, programName) }; }
};

export const ContactBand = {
  parse(source) {
    const { name, body } = outer(source, 'contactband', ContactBandError, 'CB_BODY_REQUIRED');
    const bands = []; const unknown = [];
    for (const line of cleanLines(body)) {
      const m = line.match(/^band\s+([A-Za-z_][\w.-]*)\s+(-?(?:\d+(?:\.\d+)?|\.\d+))\.\.(-?(?:\d+(?:\.\d+)?|\.\d+))\s+route\s+([A-Za-z_][\w.-]*)$/);
      if (m) { bands.push({ type: 'ContactBandRule', name: m[1], min: Number(m[2]), max: Number(m[3]), route: m[4] }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && bands.length > 0, ContactBandError, 'CB_INVALID_DECLARATION', `Invalid ContactBand declaration: ${unknown[0] ?? 'no bands'}`);
    const names = new Set();
    for (const band of bands) { need(band.min <= band.max, ContactBandError, 'CB_BAD_RANGE', `Bad range ${band.name}.`); need(!names.has(band.name), ContactBandError, 'CB_DUPLICATE_BAND', `Duplicate band ${band.name}.`); names.add(band.name); }
    const sorted = [...bands].sort((a, b) => a.min - b.min);
    for (let i = 1; i < sorted.length; i += 1) need(sorted[i].min > sorted[i - 1].max, ContactBandError, 'CB_OVERLAP', `Bands ${sorted[i - 1].name} and ${sorted[i].name} overlap.`);
    return { type: 'ContactBandProgram', name, bands, bridge: INNER_SPINE_BRIDGES.contactband };
  },
  lower(program) { return { type: 'ContactBandIR', bandNodes: program.bands.map((band, index) => ({ id: `band:${index}:${band.name}`, ...band })) }; },
  contact(program, value, source = 'contact', state = {}) {
    need(typeof value === 'number' && Number.isFinite(value), ContactBandError, 'CB_VALUE_REQUIRED', 'Contact value must be finite number.');
    const band = program.bands.find(item => value >= item.min && value <= item.max) ?? null;
    const trace = new Trace('ContactBand');
    trace.emit('contact.measured', { source, value, band: band?.name ?? null });
    const next = { ...structuredClone(state), contactSource: source, contactValue: value, contactBand: band?.name ?? null, nextRoute: band?.route ?? null };
    return { type: 'ContactBandRuntimeResult', matched: Boolean(band), band: band?.name ?? null, route: band?.route ?? null, state: next, trace: trace.events, receipt: trace.receipt('route bounded contact', next) };
  },
  execute(source, value, contactSource, state) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.contact(ast, value, contactSource, state) }; }
};

export const StateField = {
  parse(source) {
    const { name, body } = outer(source, 'statefield', StateFieldError, 'SF_BODY_REQUIRED');
    const states = []; const transitions = []; const unknown = [];
    for (const line of cleanLines(body)) {
      let m = line.match(/^state\s+([A-Za-z_][\w.]*)\s*=\s*(.+)$/);
      if (m) { states.push({ type: 'StateFieldState', path: m[1], value: valueOf(m[2]) }); continue; }
      m = line.match(/^transition\s+([A-Za-z_][\w.-]*)\s+when\s+(.+?)\s+do\s+(.+)$/);
      if (m) { transitions.push({ type: 'StateFieldTransition', name: m[1], condition: parseExpr(m[2]), action: parseAction(m[3]) }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && states.length > 0, StateFieldError, 'SF_INVALID_DECLARATION', `Invalid StateField declaration: ${unknown[0] ?? 'no state'}`);
    const names = new Set(); for (const t of transitions) { need(!names.has(t.name), StateFieldError, 'SF_DUPLICATE_TRANSITION', `Duplicate transition ${t.name}.`); names.add(t.name); }
    return { type: 'StateFieldProgram', name, states, transitions, bridge: INNER_SPINE_BRIDGES.statefield };
  },
  lower(program) { return { type: 'StateTransitionIR', stateNodes: program.states.map((state, index) => ({ id: `state:${index}`, ...state })), transitionNodes: program.transitions.map((transition, index) => ({ id: `transition:${index}:${transition.name}`, ...transition })) }; },
  run(program, context = {}, initialState = {}, services = {}) {
    const state = structuredClone(initialState); const trace = new Trace('StateField');
    for (const item of program.states) if (item.path.split('.').reduce((v, key) => v?.[key], state) === undefined) applyAction({ type: 'assign', path: item.path, value: structuredClone(item.value) }, state, services, trace);
    const applied = [];
    for (const transition of program.transitions) {
      const facts = { ...state, ...context };
      const matched = evaluate(transition.condition, facts, services);
      trace.emit('transition.checked', { name: transition.name, matched });
      if (matched) { applyAction(transition.action, state, services, trace); applied.push(transition.name); }
    }
    return { type: 'StateFieldRuntimeResult', state, applied, trace: trace.events, receipt: trace.receipt('apply contact/state consequence', { state, applied }) };
  },
  execute(source, context, initialState, services) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.run(ast, context, initialState, services) }; }
};

export const RouteFrame = {
  parse(source) {
    const { name, body } = outer(source, 'routeframe', RouteFrameError, 'RF_BODY_REQUIRED');
    let entry = null; const steps = []; const fallbacks = []; const ends = new Set(); const unknown = [];
    for (const line of cleanLines(body)) {
      let m = line.match(/^entry\s+([A-Za-z_][\w.-]*)$/); if (m) { entry = m[1]; continue; }
      m = line.match(/^step\s+([A-Za-z_][\w.-]*)\s+when\s+(.+?)\s+do\s+(.+?)\s*->\s*([A-Za-z_][\w.-]*)$/);
      if (m) { steps.push({ type: 'RouteFrameStep', name: m[1], condition: parseExpr(m[2]), action: parseAction(m[3]), target: m[4] }); continue; }
      m = line.match(/^fallback\s+([A-Za-z_][\w.-]*)\s+do\s+(.+?)\s*->\s*([A-Za-z_][\w.-]*)$/);
      if (m) { fallbacks.push({ type: 'RouteFrameFallback', name: m[1], action: parseAction(m[2]), target: m[3] }); continue; }
      m = line.match(/^end\s+([A-Za-z_][\w.-]*)$/); if (m) { ends.add(m[1]); continue; }
      unknown.push(line);
    }
    need(!unknown.length && entry, RouteFrameError, 'RF_INVALID_DECLARATION', `Invalid RouteFrame declaration: ${unknown[0] ?? 'entry missing'}`);
    const nodeNames = new Set([...steps.map(item => item.name), ...fallbacks.map(item => item.name), ...ends]);
    need(nodeNames.has(entry), RouteFrameError, 'RF_ENTRY_MISSING', `Entry ${entry} has no node.`);
    for (const item of [...steps, ...fallbacks]) need(nodeNames.has(item.target), RouteFrameError, 'RF_UNKNOWN_TARGET', `Unknown target ${item.target}.`);
    return { type: 'RouteFrameProgram', name, entry, steps, fallbacks, ends: [...ends], bridge: INNER_SPINE_BRIDGES.routeframe };
  },
  lower(program) {
    return { type: 'RouteFrameGraph', entry: program.entry, nodes: [...program.steps.map(item => ({ id: `step:${item.name}`, ...item })), ...program.fallbacks.map(item => ({ id: `fallback:${item.name}`, ...item })), ...program.ends.map(name => ({ id: `end:${name}`, type: 'RouteFrameEnd', name }))], edges: [...program.steps.map(item => ({ from: item.name, to: item.target, kind: 'guarded', condition: item.condition })), ...program.fallbacks.map(item => ({ from: item.name, to: item.target, kind: 'fallback' }))] };
  },
  run(program, initialState = {}, services = {}) {
    const state = structuredClone(initialState); const trace = new Trace('RouteFrame'); let current = program.entry; let transitions = 0;
    while (!program.ends.includes(current)) {
      need(transitions++ < 128, RouteFrameError, 'RF_LOOP_LIMIT', 'RouteFrame exceeded transition limit.');
      const candidates = program.steps.filter(item => item.name === current);
      const selected = candidates.find(item => evaluate(item.condition, state, services)) ?? program.fallbacks.find(item => item.name === current);
      need(selected, RouteFrameError, 'RF_NO_TRANSITION', `No transition from ${current}.`);
      trace.emit('frame.enter', { current, selected: selected.type, target: selected.target });
      applyAction(selected.action, state, services, trace);
      current = selected.target;
    }
    trace.emit('frame.end', { current });
    return { type: 'RouteFrameRuntimeResult', state, end: current, transitions, trace: trace.events, receipt: trace.receipt('execute visible route frame', { state, end: current }) };
  },
  execute(source, state, services) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.run(ast, state, services) }; }
};

export function runInnerSpineFour({ punctSource, contactSource, stateSource, routeSource, textProgram = 'sample' } = {}) {
  const punct = PunctBody.execute(punctSource, textProgram);
  const contact = ContactBand.execute(contactSource, punct.runtime.state.routePressure, 'punctuation-pressure');
  const state = StateField.execute(stateSource, { band: contact.runtime.band, completion: punct.runtime.state.completion });
  const route = RouteFrame.execute(routeSource, state.runtime.state);
  return {
    type: 'InnerSpineFourResult',
    stages: { punct, contact, state, route },
    outcome: { completion: punct.runtime.state.completion, pressure: punct.runtime.state.routePressure, band: contact.runtime.band, mode: state.runtime.state.mode, nextRoute: route.runtime.state.nextRoute, end: route.runtime.end },
    identities: [
      ['PunctBody', punct.ast.type, punct.ir.type, punct.runtime.type],
      ['ContactBand', contact.ast.type, contact.ir.type, contact.runtime.type],
      ['StateField', state.ast.type, state.ir.type, state.runtime.type],
      ['RouteFrame', route.ast.type, route.ir.type, route.runtime.type]
    ]
  };
}
