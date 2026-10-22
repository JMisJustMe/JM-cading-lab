// M002 CP7: actual bounded law-earned sources -> existing GameForge first-open world.
// Adds only an OPT-IN JSON capsule. GameForge donor and legacy worlds unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {executeWorldLawContact} from '../coding-estate/integration/world-law-native-contact.mjs';
import {assembleRegistry} from '../navigator/estate-integration/native-operator.mjs';
import {loadGameForgeDonor,makeGameForgeWorld,readWorldBoot} from '../coding-estate/integration/gameforge-world-carrier.mjs';
const STEPS=Object.freeze({
 bridge:['right','reach','right','right','reach','free',...Array(20).fill('right')],
 arena:['right','right','up','reach','free','up',...Array(4).fill('right'),'down','down','reach','free',
  ...Array(3).fill('right'),'up',...Array(6).fill('right'),'down']
});
const manifest=JSON.parse(fs.readFileSync('coding-estate/integration/REGISTRY.json','utf8'));
const registry=assembleRegistry(manifest,manifest.parts.map(p=>JSON.parse(fs.readFileSync('coding-estate/integration/'+p,'utf8'))));
const donor=await loadGameForgeDonor(async url=>({ok:true,text:async()=>fs.readFileSync(new URL(url),'utf8')}));
const dir=process.argv[2]||'qa/m002-cp7';fs.mkdirSync(dir,{recursive:true});
const results=[];
for(const kind of ['bridge','arena']){
 const executed=await executeWorldLawContact({kind,actions:STEPS[kind],registry});
 if(executed.status!=='ALLOWED_NATIVE_WORLD_EXECUTED'||!executed.worldLaw.allowed||!executed.recipient?.world)
  throw Error('CP7_UPSTREAM_EARNED_SOURCE_HOLD:'+kind);
 const token='jm-m002-cp7-'+kind+'-v1';
 const base=makeGameForgeWorld(donor,executed.recipient.world,token);
 const key='<script type="application/json" id="jm-world-boot">';
 if(base.split(key).length!==2)throw Error('CP7_WORLD_BOOT_MARKER_HOLD');
 const contact={schema:'jm.m002.cp7.inworld-contact/1',kind,sourceDigest:executed.source.sha256};
 const html=base.replace(key,'<script type="application/json" id="jm-m002-cp7-boot">'+JSON.stringify(contact)+'</script>'+key);
 const boot=readWorldBoot(html);
 if(JSON.stringify(boot.world)!==JSON.stringify(executed.recipient.world))throw Error('CP7_BOOT_MUTATION_HOLD');
 const file=path.join(dir,'CP7_'+kind.toUpperCase()+'_TWO_CURRENTS_OPEN_FIRST.html');
 fs.writeFileSync(file,html);
 results.push({kind,filename:file,bytes:Buffer.byteLength(html),world:executed.recipient.world,
  sourceSha256:executed.source.sha256,receiverReceipt:executed.recipient.stateDigest,
  boot:contact,claim:'First-open playable opt-in; player contacts must be earned again INSIDE the world'});
}
const record={schema:'jm.m002.cp7.first-open-build/1',status:'PRODUCED_PENDING_BROWSER_PROOF',results,
 boundary:'Genuine pre-creation law gate and existing GameForge engine with opt-in in-world state. No owner Samsung, main merge or release.'};
fs.writeFileSync(path.join(dir,'CP7_BUILD_MANIFEST.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record));
