import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { FlowTalk } from '../../sovereign-ten/direct/language-native.mjs';
import { RECORP } from '../../sovereign-batch-four/direct/bridge-native.mjs';
import { parseOperationalComposition } from './composition-spine.mjs';

export const SUPPORTED_SOVEREIGN_CONTACTS_V02 = Object.freeze({
  recorp: {
    bodyId: 'recorp',
    mode: 'direct-native-execute',
    description: 'Direct contact with the mounted RECORP native body when RECORP is explicitly present in the natural source.'
  },
  flowtalk: {
    bodyId: 'flowtalk',
    mode: 'declared-meaning-bridge',
    description: 'Direct contact with the mounted FlowTalk interpreter using the natural source as an explicit utterance body.'
  }
});

function clone(value) {
  return structuredClone(value);
}

function grantBody(grant) {
  return {
    schema: grant.schema,
    issuer: grant.issuer,
    subject: grant.subject,
    bodyId: grant.bodyId,
    scopes: grant.scopes,
    confirmed: grant.confirmed,
    session: grant.session
  };
}

export function makeOwnerSessionGrant({ bodyId, scopes = ['execute'], session = 'local-working-room', issuer = 'owner-session' } = {}) {
  need(bodyId, 'NOL_V02_GRANT_BODY_REQUIRED', 'Owner-session grant requires bodyId.');
  const grant = {
    schema: 'JM.NaturalOperationalOwnerSessionGrant.v0.2',
    issuer,
    subject: 'natural-operational-language',
    bodyId: String(bodyId).toLowerCase(),
    scopes: [...new Set(scopes.map(String))],
    confirmed: true,
    session
  };
  return { ...grant, digest: digest(grant) };
}

export function verifyOwnerSessionGrant(grant, targetBody, scope = 'execute') {
  need(grant?.schema === 'JM.NaturalOperationalOwnerSessionGrant.v0.2', 'NOL_V02_PERMISSION_REQUIRED', 'Sovereign contact requires an explicit owner-session grant.');
  need(grant.confirmed === true, 'NOL_V02_PERMISSION_NOT_CONFIRMED', 'Owner-session grant is not confirmed.');
  need(grant.subject === 'natural-operational-language', 'NOL_V02_PERMISSION_SUBJECT_MISMATCH', 'Grant subject does not match the natural operational-language surface.');
  need(grant.bodyId === String(targetBody).toLowerCase(), 'NOL_V02_PERMISSION_BODY_MISMATCH', `Grant is for ${grant.bodyId}, not ${targetBody}.`);
  need(grant.scopes?.includes(scope), 'NOL_V02_PERMISSION_SCOPE_MISSING', `Grant does not include ${scope}.`);
  need(grant.digest === digest(grantBody(grant)), 'NOL_V02_PERMISSION_DIGEST_MISMATCH', 'Owner-session grant digest does not match its declared body.');
  return true;
}

function operationalLeaves(node, out = []) {
  if (!node) return out;
  if (node.type === 'OperationalGroup') return operationalLeaves(node.inner, out);
  if (node.type === 'OperationalRelation') {
    operationalLeaves(node.left, out);
    operationalLeaves(node.right, out);
    return out;
  }
  if (node.type === 'OperationalLeaf') out.push(node.ast);
  return out;
}

function recorpNativeSource(source) {
  const composition = parseOperationalComposition(source);
  const leaves = operationalLeaves(composition);
  const recorpLeaves = leaves.filter(ast => ast.operator?.word === 'recorp');
  need(recorpLeaves.length === 1 && leaves.length === 1, 'NOL_V02_RECORP_SINGLE_CONTACT_REQUIRED', 'Direct RECORP contact currently requires a single RECORP operational leaf.');
  const ast = recorpLeaves[0];
  need(ast.operator?.modifier, 'NOL_V02_RECORP_MARK_REQUIRED', 'Direct RECORP contact requires one of ! ? ~ .lock or →.');
  const target = ast.target?.text ?? ast.subject?.text ?? '';
  need(target, 'NOL_V02_RECORP_TARGET_REQUIRED', 'Direct RECORP contact requires a target body.');
  need(/^[A-Za-z_][\w.-]*$/.test(target), 'NOL_V02_RECORP_TARGET_NATIVE_SHAPE', 'RECORP native contact currently requires a single native-safe target name.');
  return `RECORP${ast.operator.modifier} ${target}`;
}

function executeRecorp({ source, state = {} }) {
  const nativeSource = recorpNativeSource(source);
  const before = clone(state);
  const native = RECORP.execute(nativeSource, before);
  return {
    contactKind: 'direct-native-recorp',
    nativeSource,
    result: native,
    before,
    after: clone(native.state),
    changed: digest(before) !== digest(native.state)
  };
}

function executeFlowTalk({ source, context = {} }) {
  const flowSource = `utterance ${JSON.stringify(String(source))}\nas intent operational_language(source=${JSON.stringify(String(source))})`;
  const native = FlowTalk.execute(flowSource, context);
  return {
    contactKind: 'direct-native-flowtalk-bridge',
    nativeSource: flowSource,
    result: native,
    before: clone(context),
    after: clone(context),
    changed: false
  };
}

export function contactSovereignBody({ source, targetBody, grant, state = {}, context = {} } = {}) {
  need(typeof source === 'string' && source.trim(), 'NOL_V02_CONTACT_SOURCE_REQUIRED', 'Sovereign contact requires natural source.');
  const bodyId = String(targetBody ?? '').toLowerCase();
  need(bodyId, 'NOL_V02_CONTACT_BODY_REQUIRED', 'Sovereign contact requires an explicitly selected target body.');
  const adapter = SUPPORTED_SOVEREIGN_CONTACTS_V02[bodyId];
  need(adapter, 'NOL_V02_CONTACT_ADAPTER_MISSING', `No v0.2 direct sovereign-contact adapter is mounted for ${bodyId}; keep it route-planned only.`);
  verifyOwnerSessionGrant(grant, bodyId, 'execute');

  const contact = bodyId === 'recorp'
    ? executeRecorp({ source, state })
    : executeFlowTalk({ source, context });

  const receiptBody = {
    schema: 'JM.NaturalOperationalSovereignContactReceipt.v0.2',
    targetBody: bodyId,
    adapterMode: adapter.mode,
    source,
    grantDigest: grant.digest,
    contactKind: contact.contactKind,
    beforeDigest: digest(contact.before),
    afterDigest: digest(contact.after),
    changed: contact.changed,
    nativeReceiptDigest: contact.result?.receipt ? digest(contact.result.receipt) : digest(contact.result)
  };
  return {
    type: 'JM.NaturalOperationalSovereignContact.v0.2',
    targetBody: bodyId,
    adapter,
    contact,
    receipt: { ...receiptBody, digest: digest(receiptBody) },
    boundary: 'Application-level owner-session permission contract. This is not cryptographic authentication and does not authorise unadapted or registry-ranked bodies.'
  };
}
