import { digest, need } from '../../sovereign-ten/direct/native-core.mjs';
import { compileActivatedPhrase } from '../v0.7/phrase-activation.mjs';
import { parseOperationalRelations } from '../v0.8/relation-spine.mjs';

function clone(value) {
  return structuredClone(value);
}

function flatten(node, operations, path = 'root') {
  if (node.type === 'RelationGroupV08') {
    operations.push({ index: operations.length, op: 'group.enter', path, source: node.source });
    flatten(node.inner, operations, `${path}.group`);
    operations.push({ index: operations.length, op: 'group.leave', path, source: node.source });
    return;
  }
  if (node.type === 'OperationalRelationV08') {
    operations.push({
      index: operations.length,
      op: `relation.${node.operator}`,
      path,
      source: node.source,
      law: clone(node.law)
    });
    flatten(node.left, operations, `${path}.left`);
    flatten(node.right, operations, `${path}.right`);
    return;
  }
  need(node.type === 'OperationalLeafV08', 'NOL_V09_UNKNOWN_RELATION_NODE', `Unsupported v0.9 relation node ${node.type}.`);
  operations.push({ index: operations.length, op: 'natural.leaf', path, source: node.source });
}

export function portableIRFromMarked(source, metadata = {}) {
  const ast = parseOperationalRelations(source);
  const operations = [];
  flatten(ast, operations);
  const body = {
    schema: 'JM.NaturalOperationalPortableIR.v0.9',
    namespace: 'jm.surface.natural-operational-language',
    source: String(source),
    sourceKind: 'marked-natural-language',
    astDigest: digest(ast),
    operations,
    metadata: clone(metadata)
  };
  return { ...body, digest: digest(body) };
}

export function portableIRFromPhrase(phrase, activations = [], metadata = {}) {
  const compiled = compileActivatedPhrase(phrase, activations);
  const ir = portableIRFromMarked(compiled.markedSource, {
    ...clone(metadata),
    originalPhrase: compiled.phrase,
    phraseDigest: compiled.digest,
    activations: clone(compiled.activations)
  });
  return { compiled, ir };
}
