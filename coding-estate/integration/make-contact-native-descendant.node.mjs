/**
 * JM CP39 — reproducibly derive a playable native-contact descendant
 * from a protected verified original without altering that ancestor.
 * Usage: node make-contact-native-descendant.node.mjs <original-lab.html> <destination.html>
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const [src,out]=process.argv.slice(2);
if(!src||!out)throw Error('SOURCE_AND_OUTPUT_REQUIRED');
if(resolve(src)===resolve(out))throw Error('PROTECTED_SOURCE_OVERWRITE_FORBIDDEN');
const original=fs.readFileSync(src);
const actual=createHash('sha256').update(original).digest('hex');
if(actual!=='ed72ec0880af89925ab78fe0de125f47613217a3758d9a744dd08420e00c3310')
 throw Error('PROTECTED_SOURCE_HASH_MISMATCH');
const html=original.toString('utf8');
if(!html.includes('</body>')||html.includes('id="nativeContactProof"'))throw Error('SOURCE_SEAM_INVALID');
const add='<section class="panel" id="nativeContactProof" style="max-width:1330px;margin:0 auto 14px;min-height:115px" aria-label="JM native GameCore proof"></section>\n'
  +'<script type="module" src="./contact-gamecore-playable.mjs"></script>\n';
fs.writeFileSync(out,html.replace('</body>',add+'</body>'),'utf8');
console.log(JSON.stringify({schema:'jm.cp39.playable-derivative/1',originalSha256:actual,output:resolve(out),originalUnmodified:true,bodyAdded:'native HUD and touch swipe only'}));
