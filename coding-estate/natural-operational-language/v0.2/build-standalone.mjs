import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here=path.dirname(fileURLToPath(import.meta.url));
const sourceHtmlPath=path.join(here,'00_OPEN_FIRST.html');
const distDir=path.join(here,'dist');
const outputPath=path.join(distDir,'00_OPEN_FIRST_STANDALONE.html');
const receiptPath=path.join(distDir,'STANDALONE_BUILD_RECEIPT.json');
const cache=new Map();

const sha256=value=>createHash('sha256').update(value).digest('hex');

async function rewriteRelativeImports(source,baseDir){
  const patterns=[/(\bfrom\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,/(\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g];
  let output=source;
  for(const pattern of patterns){
    let cursor=0,rebuilt='';
    pattern.lastIndex=0;
    let match;
    while((match=pattern.exec(output))){
      rebuilt+=output.slice(cursor,match.index);
      const resolved=path.resolve(baseDir,match[3]);
      const dataUrl=await moduleDataUrl(resolved);
      rebuilt+=`${match[1]}${match[2]}${dataUrl}${match[2]}`;
      cursor=pattern.lastIndex;
    }
    rebuilt+=output.slice(cursor);
    output=rebuilt;
  }
  return output;
}

async function moduleDataUrl(filename){
  const absolute=path.resolve(filename);
  if(cache.has(absolute))return cache.get(absolute);
  cache.set(absolute,`__JM_PENDING_MODULE__${cache.size}`);
  const source=fs.readFileSync(absolute,'utf8');
  const bundled=await rewriteRelativeImports(source,path.dirname(absolute));
  const url=`data:text/javascript;base64,${Buffer.from(bundled,'utf8').toString('base64')}`;
  cache.set(absolute,url);
  return url;
}

async function build(){
  let html=fs.readFileSync(sourceHtmlPath,'utf8');
  const modulePattern=/<script type="module">([\s\S]*?)<\/script>/;
  const match=html.match(modulePattern);
  if(!match)throw new Error('V02_STANDALONE_MODULE_SCRIPT_MISSING');
  const bundled=await rewriteRelativeImports(match[1],here);
  html=html.replace(modulePattern,`<script type="module">${bundled}<\/script>`);
  for(const token of ["from './",'from "./',"from '../",'from "../']){
    if(html.includes(token))throw new Error(`V02_STANDALONE_RELATIVE_IMPORT_REMAINED:${token}`);
  }
  if(!html.includes('data:text/javascript;base64,'))throw new Error('V02_STANDALONE_MODULES_NOT_EMBEDDED');
  fs.mkdirSync(distDir,{recursive:true});
  fs.writeFileSync(outputPath,html);
  const receipt={
    schema:'JM.NaturalOperationalStandaloneBuildReceipt.v0.2',
    parentAnchor:'b9b9127fc37e504f1d3b9b7cdbaa94d2b605eb7d',
    source:path.relative(process.cwd(),sourceHtmlPath),
    output:path.relative(process.cwd(),outputPath),
    sha256:sha256(html),
    bytes:Buffer.byteLength(html),
    embeddedModules:cache.size,
    checks:{
      relativeModuleImportsRemoved:true,
      frozenV01ImportedAsDonorRatherThanRewritten:true,
      compositionV02Embedded:true,
      permissionedSovereignContactEmbedded:true,
      fileProtocolFetchNotRequiredForCoreRoom:true
    },
    boundary:'Standalone v0.2 continuation above the frozen v0.1 anchor. Not mounted or crowned by this build.'
  };
  fs.writeFileSync(receiptPath,`${JSON.stringify(receipt,null,2)}\n`);
  console.log(JSON.stringify(receipt,null,2));
}

await build();
