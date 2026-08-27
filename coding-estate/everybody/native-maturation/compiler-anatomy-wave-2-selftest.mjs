import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  preservePunctuation,
  resolveBackend,
  wakeBody,
  COMPILER_ANATOMY,
  WAVE
} from './compiler-anatomy-wave-2.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(fs.readFileSync(path.join(here, '..', 'body-registry.json'), 'utf8'));

let passed = 0;
function gate(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${String(passed).padStart(2, '0')} ${name}`);
}

const source = [
  'BODY wakeforge',
  'VERSION 0.2',
  'SET counter 1',
  'ADD counter 2',
  'ROUTE wakeforge.build',
  'TRACE {"source":"wakeforge-v0.6B-logic"}',
  'ASSERT counter 3',
  'DING {"state":"WOKEN"}',
  'END'
].join('\n');

const punctRaw = '[::][->][||]';

gate('TheoC preserves punctuation raw form exactly', () => {
  const punct = preservePunctuation(punctRaw);
  assert.equal(punct.raw, punctRaw);
  assert.deepEqual(punct.marks, ['[::]', '[->]', '[||]']);
  assert.equal(punct.interpreted, false);
});

gate('Hybrid backend resolver requires source authority', () => {
  assert.throws(() => resolveBackend({ requestedTarget: 'javascript' }), /source authority/i);
});

gate('Hybrid backend resolver cannot smuggle an unsupported target', () => {
  assert.throws(() => resolveBackend({ requestedTarget: 'brainfuck', sourceAuthority: 'wakeforge' }), /unsupported target/i);
});

gate('Hybrid backend resolver obeys explicit target permission', () => {
  assert.throws(
    () => resolveBackend({ requestedTarget: 'rust', sourceAuthority: 'wakeforge', permittedTargets: ['javascript'] }),
    /not permitted/i
  );
});

gate('WakeForge rejects undeclared recovery authority', () => {
  assert.throws(
    () => wakeBody({ source, registry, punctuation: punctRaw, recovery: { authority: 'ASSUMED_SOURCE' } }),
    /RECOVERED_SOURCE or DECLARED_FORWARD_BRIDGE/
  );
});

gate('WakeForge recovered-source route reaches Ding and emission', () => {
  const result = wakeBody({
    source,
    registry,
    punctuation: punctRaw,
    target: 'javascript',
    recovery: { authority: 'RECOVERED_SOURCE', reference: 'WakeForge v0.6B logic lineage' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.state, 'WOKEN_NOT_CROWNED');
  assert.equal(result.receipt.ding, true);
  assert.equal(result.graph.source.authority, 'RECOVERED_SOURCE');
  assert.equal(result.graph.theoc.punctHash.length, 8);
  assert.equal(result.emitted.extension, 'mjs');
  assert.match(result.claimBoundary, /device-proven crown blocked/i);
});

gate('WakeForge declared bridge remains visibly declared', () => {
  const result = wakeBody({
    source,
    registry,
    target: 'typescript',
    recovery: { authority: 'DECLARED_FORWARD_BRIDGE', reference: 'authorised forward bridge test' }
  });
  assert.equal(result.ok, true);
  assert.equal(result.graph.source.authority, 'DECLARED_FORWARD_BRIDGE');
  assert.equal(result.emitted.extension, 'ts');
});

gate('WakeForge parse failure HOLDs instead of fabricating recovery', () => {
  const result = wakeBody({
    source: 'BODY wakeforge\nUNKNOWN nope\nDING "x"\nEND',
    registry,
    recovery: { authority: 'RECOVERED_SOURCE' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.state, 'PARSE_HOLD');
  assert.equal(result.claimBoundary, 'NO_DING_NO_CLAIM');
});

gate('Anatomy identities stay separate', () => {
  assert.deepEqual(
    [COMPILER_ANATOMY.primebody.id, COMPILER_ANATOMY.theoc.id, COMPILER_ANATOMY.hybrid.id, COMPILER_ANATOMY.wakeforge.id],
    ['primebody', 'theoc', 'hybrid-auto-compiler', 'wakeforge']
  );
});

gate('Wave identity is explicit', () => {
  assert.equal(WAVE, 'jm.compiler-anatomy.native-maturation/2');
});

console.log(`DING COMPILER_ANATOMY_WAVE_2 ${passed}/10 PASS`);
