import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import {
  SUPPORTED_SOVEREIGN_CONTACTS_V02,
  verifyOwnerSessionGrant
} from '../v0.2/sovereign-contact.mjs';
import { ContextualBounceV03 } from '../v0.3/context-room.mjs';
import { contactContextualSovereignBody } from '../v0.3/sovereign-contact-v0.3.mjs';

function clone(value) {
  return structuredClone(value);
}

function normalBody(value) {
  return String(value ?? '').trim().toLowerCase();
}

function preflightContact(entry) {
  const bodyId = normalBody(entry?.bodyId);
  need(bodyId, 'NOL_V04_BODY_REQUIRED', 'Each federation contact requires bodyId.');
  need(SUPPORTED_SOVEREIGN_CONTACTS_V02[bodyId], 'NOL_V04_ADAPTER_MISSING', `No direct mounted adapter exists for ${bodyId}; federation will not fake execution.`);
  verifyOwnerSessionGrant(entry.grant, bodyId, 'execute');
  return bodyId;
}

export function preflightFederation({ source, contacts = [], context = {}, stateMode = 'isolated' } = {}) {
  need(typeof source === 'string' && source.trim(), 'NOL_V04_SOURCE_REQUIRED', 'Federation requires natural source.');
  need(Array.isArray(contacts) && contacts.length > 0, 'NOL_V04_CONTACTS_REQUIRED', 'Federation requires at least one explicitly selected sovereign contact.');
  need(['isolated', 'carry-forward'].includes(stateMode), 'NOL_V04_STATE_MODE', 'stateMode must be isolated or carry-forward.');

  const bodyIds = contacts.map(preflightContact);
  need(new Set(bodyIds).size === bodyIds.length, 'NOL_V04_DUPLICATE_BODY', 'v0.4 federation requires unique explicitly selected bodies per contact pass.');

  const room = new ContextualBounceV03();
  const plan = room.plan(source, context);
  const body = {
    schema: 'JM.NaturalOperationalFederationPreflight.v0.4',
    source,
    contextualPlanDigest: plan.digest,
    contextDigest: plan.contextDigest,
    resolutionDigest: plan.resolutionDigest,
    bodyIds,
    stateMode
  };
  return { ...body, plan, digest: digest(body) };
}

function stateAfterContact(contacted, inputState) {
  const payload = contacted.contact.contact;
  // Some sovereign contacts are interpretive/observational and use `after`
  // for their own context body rather than the shared Estate state. They may
  // observe the carried state without owning or replacing it. Only a contact
  // that reports a state change is allowed to advance shared carry-forward state.
  if (payload.changed === true) return clone(payload.after);
  return clone(inputState);
}

export function contactSovereignFederation({ source, contacts = [], state = {}, context = {}, stateMode = 'isolated' } = {}) {
  const preflight = preflightFederation({ source, contacts, context, stateMode });
  const initialState = clone(state);
  let carriedState = clone(initialState);
  const results = [];

  for (let index = 0; index < contacts.length; index += 1) {
    const selection = contacts[index];
    const bodyId = preflight.bodyIds[index];
    const inputState = stateMode === 'carry-forward' ? clone(carriedState) : clone(initialState);
    const contacted = contactContextualSovereignBody({
      source,
      targetBody: bodyId,
      grant: selection.grant,
      state: inputState,
      context
    });

    const outputState = stateAfterContact(contacted, inputState);
    if (stateMode === 'carry-forward') carriedState = clone(outputState);

    results.push({
      order: index + 1,
      bodyId,
      adapterMode: contacted.contact.adapter.mode,
      inputStateDigest: digest(inputState),
      outputStateDigest: digest(outputState),
      changed: contacted.contact.contact.changed,
      sharedStateAdvanced: contacted.contact.contact.changed === true,
      contactReceiptDigest: contacted.receipt.digest,
      contact: contacted
    });
  }

  const finalState = stateMode === 'carry-forward' ? carriedState : initialState;
  const receiptBody = {
    schema: 'JM.NaturalOperationalSovereignFederationReceipt.v0.4',
    source,
    preflightDigest: preflight.digest,
    stateMode,
    bodyIds: preflight.bodyIds,
    initialStateDigest: digest(initialState),
    finalStateDigest: digest(finalState),
    contactReceipts: results.map(result => result.contactReceiptDigest),
    identitiesPreserved: true,
    merge: false
  };

  return {
    type: 'JM.NaturalOperationalSovereignFederation.v0.4',
    source,
    preflight,
    stateMode,
    initialState,
    finalState,
    contacts: results,
    receipt: { ...receiptBody, digest: digest(receiptBody) },
    laws: [
      'EXPLICIT_SELECTION_ONLY',
      'PER_BODY_PERMISSION_REQUIRED',
      'PREFLIGHT_BEFORE_EXECUTION',
      'IDENTITY_PRESERVED',
      'MEET_NOT_MERGE',
      'NON_STATE_CONTACT_CANNOT_REPLACE_SHARED_STATE',
      'NO_ROUTE_SCORE_AUTO_EXECUTION'
    ],
    boundary: 'v0.4 federates only explicitly selected bodies with mounted direct adapters. It is not automatic 100-body execution or kernel federation.'
  };
}
