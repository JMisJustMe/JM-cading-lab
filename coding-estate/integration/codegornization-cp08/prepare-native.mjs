import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url);
const prior=new URL('../codegornization-cp03/',here);
const source=new URL('godot/',prior);
const target=new URL('godot/',here);
// Recover/replay the strongest protected ancestor; do not modify source.
for(const script of ['prepare-native.mjs','emit-director.mjs','test-director.mjs'])
 execFileSync(process.execPath,[fileURLToPath(new URL(script,prior))],{stdio:'inherit'});
await mkdir(target,{recursive:true});
await cp(source,target,{recursive:true,force:true});
const project=new URL('project.godot',target);
const p=await readFile(project,'utf8');
if(!p.includes('res://CP03Main.tscn'))throw Error('CP03_MAIN_SCENE_NOT_FOUND');
await writeFile(project,p.replace('res://CP03Main.tscn','res://CP08Main.tscn'));
const cfg=new URL('export_presets.cfg',target);
let exportText=await readFile(cfg,'utf8');
exportText=exportText.replaceAll('org.jmecostate.slingfall.cp03','org.jmecostate.slingfall.cp08');
await writeFile(cfg,exportText);
// Verify the unchanged ancestor source files by deterministic SHA-256 in CP03's prepare script.
// This CP08 directory owns only CP08 scripts and a generated copy of the parent project.
console.log('CP08 prepared from exact CP03 repaired carrier; original JM source unchanged.');
