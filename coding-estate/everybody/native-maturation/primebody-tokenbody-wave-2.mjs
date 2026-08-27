/*
 * PrimeBody + TokenBody Native Maturation Wave 2
 *
 * Recovered-spec implementation from the bounded TokenBody source-custody proof
 * and PrimeBodyParser.v0.2 / THEO Proof Tool lineage. This is not claimed as a
 * byte-recovered historical implementation.
 */

import { fnv1a } from '../compiler-core.mjs';

export const PRIMEBODY_REQUIRED_ORGANS = Object.freeze([
  'TokenBody', 'GlyphBody', 'RouteFrame', 'StateField',
  'ContactBand', 'FormulaGate', 'Output', 'PunctBody'
]);

const PRESSURE_MARKS = Object.freeze({
  'RECORP?': 'query-inspect',
  'RECORP~': 'soften',
  'RECORP!': 'immediate',
  'RECORP.lock': 'hold-formation',
  'RECORP→': 'route-forward',
  '✓': 'ding',
  'Ø': 'no-route',
  '32÷×&': 'compound-operator',
  'Speakuals': 'relation-operator'
});

export function tokeniseWithCustody(source, { bodyId = 'source:root' } = {}) {
  const text = String(source ?? '');
  const tokens = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  while (offset < text.length) {
    const start = offset;
    const startLine = line;
    const startColumn = column;
    const rest = text.slice(offset);
    let raw;
    let kind;

    const pressure = Object.keys(PRESSURE_MARKS)
      .sort((a, b) => b.length - a.length)
      .find(mark => rest.startsWith(mark));

    if (pressure) {
      raw = pressure;
      kind = 'pressure-mark';
    } else if (rest[0] === '\n') {
      raw = '\n';
      kind = 'newline';
    } else if (/^[ \t\r]/.test(rest)) {
      raw = rest.match(/^[ \t\r]+/)[0];
      kind = 'whitespace';
    } else if (/^[A-Za-z_]/.test(rest)) {
      raw = rest.match(/^[A-Za-z_][A-Za-z0-9_.-]*/)[0];
      kind = 'word';
    } else if (/^[0-9]/.test(rest)) {
      raw = rest.match(/^[0-9]+(?:\.[0-9]+)?/)[0];
      kind = 'number';
    } else if (rest[0] === '[') {
      const close = rest.indexOf(']');
      raw = close >= 0 ? rest.slice(0, close + 1) : '[';
      kind = close >= 0 ? 'punct-group' : 'punctuation';
    } else {
      raw = rest[0];
      kind = 'punctuation';
    }

    for (const char of raw) {
      offset += 1;
      if (char === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }

    tokens.push(Object.freeze({
      raw,
      kind,
      mark: kind === 'pressure-mark' || kind.startsWith('punct') ? raw : null,
      source_span: Object.freeze({ start, end: offset, line: startLine, column: startColumn }),
      pressure: PRESSURE_MARKS[raw] ?? (kind === 'whitespace' && raw.length > 1 ? 'spacing-pressure:WORKING_MODEL' : null),
      body_id: bodyId
    }));
  }

  return Object.freeze({
    schema: 'jm.tokenbody.source-custody/0.3',
    sourceLength: text.length,
    tokens,
    punctbody: Object.freeze(tokens.filter(t => t.mark).map(t => Object.freeze({ raw: t.raw, source_span: t.source_span }))),
    hash: fnv1a(text)
  });
}

export function reconstructTokenBody(custody) {
  return custody.tokens.map(token => token.raw).join('');
}

export function tokenAtOffset(custody, offset) {
  if (!Number.isInteger(offset) || offset < 0 || offset >= custody.sourceLength) return null;
  return custody.tokens.find(token => token.source_span.start <= offset && offset < token.source_span.end) ?? null;
}

export function sourceSlice(source, custody, start, end) {
  const text = String(source ?? '');
  if (start < 0 || end < start || end > text.length) throw new RangeError('Invalid source slice.');
  const covered = custody.tokens.filter(token => token.source_span.end > start && token.source_span.start < end);
  return { text: text.slice(start, end), tokens: covered };
}

export function validateCustody(source, custody) {
  const text = String(source ?? '');
  const diagnostics = [];
  let expected = 0;
  for (const token of custody.tokens) {
    if (token.source_span.start !== expected) diagnostics.push({ code: 'GAP_OR_OVERLAP', expected, actual: token.source_span.start });
    if (text.slice(token.source_span.start, token.source_span.end) !== token.raw) diagnostics.push({ code: 'SPAN_RAW_MISMATCH', span: token.source_span });
    expected = token.source_span.end;
  }
  if (expected !== text.length) diagnostics.push({ code: 'FINAL_SPAN_MISMATCH', expected: text.length, actual: expected });
  if (reconstructTokenBody(custody) !== text) diagnostics.push({ code: 'ROUNDTRIP_MISMATCH' });
  return { ok: diagnostics.length === 0, diagnostics, zeroGap: diagnostics.every(d => d.code !== 'GAP_OR_OVERLAP'), exactRoundTrip: reconstructTokenBody(custody) === text };
}

export function parsePrimeBodyV02(source) {
  const text = String(source ?? '').replace(/\r\n?/g, '\n');
  const outer = text.match(/^\s*PrimeBody\s*\{([\s\S]*)\}\s*$/);
  if (!outer) return failed('PrimeBody wrapper required.');

  const organs = Object.create(null);
  const malformed_lines = [];
  const duplicate_organs = [];
  const unknown_organs = [];

  for (const rawLine of outer[1].split('\n')) {
    if (!rawLine.trim()) continue;
    const match = rawLine.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!match) {
      malformed_lines.push(rawLine.trim());
      continue;
    }
    const [, name, value] = match;
    if (!PRIMEBODY_REQUIRED_ORGANS.includes(name)) unknown_organs.push(name);
    if (Object.prototype.hasOwnProperty.call(organs, name)) duplicate_organs.push(name);
    organs[name] = value;
  }

  const missing = PRIMEBODY_REQUIRED_ORGANS.filter(name => !Object.prototype.hasOwnProperty.call(organs, name));
  const empty = PRIMEBODY_REQUIRED_ORGANS.filter(name => Object.prototype.hasOwnProperty.call(organs, name) && organs[name] === '');
  const checks = {
    allrequiredorgans_present: missing.length === 0,
    noduplicateorgans: duplicate_organs.length === 0,
    noemptyvalues: empty.length === 0,
    punctbody_present: Object.prototype.hasOwnProperty.call(organs, 'PunctBody'),
    punctbody_nonempty: Boolean(organs.PunctBody),
    nounknownorgans: unknown_organs.length === 0,
    nomalformedlines: malformed_lines.length === 0
  };
  const success = Object.values(checks).every(Boolean);

  return {
    kind: 'PrimeBodyParse.v0.2',
    status: success ? 'success' : 'failed',
    source_body: 'PrimeBody',
    parser: 'PrimeBodyParser.v0.2-recovered-spec',
    organs,
    checks,
    build_permission: success,
    diagnostics: { missing, empty, duplicate_organs, unknown_organs, malformed_lines },
    source_custody: tokeniseWithCustody(text, { bodyId: 'PrimeBody' }),
    claimBoundary: 'Recovered-spec implementation; not byte-recovered historical parser source.'
  };
}

function failed(message) {
  return {
    kind: 'PrimeBodyParse.v0.2',
    status: 'failed',
    source_body: 'PrimeBody',
    parser: 'PrimeBodyParser.v0.2-recovered-spec',
    organs: {},
    checks: {},
    build_permission: false,
    diagnostics: { wrapper: message },
    claimBoundary: 'Recovered-spec implementation; not byte-recovered historical parser source.'
  };
}
