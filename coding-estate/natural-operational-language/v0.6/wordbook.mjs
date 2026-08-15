import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { CreatorRoomSessionV05, contextFromRoomBindings } from '../v0.5/room-controller.mjs';
import { resolvePlaceReference } from '../v0.3/context-room.mjs';

const CANONICAL_ROLES = Object.freeze({
  open: { office: 'state-action', operation: 'set-open', description: 'Make the contacted body open.' },
  close: { office: 'state-action', operation: 'set-closed', description: 'Make the contacted body closed.' },
  move: { office: 'route-action', operation: 'move-to', description: 'Move the contacted body to an explicitly supplied destination.' },
  hold: { office: 'state-action', operation: 'hold-body', description: 'Hold the contacted body.' }
});

const RESERVED = new Set(['and', 'recorp']);

function clone(value) {
  return structuredClone(value);
}

function normalWord(value) {
  return String(value ?? '').trim().toLowerCase();
}

function safeWord(value) {
  const word = normalWord(value);
  need(/^[a-z][\w-]*$/.test(word), 'NOL_V06_BAD_WORD', 'Wordbook words must be ordinary single word-bodies using letters, numbers, underscore or hyphen.');
  return word;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function snapshotBody(definitions) {
  return {
    schema: 'JM.NaturalOperationalWordbook.v0.6',
    definitions: [...definitions.values()].map(clone).sort((a, b) => a.word.localeCompare(b.word))
  };
}

export class NaturalWordbookV06 {
  constructor({ state = {}, session = 'creator-room-v0.6' } = {}) {
    this.room = new CreatorRoomSessionV05({ state, session });
    this.definitions = new Map();
    this.events = [];
  }

  get state() {
    return this.room.state;
  }

  define(wordValue, { as, description = '', note = '' } = {}) {
    const word = safeWord(wordValue);
    const canonical = normalWord(as);
    need(!RESERVED.has(word), 'NOL_V06_RESERVED_WORD', `${word} carries recovered/native custody and cannot be rebound through the local wordbook.`);
    need(!this.definitions.has(word), 'NOL_V06_WORD_EXISTS', `${word} already has a local wordbook definition.`);
    const role = CANONICAL_ROLES[canonical];
    need(role, 'NOL_V06_UNKNOWN_CANONICAL_ROLE', `Unknown canonical role ${canonical}. v0.6 only authors against proven local primitives: ${Object.keys(CANONICAL_ROLES).join(', ')}.`);

    const definition = {
      schema: 'JM.NaturalOperationalWordDefinition.v0.6',
      word,
      canonical,
      office: role.office,
      operation: role.operation,
      evidence: 'owner-authored-local-wordbook',
      identityPolicy: 'preserve-contacted-body',
      description: String(description || `${word} uses the declared ${canonical} role. ${role.description}`),
      note: String(note ?? '')
    };
    const sealed = { ...definition, digest: digest(definition) };
    this.definitions.set(word, sealed);
    this.room.room.register(word, definition);
    this.events.push({ event: 'word.define', word, canonical, digest: sealed.digest });
    return clone(sealed);
  }

  has(word) {
    return this.definitions.has(normalWord(word));
  }

  get(word) {
    const value = this.definitions.get(normalWord(word));
    return value ? clone(value) : null;
  }

  prepareSource(source, bindings = {}) {
    let prepared = String(source);
    const context = contextFromRoomBindings(bindings);
    for (const definition of this.definitions.values()) {
      if (definition.canonical !== 'move') continue;
      const escaped = escapeRegExp(definition.word);
      const naturalMove = new RegExp(`;${escaped}(\\.lock|[!?~→])?;\\s+([^;()]+?)\\s+to\\s+([^;()]+?)(?=\\s*;and;|\\)|$)`, 'gi');
      prepared = prepared.replace(naturalMove, (_whole, modifier = '', target, rawDestination) => {
        const destination = resolvePlaceReference(String(rawDestination).trim(), context, []);
        return `;${definition.word}${modifier || ''}(to=${destination}); ${String(target).trim()}`;
      });
    }
    return prepared;
  }

  run(source, bindings = {}) {
    const inputSource = String(source);
    const preparedSource = this.prepareSource(inputSource, bindings);
    const result = this.room.run(preparedSource, bindings);
    this.events.push({ event: 'wordbook.run', inputSource, preparedSource, receiptDigest: result.receipt.digest, changed: result.receipt.changed });
    return { ...result, inputSource, preparedSource };
  }

  undo() {
    const result = this.room.undo();
    this.events.push({ event: 'wordbook.undo', changed: result.changed });
    return result;
  }

  grant(bodyId) {
    return this.room.grant(bodyId);
  }

  revoke(bodyId) {
    return this.room.revoke(bodyId);
  }

  contact(source, bodyId, bindings = {}, options = {}) {
    return this.room.contact(source, bodyId, bindings, options);
  }

  federate(source, bodyIds, bindings = {}, options = {}) {
    return this.room.federate(source, bodyIds, bindings, options);
  }

  exportWordbook() {
    const body = snapshotBody(this.definitions);
    return { ...body, digest: digest(body) };
  }

  importWordbook(snapshot) {
    need(snapshot?.schema === 'JM.NaturalOperationalWordbook.v0.6', 'NOL_V06_BAD_WORDBOOK', 'Wordbook import requires a v0.6 snapshot.');
    const body = { schema: snapshot.schema, definitions: clone(snapshot.definitions ?? []) };
    need(snapshot.digest === digest(body), 'NOL_V06_WORDBOOK_DIGEST_MISMATCH', 'Wordbook snapshot digest does not match its declared body.');
    for (const definition of body.definitions) {
      const canonical = normalWord(definition.canonical);
      const role = CANONICAL_ROLES[canonical];
      need(role, 'NOL_V06_UNKNOWN_CANONICAL_ROLE', `Imported role ${canonical} is not available.`);
      const word = safeWord(definition.word);
      need(!RESERVED.has(word), 'NOL_V06_RESERVED_WORD', `${word} cannot be imported over recovered/native custody.`);
      const expected = {
        schema: 'JM.NaturalOperationalWordDefinition.v0.6',
        word,
        canonical,
        office: role.office,
        operation: role.operation,
        evidence: 'owner-authored-local-wordbook',
        identityPolicy: 'preserve-contacted-body',
        description: String(definition.description ?? ''),
        note: String(definition.note ?? '')
      };
      const sealed = { ...expected, digest: digest(expected) };
      this.definitions.set(word, sealed);
      this.room.room.register(word, expected);
    }
    this.events.push({ event: 'wordbook.import', count: body.definitions.length, digest: snapshot.digest });
    return this.exportWordbook();
  }

  receipt() {
    const wordbook = this.exportWordbook();
    const body = {
      schema: 'JM.NaturalOperationalWordbookSessionReceipt.v0.6',
      wordbookDigest: wordbook.digest,
      wordCount: wordbook.definitions.length,
      roomReceiptDigest: this.room.receipt().digest,
      stateDigest: digest(this.state),
      events: clone(this.events)
    };
    return { ...body, digest: digest(body) };
  }
}

export const WORD_CANONICAL_ROLES_V06 = CANONICAL_ROLES;
