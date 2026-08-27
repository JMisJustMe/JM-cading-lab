/*
 * JM Compiler Anatomy — Native Maturation Wave 2
 *
 * This layer does NOT replace PrimeBody, TheoC, Hybrid Auto-Compiler or
 * WakeForge. It composes recovered/proven organs through explicit contracts.
 * Historical source authority and forward bridge authority stay separate.
 */

import {
  parsePortable,
  lowerPortable,
  executePortable,
  emitJavaScriptModule,
  emitTypeScriptModule,
  emitCppHeader,
  emitRustModule,
  fnv1a,
  stableStringify
} from '../compiler-core.mjs';

export const WAVE = 'jm.compiler-anatomy.native-maturation/2';

export const COMPILER_ANATOMY = Object.freeze({
  primebody: {
    id: 'primebody',
    role: 'compiler_frontend',
    authority: 'PROVEN_LINEAGE_ORGAN',
    law: 'source must become explicit structure before execution and Ding'
  },
  theoc: {
    id: 'theoc',
    role: 'compiler_ir',
    authority: 'COMPLETE_PROVEN_ORGAN',
    version: 'v0.2-punctuation-contract',
    law: 'contracts and IR preserve JM permission and meaning before host compilation'
  },
  hybrid: {
    id: 'hybrid-auto-compiler',
    role: 'compiler_router',
    authority: 'FORWARD_NATIVE_DESCENDANT_OVER_MOUNTED_SOURCE_SUMMARY',
    law: 'automation may choose compilation machinery but may not choose source authority'
  },
  wakeforge: {
    id: 'wakeforge',
    role: 'compiler_forge',
    authority: 'BOUNDED_FORWARD_BODY',
    lineageBoundary: 'v0.6B logic current-best + v0.7 shell direction; full device-proven crown blocked',
    law: 'wake dormant bodies into executable routes without rewriting their identity'
  }
});

const TARGETS = new Set(['javascript', 'typescript', 'cpp', 'rust']);

export function preservePunctuation(raw) {
  if (typeof raw !== 'string') throw new TypeError('TheoC punctuation body must be a string.');
  return Object.freeze({
    raw,
    marks: raw.match(/\[[^\]]*\]|::|->|\|\||[^\s]/g) ?? [],
    mode: 'structural',
    interpreted: false,
    hash: fnv1a(raw)
  });
}

export function makeTheoCEnvelope({ portableIr, punctuation = '' }) {
  if (!portableIr || !portableIr.body?.id) throw new TypeError('TheoC requires a lowered body IR.');
  const punct = preservePunctuation(punctuation);
  const envelope = {
    schema: 'jm.theoc.ir/0.2',
    meta: {
      source_kind: 'PrimeBody-or-body-native-frontend',
      compiler_version: 'TheoC.v0.2',
      source_authority: portableIr.contracts?.sourceAuthority ?? portableIr.body.id
    },
    body: portableIr.body,
    portable: portableIr,
    punct,
    contracts: {
      rawPunctuationPreserved: true,
      punctuationOrderPreserved: true,
      punctuationGroupingPreserved: true,
      punctuationExecution: false,
      sourceAuthorityPreserved: true,
      noGuessing: true,
      noSilentCorrection: true
    }
  };
  envelope.hash = fnv1a(envelope);
  return envelope;
}

export function resolveBackend({ requestedTarget, sourceAuthority, permittedTargets = [] }) {
  if (!sourceAuthority) throw new Error('Hybrid Auto-Compiler may not compile without explicit source authority.');
  const target = String(requestedTarget ?? '').toLowerCase();
  if (!TARGETS.has(target)) throw new Error(`Unsupported target ${JSON.stringify(requestedTarget)}.`);
  if (permittedTargets.length && !permittedTargets.includes(target)) {
    throw new Error(`Target ${target} is not permitted by source authority ${sourceAuthority}.`);
  }
  return Object.freeze({
    target,
    sourceAuthority,
    chosenBy: 'capability-resolver',
    authorityChosenByAutomation: false,
    contract: 'TARGET_SELECTION_MAY_AUTOMATE__SOURCE_AUTHORITY_MAY_NOT'
  });
}

export function emitTarget(theoEnvelope, backend, relativeCore = '../../compiler-core.mjs') {
  if (backend.sourceAuthority !== theoEnvelope.meta.source_authority) {
    throw new Error('Backend/source authority mismatch.');
  }
  switch (backend.target) {
    case 'javascript': return { extension: 'mjs', text: emitJavaScriptModule(theoEnvelope.portable, relativeCore) };
    case 'typescript': return { extension: 'ts', text: emitTypeScriptModule(theoEnvelope.portable, relativeCore) };
    case 'cpp': return { extension: 'hpp', text: emitCppHeader(theoEnvelope.portable) };
    case 'rust': return { extension: 'rs', text: emitRustModule(theoEnvelope.portable) };
    default: throw new Error(`No emitter for ${backend.target}.`);
  }
}

export function wakeBody({ source, registry, punctuation = '', target = 'javascript', recovery }) {
  if (!recovery || !['RECOVERED_SOURCE', 'DECLARED_FORWARD_BRIDGE'].includes(recovery.authority)) {
    throw new Error('WakeForge requires RECOVERED_SOURCE or DECLARED_FORWARD_BRIDGE authority.');
  }
  const parsed = parsePortable(source);
  if (!parsed.ok) return hold('PARSE_HOLD', parsed.diagnostics, recovery);

  const lowered = lowerPortable(parsed.ast, registry);
  if (!lowered.ok) return hold('LOWERING_HOLD', lowered.diagnostics, recovery);

  const receipt = executePortable(lowered.ir);
  if (!receipt.ok) return hold('RUNTIME_HOLD', receipt.diagnostics, recovery);

  const theo = makeTheoCEnvelope({ portableIr: lowered.ir, punctuation });
  const sourceBody = lowered.body;
  const backend = resolveBackend({
    requestedTarget: target,
    sourceAuthority: theo.meta.source_authority,
    permittedTargets: normaliseTargets(sourceBody?.targets)
  });
  const emitted = emitTarget(theo, backend);

  const graph = {
    source: { body: lowered.ir.body.id, authority: recovery.authority, reference: recovery.reference ?? null },
    parse: { ok: true, schema: parsed.ast.schema },
    lower: { ok: true, irHash: lowered.ir.hash },
    theoc: { ok: true, hash: theo.hash, punctHash: theo.punct.hash },
    backend,
    emit: { ok: true, extension: emitted.extension, contentHash: fnv1a(emitted.text) },
    runtime: { ok: true, ding: receipt.ding, irHash: receipt.irHash }
  };

  return {
    schema: 'jm.wakeforge.build-receipt/0.2',
    ok: true,
    state: 'WOKEN_NOT_CROWNED',
    wave: WAVE,
    graph,
    emitted,
    receipt,
    claimBoundary: COMPILER_ANATOMY.wakeforge.lineageBoundary,
    hash: fnv1a(stableStringify(graph))
  };
}

function normaliseTargets(targets) {
  const mapped = (targets ?? []).flatMap(target => {
    if (target === 'javascript') return ['javascript', 'typescript'];
    if (target === 'cpp_lineage') return ['cpp'];
    if (target === 'rust') return ['rust'];
    return [];
  });
  return [...new Set(mapped)];
}

function hold(code, diagnostics, recovery) {
  return {
    schema: 'jm.wakeforge.build-receipt/0.2',
    ok: false,
    state: code,
    diagnostics,
    recovery,
    claimBoundary: 'NO_DING_NO_CLAIM'
  };
}
