import { compilePortable, stableStringify } from './compiler-core.mjs';

export const CANONICAL_NATIVE_VERSION = '2.0';
export const CANONICAL_NATIVE_SCHEMA = 'jm.everybody.canonical-native-spec/2.0';
export const CANONICAL_AST_SCHEMA = 'jm.everybody.canonical-native-ast/2.0';

const FAMILY_DEFINITIONS = Object.freeze({
  route: {
    commands: ['SOURCE', 'ROUTE', 'STATE', 'RECOVER'],
    requiredAny: ['ROUTE', 'STATE'],
    meaning: 'source, route, state transition and recovery',
    effects: { SOURCE: 'declare_source', ROUTE: 'open_route', STATE: 'set_state', RECOVER: 'restore_route' }
  },
  logic: {
    commands: ['FACT', 'WHEN', 'THEN', 'OTHERWISE', 'DECIDE'],
    requiredAny: ['WHEN', 'DECIDE'],
    meaning: 'facts, conditions, consequence and visible decision',
    effects: { FACT: 'register_fact', WHEN: 'open_condition', THEN: 'apply_consequence', OTHERWISE: 'apply_alternative', DECIDE: 'commit_decision' }
  },
  formula: {
    commands: ['FORM', 'BIND', 'APPLY', 'YIELD'],
    requiredAny: ['FORM', 'APPLY'],
    meaning: 'form, relation, operation and yielded consequence',
    effects: { FORM: 'declare_form', BIND: 'bind_relation', APPLY: 'apply_operator', YIELD: 'yield_body' }
  },
  embodied: {
    commands: ['POSE', 'CONTACT', 'HOLD', 'RELEASE', 'SHIFT'],
    requiredAny: ['CONTACT', 'POSE'],
    meaning: 'embodied signal, contact, duration and state shift',
    effects: { POSE: 'declare_pose', CONTACT: 'open_contact', HOLD: 'maintain_contact', RELEASE: 'release_contact', SHIFT: 'shift_body_state' }
  },
  compiler: {
    commands: ['SOURCE', 'TOKEN', 'PARSE', 'LOWER', 'EMIT'],
    requiredAny: ['PARSE', 'LOWER'],
    meaning: 'source transformation into verified executable structure',
    effects: { SOURCE: 'accept_source', TOKEN: 'emit_token', PARSE: 'build_ast', LOWER: 'lower_ir', EMIT: 'emit_target' }
  },
  runtime: {
    commands: ['STATE', 'LOAD', 'EXEC', 'ROUTE', 'RECOVER'],
    requiredAny: ['LOAD', 'EXEC'],
    meaning: 'verified loading, execution, routing and recovery',
    effects: { STATE: 'set_runtime_state', LOAD: 'load_instruction', EXEC: 'execute_instruction', ROUTE: 'route_execution', RECOVER: 'recover_runtime' }
  },
  game: {
    commands: ['ENTITY', 'INPUT', 'RULE', 'STEP', 'COLLIDE', 'SCORE'],
    requiredAny: ['RULE', 'STEP'],
    meaning: 'entities, input, deterministic rules and playable consequence',
    effects: { ENTITY: 'spawn_entity', INPUT: 'accept_input', RULE: 'register_rule', STEP: 'advance_simulation', COLLIDE: 'resolve_contact', SCORE: 'update_score' }
  },
  governance: {
    commands: ['CLAIM', 'EVIDENCE', 'GATE', 'HOLD', 'PASS'],
    requiredAny: ['GATE', 'PASS'],
    meaning: 'claim, evidence, gate decision and receipt boundary',
    effects: { CLAIM: 'register_claim', EVIDENCE: 'attach_evidence', GATE: 'evaluate_gate', HOLD: 'hold_claim', PASS: 'pass_gate' }
  },
  delivery: {
    commands: ['SOURCE', 'MANIFEST', 'HASH', 'PACKAGE', 'OPEN_FIRST'],
    requiredAny: ['PACKAGE', 'OPEN_FIRST'],
    meaning: 'recoverable packaging, integrity and open-first delivery',
    effects: { SOURCE: 'attach_source', MANIFEST: 'write_manifest', HASH: 'record_integrity', PACKAGE: 'seal_package', OPEN_FIRST: 'declare_entry' }
  },
  visual: {
    commands: ['FIELD', 'INPUT', 'RENDER', 'FEEDBACK', 'SYNC'],
    requiredAny: ['RENDER', 'FEEDBACK'],
    meaning: 'state-linked visual field, input and readable feedback',
    effects: { FIELD: 'declare_visual_field', INPUT: 'accept_visual_input', RENDER: 'render_state', FEEDBACK: 'show_consequence', SYNC: 'sync_visual_state' }
  },
  authoring: {
    commands: ['PROJECT', 'BODYREF', 'EDIT', 'BUILD', 'TEST', 'EXPORT'],
    requiredAny: ['BUILD', 'TEST'],
    meaning: 'authoring, inspection, building, testing and export',
    effects: { PROJECT: 'open_project', BODYREF: 'reference_body', EDIT: 'edit_source', BUILD: 'build_body', TEST: 'test_body', EXPORT: 'export_body' }
  },
  composition: {
    commands: ['SOURCE', 'TARGET', 'CHECK', 'BIND', 'ROLLBACK'],
    requiredAny: ['CHECK', 'BIND'],
    meaning: 'identity-preserving compatibility, binding and rollback',
    effects: { SOURCE: 'declare_source_body', TARGET: 'declare_target_body', CHECK: 'check_compatibility', BIND: 'bind_bodies', ROLLBACK: 'rollback_binding' }
  },
  service: {
    commands: ['REGISTER', 'LOOKUP', 'RESOLVE', 'RETURN', 'VERSION'],
    requiredAny: ['REGISTER', 'LOOKUP'],
    meaning: 'registered symbols, lookup, resolution and versioned return',
    effects: { REGISTER: 'register_entry', LOOKUP: 'lookup_entry', RESOLVE: 'resolve_entry', RETURN: 'return_result', VERSION: 'record_version' }
  }
});

