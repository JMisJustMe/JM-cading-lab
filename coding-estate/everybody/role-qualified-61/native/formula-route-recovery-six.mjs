/*
 * Formula-Born Code / Mark-Code / Route-Code / TBS.String / RECORP / Buildode
 * Six distinct authorised current-native descendants. FormeULA itself is not
 * rebuilt here: it remains the specialist donor that feeds Formula-Born Code.
 */
import { digest, getPath, stable, valueOf } from '../../../sovereign-ten/direct/native-core.mjs';
import { RouteScript } from '../../../sovereign-ten/direct/route-proof-native.mjs';

function makeError(name) { return class extends Error { constructor(code, message) { super(message); this.name = name; this.code = code; } }; }
const FormulaBornError = makeError('FormulaBornCodeError');
const MarkCodeError = makeError('MarkCodeError');
const RouteCodeError = makeError('RouteCodeError');
const TBSStringError = makeError('TBSStringError');
const RecorpError = makeError('RecorpError');
const BuildodeError = makeError('BuildodeError');
function need(ok, E, code, message) { if (!ok) throw new E(code, message); }
function outer(source, keyword, E, code) { const m = String(source ?? '').match(new RegExp(`\\b${keyword}\\s+([A-Za-z_][\\w.-]*)\\s*\\{([\\s\\S]*)\\}\\s*$`)); need(m, E, code, `${keyword} NAME { ... } required.`); return { name: m[1], body: m[2] }; }
function lines(body) { return body.replace(/\r/g, '').split('\n').map(line => line.replace(/\s*(?:#|\/\/).*$/, '').trim()).filter(Boolean); }

export const FORMULA_ROUTE_RECOVERY_BRIDGES = Object.freeze({
  formulaBornCode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Formulas give birth to executable bodies through governed lowering.' },
  markCode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Marks compile through declared semantics and route effects.' },
  routeCode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Routes are executable code with source, state and recovery.' },
  tbsString: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'String bodies preserve named route and meaning structure.' },
  recorp: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Scattered -> RECORP -> Regrouped Body.' },
  buildode: { status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE', historicalRecoveryClaim: false, law: 'Body + Purpose + Build Mode -> Adapted Build Package.' }
});

export const FormulaBornCode = {
  parse(source) {
    const { name, body } = outer(source, 'formulaborn', FormulaBornError, 'FBC_BODY_REQUIRED');
    let sourceForm = null, threshold = null, bodyId = null, passRoute = null, failRoute = null, ding = null; const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^source\s+([A-Za-z_][\w.-]*)$/); if (m) { sourceForm = m[1]; continue; }
      m = line.match(/^threshold\s+(-?(?:\d+(?:\.\d+)?|\.\d+))$/); if (m) { threshold = Number(m[1]); continue; }
      m = line.match(/^body\s+([a-z0-9][a-z0-9.-]*)$/); if (m) { bodyId = m[1]; continue; }
      m = line.match(/^pass\s+route\s+([A-Za-z_][\w.-]*)$/); if (m) { passRoute = m[1]; continue; }
      m = line.match(/^fail\s+route\s+([A-Za-z_][\w.-]*)$/); if (m) { failRoute = m[1]; continue; }
      m = line.match(/^ding\s+("(?:\\.|[^"\\])*")$/); if (m) { ding = JSON.parse(m[1]); continue; }
      unknown.push(line);
    }
    need(!unknown.length && sourceForm && Number.isFinite(threshold) && bodyId && passRoute && failRoute && ding, FormulaBornError, 'FBC_INCOMPLETE', `Formula-Born Code incomplete: ${unknown[0] ?? 'required field missing'}`);
    return { type: 'FormulaBornProgram', name, sourceForm, threshold, bodyId, passRoute, failRoute, ding, bridge: FORMULA_ROUTE_RECOVERY_BRIDGES.formulaBornCode };
  },
  lower(program) { return { type: 'FormulaBornIR', sourceForm: program.sourceForm, threshold: program.threshold, bodyId: program.bodyId, branches: [{ when: 'value>=threshold', route: program.passRoute }, { when: 'else', route: program.failRoute }], ding: program.ding }; },
  birth(program, formulaResult) {
    need(formulaResult?.type === 'FormeULAResult', FormulaBornError, 'FBC_FORMEULA_RESULT_REQUIRED', 'Formula-Born Code requires a FormeULAResult donor.');
    need(formulaResult.form === program.sourceForm, FormulaBornError, 'FBC_SOURCE_FORM_MISMATCH', `Expected FormeULA form ${program.sourceForm}.`);
    need(typeof formulaResult.value === 'number' && Number.isFinite(formulaResult.value), FormulaBornError, 'FBC_NUMERIC_RESULT_REQUIRED', 'Formula-Born Code threshold birth requires numeric FormeULA result.');
    const passed = formulaResult.value >= program.threshold;
    const body = { type: 'FormulaBornExecutableBody', id: program.bodyId, sourceForm: program.sourceForm, sourceValue: formulaResult.value, passed, route: passed ? program.passRoute : program.failRoute, ding: program.ding };
    body.proof = digest(body);
    return { type: 'FormulaBornRuntimeResult', body, bridge: program.bridge, claimBoundary: 'Current-native formula-born descendant; historical Formula-Born Code source remains open.' };
  },
  execute(source, formulaResult) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.birth(ast, formulaResult) }; }
};

