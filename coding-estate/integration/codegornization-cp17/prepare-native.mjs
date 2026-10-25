// CP17 additive native owner-review descendant. CP16 build exact remains intact.
import {copyFile,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url);
execFileSync(process.execPath,[fileURLToPath(new URL('../codegornization-cp16/prepare-native.mjs',here))],{stdio:'inherit'});
const godot=new URL('../codegornization-cp11/godot/',here);
for(const [source,target] of [
 ['native/CP17Recipient.gd','CP17Recipient.gd'],
 ['native/CP17Main.tscn','CP17Main.tscn'],
 ['native/cp17_review_native_test.gd','tests/cp17_review_native_test.gd']
])await copyFile(new URL(source,here),new URL(target,godot));
const p=new URL('project.godot',godot),src=await readFile(p,'utf8');
if(!src.includes('res://CP16Main.tscn'))throw Error('CP16_NATIVE_ANCESTOR_DRIFT');
await writeFile(p,src.replace('res://CP16Main.tscn','res://CP17Main.tscn'));
const exp=new URL('export_presets.cfg',godot);
let cfg=await readFile(exp,'utf8');
for(const [oldText,newText] of [
 ['org.jmecostate.slingfall.cp16','org.jmecostate.slingfall.cp17'],
 ['Android Fold CP16','Android Fold CP17'],
 ['JM SLINGFALL CP16','JM SLINGFALL CP17'],
 ['1.6.0-cp16','1.7.0-cp17']
]){if(!cfg.includes(oldText))throw Error('CP16_EXPORT_IDENTITY_DRIFT:'+oldText);
 cfg=cfg.replaceAll(oldText,newText);}
await writeFile(exp,cfg);
console.log('CP17 inherits original six-tactic Godot body, distinct UI child; zero changes to inherited gameplay recipients.');
