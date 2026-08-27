/* Speech-Code / SpeakGate / FlowTalk Body Route / Noncoding-Code — declared current-native descendants. */
import { Trace, digest } from '../../../sovereign-ten/direct/native-core.mjs';

function makeError(name) { return class extends Error { constructor(code, message) { super(message); this.name = name; this.code = code; } }; }
const SpeechError = makeError('SpeechCodeError');
const GateError = makeError('SpeakGateError');
const FlowBodyError = makeError('FlowTalkBodyRouteError');
const NoncodingError = makeError('NoncodingCodeError');
function need(ok, E, code, message) { if (!ok) throw new E(code, message); }
function outer(source, keyword, E, code) { const m = String(source ?? '').match(new RegExp(`\\b${keyword}\\s+([A-Za-z_][\\w.-]*)\\s*\\{([\\s\\S]*)\\}\\s*$`)); need(m, E, code, `${keyword} NAME { ... } required.`); return { name: m[1], body: m[2] }; }
function lines(body) { return body.replace(/\r/g, '').split('\n').map(line => line.replace(/\s*(?:#|\/\/).*$/, '').trim()).filter(Boolean); }
function norm(text) { return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' '); }

export const SPEECH_MEANING_BRIDGES = Object.freeze({
  speechCode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Speech becomes executable only through ambiguity, intent and permission handling.' },
  speakGate: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Spoken input passes identity, ambiguity and permission gates before execution.' },
  flowTalkBodyRoute: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Source Wording -> Body Meaning -> Route -> Output.' },
  noncodingCode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Meaning -> Signal -> Action -> Trace.' }
});

export const SpeechCode = {
  parse(source) {
    const { name, body } = outer(source, 'speechcode', SpeechError, 'SC_BODY_REQUIRED');
    const phrases = []; const permissions = new Map(); const routes = new Map(); const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^phrase\s+("(?:\\.|[^"\\])*")\s+intent\s+([A-Za-z_][\w.-]*)$/);
      if (m) { phrases.push({ type: 'SpeechPhrase', phrase: norm(JSON.parse(m[1])), intent: m[2] }); continue; }
      m = line.match(/^permission\s+([A-Za-z_][\w.-]*)\s+(allow|deny)$/);
      if (m) { permissions.set(m[1], m[2]); continue; }
      m = line.match(/^route\s+([A-Za-z_][\w.-]*)\s+([A-Za-z_][\w.-]*)$/);
      if (m) { routes.set(m[1], m[2]); continue; }
      unknown.push(line);
    }
    need(!unknown.length && phrases.length > 0, SpeechError, 'SC_INVALID_DECLARATION', `Invalid Speech-Code declaration: ${unknown[0] ?? 'no phrases'}`);
    for (const phrase of phrases) { need(permissions.has(phrase.intent), SpeechError, 'SC_PERMISSION_MISSING', `No permission for ${phrase.intent}.`); need(routes.has(phrase.intent), SpeechError, 'SC_ROUTE_MISSING', `No route for ${phrase.intent}.`); }
    return { type: 'SpeechCodeProgram', name, phrases, permissions: Object.fromEntries(permissions), routes: Object.fromEntries(routes), bridge: SPEECH_MEANING_BRIDGES.speechCode };
  },
  lower(program) { return { type: 'SpeechIntentIR', phraseNodes: program.phrases.map((p, i) => ({ id: `phrase:${i}`, ...p })), permissionNodes: Object.entries(program.permissions).map(([intent, decision]) => ({ id: `permission:${intent}`, intent, decision })), routeNodes: Object.entries(program.routes).map(([intent, route]) => ({ id: `route:${intent}`, intent, route })) }; },
  speak(program, utterance) {
    const phrase = program.phrases.find(p => p.phrase === norm(utterance)) ?? null;
    const trace = new Trace('Speech-Code'); trace.emit('utterance.heard', { utterance: norm(utterance), matched: phrase?.intent ?? null });
    if (!phrase) return { type: 'SpeechCodeRuntimeResult', matched: false, ambiguity: 'unmatched', intent: null, permission: null, route: null, trace: trace.events, receipt: trace.receipt('resolve speech intent', { matched: false }) };
    const permission = program.permissions[phrase.intent];
    const result = { type: 'SpeechCodeRuntimeResult', matched: true, ambiguity: 'exact', intent: phrase.intent, permission, route: permission === 'allow' ? program.routes[phrase.intent] : null };
    trace.emit('intent.resolved', result);
    return { ...result, trace: trace.events, receipt: trace.receipt('resolve speech intent', result) };
  },
  execute(source, utterance) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.speak(ast, utterance) }; }
};

