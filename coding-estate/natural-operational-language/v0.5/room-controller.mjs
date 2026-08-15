import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { ContextualBounceV03 } from '../v0.3/context-room.mjs';
import { contactContextualSovereignBody, makeOwnerSessionGrant } from '../v0.3/sovereign-contact-v0.3.mjs';
import { contactSovereignFederation } from '../v0.4/federation-contact.mjs';

function clone(value) {
  return structuredClone(value);
}

export function contextFromRoomBindings(bindings = {}) {
  const refs = {};
  const places = {};
  const aliases = clone(bindings.aliases ?? {});
  for (const key of ['it', 'this', 'that', 'them', 'these', 'those']) {
    if (bindings[key] !== undefined && String(bindings[key]).trim()) refs[key] = String(bindings[key]).trim();
  }
  for (const key of ['here', 'there']) {
    if (bindings[key] !== undefined && String(bindings[key]).trim()) places[key] = String(bindings[key]).trim();
  }
  return {
    refs,
    places,
    aliases,
    currentBody: bindings.currentBody ? String(bindings.currentBody).trim() : null,
    destination: bindings.destination ? String(bindings.destination).trim() : null
  };
}

export class CreatorRoomSessionV05 {
  constructor({ state = {}, session = 'creator-room-v0.5' } = {}) {
    this.room = new ContextualBounceV03({ state });
    this.session = session;
    this.grants = new Map();
    this.events = [];
  }

  get state() {
    return this.room.state;
  }

  grant(bodyId) {
    const id = String(bodyId ?? '').trim().toLowerCase();
    need(id, 'NOL_V05_GRANT_BODY_REQUIRED', 'Creator room grant requires bodyId.');
    const grant = makeOwnerSessionGrant({ bodyId: id, session: this.session });
    this.grants.set(id, grant);
    this.events.push({ event: 'owner.grant', bodyId: id, grantDigest: grant.digest });
    return grant;
  }

  revoke(bodyId) {
    const id = String(bodyId ?? '').trim().toLowerCase();
    const removed = this.grants.delete(id);
    this.events.push({ event: 'owner.revoke', bodyId: id, removed });
    return removed;
  }

  run(source, bindings = {}) {
    const context = contextFromRoomBindings(bindings);
    const result = this.room.execute(source, context);
    this.events.push({ event: 'room.run', source, planDigest: result.plan.digest, receiptDigest: result.receipt.digest, changed: result.receipt.changed });
    return result;
  }

  undo() {
    const result = this.room.undo();
    this.events.push({ event: 'room.undo', changed: result.changed, stateDigest: digest(result.state) });
    return result;
  }

  contact(source, bodyId, bindings = {}, { applyState = true } = {}) {
    const id = String(bodyId ?? '').trim().toLowerCase();
    const grant = this.grants.get(id);
    need(grant, 'NOL_V05_EXPLICIT_GRANT_REQUIRED', `No owner-session execute grant exists for ${id}.`);
    const context = contextFromRoomBindings(bindings);
    const result = contactContextualSovereignBody({ source, targetBody: id, grant, state: this.state, context });
    if (applyState && result.contact.contact.changed === true) this.room.base.state = clone(result.contact.contact.after);
    this.events.push({ event: 'room.sovereign-contact', bodyId: id, receiptDigest: result.receipt.digest, changed: result.contact.contact.changed, appliedToRoomState: Boolean(applyState && result.contact.contact.changed) });
    return result;
  }

  federate(source, bodyIds, bindings = {}, { stateMode = 'isolated', applyState = true } = {}) {
    need(Array.isArray(bodyIds) && bodyIds.length, 'NOL_V05_FEDERATION_SELECTION_REQUIRED', 'Creator room federation requires explicitly selected bodies.');
    const contacts = bodyIds.map(value => {
      const bodyId = String(value).trim().toLowerCase();
      const grant = this.grants.get(bodyId);
      need(grant, 'NOL_V05_EXPLICIT_GRANT_REQUIRED', `No owner-session execute grant exists for ${bodyId}.`);
      return { bodyId, grant };
    });
    const context = contextFromRoomBindings(bindings);
    const result = contactSovereignFederation({ source, contacts, state: this.state, context, stateMode });
    if (applyState && stateMode === 'carry-forward') this.room.base.state = clone(result.finalState);
    this.events.push({ event: 'room.federation-contact', bodyIds: [...bodyIds], receiptDigest: result.receipt.digest, stateMode, appliedToRoomState: Boolean(applyState && stateMode === 'carry-forward') });
    return result;
  }

  receipt() {
    const body = {
      schema: 'JM.NaturalOperationalCreatorRoomSessionReceipt.v0.5',
      session: this.session,
      stateDigest: digest(this.state),
      grants: [...this.grants.keys()].sort(),
      events: clone(this.events)
    };
    return { ...body, digest: digest(body) };
  }
}
