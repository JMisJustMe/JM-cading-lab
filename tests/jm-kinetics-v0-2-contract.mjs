import assert from 'node:assert/strict';
import fs from 'node:fs';
const k=fs.readFileSync('target-bridge/form-forge-routeos-v0-2/JM_FORGE_SURFACE_KINETICS_v0_2.js','utf8');
assert.match(k,/triangleHit/);
assert.match(k,/SURFACE_IMPACT/);
console.log('Kinetics source contract PASS');
