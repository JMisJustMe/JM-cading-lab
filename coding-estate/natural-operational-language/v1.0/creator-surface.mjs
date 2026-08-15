import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { NaturalRelationSessionV08 } from '../v0.8/relation-spine.mjs';
import { portableIRFromMarked, portableIRFromPhrase } from '../v0.9/portable-ir.mjs';

function clone(value) {
  return structuredClone(value);
}

export class NaturalOperationalCreatorSurfaceV10 {
  constructor(options = {}) {
    this.relations = new NaturalRelationSessionV08(options);
    this.events = [];
  }

  get state() {
    return this.relations.state;
  }

  defineWord(word, definition) {
    const result = this.relations.define(word, definition);
    this.events.push({ event: 'surface.word.define', word: result.word, digest: result.digest });
    return result;
  }

  runPhrase(phrase, activations = [], bindings = {}, options = {}) {
    const result = this.relations.runPhrase(phrase, activations, bindings, options);
    this.events.push({
      event: 'surface.phrase.run',
      phrase: String(phrase),
      markedSource: result.compiled.markedSource,
      receiptDigest: result.receipt.digest,
      status: result.receipt.status,
      changed: result.receipt.changed
    });
    return result;
  }

  runMarked(source, bindings = {}, options = {}) {
    const result = this.relations.runMarked(source, bindings, options);
    this.events.push({ event: 'surface.marked.run', source: String(source), receiptDigest: result.receipt.digest, status: result.receipt.status, changed: result.receipt.changed });
    return result;
  }

  undo() {
    const result = this.relations.undo();
    this.events.push({ event: 'surface.undo', changed: result.changed, stateDigest: digest(result.state) });
    return result;
  }

  grant(bodyId) {
    const result = this.relations.grant(bodyId);
    this.events.push({ event: 'surface.grant', bodyId: String(bodyId).toLowerCase(), grantDigest: result.digest });
    return result;
  }

  revoke(bodyId) {
    const result = this.relations.revoke(bodyId);
    this.events.push({ event: 'surface.revoke', bodyId: String(bodyId).toLowerCase(), removed: result });
    return result;
  }

  contact(source, bodyId, bindings = {}, options = {}) {
    const result = this.relations.parent.wordbook.contact(source, bodyId, bindings, options);
    const targetBody = result.contact?.targetBody ?? String(bodyId).toLowerCase();
    this.events.push({ event: 'surface.sovereign.contact', bodyId: targetBody, receiptDigest: result.receipt.digest, changed: result.contact.contact.changed });
    return { ...result, targetBody };
  }

  federate(source, bodyIds, bindings = {}, options = {}) {
    need(Array.isArray(bodyIds) && bodyIds.length, 'NOL_V10_FEDERATION_BODIES_REQUIRED', 'Creator surface federation requires explicit body selections.');
    const result = this.relations.parent.wordbook.federate(source, bodyIds, bindings, options);
    this.events.push({ event: 'surface.sovereign.federate', bodyIds: clone(bodyIds), receiptDigest: result.receipt.digest, stateMode: result.stateMode });
    return result;
  }

  portableFromPhrase(phrase, activations = [], metadata = {}) {
    const result = portableIRFromPhrase(phrase, activations, metadata);
    this.events.push({ event: 'surface.portable-ir', sourceKind: 'ordinary-phrase', irDigest: result.ir.digest });
    return result;
  }

  portableFromMarked(source, metadata = {}) {
    const ir = portableIRFromMarked(source, metadata);
    this.events.push({ event: 'surface.portable-ir', sourceKind: 'marked-natural-language', irDigest: ir.digest });
    return ir;
  }

  wordbook() {
    return this.relations.parent.wordbook.exportWordbook();
  }

  receipt() {
    const body = {
      schema: 'JM.NaturalOperationalCreatorSurfaceReceipt.v1.0',
      stateDigest: digest(this.state),
      wordbookDigest: this.wordbook().digest,
      relationReceiptDigest: this.relations.receipt().digest,
      events: clone(this.events),
      boundary: 'Creator-facing operational-language surface over existing mounted/recovered donor machinery. Not a universal natural-language understanding claim and not a 101st canonical coding body.'
    };
    return { ...body, digest: digest(body) };
  }
}
