#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { EverybodyMaximiser } from './everybody-maximiser.mjs';
import { loadFederatedRegistry } from './registry-loader.mjs';
import { compilePortable } from './compiler-core.mjs';
import { compileNativeUnified, EXACT_HISTORICAL_NATIVE_IDS, nativeStatusV2 } from './native-router-v2.mjs';

function usage() {
  return `JM EveryBody CLI v2.0

Usage:
  node cli.mjs list
  node cli.mjs audit
  node cli.mjs resolve --goal "..." [--cap parser,runtime] [--target javascript,cpp_lineage,rust] [--constraint Android]
  node cli.mjs compile <portable-source-file>
  node cli.mjs native <body-id> --source "native source" [--mode auto|historical|canonical]
  node cli.mjs native <body-id> --file <native-source-file> [--mode auto|historical|canonical]
  node cli.mjs spec <body-id>
  node cli.mjs adapters
  node cli.mjs build

Native lanes:
  historical = one of the four exact recovered historical-native subsets
  canonical  = official current JM canonical-native v2 specification
  auto       = detect canonical v2 header, otherwise use an exact historical adapter when available

Boundaries:
  Current canonical-native completion does not rewrite unrecovered historical syntax.
  A lead body is selected for one request only and is never crowned supreme.
`;
}

function valueAfter(args, flag, fallback = '') {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function csv(value) {
  return String(value ?? '').split(',').map(item => item.trim()).filter(Boolean);
}

function groupCounts(items, key) {
  const counts = Object.create(null);
  for (const item of items) counts[item[key] ?? 'unknown'] = (counts[item[key] ?? 'unknown'] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.shift() ?? 'help';

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(usage());
    return;
  }

  if (command === 'build') {
    await import('./build-all.mjs');
    await import('./canonical-native-v2-build.mjs');
    return;
  }

  const registry = await loadFederatedRegistry();
  const maximiser = new EverybodyMaximiser(registry);

  if (command === 'list') {
    console.log(JSON.stringify({
      schema: registry.schema,
      recoveredCount: registry.bodies.length,
      finalCountClaimed: false,
      currentCanonicalNativeComplete: registry.bodies.length,
      exactHistoricalNativeBodyIds: EXACT_HISTORICAL_NATIVE_IDS,
      bodies: registry.bodies.map(body => {
        const status = nativeStatusV2(body, registry);
        return { id: body.id, name: body.name, kind: body.kind, status: body.status, nativeFamily: status.family, currentCanonicalNative: status.currentCanonicalNative, historicalNative: status.historicalNative, targets: body.targets };
      })
    }, null, 2));
    return;
  }

  if (command === 'audit') {
    const audit = maximiser.audit();
    const nativeStates = registry.bodies.map(body => nativeStatusV2(body, registry));
    console.log(JSON.stringify({
      ...audit,
      kinds: groupCounts(registry.bodies, 'kind'),
      statuses: groupCounts(registry.bodies, 'status'),
      nativeFamilies: groupCounts(nativeStates, 'family'),
      currentCanonicalNativeComplete: nativeStates.filter(state => state.currentCanonicalNative === 'COMPLETE_V2').length,
      exactHistoricalNativeBodyIds: EXACT_HISTORICAL_NATIVE_IDS,
      historicalNativeStates: groupCounts(nativeStates, 'historicalNative'),
      completionBoundary: 'All registered bodies have complete current canonical-native v2 specifications. Historical source evidence remains separately classified.'
    }, null, 2));
    return;
  }

  if (command === 'resolve') {
    const request = {
      goal: valueAfter(args, '--goal', args.filter(item => !item.startsWith('--')).join(' ')),
      capabilities: csv(valueAfter(args, '--cap')),
      targets: csv(valueAfter(args, '--target')),
      constraints: csv(valueAfter(args, '--constraint'))
    };
    if (!request.goal) throw new Error('resolve requires --goal.');
    console.log(JSON.stringify(maximiser.resolve(request), null, 2));
    return;
  }

  if (command === 'compile') {
    const file = args[0];
    if (!file) throw new Error('compile requires a portable source file.');
    const source = await readFile(resolvePath(file), 'utf8');
    const result = compilePortable(source, registry);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (command === 'native') {
    const bodyId = args[0];
    if (!bodyId) throw new Error('native requires a body id.');
    const inline = valueAfter(args, '--source');
    const file = valueAfter(args, '--file');
    const mode = valueAfter(args, '--mode', 'auto');
    if (!inline && !file) throw new Error('native requires --source or --file.');
    if (!['auto', 'historical', 'exact', 'canonical'].includes(mode)) throw new Error(`Unknown native mode ${mode}.`);
    const source = inline || await readFile(resolvePath(file), 'utf8');
    const result = compileNativeUnified(bodyId, source, registry, { mode });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (command === 'spec') {
    const bodyId = args[0];
    if (!bodyId) throw new Error('spec requires a body id.');
    const body = registry.bodies.find(candidate => candidate.id === bodyId);
    if (!body) throw new Error(`Unknown body ${bodyId}.`);
    console.log(JSON.stringify(nativeStatusV2(body, registry), null, 2));
    return;
  }

  if (command === 'adapters') {
    console.log(JSON.stringify({
      currentCanonicalNative: { version: '2.0', bodies: registry.bodies.length, state: 'COMPLETE' },
      exactHistoricalNative: { count: EXACT_HISTORICAL_NATIVE_IDS.length, bodyIds: EXACT_HISTORICAL_NATIVE_IDS },
      truthLaw: 'Current canonical specifications are authoritative for present builds; historical adapters only claim exact recovered subsets.'
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command ${JSON.stringify(command)}.\n\n${usage()}`);
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
