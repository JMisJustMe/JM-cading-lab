/**
 * JM FTR First-Person renderer BUGG correction / conditional descendant builder.
 * Read-only source: frozen v0.5.1. Builds a temp corrected carrier without
 * overwriting, duplicating or promoting the protected original.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const dirname='estate-publication/apps-tools-games/games/ftr-first-person-v0.5.1';
const sourceDir=join(root,dirname);
const relative='ftr-hud-render-loop.js';
const pinnedBlob='333463f73344b9af84204bea32b3cef7195388c2';
const broken='ctx.scale(side<0?-1:1)';
const repaired='ctx.scale(side<0?-1:1,1)';
const gitBlobSha=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function buildCorrectedFTRFirstPerson(destination){
  if(typeof destination!=='string'||!destination.trim())throw Error('DERIVED_DESTINATION_REQUIRED');
  const dst=resolve(destination);
  if(dst===sourceDir||dst.startsWith(sourceDir+'/'))throw Error('FROZEN_SOURCE_OVERWRITE_REFUSED');
  const original=readFileSync(join(sourceDir,relative));
  if(gitBlobSha(original)!==pinnedBlob)throw Error('FTR_FROZEN_ANCESTOR_SHA_MISMATCH');
  const text=original.toString('utf8');
  if(text.split(broken).length!==2)throw Error('FTR_RENDER_BUGG_EXACT_MATCH_NOT_UNIQUE');
  const corrected=text.replace(broken,repaired);
  mkdirSync(dst,{recursive:true});
  const copied=[];
  for(const name of readdirSync(sourceDir)){
    const path=join(sourceDir,name);
    if(!statSync(path).isFile())continue;
    const input=readFileSync(path);
    writeFileSync(join(dst,name),name===relative?corrected:input);
    copied.push(name);
  }
  if(gitBlobSha(readFileSync(join(sourceDir,relative)))!==pinnedBlob)throw Error('FTR_ORIGINAL_CHANGED');
  return {schema:'jm.ftr.first-person-derived-contact/0.1',source:dirname,
    sourceBlob:pinnedBlob,originalFrozen:true,generatedDirectory:dst,
    changedSourceFiles:[relative],correction:'CanvasRenderingContext2D.scale(x,y) second axis restored',
    copiedFileCount:copied.length,claim:'DERIVED_TEST_CARRIER_ONLY_NO_NEW_RELEASE'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=buildCorrectedFTRFirstPerson(process.argv[2]);
 console.log(JSON.stringify(r));
}
