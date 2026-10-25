// CP15 child graft into the inherited original CP11 Converged build, on a
// separate draft branch. The parent runtime source is not modified in Git.
import {cp,copyFile,readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url),parent=new URL('../codegornization-cp11/',here);
execFileSync(process.execPath,[fileURLToPath(new URL('prepare-native.mjs',parent))],{stdio:'inherit'});
execFileSync(process.execPath,[fileURLToPath(new URL('compile-routes.mjs',here))],{stdio:'inherit'});
const godot=new URL('../codegornization-cp11/godot/',here);
await mkdir(new URL('packets/',godot),{recursive:true});
await copyFile(new URL('native/CP15Recipient.gd',here),new URL('CP15Recipient.gd',godot));
await copyFile(new URL('native/CP15Main.tscn',here),new URL('CP15Main.tscn',godot));
await copyFile(new URL('seal/CP15Seal.gd',here),new URL('CP15Seal.gd',godot));
await copyFile(new URL('packets/tactics.json',here),new URL('packets/jm_route_tactics.json',godot));
await copyFile(new URL('native/cp15_route_native_test.gd',here),new URL('tests/cp15_route_native_test.gd',godot));
const project=new URL('project.godot',godot);
const current=await readFile(project,'utf8');
if(!current.includes('res://CP11ConvergedMain.tscn'))throw Error('CP11_CONVERGED_MAIN_DRIFT');
await writeFile(project,current.replace('res://CP11ConvergedMain.tscn','res://CP15Main.tscn'));
const preset=new URL('export_presets.cfg',godot);
let cfg=await readFile(preset,'utf8');
for(const [a,b] of [
 ['org.jmecostate.slingfall.cp11','org.jmecostate.slingfall.cp15'],
 ['Android Fold CP11','Android Fold CP15'],
 ['JM SLINGFALL CP11','JM SLINGFALL CP15'],
 ['1.1.0-cp11','1.5.0-cp15']
]){if(!cfg.includes(a))throw Error('CP11_EXPORT_PRESET_DRIFT_'+a);cfg=cfg.replaceAll(a,b)}
await writeFile(preset,cfg);
console.log('CP15 source-aligned original JourMaze → typed native path deck grafted into exact inherited CP11; original CP11 scripts unchanged.');