export const MarkCode = {
  parse(source) {
    const { name, body } = outer(source, 'markcode', MarkCodeError, 'MC_BODY_REQUIRED');
    const semantics = []; const programs = []; const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^semantic\s+([A-Za-z_][\w.-]*)\s*=\s*("(?:\\.|[^"\\])*")\s+route\s+([A-Za-z_][\w.-]*)$/);
      if (m) { semantics.push({ type: 'MarkSemantic', name: m[1], glyph: JSON.parse(m[2]), route: m[3] }); continue; }
      m = line.match(/^program\s+([A-Za-z_][\w.-]*)\s*=\s*("(?:\\.|[^"\\])*")$/);
      if (m) { programs.push({ type: 'MarkCodeSource', name: m[1], source: JSON.parse(m[2]) }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && semantics.length > 0 && programs.length > 0, MarkCodeError, 'MC_INCOMPLETE', `Mark-Code incomplete: ${unknown[0] ?? 'semantics/program missing'}`);
    const glyphs = new Set(); for (const s of semantics) { need(!glyphs.has(s.glyph), MarkCodeError, 'MC_DUPLICATE_GLYPH', `Duplicate Mark-Code glyph ${s.glyph}.`); glyphs.add(s.glyph); }
    return { type: 'MarkCodeProgram', name, semantics, programs, bridge: FORMULA_ROUTE_RECOVERY_BRIDGES.markCode };
  },
  lower(program, programName) {
    const source = (program.programs.find(item => item.name === programName) ?? program.programs[0])?.source;
    need(source !== undefined, MarkCodeError, 'MC_UNKNOWN_PROGRAM', `Unknown Mark-Code program ${programName}.`);
    const byGlyph = new Map(program.semantics.map(item => [item.glyph, item]));
    const instructions = []; let offset = 0;
    const ordered = [...program.semantics].sort((a, b) => b.glyph.length - a.glyph.length);
    while (offset < source.length) {
      const semantic = ordered.find(item => source.startsWith(item.glyph, offset));
      need(semantic, MarkCodeError, 'MC_UNKNOWN_MARK', `Unknown mark at offset ${offset}.`);
      instructions.push({ type: 'MarkRouteInstruction', index: instructions.length, mark: semantic.name, glyph: semantic.glyph, route: semantic.route });
      offset += semantic.glyph.length;
    }
    return { type: 'MarkCodeIR', program: programName ?? program.programs[0].name, instructions, semanticTable: Object.fromEntries([...byGlyph].map(([glyph, semantic]) => [glyph, semantic.route])) };
  },
  run(ir) {
    need(ir?.type === 'MarkCodeIR', MarkCodeError, 'MC_BAD_IR', 'Mark-Code runtime requires MarkCodeIR.');
    const routes = ir.instructions.map(item => item.route);
    return { type: 'MarkCodeRuntimeResult', routes, finalRoute: routes.at(-1) ?? null, proof: digest({ routes, semanticTable: ir.semanticTable }) };
  },
  execute(source, programName) { const ast = this.parse(source); const ir = this.lower(ast, programName); return { ast, ir, runtime: this.run(ir) }; }
};