const CORE_COMMANDS = Object.freeze(['LAW', 'TRACE', 'DING']);
const RESERVED_COMMANDS = new Set([...CORE_COMMANDS, 'NATIVE', 'END']);

const unique = values => [...new Set(values)];

function normaliseText(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function capabilityCommand(capability) {
  const token = String(capability ?? '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return `CAP_${token || 'UNNAMED'}`;
}

export function classifyCanonicalFamily(body) {
  const text = normaliseText(`${body.id} ${body.name} ${body.kind} ${(body.caps ?? []).join(' ')}`);
  if (/gesture|mudra|contact|speech|embodied|body input|paired contact|mood|signal language|pattern tapping|seedform/.test(text)) return 'embodied';
  if (/game|playable|glyphplay|gameforge|glyphforge|playform/.test(text)) return 'game';
  if (/compiler|parser|frontend|emitter|lexer|syntax body|compiler ir|tokenbody|punctbody|theoc|primebody/.test(text)) return 'compiler';
  if (/virtual machine|\bvm\b|opcode|runtime|routevm|jmvm|cadenvm|routecore|routeos|routebox/.test(text)) return 'runtime';
  if (/governance|proof|validation|guardrail|register|ledger|gate|dings|reality contact|choice box/.test(text)) return 'governance';
  if (/delivery|container|build mode|zionfolder|onebody delivery/.test(text)) return 'delivery';
  if (/visual|render|interaction runtime/.test(text)) return 'visual';
  if (/ide|lab|builder|authoring|codestudio|language service|pattern library|namebank|lexicon|speakgate/.test(text)) return 'authoring';
  if (/composition|graft|smooth|bridge|adapter|combibind|polyglot/.test(text)) return 'composition';
  if (/formula|formeula|formulaborn|formula born/.test(text)) return 'formula';
  if (/logic|decision/.test(text)) return 'logic';
  if (/registry|service|lookup/.test(text)) return 'service';
  return 'route';
}

export function canonicalNativeSpec(body) {
  if (!body?.id || !body?.name || !body?.kind || !body?.law) throw new TypeError('Complete body descriptor required.');
  const family = classifyCanonicalFamily(body);
  const definition = FAMILY_DEFINITIONS[family];
  const capabilityCommands = unique((body.caps ?? []).map(capabilityCommand)).filter(command => !RESERVED_COMMANDS.has(command));
  const commands = unique([...definition.commands, ...capabilityCommands, ...CORE_COMMANDS]);
  return {
    schema: CANONICAL_NATIVE_SCHEMA,
    body: { id: body.id, name: body.name, kind: body.kind, law: body.law },
    version: CANONICAL_NATIVE_VERSION,
    authority: 'CURRENT_JM_CANON_AUTHORISED_17_JULY_2026',
    historicalClaim: false,
    family,
    familyMeaning: definition.meaning,
    familyCommands: definition.commands,
    requiredAny: definition.requiredAny,
    capabilityCommands: Object.fromEntries((body.caps ?? []).map(capability => [capabilityCommand(capability), capability])),
    commands,
    effects: {
      ...definition.effects,
      ...Object.fromEntries(capabilityCommands.map(command => [command, 'invoke_registered_capability'])),
      LAW: 'bind_governing_law',
      TRACE: 'record_native_trace',
      DING: 'issue_native_receipt'
    },
    contracts: {
      identityPreserved: true,
      lawMustMatchRegistry: true,
      bodySpecificCapabilityRequired: capabilityCommands.length > 0,
      familyCommandRequired: true,
      traceRequired: true,
      dingRequired: true,
      roundTripRequired: true,
      portableLoweringRequired: true,
      historicalEvidenceSeparate: true
    }
  };
}

function diagnostic(code, message, extra = {}) {
  return { level: 'error', code, message, ...extra };
}

function parseValue(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return '';
  try { return JSON.parse(trimmed); } catch { return trimmed; }
}

function sourceLines(source) {
  return String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
}

export function parseCanonicalNative(bodyId, source, registry) {
  const body = registry?.bodies?.find(candidate => candidate.id === bodyId) ?? null;
  if (!body) return { ok: false, diagnostics: [diagnostic('UNKNOWN_BODY', `Body ${bodyId} is not registered.`)] };
  const spec = canonicalNativeSpec(body);
  const lines = sourceLines(source);
  const diagnostics = [];
  const tokens = [];
  const statements = [];
  let header = null;
  let ended = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = index + 1;
    const raw = lines[index];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const match = trimmed.match(/^(\S+)(?:\s+([\s\S]*))?$/);
    const head = (match?.[1] ?? '').toUpperCase();
    const rest = match?.[2] ?? '';
    tokens.push({ line, column: raw.indexOf(match?.[1] ?? '') + 1, head, rest, raw });

    if (!header) {
      if (head !== 'NATIVE') {
        diagnostics.push(diagnostic('NATIVE_HEADER_REQUIRED', 'First statement must be NATIVE <body-id> 2.0.', { line }));
        continue;
      }
      const [declaredBody = '', version = ''] = rest.trim().split(/\s+/);
      header = { declaredBody, version, line };
      if (declaredBody !== bodyId) diagnostics.push(diagnostic('BODY_ID_MISMATCH', `Expected ${bodyId}, received ${declaredBody}.`, { line }));
      if (version !== CANONICAL_NATIVE_VERSION) diagnostics.push(diagnostic('VERSION_MISMATCH', `Expected canonical native ${CANONICAL_NATIVE_VERSION}.`, { line }));
      continue;
    }

    if (ended) {
      diagnostics.push(diagnostic('AFTER_END', 'No statements are allowed after END.', { line }));
      continue;
    }
    if (head === 'END') {
      ended = true;
      continue;
    }
    if (!spec.commands.includes(head)) {
      diagnostics.push(diagnostic('COMMAND_NOT_IN_BODY_SPEC', `${head} is not valid for ${bodyId}/${spec.family}.`, { line, allowed: spec.commands }));
      continue;
    }
    const value = parseValue(rest);
    statements.push({ op: head, value, effect: spec.effects[head], line, column: raw.indexOf(match?.[1] ?? '') + 1 });
  }

  if (!header) diagnostics.push(diagnostic('NATIVE_HEADER_REQUIRED', 'NATIVE header missing.'));
  if (!ended) diagnostics.push(diagnostic('END_REQUIRED', 'Canonical native source requires END.'));
  const lawStatements = statements.filter(statement => statement.op === 'LAW');
  const traceStatements = statements.filter(statement => statement.op === 'TRACE');
  const dingStatements = statements.filter(statement => statement.op === 'DING');
  if (lawStatements.length !== 1) diagnostics.push(diagnostic('ONE_LAW_REQUIRED', 'Exactly one LAW statement is required.'));
  if (lawStatements.length === 1 && lawStatements[0].value !== body.law) diagnostics.push(diagnostic('LAW_MISMATCH', 'LAW must exactly match the registered governing law.'));
  if (traceStatements.length < 1) diagnostics.push(diagnostic('TRACE_REQUIRED', 'At least one TRACE statement is required.'));
  if (dingStatements.length !== 1) diagnostics.push(diagnostic('ONE_DING_REQUIRED', 'Exactly one DING statement is required.'));
  const familyOps = statements.filter(statement => spec.familyCommands.includes(statement.op));
  if (!familyOps.some(statement => spec.requiredAny.includes(statement.op))) {
    diagnostics.push(diagnostic('FAMILY_MEANING_NOT_PROVEN', `At least one of ${spec.requiredAny.join(', ')} is required for ${spec.family}.`));
  }
  const capabilityOps = statements.filter(statement => Object.hasOwn(spec.capabilityCommands, statement.op));
  if (spec.contracts.bodySpecificCapabilityRequired && capabilityOps.length < 1) diagnostics.push(diagnostic('BODY_CAPABILITY_REQUIRED', 'At least one registered body capability must execute.'));

  const ast = {
    schema: CANONICAL_AST_SCHEMA,
    body: { id: body.id, name: body.name, kind: body.kind },
    version: CANONICAL_NATIVE_VERSION,
    family: spec.family,
    authority: spec.authority,
    historicalClaim: false,
    law: body.law,
    statements,
    sourceMap: statements.map((statement, index) => ({ index, line: statement.line, column: statement.column, op: statement.op })),
    source: String(source ?? '')
  };
  return { ok: !diagnostics.some(item => item.level === 'error'), body, spec, ast, diagnostics, tokens };
}

function statementLine(statement) {
  return `${statement.op} ${JSON.stringify(statement.value)}`;
}

export function formatCanonicalNative(ast) {
  return [
    `NATIVE ${ast.body.id} ${CANONICAL_NATIVE_VERSION}`,
    ...ast.statements.map(statementLine),
    'END'
  ].join('\n');
}

export function lowerCanonicalNative(ast) {
  const executable = ast.statements.filter(statement => !['LAW', 'TRACE', 'DING'].includes(statement.op));
  const tracePayload = {
    schema: CANONICAL_AST_SCHEMA,
    body: ast.body,
    family: ast.family,
    authority: ast.authority,
    historicalClaim: false,
    operations: executable.map(statement => ({ op: statement.op, effect: statement.effect, value: statement.value, line: statement.line }))
  };
  const lines = [
    `BODY ${ast.body.id}`,
    `VERSION canonical-native-${CANONICAL_NATIVE_VERSION}`,
    `SET native_family ${JSON.stringify(ast.family)}`,
    `SET native_version ${JSON.stringify(CANONICAL_NATIVE_VERSION)}`,
    `SET native_command_count ${executable.length}`,
    `SET native_effect_count ${executable.length}`,
    `ROUTE ${ast.body.id}.canonical-native.${ast.family}`
  ];
  for (const statement of executable) {
    lines.push(`ROUTE ${ast.body.id}.${statement.op.toLowerCase()}`);
    lines.push(`TRACE ${JSON.stringify({ op: statement.op, effect: statement.effect, value: statement.value, sourceLine: statement.line })}`);
  }
  lines.push(`TRACE ${JSON.stringify(tracePayload)}`);
  lines.push(`ASSERT native_command_count ${executable.length}`);
  lines.push(`ASSERT native_effect_count ${executable.length}`);
  lines.push(`DING ${JSON.stringify({ body: ast.body.id, status: 'CANONICAL_NATIVE_V2_EXECUTED', family: ast.family, historicalClaim: false })}`);
  lines.push('END');
  return lines.join('\n');
}

export function compileCanonicalNative(bodyId, source, registry) {
  const parsed = parseCanonicalNative(bodyId, source, registry);
  if (!parsed.ok) return { ok: false, bodyId, status: 'CANONICAL_NATIVE_V2_PARSE_OR_SEMANTIC_FAILURE', parsed, diagnostics: parsed.diagnostics };
  const portableSource = lowerCanonicalNative(parsed.ast);
  const compiled = compilePortable(portableSource, registry);
  const formatted = formatCanonicalNative(parsed.ast);
  const reparsed = parseCanonicalNative(bodyId, formatted, registry);
  const roundTrip = reparsed.ok && stableStringify(reparsed.ast.statements.map(({ op, value, effect }) => ({ op, value, effect }))) === stableStringify(parsed.ast.statements.map(({ op, value, effect }) => ({ op, value, effect })));
  return {
    ok: compiled.ok && roundTrip,
    bodyId,
    status: compiled.ok && roundTrip ? 'CANONICAL_NATIVE_V2_TO_PORTABLE_RUNTIME_PASS' : 'CANONICAL_NATIVE_V2_LOWER_RUNTIME_OR_ROUNDTRIP_FAILURE',
    specification: parsed.spec,
    parsed,
    formatted,
    roundTrip,
    portableSource,
    compiled,
    claimBoundary: 'This is the official current JM canonical-native v2 specification authorised by the source owner. It does not overwrite or fabricate unrecovered historical syntax.'
  };
}

export function fixtureCanonicalNativeSource(body) {
  const spec = canonicalNativeSpec(body);
  const familyCommands = unique([spec.requiredAny[0], ...spec.familyCommands]).slice(0, 3);
  const capabilityCommands = Object.keys(spec.capabilityCommands).slice(0, 2);
  const selected = unique([...familyCommands, ...capabilityCommands]);
  return [
    `NATIVE ${body.id} ${CANONICAL_NATIVE_VERSION}`,
    `LAW ${JSON.stringify(body.law)}`,
    ...selected.map((op, index) => `${op} ${JSON.stringify({ body: body.id, family: spec.family, command: op, ordinal: index + 1 })}`),
    `TRACE ${JSON.stringify({ body: body.id, family: spec.family, proof: 'canonical-native-v2-fixture' })}`,
    `DING ${JSON.stringify({ body: body.id, status: 'CANONICAL_NATIVE_V2_READY' })}`,
    'END'
  ].join('\n');
}

export function canonicalNativeAvailability(body, exactAdapterIds = []) {
  return {
    bodyId: body.id,
    currentCanonicalNative: 'COMPLETE_V2',
    historicalNative: exactAdapterIds.includes(body.id) ? 'EXACT_RECOVERED_SUBSET_EXECUTABLE' : 'HISTORICAL_EVIDENCE_SEPARATE_OR_UNRECOVERED',
    family: classifyCanonicalFamily(body),
    currentDegree: 10,
    historicalClaim: false
  };
}

export { FAMILY_DEFINITIONS };
