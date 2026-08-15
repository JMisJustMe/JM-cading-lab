import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { NaturalOperationalCreatorSurfaceV10 } from '../v1.0/creator-surface.mjs';

export const ROOM_SCHEMA_V20 = 'JM.NaturalOperationalRecoverableRoom.v2.0';
export const WORKSPACE_SCHEMA_V20 = 'JM.NaturalOperationalRecoverableWorkspaceReceipt.v2.0';

function clone(value) {
  return structuredClone(value);
}

function cleanName(value, fallback = 'Untitled room') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function commandBody(kind, args, ordinal) {
  return { schema: 'JM.NaturalOperationalReplayCommand.v2.0', ordinal, kind, args: clone(args) };
}

function makeCommand(kind, args, ordinal) {
  const body = commandBody(kind, args, ordinal);
  return { ...body, digest: digest(body) };
}

function validateCommand(command, ordinal) {
  need(command && typeof command === 'object', 'NOL_V20_ROOM_COMMAND_INVALID', 'Recovery command must be an object.');
  need(command.schema === 'JM.NaturalOperationalReplayCommand.v2.0', 'NOL_V20_ROOM_COMMAND_SCHEMA', 'Recovery command schema is not supported.');
  need(command.ordinal === ordinal, 'NOL_V20_ROOM_COMMAND_ORDINAL', 'Recovery command order was altered.');
  need(['defineWord', 'runPhrase', 'runMarked'].includes(command.kind), 'NOL_V20_ROOM_COMMAND_KIND', 'Recovery command kind is not replayable.');
  const expected = digest(commandBody(command.kind, command.args, command.ordinal));
  need(command.digest === expected, 'NOL_V20_ROOM_COMMAND_DIGEST', 'Recovery command digest does not match its contents.');
}

function packageBody(room) {
  return {
    schema: ROOM_SCHEMA_V20,
    version: '2.0',
    roomName: room.roomName,
    log: clone(room.log),
    cursor: room.cursor,
    checkpoints: clone(room.checkpoints),
    draft: clone(room.draft),
    stateDigest: digest(room.surface.state),
    wordbookDigest: room.surface.wordbook().digest,
    surfaceReceiptDigest: room.surface.receipt().digest,
    boundary: 'Replayable creator operations are recoverable. Session grants and sovereign contacts are intentionally not persisted or auto-replayed.'
  };
}

function checkpointBody(name, cursor, stateDigest, wordbookDigest) {
  return {
    schema: 'JM.NaturalOperationalCheckpoint.v2.0',
    name,
    cursor,
    stateDigest,
    wordbookDigest
  };
}

function summariseStateDiff(before, after) {
  const beforeEntities = before?.entities ?? {};
  const afterEntities = after?.entities ?? {};
  const entityNames = [...new Set([...Object.keys(beforeEntities), ...Object.keys(afterEntities)])].sort();
  const entities = entityNames
    .map(name => ({ name, before: beforeEntities[name] ?? null, after: afterEntities[name] ?? null }))
    .filter(item => JSON.stringify(item.before) !== JSON.stringify(item.after));
  const beforeRelations = before?.relations ?? [];
  const afterRelations = after?.relations ?? [];
  return {
    changed: JSON.stringify(before) !== JSON.stringify(after),
    entities,
    relationDelta: afterRelations.length - beforeRelations.length,
    beforeDigest: digest(before),
    afterDigest: digest(after)
  };
}

export class NaturalOperationalRecoverableWorkspaceV20 {
  constructor(options = {}) {
    this.roomName = cleanName(options.roomName);
    this.surface = new NaturalOperationalCreatorSurfaceV10(options.surfaceOptions ?? {});
    this.log = [];
    this.cursor = 0;
    this.checkpoints = [];
    this.draft = {
      phrase: '',
      activations: [],
      bindings: {},
      options: {}
    };
    this.sessionGrants = new Set();
    this.transientContacts = [];
  }

  get state() {
    return clone(this.surface.state);
  }

  wordbook() {
    return this.surface.wordbook();
  }

