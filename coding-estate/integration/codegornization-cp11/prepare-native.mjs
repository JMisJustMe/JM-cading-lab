import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url),parent=new URL('../codegornization-cp10/',here);
execFileSync(process.execPath,[fileURLToPath(new URL('prepare-native.mjs',parent))],{stdio:'inherit'});
const target=new URL('godot/',here);
await mkdir(target,{recursive:true});
await cp(new URL('godot/',parent),target,{recursive:true,force:true});
execFileSync(process.execPath,[fileURLToPath(new URL('emit-live-policy.mjs',here))],{stdio:'inherit'});
const project=new URL('project.godot',target);
let p=await readFile(project,'utf8');
if(!p.includes('res://CP10Main.tscn'))throw Error('CP10_MAIN_DRIFT');
await writeFile(project,p.replace('res://CP10Main.tscn','res://CP11Main.tscn'));
const cfg=new URL('export_presets.cfg',target);
let s=await readFile(cfg,'utf8');
for(const [a,b] of [['org.jmecostate.slingfall.cp10','org.jmecostate.slingfall.cp11'],['Android Fold CP10','Android Fold CP11'],['JM SLINGFALL CP10','JM SLINGFALL CP11'],['1.0.0-cp10','1.1.0-cp11']]){
 if(!s.includes(a))throw Error('CP10_EXPORT_DRIFT '+a);
 s=s.replaceAll(a,b);
}
await writeFile(cfg,s);
console.log('CP11 source-aligned KO runtime choice packaged from exact inherited CP10 and donor outputs.');