export const RouteCode = {
  parse(source) {
    const { name, body } = outer(source, 'routecode', RouteCodeError, 'RCODE_BODY_REQUIRED');
    let routeName = null, condition = null, passRoute = null, failRoute = null, recoveryRoute = null; const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^route\s+([A-Za-z_][\w.-]*)$/); if (m) { routeName = m[1]; continue; }
      m = line.match(/^when\s+(.+)$/); if (m) { condition = m[1]; continue; }
      m = line.match(/^pass\s+([A-Za-z_][\w.-]*)$/); if (m) { passRoute = m[1]; continue; }
      m = line.match(/^fail\s+([A-Za-z_][\w.-]*)$/); if (m) { failRoute = m[1]; continue; }
      m = line.match(/^recover\s+([A-Za-z_][\w.-]*)$/); if (m) { recoveryRoute = m[1]; continue; }
      unknown.push(line);
    }
    need(!unknown.length && routeName && condition && passRoute && failRoute && recoveryRoute, RouteCodeError, 'RCODE_INCOMPLETE', `Route-Code incomplete: ${unknown[0] ?? 'required field missing'}`);
    return { type: 'RouteCodeProgram', name, routeName, condition, passRoute, failRoute, recoveryRoute, bridge: FORMULA_ROUTE_RECOVERY_BRIDGES.routeCode };
  },
  lower(program) {
    const source = `route ${program.routeName} {\nstart:\nbranch ${program.condition} -> pass\ngoto fail\npass:\nnextRoute = "${program.passRoute}"\nend\nfail:\nnextRoute = "${program.failRoute}"\nend\nrecover:\nnextRoute = "${program.recoveryRoute}"\nend\n}`;
    const routeAst = RouteScript.parse(source);
    const routeIR = RouteScript.lower(routeAst);
    return { type: 'RouteCodeIR', routeName: program.routeName, source, routeAst, routeIR, recoveryRoute: program.recoveryRoute };
  },
  run(program, ir, state = {}) {
    try {
      const outcome = RouteScript.run(ir.routeIR.graphs[0], state);
      return { type: 'RouteCodeRuntimeResult', status: 'executed', state: outcome.state, routeOutcome: outcome, recoveryUsed: false };
    } catch (error) {
      return { type: 'RouteCodeRuntimeResult', status: 'recovered', state: { ...structuredClone(state), nextRoute: program.recoveryRoute, recoveryCode: error.code ?? error.name }, routeOutcome: null, recoveryUsed: true };
    }
  },
  execute(source, state) { const ast = this.parse(source); const ir = this.lower(ast); return { ast, ir, runtime: this.run(ast, ir, state) }; }
};

export const TBSString = {
  parse(source) {
    const { name, body } = outer(source, 'tbsstring', TBSStringError, 'TBS_BODY_REQUIRED');
    let meaning = null, route = null; const fields = []; const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^meaning\s+("(?:\\.|[^"\\])*"|[A-Za-z_][\w.-]*)$/); if (m) { meaning = valueOf(m[1]); continue; }
      m = line.match(/^route\s+([A-Za-z_][\w.-]*)$/); if (m) { route = m[1]; continue; }
      m = line.match(/^field\s+([A-Za-z_][\w.-]*)\s+from\s+([A-Za-z_][\w.]*)$/); if (m) { fields.push({ type: 'TBSStringField', name: m[1], path: m[2] }); continue; }
      unknown.push(line);
    }
    need(!unknown.length && meaning !== null && route && fields.length > 0, TBSStringError, 'TBS_INCOMPLETE', `TBS.String incomplete: ${unknown[0] ?? 'required field missing'}`);
    return { type: 'TBSStringProgram', name, meaning, route, fields, bridge: FORMULA_ROUTE_RECOVERY_BRIDGES.tbsString };
  },
  lower(program) { return { type: 'TBSStringIR', meaning: program.meaning, route: program.route, fieldNodes: program.fields.map((field, index) => ({ id: `field:${index}:${field.name}`, ...field })) }; },
  encode(program, state = {}) {
    const fields = Object.fromEntries(program.fields.map(field => [field.name, structuredClone(getPath(state, field.path))]));
    const body = { schema: 'jm.tbs-string/1.0', name: program.name, meaning: program.meaning, route: program.route, fields };
    const encoded = `TBS.String:${JSON.stringify(body)}`;
    return { type: 'TBSStringRuntimeResult', body, encoded, digest: digest(encoded) };
  },
  decode(encoded) {
    need(typeof encoded === 'string' && encoded.startsWith('TBS.String:'), TBSStringError, 'TBS_BAD_PREFIX', 'TBS.String prefix missing.');
    const body = JSON.parse(encoded.slice('TBS.String:'.length));
    need(body?.schema === 'jm.tbs-string/1.0' && body.route && body.meaning !== undefined, TBSStringError, 'TBS_BAD_BODY', 'Invalid TBS.String body.');
    return body;
  },
  execute(source, state) { const ast = this.parse(source); const ir = this.lower(ast); const runtime = this.encode(ast, state); return { ast, ir, runtime, decoded: this.decode(runtime.encoded) }; }
};

