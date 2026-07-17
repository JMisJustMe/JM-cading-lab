import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const segments = [
  ['part-01.txt', 'a9e33202e5eff6e12588c5458d92e23510a9c756c9adecc2a3310594d5295c8e'],
  ['part-02.txt', '440779515ce28aed40c3cb393cbe0f95408c0038b1fef82baf351b55dacedcdb'],
  ['part-03.txt', 'b75a48db623601c405d06008e30d7f82180793c937d81b1e4a338fc832ea5385'],
  ['part-04.txt', '04d31955fc3b69fd8b35d51b7258132915a7a7e695d47985c14c21044679acde'],
  ['part-05a.txt', '2cfbaf309fcc2c5aee7373b778fc4433a9a0c233827599232e17dd20a7807cbf'],
  ['part-05b.txt', '28f6a57dd2775bb2219ebff29b017406027bf189028233a7be255cdabd763c01'],
  ['part-06a.txt', 'd07ad297ea9a2f3a3f291cbfc159391e2df191bb64c549d9d3ad8164d496cc06'],
  ['part-06b.txt', 'c87c67543ef0a4ac1576de1ae6ac9a26695d105567582e9c364c3ab61d9102a8'],
  ['part-07a.txt', 'e98fc6de76968387c7a64079160e09465c6b841a141c252f9d1988dc6e3deb5d'],
  ['part-07b.txt', 'fbaedd6efc1c9d4f550a39db5fc44ee62be7974fa8d3a648186d2ac13def73fd'],
  ['part-08a.txt', 'b778aadcee78b55cd33e0ee9d27b6ee23a80841beaf007decb10d973441c1222'],
  ['part-08b.txt', '2ca94c1cc7256432c0145ac532773879be907e6a867ac890693fa8a2917c3cd8']
];

const parts = [];
for (const [name, expected] of segments) {
  const text = (await readFile(join(root, 'pack', name), 'utf8')).trim();
  const actual = createHash('sha256').update(text).digest('hex');
  if (actual !== expected) throw new Error(`Pack segment ${name} failed SHA-256: expected ${expected}, got ${actual}`);
  parts.push(text);
}

const packed = Buffer.from(parts.join(''), 'base64');
const payload = JSON.parse(gunzipSync(packed).toString('utf8'));
if (payload.schema !== 'jm.sovereign-ten.pack/1.0') throw new Error('Unexpected sovereign-ten pack schema.');
for (const [relativePath, content] of Object.entries(payload.files)) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}
console.log(JSON.stringify({ schema: payload.schema, segments: segments.length, extracted: Object.keys(payload.files).length, root }, null, 2));
