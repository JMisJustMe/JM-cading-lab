#!/usr/bin/env node
/*
 * JM × REA POWERED CONTACT v0.2 — real JM runtime/route/compiler execution.
 * REA inputs are untrusted metadata. No REA target execution; no estate mutation.
 * Current-64 selection is not 12 separate process executions.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planEstateRoute, validateRegistry } from '../../../coding-estate/integration/router-core.mjs';
import { loadFederatedRegistry } from '../../../coding-estate/everybody/registry-loader.mjs';
import { EverybodyMaximiser } from '../../../coding-estate/everybody/everybody-maximiser.mjs';
import { compilePortable } from '../../../coding-estate/everybody/compiler-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const CORE_QUERY = 'source trace proof recover';
const FAMILIES = [
  ['android', /android|apk|jadx|dex/i, ['android','parse','compile','trace']],
  ['javascript', /javascript|electron|asar|source.map/i, ['javascript','parse','compile','route']],
  ['native-binary', /binary|mach.o|\belf\b|\bpe\b|ghidra|hopper|ida/i, ['binary','parse','trace']],
  ['website', /website|browser|web.page|webpage/i, ['visual','route','trace']],
  ['managed-dotnet', /dotnet|\.net|cil|assembly/i, ['compile','parse','trace']]
];
function classifyEvidence(records) {
  const kinds = new Set();
  const tags = new Set();
  for (const rec of records) {
    const identity = [rec.source_subject?.format ?? '',rec.predicate_type ?? '',rec.operation ?? ''].join(' ').slice(0, 1024);
    for (const [kind, pattern, words] of FAMILIES) if (pattern.test(identity)) {
      kinds.add(kind);
      for (const word of words) tags.add(word);
    }
  }
  return { families: [...kinds].sort(), routing_terms: [...tags].sort(),
    authority: 'DERIVED_FROM_UNVERIFIED_REA_LABELS' };
}
const SHA = /^[0-9a-f]{64}$/;

function jsonFile(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function digest(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
function run(bin, args) {
  const result = spawnSync(bin, args, { cwd: ROOT, encoding: 'utf8', timeout: 45_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error('JM_COMPONENT_FAILURE (' + bin + '): ' + (result.error?.code ?? result.status) +
      ' ' + String(result.stderr ?? '').slice(0, 500));
  }
  return result.stdout.trim();
}
function requireTruth(value, message) { if (!value) throw new Error('JM_GATE_HOLD: ' + message); }
function usage() {
  return 'Usage: node jm_rea_powered_contact.mjs /absolute/rea-bundle-or-snapshot.json [--output /new/receipt.json] [--query "inspect code trace ..."]';
}
function argsParse(argv) {
  if (!argv.length || argv.includes('--help')) throw new Error(usage());
  const source = argv[0];
  let output = null, query = null;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--output' && argv[i + 1]) output = argv[++i];
    else if (argv[i] === '--query' && argv[i + 1]) query = argv[++i];
    else throw new Error('Unknown argument: ' + argv[i]);
  }
  requireTruth(source !== output, 'INPUT_OUTPUT_SAME_PATH');
  requireTruth(query === null || (query.length > 0 && query.length <= 280), 'QUERY_LENGTH');
  return { source, output, query };
}

export async function runJMREA({ source, query = null }) {
  requireTruth(path.isAbsolute(source), 'INPUT_MUST_BE_ABSOLUTE');
  const raw = fs.readFileSync(source);
  const sourceHash = digest(raw);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-rea-contact-'));
  let candidate;
  try {
    const extracted = path.join(temporary, 'metadata-candidate.json');
    // Execute existing v0.1 safety importer, without optional sensitive locations.
    run('python3', [path.join(HERE, 'jm_rea_evidence_contact.py'), source, extracted,
      '--expect-input-sha256', sourceHash]);
    candidate = jsonFile(extracted);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  requireTruth(candidate.state === 'EXTRACTED_UNVERIFIED', 'IMPORTER_AUTHORITY_DRIFT');
  requireTruth(candidate.source.file_sha256 === sourceHash, 'SOURCE_HASH_MISMATCH');
  requireTruth(candidate.proof_boundary.jm_executable_contact === false, 'CLAIM_INFLATION');

  // Known format/operation labels steer JM's own routing, never commands.
  const investigationSignals = classifyEvidence(candidate.records);
  const effectiveQuery = query ?? [CORE_QUERY, ...investigationSignals.routing_terms].join(' ');
  requireTruth(effectiveQuery.length > 0 && effectiveQuery.length <= 280, 'EFFECTIVE_QUERY_LENGTH');
  // Run the actual existing JM Python & Node sovereign portable agents.
  const pyText = run('python3', ['agent-runtime/jm_agent_runtime.py', '--core-only',
    '--surface', 'portable-runtime', '--query', effectiveQuery]);
  const nodeText = run('node', ['agent-runtime/jm-agent-runtime.mjs', '--core-only',
    '--surface', 'portable-runtime', '--query', effectiveQuery]);
  requireTruth(pyText === nodeText, 'SOVEREIGN_RUNTIME_PY_NODE_PARITY');
  const core = JSON.parse(pyText);
  requireTruth(core.authority_class === 'SESSION_ROUTER_NOT_SOURCE_AUTHORITY', 'ROUTER_AUTHORITY');
  requireTruth(core.coding.activation.accounting.current_coding_identities === 64,
    'CURRENT64_ACCOUNTING');
  requireTruth(core.coding.activation.accounting.active_route === 12 &&
    core.coding.activation.selection_is_process_execution === false,
    'ACTIVATION_PROOF_BOUNDARY');

  // Run the actual existing JM 100-body Estate Router, loading its registry as-is.
  const manifest = jsonFile(path.join(ROOT, 'coding-estate/integration/REGISTRY.json'));
  const directory = path.join(ROOT, 'coding-estate/integration');
  const estateRegistry = { ...manifest, bodies: manifest.parts.flatMap(p =>
    jsonFile(path.join(directory, p)).bodies) };
  const validation = validateRegistry(estateRegistry);
  requireTruth(validation.valid && validation.count === 100, 'JM_100_REGISTRY');
  const plan = planEstateRoute(effectiveQuery, estateRegistry);
  const routedIds = new Set(plan.route.map(r => r.id));
  for (const id of ['tracebox', 'dings', 'source-ledger'])
    requireTruth(routedIds.has(id), 'PROOF_SPINE_MISSING_' + id);

  // Run the actual existing JM EveryBody registry+compiler+portable execution.
  // The program checks the imported metadata counts; it does not revalidate REA.
  const registry = await loadFederatedRegistry();
  const maximiser = new EverybodyMaximiser(registry);
  requireTruth(maximiser.getBody('source-ledger'), 'JM_SOURCE_LEDGER_ABSENT');
  const native = [
    'BODY source-ledger',
    'VERSION 0.2',
    'SET records ' + candidate.record_count,
    'SET unknowns ' + candidate.unknown_count,
    'ASSERT records ' + candidate.record_count,
    'ASSERT unknowns ' + candidate.unknown_count,
    'ROUTE jm.rea.metadata-candidate',
    'TRACE ' + JSON.stringify({ sha256: sourceHash, state: candidate.state,
      scope: 'JM_PORTABLE_SOURCE_LEDGER_ONLY' }),
    'DING ' + JSON.stringify({ scope: 'PORTABLE_SOURCE_LEDGER_EXECUTION',
      rea_authenticated: false, target_reconstructed: false, recipient_proven: false }),
    'END'
  ].join('\n');
  const compiled = compilePortable(native, registry);
  requireTruth(compiled.ok && compiled.receipt?.ok &&
    compiled.receipt?.state?.records === candidate.record_count &&
    compiled.receipt?.state?.unknowns === candidate.unknown_count &&
    compiled.receipt?.assertions?.every(a => a.passed), 'JM_COMPILER_EXECUTION');
  requireTruth(compiled.receipt.body.id === 'source-ledger', 'COMPILER_BODY_IDENTITY');

  return {
    schema: 'JM.REA.PoweredEvidenceContact/0.2',
    status: 'JM_LOCAL_RUNTIME_EXECUTED__REA_UNVERIFIED',
    source: { sha256: sourceHash, byte_count: raw.length, kind: candidate.source.kind,
      evidence_records: candidate.record_count, unresolved_questions: candidate.unknown_count, 
      target_artifact_sha256_claims: [...new Set(candidate.records.map(r => r.source_subject?.sha256).filter(v => SHA.test(v)))].sort() },
    investigation_signals: { ...investigationSignals, actual_query: effectiveQuery,
      route_is_executed_by_JM_not_REA: true },
    executed_original_jm_bodies: [
      { path: 'agent-runtime/jm_agent_runtime.py', result: 'EXECUTED' },
      { path: 'agent-runtime/jm-agent-runtime.mjs', result: 'EXECUTED_PARITY_PASS' },
      { path: 'coding-estate/integration/router-core.mjs', result: 'EXECUTED_100_REGISTRY_VALID' },
      { path: 'coding-estate/everybody/compiler-core.mjs', result: 'PORTABLE_IR_EXECUTED' }
    ],
    jm_portable_agent: { core_sha256: digest(Buffer.from(pyText, 'utf8')),
      coding_identities: core.coding.current_identities,
      active_route_selected_not_spawned: core.coding.activation.active_code_ids,
      source_digests: core.source_digests,
      route_candidates: core.route_candidates.slice(0, 7) },
    jm_estate_router: { registry_count: validation.count, plan_schema: plan.schema,
      selected_bodies: plan.route.map(({ id, reasons, order }) => ({ id, reasons, order })),
      execution_scope: 'ROUTE_PLAN_ONLY' },
    jm_compiler: { body_id: compiled.receipt.body.id, ir_schema: compiled.lowered.ir.schema,
      ir_hash: compiled.receipt.irHash, executed_state: compiled.receipt.state,
      assertions_passed: compiled.receipt.assertions.length,
      scoped_ding: compiled.receipt.coldDing,
      boundary: compiled.receipt.claimBoundary },
    source_claims: { rea_integrity_verified: false, rea_executed: false,
      target_apk_executed: false, jm_runtime_ran: true,
      owner_device_contact: false, build_mesh_integrated: false },
    original_input_mutated: false,
    keeper: 'JM EXECUTABLE LOCAL CONTACT IS NOT REA OR OWNER-DEVICE PROOF'
  };
}
async function main() {
  try {
    const { source, output, query } = argsParse(process.argv.slice(2));
    const report = await runJMREA({ source, query });
    const serialized = JSON.stringify(report, null, 2) + '\n';
    if (output) fs.writeFileSync(output, serialized, { flag: 'wx', mode: 0o600 });
    else process.stdout.write(serialized);
  } catch (error) {
    process.stderr.write('JM REA CONTACT HOLD: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