export const RECORP = {
  parse(source) {
    const { name, body } = outer(source, 'recorp', RecorpError, 'RECORP_BODY_REQUIRED');
    let order = null, inspect = false, prove = false, lock = false, route = null; const unknown = [];
    for (const line of lines(body)) {
      if (line === 'RECORP? inspect') { inspect = true; continue; }
      let m = line.match(/^RECORP~\s+regroup\s+([A-Za-z_][\w.-]*(?:\s*,\s*[A-Za-z_][\w.-]*)*)$/); if (m) { order = m[1].split(',').map(v => v.trim()); continue; }
      if (line === 'RECORP! prove') { prove = true; continue; }
      if (line === 'RECORP.lock') { lock = true; continue; }
      m = line.match(/^RECORP→\s+([A-Za-z_][\w.-]*)$/); if (m) { route = m[1]; continue; }
      unknown.push(line);
    }
    need(!unknown.length && inspect && order?.length && prove && lock && route, RecorpError, 'RECORP_INCOMPLETE', `RECORP incomplete: ${unknown[0] ?? 'operator missing'}`);
    return { type: 'RECORPProgram', name, inspect, order, prove, lock, route, bridge: FORMULA_ROUTE_RECOVERY_BRIDGES.recorp };
  },
  lower(program) { return { type: 'RECORPIR', operations: [{ op: 'inspect' }, { op: 'regroup', order: program.order }, { op: 'prove' }, { op: 'lock' }, { op: 'route', route: program.route }] }; },
  recover(program, fragments, expectedDigest) {
    const missing = program.order.filter(key => !(key in (fragments ?? {})));
    need(!missing.length, RecorpError, 'RECORP_FRAGMENT_MISSING', `Missing fragments: ${missing.join(', ')}`);
    const recovered = program.order.map(key => String(fragments[key])).join('');
    const recoveredDigest = digest(recovered);
    const proved = expectedDigest ? recoveredDigest === expectedDigest : true;
    need(proved, RecorpError, 'RECORP_PROOF_MISMATCH', 'Recovered body digest does not match expected digest.');
    return { type: 'RECORPRuntimeResult', inspected: Object.keys(fragments).sort(), recovered, recoveredDigest, proved, locked: program.lock && proved, route: program.route, ding: proved ? { body: 'RECORP', proof: recoveredDigest } : null };
  },
  execute(source, fragments, expectedDigest) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.recover(ast, fragments, expectedDigest) }; }
};

export const Buildode = {
  parse(source) {
    const { name, body } = outer(source, 'buildode', BuildodeError, 'BUILDODE_BODY_REQUIRED');
    let bodyId = null, purpose = null, mode = null, requireLocked = false; const includes = []; const unknown = [];
    for (const line of lines(body)) {
      let m = line.match(/^body\s+([a-z0-9][a-z0-9.-]*)$/); if (m) { bodyId = m[1]; continue; }
      m = line.match(/^purpose\s+("(?:\\.|[^"\\])*")$/); if (m) { purpose = JSON.parse(m[1]); continue; }
      m = line.match(/^mode\s+([A-Za-z_][\w.-]*)$/); if (m) { mode = m[1]; continue; }
      m = line.match(/^include\s+([A-Za-z_][\w.-]*)$/); if (m) { includes.push(m[1]); continue; }
      if (line === 'require locked') { requireLocked = true; continue; }
      unknown.push(line);
    }
    need(!unknown.length && bodyId && purpose && mode && includes.length > 0, BuildodeError, 'BUILDODE_INCOMPLETE', `Buildode incomplete: ${unknown[0] ?? 'required field missing'}`);
    return { type: 'BuildodeProgram', name, bodyId, purpose, mode, includes, requireLocked, bridge: FORMULA_ROUTE_RECOVERY_BRIDGES.buildode };
  },
  lower(program) { return { type: 'BuildodeIR', bodyId: program.bodyId, purpose: program.purpose, mode: program.mode, includeNodes: program.includes.map((name, index) => ({ id: `include:${index}:${name}`, name })), requireLocked: program.requireLocked }; },
  build(program, inputs = {}) {
    if (program.requireLocked) need(inputs.locked === true, BuildodeError, 'BUILDODE_LOCK_REQUIRED', 'Buildode package requires locked input.');
    const contents = {};
    for (const name of program.includes) { need(name in inputs, BuildodeError, 'BUILDODE_INCLUDE_MISSING', `Buildode input ${name} missing.`); contents[name] = structuredClone(inputs[name]); }
    const manifest = { schema: 'jm.buildode.package/1.0', bodyId: program.bodyId, purpose: program.purpose, mode: program.mode, includes: program.includes, contents };
    const packageDigest = digest(stable(manifest));
    return { type: 'BuildodeRuntimeResult', manifest, packageDigest, receipt: { body: 'Buildode', status: 'ADAPTED_BUILD_PACKAGE', packageDigest }, bridge: program.bridge };
  },
  execute(source, inputs) { const ast = this.parse(source); return { ast, ir: this.lower(ast), runtime: this.build(ast, inputs) }; }
};
