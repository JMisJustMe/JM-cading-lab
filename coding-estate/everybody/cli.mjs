#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import { EverybodyMaximiser } from './everybody-maximiser.mjs';
import { loadFederatedRegistry } from './registry-loader.mjs';
import { compilePortable } from './compiler-core.mjs';
import { compileNative, NATIVE_ADAPTERS } from './native-adapters.mjs';

function usage() {
  return `JM EveryBody CLI v0.2

Usage:
  node cli.mjs list
  node cli.mjs audit
  node cli.mjs resolve --goal "..." [--cap parser,runtime] [--target javascript,cpp_lineage,rust] [--constraint Android]
  node cli.mjs compile <portable-source-file>
  node cli.mjs native <body-id> --source "native source"
  node cli.mjs native <body-id> --file <native-source-file>
  node cli.mjs adapters
  node cli.mjs build

Boundaries:
  Portable backend success never implies unrecovered native grammar parity.
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

function nativeState(body) {
  if (NATIVE_ADAPTERS[body.id]) return 'EXACT_ADAPTER_TESTED';
  const needs = body.needs.join(' ').toLowerCase();
  const caps = body.caps.join(' ').toLowerCase();
  if (/grammar recovery|identity audit|native parser/.test(needs)) return 'UNRECOVERED_OR_UNSPECIFIED';
  if (/parser|grammar|lexer|tokenizer/.test(caps)) return 'PRESENT_OR_LINEAGE_NEEDS_EXTRACTION';
  return 'REQUIRES_BODY_SPECIFICATION';
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
    return;
  }

  const registry = await loadFederatedRegistry();
  const maximiser = new EverybodyMaximiser(registry);

  if (command === 'list') {
    console.log(JSON.stringify({
      schema: registry.schema,
      recoveredCount: registry.bodies.length,
      finalCountClaimed: false,
      bodies: registry.bodies.map(body => ({ id: body.id, name: body.name, kind: body.kind, status: body.status, nativeFrontend: nativeState(body), targets: body.targets }))
    }, null, 2));
    return;
  }

  if (command === 'audit') {
    const audit = maximiser.audit();
    console.log(JSON.stringify({
      ...audit,
      kinds: groupCounts(registry.bodies, 'kind'),
      statuses: groupCounts(registry.bodies, 'status'),
      exactNativeAdapters: Object.keys(NATIVE_ADAPTERS),
      nativeFrontendStates: groupCounts(registry.bodies.map(body => ({ state: nativeState(body) })), 'state'),
      completionBoundary: 'All recovered bodies have registry and portable target lanes. Exact native semantics remain complete only where an exact tested adapter is registered.'
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
    if (!inline && !file) throw new Error('native requires --source or --file.');
    const source = inline || await readFile(resolvePath(file), 'utf8');
    const result = compileNative(bodyId, source, registry);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (command === 'adapters') {
    console.log(JSON.stringify({
      exactAdapters: Object.entries(NATIVE_ADAPTERS).map(([id, adapter]) => ({ id, version: adapter.version })),
      refusalLaw: 'Bodies without an exact adapter fail visibly instead of accepting invented native syntax.'
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command ${JSON.stringify(command)}.\n\n${usage()}`);
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
