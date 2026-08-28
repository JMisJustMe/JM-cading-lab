import assert from 'node:assert/strict';
import { Codifying } from '../../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';

const source = `
codex Signal {
  field score: number
  field status: text = "candidate"
  field metadata: object
  require score >= 1
  emit score
  emit status
}

codex Alternate {
  field flag: bool = true
  emit flag
}
`;

const input = { score: 7, metadata: { owner: 'source', nested: { value: 3 } } };
const result = Codifying.execute(source, 'Signal', input).runtime;
assert.equal(result.record.score, 7);
assert.equal(result.record.status, 'candidate');
assert.equal(result.record.metadata.owner, 'source');
assert.deepEqual(result.emissions, ['score', 'status']);
assert.deepEqual(input, { score: 7, metadata: { owner: 'source', nested: { value: 3 } } });
assert.notStrictEqual(result.record.metadata, input.metadata);
result.record.metadata.nested.value = 99;
assert.equal(input.metadata.nested.value, 3);

const alternate = Codifying.execute(source, 'Alternate', {}).runtime;
assert.equal(alternate.record.flag, true);

let requiredCode = null;
try { Codifying.execute(source, 'Signal', { metadata: {} }); } catch (error) { requiredCode = error.code; }
assert.equal(requiredCode, 'CODIFY_REQUIRED_FIELD');

let typeCode = null;
try { Codifying.execute(source, 'Signal', { score: '7', metadata: {} }); } catch (error) { typeCode = error.code; }
assert.equal(typeCode, 'CODIFY_TYPE_MISMATCH');

let constraintCode = null;
try { Codifying.execute(source, 'Signal', { score: 0, metadata: {} }); } catch (error) { constraintCode = error.code; }
assert.equal(constraintCode, 'CODIFY_CONSTRAINT_FAILED');

let duplicateCode = null;
try { Codifying.parse('codex Bad { field x: number\nfield x: number }'); } catch (error) { duplicateCode = error.code; }
assert.equal(duplicateCode, 'CODIFY_DUPLICATE_FIELD');

let unknownCode = null;
try { Codifying.execute(source, 'Missing', {}); } catch (error) { unknownCode = error.code; }
assert.equal(unknownCode, 'CODIFY_UNKNOWN_CODEX');

const a = Codifying.execute(source, 'Signal', input).runtime;
const b = Codifying.execute(source, 'Signal', input).runtime;
assert.equal(a.encoded, b.encoded);
assert.equal(a.recordDigest, b.recordDigest);
assert.deepEqual(a.trace, b.trace);

console.log(JSON.stringify({
  schema: 'jm.codifying.source-aware-smoke/1.0',
  historicalRecoveryClaim: false,
  keeper: 'TYPED MATERIALISATION != SILENT COERCION',
  checks: 18,
  status: 'PASS'
}, null, 2));