  _apply(surface, command) {
    const args = command.args ?? {};
    if (command.kind === 'defineWord') return surface.defineWord(args.word, args.definition);
    if (command.kind === 'runPhrase') return surface.runPhrase(args.phrase, args.activations ?? [], args.bindings ?? {}, args.options ?? {});
    if (command.kind === 'runMarked') return surface.runMarked(args.source, args.bindings ?? {}, args.options ?? {});
    need(false, 'NOL_V20_COMMAND_NOT_REPLAYABLE', `Command ${command.kind} is not replayable.`);
  }

  _freshReplaySurface(cursor = this.cursor) {
    const replay = new NaturalOperationalCreatorSurfaceV10();
    for (const command of this.log.slice(0, cursor)) this._apply(replay, command);
    return replay;
  }

  _replaceSurfaceFromReplay() {
    this.surface = this._freshReplaySurface(this.cursor);
    this.sessionGrants.clear();
    return this.surface;
  }

  _append(kind, args) {
    if (this.cursor < this.log.length) {
      this.log = this.log.slice(0, this.cursor);
      this.checkpoints = this.checkpoints.filter(item => item.cursor <= this.cursor);
    }
    const command = makeCommand(kind, args, this.log.length + 1);
    this.log.push(command);
    this.cursor = this.log.length;
    return command;
  }

  rename(name) {
    this.roomName = cleanName(name);
    return this.roomName;
  }

  setDraft(draft = {}) {
    this.draft = {
      phrase: String(draft.phrase ?? this.draft.phrase ?? ''),
      activations: clone(draft.activations ?? this.draft.activations ?? []),
      bindings: clone(draft.bindings ?? this.draft.bindings ?? {}),
      options: clone(draft.options ?? this.draft.options ?? {})
    };
    return clone(this.draft);
  }

  defineWord(word, definition) {
    const args = { word: String(word ?? '').trim(), definition: clone(definition ?? {}) };
    const result = this.surface.defineWord(args.word, args.definition);
    const command = this._append('defineWord', args);
    return { result, command, receipt: this.receipt() };
  }

  runPhrase(phrase, activations = [], bindings = {}, options = {}) {
    const args = { phrase: String(phrase), activations: clone(activations), bindings: clone(bindings), options: clone(options) };
    const result = this.surface.runPhrase(args.phrase, args.activations, args.bindings, args.options);
    if (result.receipt?.status === 'choice-required') {
      return { ...result, committed: false, workspaceReceipt: this.receipt() };
    }
    const command = this._append('runPhrase', args);
    return { ...result, committed: true, command, workspaceReceipt: this.receipt() };
  }

  runMarked(source, bindings = {}, options = {}) {
    const args = { source: String(source), bindings: clone(bindings), options: clone(options) };
    const result = this.surface.runMarked(args.source, args.bindings, args.options);
    if (result.receipt?.status === 'choice-required') {
      return { ...result, committed: false, workspaceReceipt: this.receipt() };
    }
    const command = this._append('runMarked', args);
    return { ...result, committed: true, command, workspaceReceipt: this.receipt() };
  }

  previewPhrase(phrase, activations = [], bindings = {}, options = {}) {
    const preview = this._freshReplaySurface();
    const before = clone(preview.state);
    const result = preview.runPhrase(String(phrase), clone(activations), clone(bindings), clone(options));
    const after = clone(preview.state);
    return {
      schema: 'JM.NaturalOperationalPreview.v2.0',
      phrase: String(phrase),
      result,
      before,
      after,
      diff: summariseStateDiff(before, after),
      committed: false,
      boundary: 'Preview executes only on a replay clone. The live recoverable room is not mutated.'
    };
  }

  undo() {
    if (this.cursor === 0) return { changed: false, cursor: this.cursor, state: this.state };
    this.cursor -= 1;
    this._replaceSurfaceFromReplay();
    return { changed: true, cursor: this.cursor, state: this.state, receipt: this.receipt() };
  }

  redo() {
    if (this.cursor >= this.log.length) return { changed: false, cursor: this.cursor, state: this.state };
    this.cursor += 1;
    this._replaceSurfaceFromReplay();
    return { changed: true, cursor: this.cursor, state: this.state, receipt: this.receipt() };
  }

