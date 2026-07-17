import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFederatedRegistry } from './registry-loader.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const CPP = join(ROOT, 'generated', 'cpp');
const registry = await loadFederatedRegistry();
let changed = 0;

for (const body of registry.bodies) {
  const path = join(CPP, `${body.id}.hpp`);
  const source = await readFile(path, 'utf8');
  const legacyCompatible = source
    .replace('#include <unordered_map>', '#include <map>')
    .replaceAll('std::unordered_map', 'std::map');
  if (legacyCompatible !== source) {
    await writeFile(path, legacyCompatible, 'utf8');
    changed += 1;
  }
}

console.log(JSON.stringify({
  ok: changed === registry.bodies.length,
  normalizedBodies: changed,
  expectedBodies: registry.bodies.length,
  standards: ['C++98', 'C++03', 'C++11', 'C++14', 'C++17', 'C++20', 'C++23', 'C++26 draft/c++2c'],
  boundary: 'C++26 remains a draft compiler lane, not a published-final standard claim.'
}, null, 2));

if (changed !== registry.bodies.length) process.exitCode = 1;
