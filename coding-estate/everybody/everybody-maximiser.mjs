/* JM EveryBody v0.1-alpha
 * Sovereign Compatibility & Maximisation Fabric
 * The resolver selects best-fit bodies without declaring a supreme language.
 */

const MATURITY = Object.freeze({
  'live_prototype': 5,
  'runtime_v0.6_live': 7,
  'device_proven_lineage': 8,
  'proven_lineage': 7,
  'proven_tool_lineage': 7,
  'v0.1_to_v0.10_lineage': 7,
  'v0.1_v0.2_host_proof': 7,
  'multiple_live_lineages': 7,
  'v1.0_lineage': 7,
  'governance_body': 6,
  'v3.16_alpha_lineage': 6,
  'B1_lineage': 6,
  'v3.14_plus_lineage': 6,
  'v0.2I_donor_estate_stage': 6,
  'v0.7B_lineage': 5,
  'developing_body': 3,
  'donor_body': 4,
  'extraction_fuel': 3,
  'recovered_named_body': 2,
  'mounted_lineage': 5,
  'starter_13_body': 5,
  'starter_13_body_trial_pass': 7,
  'inner_spine_body': 5,
  'library_lineage': 5,
  'coding_house_room': 4,
  'finger_two_body': 4,
  'live_github_route': 6,
  'v0.3_46_room_lineage': 7,
  'v0.8_lineage': 6,
  'v0.1_lineage': 4,
  'trial_lineage': 5
});

const REQUIRED_PIPELINE = Object.freeze([
  'recover', 'lex', 'parse', 'AST', 'semantics', 'body_IR',
  'interop_adapter', 'runtime_VM', 'debug_trace', 'tests',
  'JS_TS', 'CPP', 'Rust', 'Wasm_other', 'receipt'
]);

