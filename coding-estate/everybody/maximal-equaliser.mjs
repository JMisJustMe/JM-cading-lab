import { mkdir, writeFile } from 'node:fs/promises';
import { loadFederatedRegistry } from './registry-loader.mjs';
import { compilePortable, fixtureSource } from './compiler-core.mjs';
import { loadRecovered53Profiles } from './profile-evidence.mjs';
import { NATIVE_ADAPTERS_V1_1 } from './native-adapters-v1-1.mjs';

const PROFILE_TO_BODIES = Object.freeze({"cading-kading-host":["cading","kading"],"jmlogic":["jmlogic"],"flowtalk":["flowtalk"],"route-code":["route-code"],"mark-level-syntax":["mark-level-syntax"],"speakuals":["speakuals"],"tbs-string":["tbs-string"],"cadenvm-routevm-jmvm":["cadenvm","routevm","jmvm"],"cadenpad":["cadenpad"],"parser":["parser"],"compiler":["compiler"],"onebody-ir":["onebody-ir"],"js-emitter":["js-emitter"],"hybrid-compiler":["hybrid-auto-compiler"],"tracebox-routebox":["tracebox","routebox"],"build-gates":["build-gates"],"bugg-error-library":["bugg-error-library"],"onebody-delivery":["onebody-delivery"],"zezu-nwona-jm-cading-lab":["cading-lab"],"formula-born-code":["formula-born-code"],"noncoding-code":["noncoding-code"],"contactcode":["contactcode"],"morseminus":["morseminus"],"morseminus-zerogrip":["mmzg"],"mudra-code":["mudra-code"],"jickma-jickmah":["jickma-jickmah"],"mood-drills":["mood-drills"],"flowtalk-body-route":["flowtalk-body-route"],"command-glyphs":["command-glyphs"],"mirror-pair-finger-law":["mirror-pair-finger-law"],"prayer-hands-paired-contact":["prayer-hands-paired-contact"],"cold-ding-join":["cold-ding-join"],"recorp":["recorp"],"tokenbody":["tokenbody"],"routeframe":["routeframe"],"statefield":["statefield"],"contactband":["contactband"],"punctbody":["punctbody"],"candidate-command-glyphs":["glyph-candidates"],"quadze-quadzi":["quadze"],"jmp-jamp":["jmp"],"codifying":["codifying"],"kocodifying":["kocodifying"],"jm32-1da":["jm32-1da"],"vts":["vts"],"dgyak":["dgyak"],"routeos-amacore":["routeos"],"onebody":["onebody"],"buildode":["buildode"],"zionfolder":["zionfolder"],"current-best-register":["current-best-register"],"crown-register":["crown-register"],"source-ledger":["source-ledger"]});
const TARGETS = Object.freeze(['javascript','typescript','wasm','cpp98','cpp03','cpp11','cpp14','cpp17','cpp20','cpp23','cpp26-draft','rust2021','rust2024']);

function profileEvidenceIndex(profileSet) {
  const byBody = new Map();
  for (const profile of profileSet.profiles) {
    for (const bodyId of PROFILE_TO_BODIES[profile.id] ?? []) {
      const current = byBody.get(bodyId) ?? [];
      current.push({
        profileId: profile.id,
        profileName: profile.name,
        sourceStatus: profile.sourceStatus,
        formula: profile.formula,
        commands: Object.keys(profile.operations),
        defaultProgram: profile.defaultProgram
      });
      byBody.set(bodyId, current);
    }
  }
  return byBody;
}

function nativeDegree(bodyId, evidence) {
  if (Object.hasOwn(NATIVE_ADAPTERS_V1_1, bodyId)) return { score: 10, state: 'EXACT_RECOVERED_SUBSET_EXECUTABLE' };
  if (evidence.some(item => item.sourceStatus === 'current-full-source-reference')) return { score: 9, state: 'CURRENT_FULL_SOURCE_REFERENCE_PROFILE' };
  if (evidence.some(item => item.sourceStatus === 'mounted-source-summary')) return { score: 6, state: 'MOUNTED_SOURCE_SUMMARY_EXECUTABLE_PROFILE' };
  if (evidence.some(item => item.sourceStatus === 'definition-derived-executable-descendant')) return { score: 5, state: 'DEFINITION_DERIVED_EXECUTABLE_DESCENDANT' };
  return { score: 2, state: 'HISTORICAL_NATIVE_SOURCE_NOT_RECOVERED' };
}

function profileDegree(evidence) {
  if (!evidence.length) return { score: 8, state: 'V1_1_MAINTAINED_CANONICAL_PORTABLE_PROFILE' };
  if (evidence.some(item => item.sourceStatus === 'current-full-source-reference')) return { score: 10, state: 'CURRENT_FULL_SOURCE_WORKING_PROFILE' };
  if (evidence.some(item => item.sourceStatus === 'mounted-source-summary')) return { score: 9, state: 'RECOVERED_WORKING_PROFILE' };
  return { score: 8, state: 'LABELLED_DEFINITION_DERIVED_WORKING_PROFILE' };
}

