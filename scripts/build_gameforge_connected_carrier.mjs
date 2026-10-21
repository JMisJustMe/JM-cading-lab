import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleRegistry} from '../navigator/estate-integration/native-operator.mjs';
import {runNativeOperatorLane,NATIVE_CONNECTED_WORLD_EXAMPLE} from '../navigator/estate-integration/execution-lanes.mjs';
import {loadGameForgeDonor,makeGameForgeWorld,GAMEFORGE_DONOR_SHA256} from '../coding-estate/integration/gameforge-world-carrier.mjs';
export async function buildConnectedCarrier(out){
  const m=JSON.parse(fs.readFileSync('coding-estate/integration/REGISTRY.json'));
  const registry=assembleRegistry(m,m.parts.map(p=>JSON.parse(fs.readFileSync('coding-estate/integration/'+p))));
  const execution=runNativeOperatorLane('native-world',NATIVE_CONNECTED_WORLD_EXAMPLE,registry);
  const donor=await loadGameForgeDonor(async url=>({ok:true,text:async()=>fs.readFileSync(new URL(url),'utf8')}));
  const html=makeGameForgeWorld(donor,execution.result.receiver.world,'jm-connected-world-carrier');
  const proof={schema:'jm.gameforge.connected-carrier/1',status:'SOURCE_EMITTED_BROWSER_PROOF_SEPARATE',entry:'index.html',sha256:createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html),donorSHA256:GAMEFORGE_DONOR_SHA256,world:execution.result.receiver.world,nativeReceipts:execution.result.receiver.receipts,androidInstalled:false,physicalDeviceProof:false};
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);fs.writeFileSync(path.join(out,'CONNECTED_WORLD_SOURCE_PROOF.json'),JSON.stringify(proof,null,2));return proof;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(!process.argv[2])throw Error('OUTPUT_DIRECTORY_REQUIRED');console.log(JSON.stringify(await buildConnectedCarrier(process.argv[2])));}
