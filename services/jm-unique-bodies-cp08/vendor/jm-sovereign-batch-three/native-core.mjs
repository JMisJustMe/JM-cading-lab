export class NativeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'NativeError';
    this.code = code;
    this.details = details;
  }
}
export function need(condition, code, message, details = {}) {
  if (!condition) throw new NativeError(code, message, details);
}
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export function digest(value) {
  const text = typeof value === 'string' ? value : stable(value);
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}
export function valueOf(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try { return JSON.parse(text.replace(/'/g, '"')); } catch {}
  }
  return text;
}
export function listOf(raw) {
  const text = String(raw ?? '').trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!text) return [];
  return splitTop(text).map(valueOf);
}
export function splitTop(text, delimiter = ',') {
  const out = [];
  let depth = 0, quote = '', start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    else if (ch === delimiter && depth === 0) {
      out.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}
export function getPath(object, path) {
  return String(path).split('.').filter(Boolean).reduce((value, key) => value == null ? undefined : value[key], object);
}
export function setPath(object, path, value) {
  const keys = String(path).split('.').filter(Boolean);
  need(keys.length, 'EMPTY_PATH', 'State path cannot be empty.');
  let cursor = object;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys.at(-1)] = value;
  return value;
}
export function blocks(source, keyword) {
  const output = [];
  const pattern = new RegExp(`\\b${keyword}\\s+([A-Za-z_][\\w.-]*)(?:\\s*\\(([^)]*)\\))?\\s*\\{`, 'g');
  let match;
  while ((match = pattern.exec(source))) {
    const open = pattern.lastIndex - 1;
    let depth = 1, quote = '', index = open + 1;
    for (; index < source.length && depth; index += 1) {
      const ch = source[index];
      if (quote) {
        if (ch === '\\') index += 1;
        else if (ch === quote) quote = '';
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
    }
    need(depth === 0, 'UNCLOSED_BLOCK', `Unclosed ${keyword} block ${match[1]}.`);
    output.push({ name: match[1], params: match[2] ?? '', body: source.slice(open + 1, index - 1), start: match.index, end: index });
    pattern.lastIndex = index;
  }
  return output;
}
export function linesOf(body) {
  return String(body).split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
}
export function assignments(body) {
  const result = {};
  for (const line of linesOf(body)) {
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*(?::|=)\s*(.+)$/);
    if (match) result[match[1]] = valueOf(match[2]);
  }
  return result;
}
export function compare(left, op, right) {
  return ({'==': left === right, '!=': left !== right, '>': left > right, '<': left < right, '>=': left >= right, '<=': left <= right})[op];
}
export function evalCondition(text, state = {}) {
  const raw = String(text).trim();
  for (const logical of [' or ', ' and ']) {
    const index = raw.indexOf(logical);
    if (index > -1) {
      const left = evalCondition(raw.slice(0, index), state);
      const right = evalCondition(raw.slice(index + logical.length), state);
      return logical.trim() === 'or' ? left || right : left && right;
    }
  }
  if (raw.startsWith('not ')) return !evalCondition(raw.slice(4), state);
  const match = raw.match(/^([A-Za-z_][\w.]*)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (match) {
    const rightText = match[3].trim();
    const right = /^[A-Za-z_][\w.]*$/.test(rightText) && !['true','false','null'].includes(rightText)
      ? getPath(state, rightText)
      : valueOf(rightText);
    return compare(getPath(state, match[1]), match[2], right);
  }
  return Boolean(getPath(state, raw));
}
export function parseAction(text) {
  const raw = String(text).trim().replace(/;$/, '');
  if (raw === 'end') return { type: 'end' };
  const assign = raw.match(/^([A-Za-z_][\w.]*)\s*(=|\+=|-=)\s*(.+)$/);
  if (assign) return { type: 'assign', path: assign[1], op: assign[2], value: valueOf(assign[3]) };
  const route = raw.match(/^route\s+([A-Za-z_][\w.-]*)$/);
  if (route) return { type: 'route', value: route[1] };
  const emit = raw.match(/^emit\s+([A-Za-z_][\w.-]*)$/);
  if (emit) return { type: 'emit', value: emit[1] };
  const show = raw.match(/^(?:show|say)\s+(.+)$/);
  if (show) return { type: 'show', value: valueOf(show[1]) };
  throw new NativeError('INVALID_ACTION', `Cannot parse action: ${raw}`);
}
export function applyAction(action, state, trace = null) {
  trace?.emit('action.begin', action);
  let result;
  if (action.type === 'assign') {
    const current = getPath(state, action.path);
    const next = action.op === '=' ? action.value : action.op === '+=' ? Number(current ?? 0) + Number(action.value) : Number(current ?? 0) - Number(action.value);
    result = setPath(state, action.path, next);
  } else if (action.type === 'route') result = state.nextRoute = action.value;
  else if (action.type === 'emit') result = (state.events ??= []).push(action.value);
  else if (action.type === 'show') result = (state.messages ??= []).push(action.value);
  else if (action.type === 'end') result = state.ended = true;
  else throw new NativeError('UNKNOWN_ACTION', action.type);
  trace?.emit('action.end', { action, result });
  return result;
}
export class Trace {
  constructor(body) { this.body = body; this.events = []; }
  emit(type, payload = {}) {
    const event = { index: this.events.length, body: this.body, type, payload };
    event.digest = digest(event);
    this.events.push(event);
    return event;
  }
  receipt(claim, result) {
    return { schema: 'jm.native.receipt/1.0', body: this.body, claim, eventCount: this.events.length, traceDigest: digest(this.events), resultDigest: digest(result) };
  }
}
function formulaTokens(source) {
  const tokens = String(source).match(/\d+(?:\.\d+)?|[A-Za-z_][\w.]*|[()+\-*/]/g) ?? [];
  need(tokens.join('').replace(/\s/g,'') === String(source).replace(/\s/g,''), 'FORMULA_BAD_TOKEN', `Invalid formula ${source}.`);
  return tokens;
}
export function evalFormula(source, vars = {}) {
  const tokens = formulaTokens(source);
  const out = [], ops = [];
  const prec = {'+':1,'-':1,'*':2,'/':2};
  for (const token of tokens) {
    if (/^\d/.test(token) || /^[A-Za-z_]/.test(token)) out.push(token);
    else if (token === '(') ops.push(token);
    else if (token === ')') {
      while (ops.length && ops.at(-1) !== '(') out.push(ops.pop());
      need(ops.pop() === '(', 'FORMULA_PAREN', 'Unbalanced formula parentheses.');
    } else {
      while (ops.length && prec[ops.at(-1)] >= prec[token]) out.push(ops.pop());
      ops.push(token);
    }
  }
  while (ops.length) {
    const op = ops.pop(); need(op !== '(', 'FORMULA_PAREN', 'Unbalanced formula parentheses.'); out.push(op);
  }
  const stack = [];
  for (const token of out) {
    if (/^\d/.test(token)) stack.push(Number(token));
    else if (/^[A-Za-z_]/.test(token)) {
      const value = getPath(vars, token);
      need(Number.isFinite(Number(value)), 'FORMULA_UNKNOWN_VAR', `Unknown numeric formula variable ${token}.`);
      stack.push(Number(value));
    } else {
      const b = stack.pop(), a = stack.pop();
      need(Number.isFinite(a) && Number.isFinite(b), 'FORMULA_STACK', 'Malformed formula.');
      stack.push(token === '+' ? a+b : token === '-' ? a-b : token === '*' ? a*b : a/b);
    }
  }
  need(stack.length === 1 && Number.isFinite(stack[0]), 'FORMULA_RESULT', 'Formula did not yield one finite value.');
  return stack[0];
}
