import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runJMREA } from './jm_rea_powered_contact.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EV1 = 'ev_' + 'a'.repeat(64);
const EV2 = 'ev_' + 'b'.repeat(64);
const UK = 'unk_' + 'c'.repeat(64);
function bundle() {
  const base = (id, links) => ({
    evidence_id: id, provider: { id: 'test', name: 'TestFixture', version: '0' },
    subject: { name: '/dont-publish/internal.apk', digest: { sha256: 'f'.repeat(64) },
      format: 'apk', architecture: null, local_path: '/dont-publish/internal.apk' },
    predicate_type: 'test.fixture', operation: 'inspect_fixture',
    confidence: 'derived', authority: 'analyst-inference',
    limitations: ['synthetic test only'], evidence_links: links,
    locations: [{ kind: 'artifact-path', path: '/dont-publish/internal.apk' }],
    raw_result: { secret: 'SOURCE_BYTES_SHOULD_NOT_LEAK' },
    normalized_result: { secret: 'SOURCE_BYTES_SHOULD_NOT_LEAK' }
  });
  return {
    artifacts: [], providers: [], environments: [], scenarios: [], captures: [],
    records: [base(EV1, []), base(EV2, [EV1])],
    unknowns: [{ unknown_id: UK, revision: 1, status: 'open', severity: 'high',
      question: 'Prove actual REA and target contact', supporting_evidence_ids: [EV1],
      contradicting_evidence_ids: [], mutation_evidence_ids: [EV2] }]
  };
}
function inTemp(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-rea-powered-test-'));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('four ORIGINAL JM executable organs run and remain strictly scoped', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-rea-powered-test-'));
  try {
    const p = path.join(d, 'rea.synthetic.json');
    const raw = JSON.stringify(bundle());
    fs.writeFileSync(p, raw);
    const result = await runJMREA({ source: p });
    assert.equal(result.schema, 'JM.REA.PoweredEvidenceContact/0.2');
    assert.equal(result.source.sha256, crypto.createHash('sha256').update(raw).digest('hex'));
    assert.equal(result.source.evidence_records, 2);
    assert.equal(result.source.unresolved_questions, 1);
    assert.deepEqual(result.investigation_signals.families, ['android']);
    assert.ok(result.investigation_signals.actual_query.includes('android'));
    assert.deepEqual(result.source.target_artifact_sha256_claims, ['f'.repeat(64)]);
    assert.equal(result.executed_original_jm_bodies.length, 4);
    assert.equal(result.jm_portable_agent.coding_identities, 64);
    assert.equal(result.jm_portable_agent.active_route_selected_not_spawned.length, 12);
    const ids = new Set(result.jm_estate_router.selected_bodies.map(x => x.id));
    for (const id of ['tracebox','dings','source-ledger']) assert.ok(ids.has(id), id);
    assert.equal(result.jm_estate_router.registry_count, 100);
    assert.equal(result.jm_compiler.body_id, 'source-ledger');
    assert.equal(result.jm_compiler.executed_state.records, 2);
    assert.equal(result.jm_compiler.executed_state.unknowns, 1);
    assert.equal(result.jm_compiler.assertions_passed, 3);
    assert.equal(result.source_claims.jm_runtime_ran, true);
    for (const field of ['rea_integrity_verified', 'rea_executed', 'target_apk_executed',
      'owner_device_contact', 'build_mesh_integrated']) assert.equal(result.source_claims[field], false);
    assert.ok(!JSON.stringify(result).includes('SOURCE_BYTES_SHOULD_NOT_LEAK'));
    assert.ok(!JSON.stringify(result).includes('/dont-publish/'));
    assert.equal(fs.readFileSync(p, 'utf8'), raw);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
test('broken source Evidence reference yields HOLD not compiler Ding', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-rea-powered-test-'));
  try {
    const b = bundle();
    b.records[1].evidence_links = ['ev_' + 'd'.repeat(64)];
    const p = path.join(d, 'broken.json');
    fs.writeFileSync(p, JSON.stringify(b));
    await assert.rejects(runJMREA({ source: p }), /JM_COMPONENT_FAILURE/);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
test('read-only CLI refuses to overwrite an existing receipt', () => {
  inTemp(d => {
    const p = path.join(d, 'evidence.json');
    const out = path.join(d, 'receipt.json');
    fs.writeFileSync(p, JSON.stringify(bundle()));
    fs.writeFileSync(out, 'KEEP_ME');
    const r = spawnSync('node', [path.join(HERE, 'jm_rea_powered_contact.mjs'),
      p, '--output', out], { encoding:'utf8', timeout: 45_000 });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /JM REA CONTACT HOLD/);
    assert.equal(fs.readFileSync(out, 'utf8'), 'KEEP_ME');
  });
});
test('unknown query remains unrouted by JM sovereign agent', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-rea-powered-test-'));
  try {
    const p = path.join(d, 'evidence.json');
    fs.writeFileSync(p, JSON.stringify(bundle()));
    const result = await runJMREA({ source:p, query:'zzzz-no-known-domain' });
    assert.deepEqual(result.jm_portable_agent.route_candidates, []);
    assert.equal(result.jm_compiler.executed_state.records, 2);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('REA JavaScript operation labels route JM coding bodies toward JS rather than Android', async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-rea-powered-test-'));
  try {
    const b = bundle();
    for (const record of b.records) {
      record.subject.format = 'directory';
      record.operation = 'analyze_javascript_application';
      record.predicate_type = 'rea.javascript-application';
      record.normalized_result = { statistics: { module_count: 4, relation_count: 13 },
        graph: { nodes: [1, 2, 3] }, semantic_graph: { relations: [1, 2] },
        secret: 'DO_NOT_PUBLISH_OR_COPY' };
    }
    const p = path.join(d, 'rea-js.json');
    fs.writeFileSync(p, JSON.stringify(b));
    const report = await runJMREA({source: p});
    assert.deepEqual(report.investigation_signals.families, ['javascript']);
    assert.ok(report.investigation_signals.actual_query.includes('javascript'));
    assert.ok(!report.investigation_signals.actual_query.includes('android'));
    assert.equal(report.jm_compiler.executed_state.records, 2);
    assert.equal(report.source_structure.graph_records, 2);
    assert.equal(report.source_structure.semantic_graph_records, 2);
    assert.equal(report.source_structure.metrics.module_count, 4);
    assert.equal(report.source_structure.metrics.semantic_graph_relations_count, 2);
    assert.equal(report.jm_compiler.executed_state.structural_metrics, Object.keys(report.source_structure.metrics).length);
    assert.ok(!JSON.stringify(report).includes('DO_NOT_PUBLISH_OR_COPY'));
  } finally { fs.rmSync(d, {recursive: true, force: true}); }
});
