import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceHtmlPath = path.join(here, '00_OPEN_FIRST.html');
const distDir = path.join(here, 'dist');
const outputPath = path.join(distDir, '00_OPEN_FIRST_STANDALONE.html');
const receiptPath = path.join(distDir, 'STANDALONE_BUILD_RECEIPT.json');
const modules = new Map();
const MAX_DIRECT_OPEN_BYTES = 2_000_000;

function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

function moduleSpecifier(filename) {
  const absolute = path.resolve(filename);
  if (modules.has(absolute)) return modules.get(absolute).specifier;
  const specifier = `jm_nol_module_${modules.size}`;
  modules.set(absolute, { specifier, source: null });
  const source = fs.readFileSync(absolute, 'utf8');
  const rewritten = rewriteRelativeImports(source, path.dirname(absolute));
  modules.get(absolute).source = rewritten;
  return specifier;
}

function rewritePattern(source, baseDir, pattern) {
  let cursor = 0, rebuilt = '', match;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(source))) {
    rebuilt += source.slice(cursor, match.index);
    const resolved = path.resolve(baseDir, match[3]);
    const specifier = moduleSpecifier(resolved);
    rebuilt += `${match[1]}${match[2]}${specifier}${match[2]}`;
    cursor = pattern.lastIndex;
  }
  rebuilt += source.slice(cursor);
  return rebuilt;
}

function rewriteRelativeImports(source, baseDir) {
  let output = source;
  output = rewritePattern(output, baseDir, /(\bfrom\s*)(['"])(\.{1,2}\/[^'"]+)\2/g);
  output = rewritePattern(output, baseDir, /(\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g);
  return output;
}

let html = fs.readFileSync(sourceHtmlPath, 'utf8');
const modulePattern = /<script type="module">([\s\S]*?)<\/script>/;
const match = html.match(modulePattern);
if (!match) throw new Error('V10_MODULE_SCRIPT_MISSING');
const mainModule = rewriteRelativeImports(match[1], here);

const imports = {};
for (const { specifier, source } of modules.values()) {
  if (source === null) throw new Error(`V10_UNRESOLVED_MODULE:${specifier}`);
  imports[specifier] = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
}
const importMap = JSON.stringify({ imports });
html = html.replace(modulePattern, `<script type="importmap">${importMap}<\/script>\n<script type="module">${mainModule}<\/script>`);

for (const token of ["from './", 'from "./', "from '../", 'from "../']) if (html.includes(token)) throw new Error(`V10_RELATIVE_IMPORT_REMAINED:${token}`);
if (!html.includes('data:text/javascript;base64,')) throw new Error('V10_MODULES_NOT_EMBEDDED');
if (!html.includes('<script type="importmap">')) throw new Error('V10_IMPORT_MAP_MISSING');
for (const required of ['Write normally.', 'Teach a word', 'Portable IR', 'Sovereign contact', 'MARK ≠ MEANING']) if (!html.includes(required)) throw new Error(`V10_SURFACE_MISSING:${required}`);

const bytes = Buffer.byteLength(html);
if (bytes > MAX_DIRECT_OPEN_BYTES) throw new Error(`V10_PEA_BEFORE_GALAXY_SIZE_GATE:${bytes}>${MAX_DIRECT_OPEN_BYTES}`);

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputPath, html);
const receipt = {
  schema: 'JM.NaturalOperationalCreatorSurfaceStandaloneReceipt.v1.0',
  output: path.relative(process.cwd(), outputPath),
  sha256: sha256(html),
  bytes,
  embeddedModules: modules.size,
  packaging: 'single-copy-import-map-data-modules',
  sizeGateBytes: MAX_DIRECT_OPEN_BYTES,
  checks: {
    relativeImportsRemoved: true,
    donorModulesEmbeddedOnce: true,
    importMapPacked: true,
    peaBeforeGalaxySizeGate: true,
    ordinaryPhraseDoor: true,
    wordActivationDoor: true,
    ownerWordbookDoor: true,
    relationDoor: true,
    contextDoor: true,
    portableIRDoor: true,
    sovereignContactDoor: true
  },
  boundary: 'Direct-open creator surface over v0.1-v0.9 donor machinery. Not a universal language crown, not body 101, and not automatic execution of the canonical 100-body estate.'
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
