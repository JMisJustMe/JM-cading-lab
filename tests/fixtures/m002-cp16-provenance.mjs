import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {assembleRegistry} from '../../navigator/estate-integration/native-operator.mjs';

export function makeCP16Fixture(){
 const dir=mkdtempSync(join(tmpdir(),'jm-cp16-'));
 const sourceRoot=join(dir,'approved');
 mkdirSync(sourceRoot);
 writeFileSync(join(sourceRoot,'alpha.md'),'# Habit\nHabit grows through repetition and correction.\nHabit is reviewed in context.\n');
 writeFileSync(join(sourceRoot,'beta.md'),'# Habit\nHabit can develop through independent feedback.\n');
 const root='coding-estate/integration/';
 const manifest=JSON.parse(readFileSync(root+'REGISTRY.json','utf8'));
 const registry=assembleRegistry(manifest,manifest.parts.map(p=>JSON.parse(readFileSync(root+p,'utf8'))));
 const candidate=JSON.parse(readFileSync('navigator/estate-integration/public-registry.json','utf8'));
 const published=structuredClone(candidate);
 const seat=published.lineage_seats.find(x=>x.id==='JM-BUILD-MESH-001');
 seat.authority.hosted_mcp_current='v0.7.3';seat.authority.primary='JM.CareerCurrentProjectRegistry/0.4';
 const mesh={candidate,published,hosted:{
  server:'JM ECOSTATE Build Mesh Native MCP',version:'0.8.5',
  current_registry_schema:'JM.CareerCurrentProjectRegistry/0.24',
  current_registry_hash_mode:'SHA256_EXACT_LOADED_BYTES',
  current_registry_reload_policy:'PROCESS_START',
  current_registry_sha256:'7debfd83bb13ccebc94acf96978e567ceaf8772272cb1ccbcd0c6931850a5d31',
  current_registry_loaded_bytes:27978,current_project_records:22,capability_profiles:34}};
 const receivers={
  game:{schema:'jm.m002.cp11.game-host/1',selected:'Krix',identity:'JM CP16',
   allies:['Krix','Vexa'].map((id,i)=>({id,x:200+i*80,y:330,hp:100,guardTicks:0})),
   enemies:['Nox','Rift'].map((id,i)=>({id,x:700+i*80,hp:100})),events:[]},
  comic:{schema:'jm.m002.cp11.comic-host/1',owner:'JM Author House',edition:0,pages:[]},
  book:{schema:'jm.m002.cp13.book-host/1',owner:'JM Author House',revision:0,chapters:[]},
  music:{schema:'jm.m002.cp13.music-host/1',owner:'JM Music House',revision:0,measures:[]},
  cartoon:{schema:'jm.m002.cp13.cartoon-host/1',owner:'JM Animated House',revision:0,shots:[]}
 };
 const config={host:'127.0.0.1',stateFile:join(dir,'jm-state.json'),
  bearer:'CP16_Test_Auth_'+randomUUID().replaceAll('-',''),
  sealKey:'CP16_Test_Seal_'+randomUUID().replaceAll('-',''),
  sourceRoot,sources:{alpha:'alpha.md',beta:'beta.md'},receivers,registry,mesh};
 const request={approval:'EXPLICIT_LOCAL_EXECUTION_REQUEST',choice:'explore',subject:'JM Krix',
  stations:3,actions:[{kind:'claim',id:'A'},{kind:'shock'},
   {kind:'claim',id:'B'},{kind:'claim',id:'C'}],
  targets:['game','comic','book','music','cartoon','compile-js','native-chain','os','gamecore','embodied'],
  inputs:{'compile-js':'source = verified.✓',embodied:'open gate'}};
 return {config,request,dir,dispose:()=>rmSync(dir,{recursive:true,force:true})};
}
