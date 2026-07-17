import { compilePortable } from './compiler-core.mjs';

function error(code, message, extra = {}) {
  return { level: 'error', code, message, ...extra };
}

function stripComments(source) {
  return String(source ?? '').replace(/#[^\n]*/g, '').replace(/\/\/[^\n]*/g, '').trim();
}

function blocks(source, keyword) {
  const out = [];
  const re = new RegExp(`\\b${keyword}\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\{`, 'gi');
  let match;
  while ((match = re.exec(source))) {
    let depth = 1;
    let cursor = re.lastIndex;
    while (cursor < source.length && depth) {
      if (source[cursor] === '{') depth += 1;
      if (source[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    if (depth) throw new SyntaxError(`Unclosed ${keyword} ${match[1]}.`);
    out.push({ name: match[1], body: source.slice(re.lastIndex, cursor - 1), start: match.index, end: cursor });
    re.lastIndex = cursor;
  }
  return out;
}

function integerField(body, name, fallback = null) {
  const match = body.match(new RegExp(`\\b${name}\\s*:\\s*(-?\\d+)`, 'i'));
  return match ? Number(match[1]) : fallback;
}

function identifierField(body, name, fallback = null) {
  const match = body.match(new RegExp(`\\b${name}\\s*:\\s*([A-Za-z_][A-Za-z0-9_]*)`, 'i'));
  return match ? match[1] : fallback;
}

function listField(body, name) {
  const match = body.match(new RegExp(`\\b${name}\\s*:\\s*\\[([^\\]]*)\\]`, 'i'));
  return match ? match[1].split(',').map(value => value.trim()).filter(Boolean) : [];
}

function parseMembrane(body) {
  const match = body.match(/\bmembrane\s*:\s*(hard|soft|porous)(?:\s*\(\s*(?:ε|epsilon)?\s*(?:=|:)?\s*(\d+)\s*\))?/i);
  if (!match) return { kind: 'hard' };
  const membrane = { kind: match[1].toLowerCase() };
  if (match[2] != null) membrane.epsilon = Number(match[2]);
  if (membrane.kind !== 'hard' && !Number.isFinite(membrane.epsilon)) {
    throw new SyntaxError(`${membrane.kind} membrane requires epsilon.`);
  }
  return membrane;
}

export function parseQuadze(source) {
  const normalized = stripComments(source);
  const diagnostics = [];
  if (!normalized) return { ok: false, diagnostics: [error('EMPTY_QUADZE', 'Mini-QUADZE source is empty.')] };

  try {
    const bodyNodes = blocks(normalized, 'body').map(node => ({
      kind: 'body',
      name: node.name,
      localTime: integerField(node.body, 'local_time', 0),
      membrane: parseMembrane(node.body),
      routes: listField(node.body, 'routes')
    }));
    const routeNodes = blocks(normalized, 'route').map(node => ({
      kind: 'route',
      name: node.name,
      cost: integerField(node.body, 'cost'),
      apply: identifierField(node.body, 'apply')
    }));
    const keeperNodes = blocks(normalized, 'keeper').map(node => {
      const rule = node.body.match(/\brule\s*:\s*allow_if\s+([A-Za-z_][A-Za-z0-9_]*)\.local_time\s*(>=|<=|==|!=|>|<)\s*(-?\d+)/i);
      if (!rule) throw new SyntaxError(`Keeper ${node.name} requires allow_if Body.local_time comparator integer.`);
      return { kind: 'keeper', name: node.name, body: rule[1], operator: rule[2], value: Number(rule[3]) };
    });
    const glyphNodes = blocks(normalized, 'glyph').map(node => {
      const window = node.body.match(/\bwindow\s*:\s*\[\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*\]/i);
      if (!window) throw new SyntaxError(`Glyph ${node.name} requires window: [start..end].`);
      return {
        kind: 'glyph', name: node.name,
        window: [Number(window[1]), Number(window[2])],
        latency: integerField(node.body, 'latency', 0),
        hysteresis: integerField(node.body, 'hysteresis', 0)
      };
    });
    const policy = normalized.match(/\bpolicy\s+rejected\s*:\s*(dingandreceipt|ding_and_receipt|ding|notick|no_tick)\b/i);
    if (!bodyNodes.length) diagnostics.push(error('QUADZE_BODY_REQUIRED', 'At least one body declaration is required.'));
    if (!routeNodes.length) diagnostics.push(error('QUADZE_ROUTE_REQUIRED', 'At least one route declaration is required.'));
    if (!policy) diagnostics.push(error('QUADZE_POLICY_REQUIRED', 'A rejected policy is required.'));
    for (const route of routeNodes) {
      if (!Number.isFinite(route.cost)) diagnostics.push(error('QUADZE_ROUTE_COST_REQUIRED', `${route.name} requires integer cost.`));
      if (!route.apply) diagnostics.push(error('QUADZE_ROUTE_APPLY_REQUIRED', `${route.name} requires apply function.`));
    }
    const routeNames = new Set(routeNodes.map(route => route.name));
    for (const body of bodyNodes) {
      for (const route of body.routes) {
        if (!routeNames.has(route)) diagnostics.push(error('QUADZE_UNKNOWN_ROUTE', `${body.name} references unknown route ${route}.`));
      }
    }
    const ast = {
      schema: 'jm.quadze.tier0-native-ast/1.1',
      bodies: bodyNodes, routes: routeNodes, keepers: keeperNodes, glyphs: glyphNodes,
      policy: policy?.[1]?.toLowerCase().replaceAll('_', '') ?? null
    };
    return { ok: diagnostics.length === 0, ast, diagnostics };
  } catch (cause) {
    return { ok: false, diagnostics: [error('QUADZE_PARSE_FAIL', cause.message)] };
  }
}

export function lowerQuadze(ast) {
  const summary = {
    bodies: ast.bodies.map(body => body.name),
    routes: ast.routes.map(route => route.name),
    keepers: ast.keepers.map(keeper => keeper.name),
    glyphs: ast.glyphs.map(glyph => glyph.name),
    policy: ast.policy
  };
  return [
    'BODY quadze',
    'VERSION tier0-native-1.1',
    `SET body_count ${ast.bodies.length}`,
    `SET route_count ${ast.routes.length}`,
    `SET policy ${JSON.stringify(ast.policy)}`,
    'ROUTE quadze.tier0.load',
    `TRACE ${JSON.stringify(summary)}`,
    `ASSERT body_count ${ast.bodies.length}`,
    `ASSERT route_count ${ast.routes.length}`,
    `DING ${JSON.stringify({ body: 'quadze', proof: 'TIER0_NATIVE_SOURCE_LOADED', policy: ast.policy })}`,
    'END'
  ].join('\n');
}

export const QUADZE_NATIVE_ADAPTER = Object.freeze({
  version: '1.1-tier0',
  sourceAuthority: 'QUADZE_TIMEFLOW_LAB_SOLO_v0_3',
  parse: parseQuadze,
  lower: lowerQuadze
});

export function compileQuadzeNative(source, registry) {
  const parsed = parseQuadze(source);
  if (!parsed.ok) return { ok: false, bodyId: 'quadze', status: 'NATIVE_PARSE_FAILED', adapterVersion: QUADZE_NATIVE_ADAPTER.version, parsed, diagnostics: parsed.diagnostics };
  const portableSource = lowerQuadze(parsed.ast);
  const compiled = compilePortable(portableSource, registry);
  return {
    ok: compiled.ok,
    bodyId: 'quadze',
    status: compiled.ok ? 'NATIVE_TO_PORTABLE_TO_RUNTIME_PASS' : 'NATIVE_LOWER_OR_RUNTIME_FAILED',
    adapterVersion: QUADZE_NATIVE_ADAPTER.version,
    parsed,
    portableSource,
    compiled,
    claimBoundary: 'This proves the recovered Mini-QUADZE Tier-0 grammar and runtime-loading contract from QUADZE Timeflow Lab v0.3; it does not claim every future Quadze tier.'
  };
}