export const SpeakGate = {
  parse(source) {
    const { name, body } = outer(source, 'speakgate', GateError, 'SG_BODY_REQUIRED');
    const identities = new Set(); const permits = new Set(); const denies = new Set(); let ambiguity = null; const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^identity\s+([A-Za-z_][\w.-]*)$/); if (m) { identities.add(m[1]); continue; }
      m = line.match(/^ambiguity\s+(exact|explicit)$/); if (m) { ambiguity = m[1]; continue; }
      m = line.match(/^permit\s+([A-Za-z_][\w.-]*)$/); if (m) { permits.add(m[1]); continue; }
      m = line.match(/^deny\s+([A-Za-z_][\w.-]*)$/); if (m) { denies.add(m[1]); continue; }
      unknown.push(line);
    }
    need(!unknown.length && identities.size > 0 && ambiguity, GateError, 'SG_INVALID_DECLARATION', `Invalid SpeakGate declaration: ${unknown[0] ?? 'identity/ambiguity missing'}`);
    for (const intent of permits) need(!denies.has(intent), GateError, 'SG_CONFLICT', `Intent ${intent} cannot be both permit and deny.`);
    return { type: 'SpeakGateProgram', name, identities: [...identities], ambiguity, permits: [...permits], denies: [...denies], bridge: SPEECH_MEANING_BRIDGES.speakGate };
  },
  lower(program) { return { type: 'SpeakGateIR', identityNodes: program.identities.map(id => ({ id: `identity:${id}`, identity: id })), permitNodes: program.permits.map(intent => ({ id: `permit:${intent}`, intent })), denyNodes: program.denies.map(intent => ({ id: `deny:${intent}`, intent })), ambiguity: program.ambiguity }; },
  gate(program, speechResult, identity) {
    const trace = new Trace('SpeakGate');
    const identityOk = program.identities.includes(identity);
    const ambiguityOk = speechResult?.ambiguity === program.ambiguity;
    const intent = speechResult?.intent ?? null;
    const permitted = identityOk && ambiguityOk && program.permits.includes(intent) && !program.denies.includes(intent) && speechResult?.permission === 'allow';
    const result = { type: 'SpeakGateRuntimeResult', identity, identityOk, ambiguityOk, intent, permitted, route: permitted ? speechResult.route : null };
    trace.emit('speech.gated', result);
    return { ...result, trace: trace.events, receipt: trace.receipt('gate spoken executable input', result) };
  },
  execute(source, speechResult, identity) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.gate(ast, speechResult, identity) }; }
};

export const FlowTalkBodyRoute = {
  parse(source) {
    const { name, body } = outer(source, 'flowbodyroute', FlowBodyError, 'FBR_BODY_REQUIRED');
    const routes = []; const unknown = [];
    for (const line of lines(body)) {
      const m = line.match(/^intent\s+([A-Za-z_][\w.-]*)\s+route\s+([A-Za-z_][\w.-]*)\s+output\s+("(?:\\.|[^"\\])*")$/);
      if (m) { routes.push({ type: 'FlowBodyRouteRule', intent: m[1], route: m[2], output: JSON.parse(m[3]) }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && routes.length > 0, FlowBodyError, 'FBR_INVALID_DECLARATION', `Invalid FlowTalk Body Route declaration: ${unknown[0] ?? 'no routes'}`);
    return { type: 'FlowTalkBodyRouteProgram', name, routes, bridge: SPEECH_MEANING_BRIDGES.flowTalkBodyRoute };
  },
  lower(program) { return { type: 'FlowTalkBodyRouteIR', routeNodes: program.routes.map((r, i) => ({ id: `intent:${i}:${r.intent}`, ...r })) }; },
  route(program, sourceWording, intent) {
    const rule = program.routes.find(r => r.intent === intent) ?? null;
    const trace = new Trace('FlowTalk Body Route'); trace.emit('body.meaning', { sourceWording, intent, matched: Boolean(rule) });
    const result = { type: 'FlowTalkBodyRouteRuntimeResult', sourceWording, bodyMeaning: intent, matched: Boolean(rule), route: rule?.route ?? null, output: rule?.output ?? null };
    return { ...result, trace: trace.events, receipt: trace.receipt('carry wording through body meaning to route output', result) };
  },
  execute(source, sourceWording, intent) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.route(ast, sourceWording, intent) }; }
};

export const NoncodingCode = {
  parse(source) {
    const { name, body } = outer(source, 'noncodingcode', NoncodingError, 'NCC_BODY_REQUIRED');
    const meanings = []; const unknown = [];
    for (const line of lines(body)) {
      const m = line.match(/^meaning\s+("(?:\\.|[^"\\])*")\s+signal\s+("(?:\\.|[^"\\])*")\s+route\s+([A-Za-z_][\w.-]*)$/);
      if (m) { meanings.push({ type: 'NoncodingMeaningRule', meaning: JSON.parse(m[1]), signal: JSON.parse(m[2]), route: m[3] }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && meanings.length > 0, NoncodingError, 'NCC_INVALID_DECLARATION', `Invalid Noncoding-Code declaration: ${unknown[0] ?? 'no meanings'}`);
    return { type: 'NoncodingCodeProgram', name, meanings, bridge: SPEECH_MEANING_BRIDGES.noncodingCode };
  },
  lower(program) { return { type: 'NoncodingMeaningSignalIR', meaningNodes: program.meanings.map((m, i) => ({ id: `meaning:${i}`, ...m })) }; },
  executeMeaning(program, meaning) {
    const rule = program.meanings.find(m => m.meaning === meaning) ?? null;
    const trace = new Trace('Noncoding-Code'); trace.emit('meaning.received', { meaning, matched: Boolean(rule) });
    const result = { type: 'NoncodingCodeRuntimeResult', matched: Boolean(rule), meaning, signal: rule?.signal ?? null, action: rule ? { type: 'route', route: rule.route } : null, proof: rule ? digest({ meaning, signal: rule.signal, route: rule.route }) : null };
    trace.emit('meaning.routed', result);
    return { ...result, trace: trace.events, receipt: trace.receipt('route meaning through signal action trace', result) };
  },
  execute(source, meaning) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.executeMeaning(ast, meaning) }; }
};
