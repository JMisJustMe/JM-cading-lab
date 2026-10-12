/* Deterministic one-body release carrier builder. Public-safe JS and HTML ONLY;
 * excludes private original Forge v0.24, real GLB and personalized owner packet.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
const parts=[
 'target-bridge/form-forge-routeos-v0-1/index.html',
 'target-bridge/form-forge-routeos-v0-2/JM_FORGE_SURFACE_KINETICS_v0_2.js',
 'target-bridge/form-forge-routeos-v0-3/JM_FORGE_EMBODIED_RESPONSE_v0_3.js',
 'target-bridge/form-forge-routeos-v0-4/JM_FORGE_ARTICULATED_BODY_v0_4.js',
 'target-bridge/form-forge-routeos-v0-5/JM_FORGE_DUAL_ACTOR_v0_5.js',
 'target-bridge/form-forge-routeos-v0-6/JM_FORGE_WORLD_CONSEQUENCE_v0_6.js',
 'release/jm-world-v0-6/JM_OWNER_CONTACT_OFFLINE_BRIDGE_v0_6.js'
];
const output='release/jm-world-v0-6/JM_GUARDIAN_COURIER_OWNER_CONTACT_ONEBODY_v0_6.html';
const texts=parts.map(p=>fs.readFileSync(p,'utf8'));
const anchor="say('Exact v0.24 Forge GLB verified · '+parsed.faces.length+' triangles are now interactive game surfaces');return parsed}";
if(!texts[0].includes(anchor))throw Error('Original Forge contact source changed. RECOVER, do not silently rebuild.');
let result=texts[0].replace(anchor,"say('Exact v0.24 Forge GLB verified · '+parsed.faces.length+' triangles are now interactive game surfaces');queueMicrotask(()=>window.JMOfflineSource?.onLoaded?.());return parsed}");
if(!result.includes('</body></html>'))throw Error('Original HTML seam missing');
result=result.replace('</body></html>',texts.slice(1).map((src,i)=>{
 if(src.includes('</script>'))throw Error('Inline script boundary violation in '+parts[i+1]);
 return '\n<!-- JM owned additive recipient '+(i+2)+'; exact original preserved in branch -->\n<script>\n'+src+'\n</script>';
}).join('')+'\n</body></html>');
if(/<script[^>]+src=/i.test(result))throw Error('External scripts forbidden in OneBody');
if(result.includes('de2a5095bae7cc1e130d09a8a54ed5312c8139eefe31c2d5a6768be36fd745e7'))throw Error('Private Forge mesh hash found in public carrier');
const hash=crypto.createHash('sha256').update(result).digest('hex');
if(process.argv.includes('--check')){
 if(fs.readFileSync(output,'utf8')!==result)throw Error('OneBody RELEASE DRIFT: regeneration differs. HOLD / restore original assets.');
 console.log('PASS · deterministic OneBody · '+Buffer.byteLength(result)+' bytes · SHA256 '+hash);
}else{
 fs.writeFileSync(output,result);
 console.log('BUILT · '+output+' · '+Buffer.byteLength(result)+' bytes · SHA256 '+hash);
}
