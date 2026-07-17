import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EverybodyMaximiser } from './everybody-maximiser.mjs';
import { loadFederatedRegistry } from './registry-loader.mjs';
import {
  bodySymbol,
  compilePortable,
  emitCppHeader,
  emitJavaScriptModule,
  emitRustModule,
  emitTypeScriptModule,
  fixtureSource,
  stableStringify
} from './compiler-core.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = join(ROOT, 'generated');

async function write(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

function nativeFrontendState(body) {
  const needs = body.needs.join(' ').toLowerCase();
  const caps = body.caps.join(' ').toLowerCase();
  if (/grammar recovery|identity audit|native parser/.test(needs)) return 'UNRECOVERED_OR_UNSPECIFIED';
  if (/parser|grammar|tokenizer|lexer/.test(caps)) return 'PRESENT_OR_LINEAGE';
  if (/parser|grammar|tokenizer|lexer/.test(needs)) return 'PARTIAL_OR_REQUIRED';
  return 'UNCLASSIFIED';
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const registry = await loadFederatedRegistry();
const maximiser = new EverybodyMaximiser(registry);
const audit = maximiser.audit();
const rows = [];
const cppIncludes = [];
const cppCalls = [];
const rustModules = [];
const rustCalls = [];
const jsImports = [];
const jsCalls = [];

for (const body of registry.bodies) {
  const source = fixtureSource(body);
  const compiled = compilePortable(source, registry);
  if (!compiled.ok) throw new Error(`Portable compilation failed for ${body.id}: ${JSON.stringify(compiled)}`);

  const ir = compiled.lowered.ir;
  const receipt = {
    ...compiled.receipt,
    nativeFrontendState: nativeFrontendState(body),
    portableBackends: ['javascript', 'typescript', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23', 'rust2021', 'rust2024'],
    targetClaim: 'Generated portable backend proof. Native-language semantic parity is not inferred.'
  };
  const name = body.id;
  const cppName = `${name}.hpp`;
  const rustName = `${name}.rs`;
  const rust = emitRustModule(ir);
  const moduleName = `body_${bodySymbol(body.id).toLowerCase()}`;

  await write(join(OUT, 'source', `${name}.jmeb`), `${source}\n`);
  await write(join(OUT, 'ir', `${name}.json`), `${JSON.stringify(ir, null, 2)}\n`);
  await write(join(OUT, 'receipts', `${name}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  await write(join(OUT, 'js', `${name}.mjs`), emitJavaScriptModule(ir));
  await write(join(OUT, 'ts', `${name}.ts`), emitTypeScriptModule(ir));
  await write(join(OUT, 'cpp', cppName), emitCppHeader(ir));
  await write(join(OUT, 'rust', rustName), rust.source);

  cppIncludes.push(`#include ${JSON.stringify(cppName)}`);
  cppCalls.push(`  if (!receipt_${bodySymbol(body.id)}()) { std::cerr << ${JSON.stringify(body.id + ' failed\\n')}; ok = false; } else { ++passed; }`);
  rustModules.push(`#[path = ${JSON.stringify(rustName)}] mod ${moduleName};`);
  rustCalls.push(`    if ${moduleName}::${rust.functionName}() { passed += 1; } else { eprintln!(${JSON.stringify(body.id + ' failed')}); ok = false; }`);
  jsImports.push(`import { run as run_${bodySymbol(body.id)} } from ${JSON.stringify(`./${name}.mjs`)};`);
  jsCalls.push(`  ['${body.id}', run_${bodySymbol(body.id)}],`);

  rows.push({
    id: body.id,
    name: body.name,
    kind: body.kind,
    nativeFrontendState: nativeFrontendState(body),
    portableParser: 'WORKING',
    portableAst: 'WORKING',
    portableIr: 'WORKING',
    javascriptRuntime: receipt.ok ? 'PASS' : 'FAIL',
    cppEmitter: 'GENERATED',
    rustEmitter: 'GENERATED',
    irHash: ir.hash,
    ding: receipt.ding
  });
}

const cppAggregate = `${cppIncludes.join('\n')}\n#include <iostream>\n\nint main(){\n  bool ok = true;\n  int passed = 0;\n${cppCalls.join('\n')}\n  std::cout << "JM EveryBody C++ portable receipts: " << passed << "/${rows.length}" << std::endl;\n  return ok && passed == ${rows.length} ? 0 : 1;\n}\n`;
await write(join(OUT, 'cpp', 'all_bodies.cpp'), cppAggregate);

const rustAggregate = `${rustModules.join('\n')}\n\nfn main(){\n    let mut ok = true;\n    let mut passed: usize = 0;\n${rustCalls.join('\n')}\n    println!("JM EveryBody Rust portable receipts: {}/{}", passed, ${rows.length});\n    if !ok || passed != ${rows.length} { std::process::exit(1); }\n}\n`;
await write(join(OUT, 'rust', 'all_bodies.rs'), rustAggregate);

const jsAggregate = `${jsImports.join('\n')}\n\nconst bodies = [\n${jsCalls.join('\n')}\n];\nlet passed = 0;\nfor (const [id, run] of bodies) {\n  const receipt = run();\n  if (!receipt.ok || !receipt.ding || receipt.body.id !== id) {\n    console.error(id, receipt);\n    process.exitCode = 1;\n  } else {\n    passed += 1;\n  }\n}\nconsole.log(JSON.stringify({suite:'JM EveryBody JavaScript portable receipts',passed,total:bodies.length,ok:passed===bodies.length},null,2));\n`;
await write(join(OUT, 'js', 'all-bodies.mjs'), jsAggregate);

const report = {
  schema: 'jm.everybody.build-report/0.2',
  status: 'PORTABLE_MULTI_TARGET_BODY_PACKS_GENERATED',
  generatedAt: new Date().toISOString(),
  recoveredBodies: rows.length,
  finalEstateCountClaimed: false,
  everyBodyHasIndividualPack: rows.length === registry.bodies.length,
  outputsPerBody: ['portable source', 'AST/IR', 'execution receipt', 'JavaScript', 'TypeScript', 'C++ header', 'Rust module'],
  aggregateTargets: ['JavaScript', 'C++11', 'C++14', 'C++17', 'C++20', 'C++23', 'Rust 2021', 'Rust 2024'],
  nativeFrontendBoundary: 'Native parser/semantic completeness remains body-specific and is never inferred from portable backend success.',
  audit,
  bodies: rows
};
await write(join(OUT, 'BUILD_REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
await write(join(OUT, 'INDEX.json'), `${stableStringify({ schema: report.schema, recoveredBodies: rows.length, bodies: rows.map(row => row.id) })}\n`);

console.log(JSON.stringify({ ok: true, generatedBodies: rows.length, output: OUT }, null, 2));
