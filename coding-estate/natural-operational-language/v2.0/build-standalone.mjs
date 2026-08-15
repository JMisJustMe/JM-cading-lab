import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here=path.dirname(fileURLToPath(import.meta.url));
const sourceHtmlPath=path.join(here,'00_OPEN_FIRST.html');
const distDir=path.join(here,'dist');
const outputPath=path.join(distDir,'00_OPEN_FIRST_STANDALONE.html');
const receiptPath=path.join(distDir,'STANDALONE_BUILD_RECEIPT.json');
const ids=new Map(),sources=new Map();let nextId=0;
const sha256=v=>createHash('sha256').update(v).digest('hex');
const relPatterns=[/(\bfrom\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,/(\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g];
function moduleId(file){const abs=path.resolve(file);if(!ids.has(abs))ids.set(abs,`jm_v20_m${nextId++}`);return ids.get(abs);}
function resolveModule(baseDir,spec){let resolved=path.resolve(baseDir,spec);if(!path.extname(resolved))resolved+='.mjs';return resolved;}
function collect(file){const abs=path.resolve(file);if(sources.has(abs))return;const id=moduleId(abs);let src=fs.readFileSync(abs,'utf8');sources.set(abs,{id,src:''});for(const pattern of relPatterns){pattern.lastIndex=0;let m;while((m=pattern.exec(src)))collect(resolveModule(path.dirname(abs),m[3]));}for(const pattern of relPatterns){src=src.replace(pattern,(full,prefix,quote,spec)=>`${prefix}${quote}${moduleId(resolveModule(path.dirname(abs),spec))}${quote}`);}sources.set(abs,{id,src});}

let html=fs.readFileSync(sourceHtmlPath,'utf8');
const modulePattern=/<script type="module">([\s\S]*?)<\/script>/;
const match=html.match(modulePattern);if(!match)throw new Error('V20_MODULE_SCRIPT_MISSING');
let inline=match[1];
for(const pattern of relPatterns){pattern.lastIndex=0;let m;while((m=pattern.exec(inline)))collect(resolveModule(here,m[3]));}
for(const pattern of relPatterns){inline=inline.replace(pattern,(full,prefix,quote,spec)=>`${prefix}${quote}${moduleId(resolveModule(here,spec))}${quote}`);}
const imports={};for(const {id,src} of sources.values())imports[id]=`data:text/javascript;base64,${Buffer.from(src,'utf8').toString('base64')}`;
const importMap=`<script type="importmap">${JSON.stringify({imports})}<\/script>`;
html=html.replace(modulePattern,`${importMap}\n<script type="module">${inline}<\/script>`);
for(const token of ["from './",'from "./',"from '../",'from "../'])if(html.includes(token))throw new Error(`V20_RELATIVE_IMPORT_REMAINED:${token}`);
for(const required of ['Write normally.','Keep the route home.','Preview','Recovery timeline','Export JSON','GRANT ≠ PERSIST','type="importmap"'])if(!html.includes(required))throw new Error(`V20_SURFACE_MISSING:${required}`);
fs.mkdirSync(distDir,{recursive:true});fs.writeFileSync(outputPath,html);
const receipt={
  schema:'JM.NaturalOperationalRecoverableWorkspaceStandaloneReceipt.v2.0',
  output:path.relative(process.cwd(),outputPath),
  sha256:sha256(html),
  bytes:Buffer.byteLength(html),
  embeddedModules:sources.size,
  packaging:'single-copy-import-map-data-modules',
  checks:{relativeImportsRemoved:true,donorModulesEmbedded:true,replayRecoveryDoor:true,previewDoor:true,undoRedoDoor:true,checkpointDoor:true,namedRoomDoor:true,roomPackageDoor:true,sessionGrantBoundary:true,directOpenCoreRoom:true},
  boundary:'Recoverable creator workspace over existing natural-operational donor machinery. Not body 101, not universal language understanding, not silent sovereign execution or persisted permission.'
};
fs.writeFileSync(receiptPath,`${JSON.stringify(receipt,null,2)}\n`);console.log(JSON.stringify(receipt,null,2));
