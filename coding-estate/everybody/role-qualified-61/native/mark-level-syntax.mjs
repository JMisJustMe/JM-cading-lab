/*
 * Mark-Level Syntax — Authorised Forward Native Bridge v1.0
 *
 * SOURCE TRUTH:
 * - Recovered identity: marks are first-class executable syntax rather than decoration.
 * - Recovered capabilities: marks, syntax, tokens.
 * - Historical original grammar/source was NOT recovered in the 27 Aug 2026 P0 archaeology pass.
 *
 * Therefore this module is a DECLARED FORWARD DESCENDANT. It must yield to stronger
 * recovered historical source if such source is later found.
 */

export const MARK_LEVEL_BRIDGE = Object.freeze({
  schema: 'jm.mark-level-syntax.forward-native/1.0',
  status: 'AUTHORISED_FORWARD_NATIVE_BRIDGE',
  historicalRecoveryClaim: false,
  law: 'Marks are first-class executable syntax rather than decoration.'
});

export class MarkLevelError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'MarkLevelError';
    this.code = code;
    this.details = details;
  }
}

function need(condition, code, message, details = {}) {
  if (!condition) throw new MarkLevelError(code, message, details);
}

function valueOf(raw) {
  const text = String(raw).trim();
  try { return JSON.parse(text); } catch {}
  if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return Number(text);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  return text;
}

function parseAction(raw) {
  const text = String(raw).trim();
  let match = text.match(/^set\s+([A-Za-z_][\w.]*)\s+(.+)$/);
  if (match) return { type: 'set', path: match[1], value: valueOf(match[2]) };
  match = text.match(/^add\s+([A-Za-z_][\w.]*)\s+(-?(?:\d+(?:\.\d+)?|\.\d+))$/);
  if (match) return { type: 'add', path: match[1], value: Number(match[2]) };
  match = text.match(/^trace\s+(.+)$/);
  if (match) return { type: 'trace', value: valueOf(match[1]) };
  match = text.match(/^route\s+([A-Za-z_][\w.-]*)$/);
  if (match) return { type: 'route', name: match[1] };
  match = text.match(/^ding(?:\s+(.+))?$/);
  if (match) return { type: 'ding', value: valueOf(match[1] ?? '"MARK_LEVEL_DING"') };
  throw new MarkLevelError('MLS_BAD_ACTION', `Unsupported mark action: ${text}`);
}

function setPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = value;
}

