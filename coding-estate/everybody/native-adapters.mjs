import { compilePortable } from './compiler-core.mjs';

const MMZG_ALLOWED = Object.freeze({
  zg: ['HOLD', 'GO', 'HINGE', 'NEW', 'OLD', 'BOND'],
  channel: ['CH0', 'CH1', 'CH2', 'CH3', 'CH4', 'CH5'],
  path: ['open', 'shift', 'tighten', 'reject', 'prove', 'bind', 'split', 'carry', 'hinge', 'resolve', 'upgrade', 'IPMF'],
  trace: ['repeat', 'receipt', 'difference', 'body', 'surface', 'runtime', 'lineage', 'proof', 'ding'],
  palm: ['hold', 'reject', 'IPMF', 'current-best', 'crown', 'living']
});

function diagnostic(code, message, extra = {}) {
  return { level: 'error', code, message, ...extra };
}

function portable(body, statements) {
  return [`BODY ${body}`, 'VERSION native-adapter-0.2', ...statements, 'END'].join('\n');
}

function normaliseCading(source) {
  return String(source ?? '').trim().replace(/\s+/g, ' ');
}

export function parseCading(source) {
  const raw = normaliseCading(source);
  const diagnostics = [];
  if (!raw) return { ok: false, diagnostics: [diagnostic('EMPTY_CADING', 'Cading source is empty.')] };

  let line = raw;
  let completion = 'open';
  if (line.endsWith('.✓')) {
    completion = 'fullstopped';
    line = line.slice(0, -2).trim();
  } else if (line.endsWith('.')) {
    completion = 'foolstopped';
    line = line.slice(0, -1).trim();
    diagnostics.push(diagnostic('FOOLSTOPPED', 'Cading line stopped without validated completion.'));
  } else {
    diagnostics.push(diagnostic('FULLSTOP_REQUIRED', 'Cading native proof requires .✓ completion.'));
  }

  const equals = [...line.matchAll(/=/g)];
  if (equals.length !== 1) diagnostics.push(diagnostic('SPEAKUALS_COUNT', 'Cading native proof requires exactly one Speakuals = operator.'));
  const splitAt = line.indexOf('=');
  const left = splitAt >= 0 ? line.slice(0, splitAt).trim() : line;
  const landing = splitAt >= 0 ? line.slice(splitAt + 1).trim() : '';
  if (!left) diagnostics.push(diagnostic('LEFT_REQUIRED', 'Cading source side is empty.'));
  if (!landing) diagnostics.push(diagnostic('LANDING_REQUIRED', 'Speakuals landing is empty.'));

  const variants = left.split(',').map(item => item.trim()).filter(Boolean);
  const operators = ['Ø', '32÷×&', 'NOTA', '{pre}', '{post}'].filter(operator => raw.includes(operator));
  const ast = {
    schema: 'jm.cading.native-ast/0.2',
    raw,
    source: left,
    variants,
    landing,
    completion,
    operators
  };
  return { ok: diagnostics.length === 0 && completion === 'fullstopped', ast, diagnostics };
}

export function lowerCading(ast) {
  return portable('cading', [
    `SET variant_count ${ast.variants.length}`,
    `SET landing ${JSON.stringify(ast.landing)}`,
    'ROUTE cading.speakuals',
    `TRACE ${JSON.stringify({ syntax: 'Cading', operators: ast.operators, source: ast.source, landing: ast.landing, completion: ast.completion })}`,
    `ASSERT variant_count ${ast.variants.length}`,
    `DING ${JSON.stringify({ body: 'cading', completion: ast.completion, landing: ast.landing })}`
  ]);
}

export function parseSpeakuals(source) {
  const raw = String(source ?? '').trim();
  const diagnostics = [];
  const full = raw.endsWith('.✓');
  const line = full ? raw.slice(0, -2).trim() : raw;
  const pieces = line.split('=');
  if (!full) diagnostics.push(diagnostic('FULLSTOP_REQUIRED', 'Speakuals proof requires .✓ completion.'));
  if (pieces.length !== 2) diagnostics.push(diagnostic('ONE_RELATION_REQUIRED', 'Speakuals requires one left = landing relation.'));
  const left = pieces[0]?.trim() ?? '';
  const landing = pieces[1]?.trim() ?? '';
  if (!left || !landing) diagnostics.push(diagnostic('RELATION_SIDE_MISSING', 'Both Speakuals sides are required.'));
  return {
    ok: diagnostics.length === 0,
    ast: { schema: 'jm.speakuals.native-ast/0.2', raw, left, landing, fullstopped: full },
    diagnostics
  };
}

export function lowerSpeakuals(ast) {
  return portable('speakuals', [
    `SET relation ${JSON.stringify(`${ast.left} = ${ast.landing}`)}`,
    'ROUTE speakuals.landing',
    `TRACE ${JSON.stringify({ left: ast.left, landing: ast.landing, fullstopped: ast.fullstopped })}`,
    `ASSERT relation ${JSON.stringify(`${ast.left} = ${ast.landing}`)}`,
    `DING ${JSON.stringify({ body: 'speakuals', landing: ast.landing })}`
  ]);
}

