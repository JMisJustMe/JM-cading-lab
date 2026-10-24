import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url),parent=new URL('../codegornization-cp09/',here);
execFileSync(process.execPath,[fileURLToPath(new URL('prepare-native.mjs',parent))],{stdio:'inherit'});
const dest=new URL('godot/',here);
await mkdir(dest,{recursive:true});
await cp(new URL('godot/',parent),dest,{recursive:true,force:true});
execFileSync(process.execPath,[fileURLToPath(new URL('emit-ko-contact.mjs',here))],{stdio:'inherit'});
const project=new URL('project.godot',dest);
const p=await readFile(project,'utf8');
if(!p.includes('res://CP09Main.tscn'))throw Error('PARENT_CP09_SCENE_DRIFT');
await writeFile(project,p.replace('res://CP09Main.tscn','res://CP10Main.tscn'));
const cfg=new URL('export_presets.cfg',dest);
let s=await readFile(cfg,'utf8');
for(const [from,to] of [['org.jmecostate.slingfall.cp09','org.jmecostate.slingfall.cp10'],
['Android Fold CP09','Android Fold CP10'],['JM SLINGFALL CP09','JM SLINGFALL CP10'],['0.9.0-cp09','1.0.0-cp10']]){
 if(!s.includes(from))throw Error('PARENT_CP09_EXPORT_DRIFT '+from);
 s=s.replaceAll(from,to);
}
await writeFile(cfg,s);
console.log('CP10 inherits all protected CP09/native estate source. Actual KO donor output carried into typed native packet.');
