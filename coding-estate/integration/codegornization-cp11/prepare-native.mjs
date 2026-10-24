import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url),parent=new URL('../codegornization-cp10/',here);
execFileSync(process.execPath,[fileURLToPath(new URL('prepare-native.mjs',parent))],{stdio:'inherit'});
const target=new URL('godot/',here);
await mkdir(target,{recursive:true});
await cp(new URL('godot/',parent),target,{recursive:true,force:true});
const proj=new URL('project.godot',target);
const p=await readFile(proj,'utf8');
if(!p.includes('res://CP10Main.tscn'))throw Error('CP10_SOURCE_PROJECT_DRIFT');
await writeFile(proj,p.replace('res://CP10Main.tscn','res://CP11Main.tscn'));
const cfg=new URL('export_presets.cfg',target);
let s=await readFile(cfg,'utf8');
for(const [before,after] of [['org.jmecostate.slingfall.cp10','org.jmecostate.slingfall.cp11'],['Android Fold CP10','Android Fold CP11'],['JM SLINGFALL CP10','JM SLINGFALL CP11'],['1.0.0-cp10','1.1.0-cp11']]){
 if(!s.includes(before))throw Error('CP10_EXPORT_SOURCE_DRIFT_'+before);
 s=s.replaceAll(before,after);
}
await writeFile(cfg,s);
await mkdir(new URL('./evidence/',here),{recursive:true});
console.log('JM CP11: exact CP10 and prior SLINGFALL carriers preserved; native return recipient only additive.');