  checkpoint(name) {
    const checkpointName = cleanName(name, `Checkpoint ${this.cursor}`);
    const body = checkpointBody(checkpointName, this.cursor, digest(this.surface.state), this.surface.wordbook().digest);
    const checkpoint = { ...body, digest: digest(body) };
    this.checkpoints = this.checkpoints.filter(item => item.name !== checkpointName);
    this.checkpoints.push(checkpoint);
    return clone(checkpoint);
  }

  restoreCheckpoint(name) {
    const checkpoint = this.checkpoints.find(item => item.name === name);
    need(checkpoint, 'NOL_V20_CHECKPOINT_NOT_FOUND', `Checkpoint ${name} was not found.`);
    need(checkpoint.cursor >= 0 && checkpoint.cursor <= this.log.length, 'NOL_V20_CHECKPOINT_CURSOR', 'Checkpoint cursor is outside the recovery log.');
    this.cursor = checkpoint.cursor;
    this._replaceSurfaceFromReplay();
    need(digest(this.surface.state) === checkpoint.stateDigest, 'NOL_V20_CHECKPOINT_STATE_MISMATCH', 'Checkpoint replay did not reproduce the checkpoint state.');
    need(this.surface.wordbook().digest === checkpoint.wordbookDigest, 'NOL_V20_CHECKPOINT_WORDBOOK_MISMATCH', 'Checkpoint replay did not reproduce the checkpoint wordbook.');
    return { checkpoint: clone(checkpoint), state: this.state, receipt: this.receipt() };
  }

  history() {
    return this.log.map((command, index) => ({
      ...clone(command),
      status: index < this.cursor ? 'applied' : 'future'
    }));
  }

  portableFromPhrase(phrase, activations = [], metadata = {}) {
    return this.surface.portableFromPhrase(phrase, activations, metadata);
  }

  portableFromMarked(source, metadata = {}) {
    return this.surface.portableFromMarked(source, metadata);
  }

  grant(bodyId) {
    const id = String(bodyId ?? '').trim().toLowerCase();
    need(id, 'NOL_V20_GRANT_BODY_REQUIRED', 'Session grant requires an explicit sovereign body id.');
    this.sessionGrants.add(id);
    return { bodyId: id, granted: true, digest: digest({ schema: 'JM.NOL.SessionGrant.v2.0', bodyId: id, roomDigest: this.roomDigest() }) };
  }

  revoke(bodyId) {
    return this.sessionGrants.delete(String(bodyId ?? '').trim().toLowerCase());
  }

  contact(source, bodyId, bindings = {}, options = {}) {
    const id = String(bodyId ?? '').trim().toLowerCase();
    need(this.sessionGrants.has(id), 'NOL_V20_EXPLICIT_GRANT_REQUIRED', 'Sovereign contact requires an explicit grant in the current session.');
    const contactSurface = this._freshReplaySurface();
    contactSurface.grant(id);
    const before = clone(contactSurface.state);
    const result = contactSurface.contact(String(source), id, clone(bindings), clone(options));
    const after = clone(contactSurface.state);
    const receipt = {
      schema: 'JM.NaturalOperationalTransientContactReceipt.v2.0',
      bodyId: id,
      source: String(source),
      contactReceiptDigest: result.receipt.digest,
      diff: summariseStateDiff(before, after),
      adoptedIntoRoom: false,
      boundary: 'Direct sovereign contact is real but session-transient at v2.0. Recovery never silently re-executes it.'
    };
    receipt.digest = digest(receipt);
    this.transientContacts.push(receipt);
    return { result, before, after, receipt };
  }

  federate(source, bodyIds, bindings = {}, options = {}) {
    need(Array.isArray(bodyIds) && bodyIds.length, 'NOL_V20_FEDERATION_BODIES_REQUIRED', 'Federation requires explicit body selections.');
    const ids = bodyIds.map(value => String(value).trim().toLowerCase());
    for (const id of ids) need(this.sessionGrants.has(id), 'NOL_V20_EXPLICIT_GRANT_REQUIRED', `Federation requires a current-session grant for ${id}.`);
    const federationSurface = this._freshReplaySurface();
    for (const id of ids) federationSurface.grant(id);
    const before = clone(federationSurface.state);
    const result = federationSurface.federate(String(source), ids, clone(bindings), clone(options));
    const after = clone(federationSurface.state);
    const receipt = {
      schema: 'JM.NaturalOperationalTransientFederationReceipt.v2.0',
      bodyIds: ids,
      source: String(source),
      federationReceiptDigest: result.receipt.digest,
      diff: summariseStateDiff(before, after),
      adoptedIntoRoom: false,
      boundary: 'Federation contact is permissioned and session-transient. It is not replayed during room recovery.'
    };
    receipt.digest = digest(receipt);
    this.transientContacts.push(receipt);
    return { result, before, after, receipt };
  }