function getPath(target, path) {
  return path.split('.').reduce((value, part) => value?.[part], target);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

export function parseMarkLevel(source) {
  need(typeof source === 'string' && source.trim(), 'MLS_EMPTY_SOURCE', 'Mark-Level Syntax source is empty.');

  const marks = [];
  const programs = [];
  const diagnostics = [];

  for (const rawLine of source.replace(/\r/g, '').split('\n')) {
    const line = rawLine.replace(/\s*(?:#|\/\/).*$/, '').trim();
    if (!line) continue;

    let match = line.match(/^mark\s+([A-Za-z_][\w.-]*)\s*=\s*("(?:\\.|[^"\\])*")\s*=>\s*(.+)$/);
    if (match) {
      const glyph = valueOf(match[2]);
      need(typeof glyph === 'string' && glyph.length > 0, 'MLS_EMPTY_GLYPH', `Mark ${match[1]} requires a non-empty glyph.`);
      marks.push({ type: 'MLSMark', name: match[1], glyph, action: parseAction(match[3]) });
      continue;
    }

    match = line.match(/^program\s+([A-Za-z_][\w.-]*)\s*=\s*("(?:\\.|[^"\\])*")$/);
    if (match) {
      programs.push({ type: 'MLSProgramSource', name: match[1], source: valueOf(match[2]) });
      continue;
    }

    diagnostics.push({ level: 'error', code: 'MLS_UNKNOWN_DECLARATION', line: rawLine });
  }

  need(diagnostics.length === 0, 'MLS_PARSE_ERRORS', 'Mark-Level Syntax contains unknown declarations.', { diagnostics });
  need(marks.length > 0, 'MLS_NO_MARKS', 'Mark-Level Syntax requires at least one mark declaration.');
  need(programs.length > 0, 'MLS_NO_PROGRAMS', 'Mark-Level Syntax requires at least one program declaration.');

  const markNames = new Set();
  const glyphs = new Set();
  for (const mark of marks) {
    need(!markNames.has(mark.name), 'MLS_DUPLICATE_MARK_NAME', `Duplicate mark name ${mark.name}.`);
    need(!glyphs.has(mark.glyph), 'MLS_DUPLICATE_GLYPH', `Duplicate mark glyph ${JSON.stringify(mark.glyph)}.`);
    markNames.add(mark.name);
    glyphs.add(mark.glyph);
  }
  const programNames = new Set();
  for (const program of programs) {
    need(!programNames.has(program.name), 'MLS_DUPLICATE_PROGRAM', `Duplicate program ${program.name}.`);
    programNames.add(program.name);
  }

  return { type: 'MarkLevelModule', marks, programs, bridge: MARK_LEVEL_BRIDGE };
}

export function lexMarkProgram(module, programName) {
  need(module?.type === 'MarkLevelModule', 'MLS_BAD_MODULE', 'Mark-Level lexer requires a parsed module.');
  const program = module.programs.find(item => item.name === programName) ?? module.programs[0];
  need(program, 'MLS_UNKNOWN_PROGRAM', `Unknown Mark-Level program ${programName}.`);

  const ordered = [...module.marks].sort((a, b) => b.glyph.length - a.glyph.length || a.name.localeCompare(b.name));
  const tokens = [];
  let offset = 0;
  while (offset < program.source.length) {
    const mark = ordered.find(candidate => program.source.startsWith(candidate.glyph, offset));
    need(mark, 'MLS_UNKNOWN_GLYPH', `No declared mark matches source at offset ${offset}.`, {
      offset,
      remainder: program.source.slice(offset, offset + 16)
    });
    tokens.push({ type: 'MLSMarkToken', index: tokens.length, offset, mark: mark.name, glyph: mark.glyph });
    offset += mark.glyph.length;
  }
  return { type: 'MLSMarkTokenStream', program: program.name, source: program.source, tokens };
}

export function lowerMarkLevel(module, tokenStream) {
  need(tokenStream?.type === 'MLSMarkTokenStream', 'MLS_BAD_TOKEN_STREAM', 'Mark-Level lowering requires a mark token stream.');
  const byName = new Map(module.marks.map(mark => [mark.name, mark]));
  const operations = tokenStream.tokens.map(token => {
    const mark = byName.get(token.mark);
    need(mark, 'MLS_TOKEN_MARK_MISSING', `Token refers to missing mark ${token.mark}.`);
    return {
      type: 'MLSOperation',
      index: token.index,
      mark: mark.name,
      glyph: mark.glyph,
      action: structuredClone(mark.action)
    };
  });
  return {
    type: 'MLSExecutableMarkIR',
    schema: 'jm.mark-level-syntax.ir/1.0',
    program: tokenStream.program,
    operations,
    sourceTruth: 'AUTHORISED_FORWARD_NATIVE_BRIDGE_NOT_HISTORICAL_ORIGINAL'
  };
}

export function executeMarkLevel(ir, initialState = {}) {
  need(ir?.type === 'MLSExecutableMarkIR', 'MLS_BAD_IR', 'Mark-Level runtime requires executable mark IR.');
  const state = structuredClone(initialState);
  const trace = [];
  const routes = [];
  const dings = [];

  for (const operation of ir.operations) {
    const action = operation.action;
    const event = { index: operation.index, mark: operation.mark, glyph: operation.glyph, action: structuredClone(action) };
    if (action.type === 'set') setPath(state, action.path, structuredClone(action.value));
    else if (action.type === 'add') {
      const current = getPath(state, action.path) ?? 0;
      need(typeof current === 'number' && Number.isFinite(current), 'MLS_ADD_NON_NUMBER', `${action.path} is not numeric.`);
      setPath(state, action.path, current + action.value);
    } else if (action.type === 'trace') trace.push({ ...event, value: structuredClone(action.value) });
    else if (action.type === 'route') routes.push({ ...event, route: action.name });
    else if (action.type === 'ding') dings.push({ ...event, value: structuredClone(action.value) });
    else throw new MarkLevelError('MLS_UNKNOWN_RUNTIME_ACTION', `Unknown runtime action ${action.type}.`);
    trace.push({ ...event, state: stable(state) });
  }

  return {
    type: 'MLSRuntimeResult',
    ok: true,
    state: stable(state),
    routes,
    dings,
    trace,
    bridge: MARK_LEVEL_BRIDGE,
    claimBoundary: 'Executable current-native Mark-Level descendant; historical-original grammar remains open.'
  };
}

export function executeMarkLevelSource(source, programName, initialState = {}) {
  const ast = parseMarkLevel(source);
  const tokens = lexMarkProgram(ast, programName);
  const ir = lowerMarkLevel(ast, tokens);
  const runtime = executeMarkLevel(ir, initialState);
  return { ast, tokens, ir, runtime };
}
