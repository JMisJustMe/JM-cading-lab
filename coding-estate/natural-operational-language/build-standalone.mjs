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

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function rewriteRelativeImports(source, baseDir) {
  const patterns = [
    /(\bfrom\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
    /(\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g
  ];
  let output = source;
  for (const pattern of patterns) {
    let cursor = 0;
    let rebuilt = '';
    pattern.lastIndex = 0;
    let match;
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
  // Guard the recursive graph before resolving its descendants.
  cache.set(absolute, `__JM_PENDING_MODULE__${cache.size}`);
  const source = fs.readFileSync(absolute, 'utf8');
  const bundled = await rewriteRelativeImports(source, path.dirname(absolute));
  const dataUrl = `data:text/javascript;base64,${Buffer.from(bundled, 'utf8').toString('base64')}`;
  cache.set(absolute, dataUrl);
  return dataUrl;
}

function loadRegistry() {
  const integrationDir = path.resolve(here, '../integration');
  const manifest = JSON.parse(fs.readFileSync(path.join(integrationDir, 'REGISTRY.json'), 'utf8'));
  const bodies = manifest.parts.flatMap(part => {
    const bodyPart = JSON.parse(fs.readFileSync(path.join(integrationDir, part), 'utf8'));
    return bodyPart.bodies;
  });
  if (manifest.count !== 100 || bodies.length !== 100) throw new Error(`STANDALONE_REGISTRY_NOT_100:${manifest.count}/${bodies.length}`);
  return { ...manifest, bodies };
}

function embeddedRegistryScript(registry) {
  const json = JSON.stringify(registry).replace(/<\/script/gi, '<\\/script');
  return `<script>globalThis.__JM_EMBEDDED_REGISTRY__=${json};<\/script>`;
}

function activateEmbeddedRegistry(html) {
  const marker = "async function loadEstateRegistry(){\n  try{";
  if (!html.includes(marker)) throw new Error('STANDALONE_REGISTRY_LOADER_MARKER_MISSING');
  const replacement = `${marker}\n    if(globalThis.__JM_EMBEDDED_REGISTRY__){\n      estateRegistry=globalThis.__JM_EMBEDDED_REGISTRY__;\n      estateStatus.textContent=\`ready · \${estateRegistry.bodies.length} bodies · embedded\`;\n      estateStatus.className='under-status good';\n      return estateRegistry;\n    }`;
  return html.replace(marker, replacement);
}

async function build() {
  let html = fs.readFileSync(sourceHtmlPath, 'utf8');
  const registry = loadRegistry();

  const modulePattern = /<script type="module">([\s\S]*?)<\/script>/;
  const match = html.match(modulePattern);
  if (!match) throw new Error('STANDALONE_MODULE_SCRIPT_MISSING');
  const bundledInlineModule = await rewriteRelativeImports(match[1], here);
  html = html.replace(modulePattern, `<script type="module">${bundledInlineModule}<\/script>`);
  html = activateEmbeddedRegistry(html);
  html = html.replace('<script type="module">', `${embeddedRegistryScript(registry)}\n<script type="module">`);

  const forbidden = ["from './", 'from "./', "from '../", 'from "../'];
  for (const token of forbidden) {
    if (html.includes(token)) throw new Error(`STANDALONE_RELATIVE_IMPORT_REMAINED:${token}`);
  }
  if (!html.includes('data:text/javascript;base64,')) throw new Error('STANDALONE_MODULES_NOT_EMBEDDED');
  if (!html.includes('__JM_EMBEDDED_REGISTRY__')) throw new Error('STANDALONE_REGISTRY_NOT_EMBEDDED');

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(outputPath, html);
  const receipt = {
    schema: 'JM.NaturalOperationalStandaloneBuildReceipt.v0.1',
    source: path.relative(process.cwd(), sourceHtmlPath),
    output: path.relative(process.cwd(), outputPath),
    sha256: sha256(html),
    bytes: Buffer.byteLength(html),
    embeddedRegistryBodies: registry.bodies.length,
    embeddedModules: cache.size,
    checks: {
      relativeModuleImportsRemoved: true,
      canonical100BodyRegistryEmbedded: true,
      donorModulesEmbeddedFromCurrentBranch: true,
      fileProtocolFetchNotRequiredForCoreRoom: true
    },
    boundary: 'Generated carrier from current branch sources. It does not rewrite donor provenance or crown semantics.'
  };
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

await build();