function normaliseMmzg(source) {
  return String(source ?? '')
    .replace(/\r/g, '\n')
    .replace(/M-/g, 'M−')
    .replace(/PathΔ/g, 'PΔ')
    .replace(/->/g, '→')
    .replace(/[◇◈]/g, '⟐')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMmzg(source) {
  const normalized = normaliseMmzg(source);
  const expression = /ZG\s*\[\s*([^\]]+?)\s*\]\s*@\s*(CH[0-5])\s*::\s*M[−-]\s*\[\s*([^\]]*?)\s*\]\s*\+\s*I\s*\[\s*([^\]]*?)\s*\]\s*⟐\s*F\s*\[\s*([^\]]*?)\s*\]\s*→\s*JM\?\s*\[\s*([^\]]*?)\s*\]\s*→\s*PΔ\s*\[\s*([^\]]*?)\s*\]\s*→\s*T✓\s*\[\s*([^\]]*?)\s*\]\s*→\s*PALM\s*\[\s*([^\]]*?)\s*\]/i;
  const match = normalized.match(expression);
  if (!match) return { ok: false, diagnostics: [diagnostic('MMZG_PARSE_FAIL', 'Use ZG[] @ CHn :: M−[] + I[] ⟐ F[] → JM?[] → PΔ[] → T✓[] → PALM[].')] };

  const [pathOperator, ...pathTarget] = match[7].trim().split(':');
  const [traceOperator, ...traceTarget] = match[8].trim().split(':');
  const ast = {
    schema: 'jm.mmzg.native-ast/0.2',
    normalized,
    zeroGrip: match[1].trim().toUpperCase(),
    channel: match[2].trim().toUpperCase(),
    signal: match[3].trim(),
    focus: match[4].trim(),
    field: match[5].trim(),
    pressure: match[6].trim(),
    path: { operator: pathOperator, target: pathTarget.join(':') },
    trace: { operator: traceOperator, target: traceTarget.join(':') },
    palm: match[9].trim()
  };
  const diagnostics = [];
  if (!MMZG_ALLOWED.zg.includes(ast.zeroGrip)) diagnostics.push(diagnostic('BAD_ZG', ast.zeroGrip));
  if (!MMZG_ALLOWED.channel.includes(ast.channel)) diagnostics.push(diagnostic('BAD_CHANNEL', ast.channel));
  if (!MMZG_ALLOWED.path.includes(ast.path.operator)) diagnostics.push(diagnostic('BAD_PATH_DELTA', ast.path.operator));
  if (!MMZG_ALLOWED.trace.includes(ast.trace.operator)) diagnostics.push(diagnostic('BAD_TRACE', ast.trace.operator));
  if (!MMZG_ALLOWED.palm.includes(ast.palm)) diagnostics.push(diagnostic('BAD_PALM', ast.palm));
  if (!ast.signal) diagnostics.push(diagnostic('SIGNAL_REQUIRED', 'M− signal cannot be empty.'));
  return { ok: diagnostics.length === 0, ast, diagnostics };
}

export function lowerMmzg(ast) {
  return portable('mmzg', [
    'SET executions 0',
    'ADD executions 1',
    `SET channel ${JSON.stringify(ast.channel)}`,
    `ROUTE mmzg.${ast.channel.toLowerCase()}.${ast.path.operator}`,
    `TRACE ${JSON.stringify({ zeroGrip: ast.zeroGrip, signal: ast.signal, focus: ast.focus, field: ast.field, pressure: ast.pressure, path: ast.path, trace: ast.trace, palm: ast.palm })}`,
    'ASSERT executions 1',
    `DING ${JSON.stringify({ body: 'mmzg', trace: ast.trace.operator, palm: ast.palm })}`
  ]);
}

export const NATIVE_ADAPTERS = Object.freeze({
  cading: { version: '0.2', parse: parseCading, lower: lowerCading },
  mmzg: { version: '0.2', parse: parseMmzg, lower: lowerMmzg },
  speakuals: { version: '0.2', parse: parseSpeakuals, lower: lowerSpeakuals }
});

export function compileNative(bodyId, source, registry) {
  const adapter = NATIVE_ADAPTERS[bodyId];
  if (!adapter) {
    return {
      ok: false,
      bodyId,
      status: 'NATIVE_ADAPTER_NOT_RECOVERED',
      diagnostics: [diagnostic('NATIVE_ADAPTER_NOT_RECOVERED', `No exact native parser is registered for ${bodyId}; portable execution remains available without pretending native parity.`)]
    };
  }
  const parsed = adapter.parse(source);
  if (!parsed.ok) return { ok: false, bodyId, status: 'NATIVE_PARSE_FAILED', adapterVersion: adapter.version, parsed, diagnostics: parsed.diagnostics };
  const portableSource = adapter.lower(parsed.ast);
  const compiled = compilePortable(portableSource, registry);
  return {
    ok: compiled.ok,
    bodyId,
    status: compiled.ok ? 'NATIVE_TO_PORTABLE_TO_RUNTIME_PASS' : 'NATIVE_LOWER_OR_RUNTIME_FAILED',
    adapterVersion: adapter.version,
    parsed,
    portableSource,
    compiled,
    claimBoundary: 'This proves the registered native subset and its lowering contract, not every historical feature of the body.'
  };
}