const normalise = value => String(value ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9+.#_-]+/g, ' ')
  .trim();

const words = value => new Set(normalise(value).split(/\s+/).filter(Boolean));
const overlap = (left, right) => [...left].filter(item => right.has(item));
const unique = items => [...new Set(items)];

function assertRegistry(registry) {
  if (!registry || typeof registry !== 'object') throw new TypeError('Registry object required.');
  if (!Array.isArray(registry.bodies) || registry.bodies.length === 0) throw new Error('Registry has no bodies.');
  if (registry.status !== 'ALPHA_NOT_CROWN') throw new Error('Registry must retain ALPHA_NOT_CROWN boundary.');
  if (!registry.laws?.includes('no_supreme_replacement')) throw new Error('No-supreme-body law missing.');
  const ids = new Set();
  for (const body of registry.bodies) {
    if (!body.id || !body.name || !body.kind || !body.law) throw new Error(`Incomplete body descriptor: ${JSON.stringify(body)}`);
    if (ids.has(body.id)) throw new Error(`Duplicate body id: ${body.id}`);
    ids.add(body.id);
    if (!Array.isArray(body.caps) || !Array.isArray(body.needs) || !Array.isArray(body.targets)) {
      throw new Error(`Body arrays missing: ${body.id}`);
    }
  }
  return true;
}

function descriptorText(body) {
  return [body.id, body.name, body.kind, body.status, body.law, ...body.caps, ...body.targets, ...body.needs].join(' ');
}

function scoreBody(body, request) {
  const requestWords = words([
    request.goal,
    ...(request.capabilities ?? []),
    ...(request.targets ?? []),
    ...(request.constraints ?? [])
  ].join(' '));
  const bodyWords = words(descriptorText(body));
  const hits = overlap(requestWords, bodyWords);
  const requestedCaps = (request.capabilities ?? []).map(normalise);
  const requestedTargets = (request.targets ?? []).map(normalise);
  const capHits = body.caps.filter(cap => requestedCaps.some(req => normalise(cap).includes(req) || req.includes(normalise(cap))));
  const targetHits = body.targets.filter(target => requestedTargets.some(req => normalise(target).includes(req) || req.includes(normalise(target))));
  const maturity = MATURITY[body.status] ?? 1;
  const nativeFit = capHits.length * 12 + hits.length * 2;
  const targetFit = targetHits.length * 8;
  const proofFit = maturity * 2;
  const identityStrength = body.law.length > 40 ? 4 : 1;
  const missingPenalty = requestedTargets.length > 0 && targetHits.length === 0 ? 3 : 0;
  const score = nativeFit + targetFit + proofFit + identityStrength - missingPenalty;
  return {
    body,
    score,
    evidence: {
      capHits,
      targetHits,
      wordHits: hits.slice(0, 16),
      maturity,
      nativeLaw: body.law
    }
  };
}

function stageState(body, stage) {
  const text = normalise([...body.caps, ...body.needs, ...body.targets].join(' '));
  const probes = {
    recover: ['recover', 'lineage', 'source'],
    lex: ['lexer', 'tokenizer', 'glyph', 'gesture'],
    parse: ['parser', 'grammar'],
    AST: ['ast', 'flow graph', 'body-state model'],
    semantics: ['semantic', 'validation', 'permission', 'effect', 'contract'],
    body_IR: ['ir', 'bytecode', 'game ir', 'render ir'],
    interop_adapter: ['adapter', 'abi', 'ffi', 'interop', 'bridge'],
    runtime_VM: ['runtime', 'vm', 'engine', 'scheduler'],
    debug_trace: ['debugger', 'trace', 'disassembler', 'receipt'],
    tests: ['test', 'selftest', 'qa', 'fuzz'],
    JS_TS: ['javascript', 'typescript'],
    CPP: ['cpp', 'c++'],
    Rust: ['rust'],
    Wasm_other: ['wasm', 'webassembly', 'android', 'gpu'],
    receipt: ['receipt', 'ding', 'cold-ding']
  };
  const matched = probes[stage]?.some(probe => text.includes(normalise(probe))) ?? false;
  const proven = body.caps.some(cap => probes[stage]?.some(probe => normalise(cap).includes(normalise(probe)))) ||
    body.targets.some(target => probes[stage]?.some(probe => normalise(target).includes(normalise(probe))));
  return proven ? 'present_or_lineage' : matched ? 'required_or_partial' : 'missing_or_unrecovered';
}

function implementationLane(body) {
  return REQUIRED_PIPELINE.map(stage => ({ stage, state: stageState(body, stage) }));
}

function compatibility(primary, support) {
  if (primary.id === support.id) return { compatible: false, reason: 'same_body' };
  const shared = unique(overlap(words(descriptorText(primary)), words(descriptorText(support))));
  const bridgeSignals = shared.filter(x => ['runtime','parser','ir','trace','state','adapter','bridge','game','routing','compatibility','receipt'].includes(x));
  return {
    compatible: bridgeSignals.length > 0,
    confidence: Math.min(1, 0.25 + bridgeSignals.length * 0.12),
    bridgeSignals,
    rule: 'compatibility permits composition; it never transfers source authority'
  };
}

export class EverybodyMaximiser {
  constructor(registry) {
    assertRegistry(registry);
    this.registry = structuredClone(registry);
  }

  getBody(id) {
    return this.registry.bodies.find(body => body.id === id) ?? null;
  }

  audit() {
    const bodyAudits = this.registry.bodies.map(body => ({
      id: body.id,
      name: body.name,
      status: body.status,
      implementationLane: implementationLane(body),
      missing: body.needs,
      existingTargets: body.targets
    }));
    return {
      ok: true,
      status: this.registry.status,
      recoveredCount: this.registry.bodies.length,
      finalCountClaimed: false,
      noSupremeBody: true,
      bodyAudits
    };
  }

  resolve(request) {
    const safeRequest = {
      goal: request?.goal ?? '',
      capabilities: unique(request?.capabilities ?? []),
      targets: unique(request?.targets ?? []),
      constraints: unique(request?.constraints ?? [])
    };
    const ranked = this.registry.bodies
      .map(body => scoreBody(body, safeRequest))
      .sort((a, b) => b.score - a.score || a.body.id.localeCompare(b.body.id));
    const lead = ranked[0];
    const supports = ranked.slice(1)
      .map(candidate => ({ ...candidate, compatibility: compatibility(lead.body, candidate.body) }))
      .filter(candidate => candidate.compatibility.compatible)
      .slice(0, 7);
    const requestedCaps = safeRequest.capabilities.map(normalise);
    const coveredCaps = unique([lead, ...supports].flatMap(item => item.evidence.capHits.map(normalise)));
    const unresolvedCapabilities = requestedCaps.filter(cap => !coveredCaps.some(hit => hit.includes(cap) || cap.includes(hit)));
    const requestedTargets = safeRequest.targets.map(normalise);
    const targetProviders = requestedTargets.map(target => ({
      target,
      bodies: ranked.filter(item => item.body.targets.some(t => normalise(t).includes(target) || target.includes(normalise(t)))).map(item => item.body.id)
    }));
    const plan = {
      planId: `JMEB-${Date.now().toString(36).toUpperCase()}`,
      status: 'MAXIMISATION_PLAN_NOT_CROWN',
      request: safeRequest,
      leadBody: {
        id: lead.body.id,
        name: lead.body.name,
        reason: lead.evidence,
        authorityBoundary: 'lead for this request only; never supreme over the estate',
        implementationLane: implementationLane(lead.body)
      },
      supportingBodies: supports.map(item => ({
        id: item.body.id,
        name: item.body.name,
        reason: item.evidence,
        compatibility: item.compatibility,
        implementationLane: implementationLane(item.body)
      })),
      targetProviders,
      unresolvedCapabilities,
      invariants: [
        'native source meaning preserved',
        'body identity retained in IR and source maps',
        'lossy conversions flagged',
        'runtime permissions and trace remain visible',
        'target emitter cannot silently govern source',
        'compatibility requires conformance and round-trip receipts'
      ]
    };
    plan.receipt = this.receipt(plan);
    return plan;
  }

  receipt(plan) {
    const ding = Boolean(plan.leadBody?.id) && plan.status === 'MAXIMISATION_PLAN_NOT_CROWN';
    return {
      receiptSchema: 'jm.everybody.receipt/0.1',
      ding,
      coldDing: ding ? 'LOOKUP_AND_MAXIMISATION_PLAN_CREATED' : 'NO_DING',
      createdAt: new Date().toISOString(),
      planId: plan.planId,
      leadBody: plan.leadBody?.id ?? null,
      supportingBodies: plan.supportingBodies?.map(x => x.id) ?? [],
      claimBoundary: 'This receipt proves resolution and planning only, not compiler/runtime/target parity.'
    };
  }
}

export async function loadRegistry(source = './body-registry.json') {
  if (typeof source === 'object') return source;
  if (typeof window !== 'undefined') {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Registry fetch failed: ${response.status}`);
    return response.json();
  }
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile(new URL(source, import.meta.url), 'utf8'));
}

export async function createMaximiser(source) {
  return new EverybodyMaximiser(await loadRegistry(source));
}
