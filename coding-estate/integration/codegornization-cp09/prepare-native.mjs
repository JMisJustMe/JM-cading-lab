import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url),prior=new URL('../codegornization-cp08/',here);
execFileSync(process.execPath,[fileURLToPath(new URL('prepare-native.mjs',prior))],{stdio:'inherit'});
const target=new URL('godot/',here);
await mkdir(target,{recursive:true});
await cp(new URL('godot/',prior),target,{recursive:true,force:true});
const project=new URL('project.godot',target);
const old=await readFile(project,'utf8');
if(!old.includes('res://CP08Main.tscn'))throw Error('CP08_PARENT_SCENE_DRIFT');
await writeFile(project,old.replace('res://CP08Main.tscn','res://CP09Main.tscn'));
const cfg=new URL('export_presets.cfg',target);
let preset=await readFile(cfg,'utf8');
for(const [from,to] of [['org.jmecostate.slingfall.cp08','org.jmecostate.slingfall.cp09'],['Android Fold CP08','Android Fold CP09'],['JM SLINGFALL CP08','JM SLINGFALL CP09'],['0.8.0-cp08','0.9.0-cp09']]){
 if(!preset.includes(from))throw Error('CP08_EXPORT_PARENT_DRIFT:'+from);
 preset=preset.replaceAll(from,to);
}
await writeFile(cfg,preset);
await mkdir(new URL('evidence/',here),{recursive:true});
console.log('CP09 native child prepared from exact CP08; source donors are unchanged.');
