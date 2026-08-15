import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceHtmlPath = path.join(here, '00_OPEN_FIRST.html');
const distDir = path.join(here, 'dist');
const outputPath = path.join(distDir, '00_OPEN_FIRST_STANDALONE.html');
const receiptPath = path.join(distDir, 'STANDALONE_BUILD_RECEIPT.json');
const cache = new Map();

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

async function rewriteRelativeImports(source, baseDir) {
  const patterns = [/(\bfrom\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, /(\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g];
  let output = source;
  for (const pattern of patterns) {
    let cursor = 0, rebuilt = '', match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(output))) {
      rebuilt += output.slice(cursor, match.index);
      const resolved = path.resolve(baseDir, match[3]);
      const dataUrl = await moduleDataUrl(resolved);
      rebuilt += `${match[1]}${match[2]}${dataUrl}${match[2]}`;
      cursor = pattern.lastIndex;
    }
    rebuilt += output.slice(cursor);
    output = rebuilt;
  }
  return output;
}

async function moduleDataUrl(filename) {
  const absolute = path.resolve(filename);
  if (cache.has(absolute)) return cache.get(absolute);
  cache.set(absolute, `__JM_PENDING_MODULE__${cache.size}`);
  const source = fs.readFileSync(absolute, 'utf8');
  const bundled = await rewriteRelativeImports(source, path.dirname(absolute));
  const dataUrl = `data:text/javascript;base64,${Buffer.from(bundled, 'utf8').toString('base64')}`;
  cache.set(absolute, dataUrl);
  return dataUrl;
}

let html = fs.readFileSync(sourceHtmlPath, 'utf8');
const modulePattern = /<script type="module">([\s\S]*?)<\/script>/;
const match = html.match(modulePattern);
if (!match) throw new Error('V05_MODULE_SCRIPT_MISSING');
const bundled = await rewriteRelativeImports(match[1], here);
html = html.replace(modulePattern, `<script type="module">${bundled}<\/script>`);
for (const token of ["from './", 'from "./', "from '../", 'from "../']) if (html.includes(token)) throw new Error(`V05_RELATIVE_IMPORT_REMAINED:${token}`);
if (!html.includes('data:text/javascript;base64,')) throw new Error('V05_MODULES_NOT_EMBEDDED');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputPath, html);
const receipt = {
  schema: 'JM.NaturalOperationalCreatorRoomStandaloneReceipt.v0.5',
  output: path.relative(process.cwd(), outputPath),
  sha256: sha256(html),
  bytes: Buffer.byteLength(html),
  embeddedModules: cache.size,
  checks: { relativeImportsRemoved: true, donorModulesEmbedded: true, directOpenCoreRoom: true },
  boundary: 'Creator-facing carrier over v0.1-v0.4 donor machinery. Not a semantic crown or universal language claim.'
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
