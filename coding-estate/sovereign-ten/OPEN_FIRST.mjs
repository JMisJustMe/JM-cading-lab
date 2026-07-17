import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const parts = [];
for (let index = 1; index <= 8; index += 1) {
  const name = `part-${String(index).padStart(2, '0')}.txt`;
  parts.push((await readFile(join(root, 'pack', name), 'utf8')).trim());
}
const packed = Buffer.from(parts.join(''), 'base64');
const payload = JSON.parse(gunzipSync(packed).toString('utf8'));
if (payload.schema !== 'jm.sovereign-ten.pack/1.0') throw new Error('Unexpected sovereign-ten pack schema.');
for (const [relativePath, content] of Object.entries(payload.files)) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}
console.log(JSON.stringify({ schema: payload.schema, extracted: Object.keys(payload.files).length, root }, null, 2));