  exportRoom() {
    const body = packageBody(this);
    return { ...body, digest: digest(body) };
  }

  importRoom(roomPackage) {
    const incoming = clone(roomPackage);
    need(incoming && typeof incoming === 'object', 'NOL_V20_ROOM_PACKAGE_REQUIRED', 'Room import requires a room package object.');
    const suppliedDigest = incoming.digest;
    delete incoming.digest;
    need(incoming.schema === ROOM_SCHEMA_V20 && incoming.version === '2.0', 'NOL_V20_ROOM_SCHEMA', 'Room package schema/version is not supported.');
    need(suppliedDigest === digest(incoming), 'NOL_V20_ROOM_DIGEST', 'Room package digest does not match its contents.');
    need(Array.isArray(incoming.log), 'NOL_V20_ROOM_LOG', 'Room package recovery log is missing.');
    incoming.log.forEach((command, index) => validateCommand(command, index + 1));
    need(Number.isInteger(incoming.cursor) && incoming.cursor >= 0 && incoming.cursor <= incoming.log.length, 'NOL_V20_ROOM_CURSOR', 'Room package cursor is invalid.');
    need(Array.isArray(incoming.checkpoints), 'NOL_V20_ROOM_CHECKPOINTS', 'Room package checkpoints are invalid.');
    for (const checkpoint of incoming.checkpoints) {
      need(checkpoint.cursor >= 0 && checkpoint.cursor <= incoming.log.length, 'NOL_V20_CHECKPOINT_CURSOR', 'Imported checkpoint cursor is invalid.');
      const body = checkpointBody(checkpoint.name, checkpoint.cursor, checkpoint.stateDigest, checkpoint.wordbookDigest);
      need(checkpoint.digest === digest(body), 'NOL_V20_CHECKPOINT_DIGEST', 'Imported checkpoint digest is invalid.');
    }

    this.roomName = cleanName(incoming.roomName);
    this.log = clone(incoming.log);
    this.cursor = incoming.cursor;
    this.checkpoints = clone(incoming.checkpoints);
    this.draft = clone(incoming.draft ?? { phrase: '', activations: [], bindings: {}, options: {} });
    this.transientContacts = [];
    this.sessionGrants.clear();
    this._replaceSurfaceFromReplay();

    need(digest(this.surface.state) === incoming.stateDigest, 'NOL_V20_ROOM_STATE_MISMATCH', 'Room recovery did not reproduce the exported state.');
    need(this.surface.wordbook().digest === incoming.wordbookDigest, 'NOL_V20_ROOM_WORDBOOK_MISMATCH', 'Room recovery did not reproduce the exported wordbook.');
    need(this.surface.receipt().digest === incoming.surfaceReceiptDigest, 'NOL_V20_ROOM_RECEIPT_MISMATCH', 'Room recovery did not reproduce the exported surface receipt.');
    return { room: this.exportRoom(), state: this.state, receipt: this.receipt() };
  }

  roomDigest() {
    return this.exportRoom().digest;
  }

  receipt() {
    const body = {
      schema: WORKSPACE_SCHEMA_V20,
      roomName: this.roomName,
      cursor: this.cursor,
      logLength: this.log.length,
      checkpointCount: this.checkpoints.length,
      stateDigest: digest(this.surface.state),
      wordbookDigest: this.surface.wordbook().digest,
      roomDigest: this.exportRoom().digest,
      transientContactDigests: this.transientContacts.map(item => item.digest),
      activeSessionGrants: [...this.sessionGrants].sort(),
      boundary: 'Recoverable state comes from replayable creator operations. Grants and sovereign contact are session-only and never silently restored.'
    };
    return { ...body, digest: digest(body) };
  }
}
