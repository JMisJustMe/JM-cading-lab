import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { contactSovereignBody, makeOwnerSessionGrant } from '../v0.2/sovereign-contact.mjs';
import { ContextualBounceV03 } from './context-room.mjs';

function clone(value) {
  return structuredClone(value);
}

function leaves(node, out = []) {
  if (!node) return out;
  if (node.type === 'OperationalGroup') return leaves(node.inner, out);
  if (node.type === 'OperationalRelation') {
    leaves(node.left, out);
    leaves(node.right, out);
    return out;
  }
  if (node.type === 'OperationalLeaf') out.push(node.ast);
  return out;
}

function concreteRecorpSource(plan) {
  const found = leaves(plan.ast).filter(ast => ast.operator?.word === 'recorp');
  need(found.length === 1 && leaves(plan.ast).length === 1, 'NOL_V03_RECORP_SINGLE_CONTACT_REQUIRED', 'Contextual RECORP contact currently requires one RECORP leaf.');
  const ast = found[0];
  need(ast.operator?.modifier, 'NOL_V03_RECORP_MARK_REQUIRED', 'Contextual RECORP contact requires ! ? ~ .lock or →.');
  const target = ast.target?.text ?? ast.subject?.text ?? '';
  need(target, 'NOL_V03_RECORP_TARGET_REQUIRED', 'Contextual RECORP contact requires a resolved target.');
  need(/^[A-Za-z_][\w.-]*$/.test(target), 'NOL_V03_RECORP_TARGET_NATIVE_SHAPE', 'Resolved RECORP target must fit the native body-name shape.');
  return `RECORP${ast.operator.modifier} ${target}`;
}

export function contactContextualSovereignBody({ source, targetBody, grant, state = {}, context = {} } = {}) {
  need(typeof source === 'string' && source.trim(), 'NOL_V03_CONTACT_SOURCE_REQUIRED', 'Contextual sovereign contact requires natural source.');
  const bodyId = String(targetBody ?? '').toLowerCase();
  need(bodyId, 'NOL_V03_CONTACT_BODY_REQUIRED', 'Contextual sovereign contact requires an explicit body selection.');

  const room = new ContextualBounceV03({ state });
  const plan = room.plan(source, context);
  const concreteSource = bodyId === 'recorp' ? concreteRecorpSource(plan) : source;
  const contacted = contactSovereignBody({
    source: concreteSource,
    targetBody: bodyId,
    grant,
    state,
    context: { ...clone(context), naturalSource: source, contextResolutionDigest: plan.resolutionDigest }
  });

  const receiptBody = {
    schema: 'JM.NaturalOperationalContextualSovereignContactReceipt.v0.3',
    targetBody: bodyId,
    source,
    concreteSource,
    contextualPlanDigest: plan.digest,
    contextDigest: plan.contextDigest,
    resolutionDigest: plan.resolutionDigest,
    resolutionCount: plan.resolutions.length,
    v02ContactReceiptDigest: contacted.receipt.digest
  };

  return {
    type: 'JM.NaturalOperationalContextualSovereignContact.v0.3',
    source,
    concreteSource,
    plan,
    contact: contacted,
    receipt: { ...receiptBody, digest: digest(receiptBody) },
    boundary: 'Context may resolve explicitly bound references; it may not invent bindings, permissions, adapters, or sovereign execution.'
  };
}

export { makeOwnerSessionGrant };
