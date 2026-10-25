// CP16: graft a completely separate child on top of exact CP15 native ancestry.
import {copyFile,readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url);
execFileSync(process.execPath,[fileURLToPath(new URL('../codegornization-cp15/prepare-native.mjs',here))],{stdio:'inherit'});
execFileSync(process.execPath,[fileURLToPath(new URL('compile-power-routes.mjs',here))],{stdio:'inherit'});
const godot=new URL('../codegornization-cp11/godot/',here);
for(const [from,to] of [
 ['native/CP16Recipient.gd','CP16Recipient.gd'],
 ['native/CP16Main.tscn','CP16Main.tscn'],
 ['native/cp16_32_native_test.gd','tests/cp16_32_native_test.gd'],
 ['seal/CP16Seal.gd','CP16Seal.gd'],
 ['packets/cp16_power_routes.json','packets/cp16_power_routes.json']
]){
 await copyFile(new URL(from,here),new URL(to,godot));
}
const project=new URL('project.godot',godot),p=await readFile(project,'utf8');
if(!p.includes('res://CP15Main.tscn'))throw Error('PARENT_CP15_SOURCE_DRIFT');
await writeFile(project,p.replace('res://CP15Main.tscn','res://CP16Main.tscn'));
const exp=new URL('export_presets.cfg',godot);let cfg=await readFile(exp,'utf8');
for(const [a,z] of [
 ['org.jmecostate.slingfall.cp15','org.jmecostate.slingfall.cp16'],
 ['Android Fold CP15','Android Fold CP16'],
 ['JM SLINGFALL CP15','JM SLINGFALL CP16'],
 ['1.5.0-cp15','1.6.0-cp16']]){
 if(!cfg.includes(a))throw Error('CP15_PRESET_DRIFT_'+a);
 cfg=cfg.replaceAll(a,z);
}
await writeFile(exp,cfg);
console.log('CP16 inherited exact CP15 controls and original KO, built six source-selected routes in a new independent child.');
