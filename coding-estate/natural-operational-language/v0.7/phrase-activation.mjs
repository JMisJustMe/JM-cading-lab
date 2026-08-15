import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { NaturalWordbookV06 } from '../v0.6/wordbook.mjs';

const MODIFIERS = new Set(['', '!', '?', '~', '.lock', '→']);

function clone(value) {
  return structuredClone(value);
}

function normalWord(value) {
  return String(value ?? '').trim().toLowerCase();
}

function payloadText(payload) {
  if (payload === null || payload === undefined || payload === '') return '';
  if (typeof payload === 'string') return payload.trim();
  need(typeof payload === 'object' && !Array.isArray(payload), 'NOL_V07_BAD_PAYLOAD', 'Activation payload must be text or a key/value object.');
  return Object.entries(payload)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');
}

function activationKey(word, occurrence) {
  return `${normalWord(word)}#${occurrence}`;
}

function validateActivation(raw) {
  const word = normalWord(raw?.word);
  need(/^[a-z][\w-]*$/.test(word), 'NOL_V07_BAD_ACTIVATION_WORD', 'Activation requires an ordinary single word-body.');
  const occurrence = Number(raw?.occurrence ?? 1);
  need(Number.isInteger(occurrence) && occurrence > 0, 'NOL_V07_BAD_OCCURRENCE', 'Activation occurrence must be a positive integer.');
  const modifier = String(raw?.modifier ?? '');
  need(MODIFIERS.has(modifier), 'NOL_V07_BAD_MODIFIER', `Unsupported activation modifier ${modifier}.`);
  const payload = payloadText(raw?.payload);
  return { word, occurrence, modifier, payload };
}

export function compileActivatedPhrase(phrase, activations = []) {
  const source = String(phrase ?? '');
  need(source.trim(), 'NOL_V07_EMPTY_PHRASE', 'Activated phrase source is empty.');
  need(!/;[A-Za-z]/.test(source), 'NOL_V07_EXPECTS_UNMARKED_PHRASE', 'v0.7 phrase activation expects ordinary unmarked source; use the marked-language runner for already-marked source.');
  need(Array.isArray(activations), 'NOL_V07_ACTIVATIONS_ARRAY', 'Activations must be an array.');

  const requested = new Map();
  for (const raw of activations) {
    const activation = validateActivation(raw);
    const key = activationKey(activation.word, activation.occurrence);
    need(!requested.has(key), 'NOL_V07_DUPLICATE_ACTIVATION', `Activation ${key} was supplied more than once.`);
    requested.set(key, activation);
  }

  const counts = new Map();
  const applied = new Set();
  const pattern = /[A-Za-z][\w-]*/g;
  let cursor = 0;
  let marked = '';
  let match;
  while ((match = pattern.exec(source))) {
    marked += source.slice(cursor, match.index);
    const surface = match[0];
    const word = normalWord(surface);
    const occurrence = (counts.get(word) ?? 0) + 1;
    counts.set(word, occurrence);
    const key = activationKey(word, occurrence);
    const activation = requested.get(key);
    if (activation) {
      const payload = activation.payload ? `(${activation.payload})` : '';
      marked += `;${surface}${activation.modifier}${payload};`;
      applied.add(key);
    } else {
      marked += surface;
    }
    cursor = match.index + surface.length;
  }
  marked += source.slice(cursor);

  const missing = [...requested.keys()].filter(key => !applied.has(key));
  need(missing.length === 0, 'NOL_V07_ACTIVATION_NOT_FOUND', `Activation target not found in phrase: ${missing.join(', ')}`, { missing });

  const body = {
    type: 'JM.NaturalOperationalActivatedPhrase.v0.7',
    phrase: source,
    markedSource: marked,
    activations: [...requested.values()].map(clone),
    wordCounts: Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)))
  };
  return { ...body, digest: digest(body) };
}

export class ActivatedPhraseSessionV07 {
  constructor(options = {}) {
    this.wordbook = new NaturalWordbookV06(options);
    this.events = [];
  }

  get state() {
    return this.wordbook.state;
  }

  define(...args) {
    return this.wordbook.define(...args);
  }

  grant(...args) {
    return this.wordbook.grant(...args);
  }

  revoke(...args) {
    return this.wordbook.revoke(...args);
  }

  compile(phrase, activations = []) {
    return compileActivatedPhrase(phrase, activations);
  }

  runPhrase(phrase, activations = [], bindings = {}) {
    const compiled = this.compile(phrase, activations);
    const run = this.wordbook.run(compiled.markedSource, bindings);
    const receiptBody = {
      schema: 'JM.NaturalOperationalActivatedPhraseReceipt.v0.7',
      phraseDigest: compiled.digest,
      markedSource: compiled.markedSource,
      runReceiptDigest: run.receipt.digest,
      changed: run.receipt.changed
    };
    const receipt = { ...receiptBody, digest: digest(receiptBody) };
    this.events.push({ event: 'phrase.run', phrase: String(phrase), phraseDigest: compiled.digest, receiptDigest: receipt.digest, changed: receipt.changed });
    return { compiled, run, state: run.state, receipt };
  }

  undo() {
    return this.wordbook.undo();
  }

  receipt() {
    const parent = this.wordbook.receipt();
    const body = {
      schema: 'JM.NaturalOperationalActivatedPhraseSessionReceipt.v0.7',
      parentDigest: parent.digest,
      stateDigest: digest(this.state),
      events: clone(this.events)
    };
    return { ...body, digest: digest(body) };
  }
}