function overallDegree(record) {
  const axes = record.axes;
  return Math.round((axes.identity + axes.parserIrRuntime + axes.targetParity + axes.workingProfile + axes.historicalNative + axes.traceReceipt) / 6 * 10) / 10;
}

function markdown(report) {
  const rows = report.bodies.map(body =>
    `| ${body.id} | ${body.name.replaceAll('|','/')} | ${body.degree} | ${body.profileState} | ${body.nativeState} | ${body.portableReceipt} |`
  ).join('\n');
  return `# JM EveryBody v1.1 — Body Completion Matrix

**Registered bodies:** ${report.summary.registered}  
**Portable maximal lane:** ${report.summary.portableComplete} / ${report.summary.registered}  
**Recovered 53-profile evidence mapped to canonical bodies:** ${report.summary.profileEvidenceBodies}  
**Exact recovered native subsets:** ${report.summary.exactNativeAdapters}  
**Target lanes retained:** ${report.summary.targetLanes} / 13  
**Final historical count claimed:** No  
**Supreme body crowned:** No

## Meaning of completion

- **Portable maximal:** registered identity, law, parser/AST/IR/runtime, trace, Ding, generated JS/TS/Wasm/C++/Rust packs and conformance receipt.
- **Working-profile maximal:** body-specific operations, state and default executable proof recovered or maintained.
- **Historical-native maximal:** exact source grammar/semantics recovered and executable. Missing history is never manufactured.

## Proof leaders, not rulers

${report.proofLeaders.map(item => `- **${item.bodyId}** — ${item.reason}`).join('\n')}

## Equalisation result

Every registered body now reaches the same **portable engineering floor**. Bodies lacking recovered historical syntax receive a versioned maintained canonical profile, clearly separated from historical-native evidence.

| Body ID | Body | Degree / 10 | Working-profile state | Historical-native state | Portable receipt |
|---|---|---:|---|---|---|
${rows}
`;
}

export async function runEqualisation({ write = true } = {}) {
  const registry = await loadFederatedRegistry();
  const recovered = await loadRecovered53Profiles();
  const evidenceIndex = profileEvidenceIndex(recovered);
  const bodies = [];

  for (const body of registry.bodies) {
    const compiled = compilePortable(fixtureSource(body), registry);
    if (!compiled.ok) throw new Error(`Portable equalisation failed for ${body.id}: ${JSON.stringify(compiled)}`);
    const evidence = evidenceIndex.get(body.id) ?? [];
    const profile = profileDegree(evidence);
    const native = nativeDegree(body.id, evidence);
    const record = {
      id: body.id,
      name: body.name,
      kind: body.kind,
      profileState: profile.state,
      nativeState: native.state,
      portableReceipt: compiled.receipt.coldDing,
      irHash: compiled.lowered.ir.hash,
      targets: TARGETS,
      evidence,
      axes: {
        identity: 10,
        parserIrRuntime: 10,
        targetParity: 10,
        workingProfile: profile.score,
        historicalNative: native.score,
        traceReceipt: 10
      }
    };
    record.degree = overallDegree(record);
    bodies.push(record);
  }

  const exactNative = Object.keys(NATIVE_ADAPTERS_V1_1);
  const report = {
    schema: 'jm.everybody.maximal-equalisation/1.1',
    generatedAt: new Date().toISOString(),
    laws: ['no_supreme_body','portable_targets_do_not_govern_source','no_invented_historical_syntax','no_ding_no_claim'],
    summary: {
      registered: registry.bodies.length,
      portableComplete: bodies.filter(body => body.portableReceipt === 'PORTABLE_BODY_EXECUTED').length,
      recoveredProfiles: recovered.profiles.length,
      profileEvidenceBodies: bodies.filter(body => body.evidence.length).length,
      exactNativeAdapters: exactNative.length,
      exactNativeBodyIds: exactNative,
      maintainedCanonicalOnly: bodies.filter(body => !body.evidence.length && !exactNative.includes(body.id)).length,
      targetLanes: TARGETS.length,
      finalHistoricalCountClaimed: false,
      supremeBody: null
    },
    proofLeaders: [
      { bodyId: 'quadze', reason: 'strongest recovered full-source working profile plus exact Mini-QUADZE Tier-0 adapter and device-proven lineage' },
      { bodyId: 'cading', reason: 'strongest exact source-to-landing language bridge with Fullstopped and Speakuals proof' },
      { bodyId: 'mmzg', reason: 'strongest exact embodied signal/channel/path/trace native grammar proof' }
    ],
    bodies: bodies.sort((a,b) => b.degree - a.degree || a.id.localeCompare(b.id))
  };

  if (write) {
    const output = new URL('./generated/equalisation/', import.meta.url);
    await mkdir(output, { recursive: true });
    await writeFile(new URL('BODY_COMPLETION_MATRIX_v1_1.json', output), JSON.stringify(report, null, 2));
    await writeFile(new URL('BODY_COMPLETION_MATRIX_v1_1.md', output), markdown(report));
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runEqualisation();
  console.log(JSON.stringify(report.summary, null, 2));
}
