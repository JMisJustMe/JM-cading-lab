from pathlib import Path
import hashlib, json, re, subprocess, sys, zipfile
P=Path(__file__).resolve().parents[1]
A=P/'ancestry/SLINGFALL_v0_1_FIELD_CONTACT.html'
G=(P/'Main.gd').read_text()
CHECKS={
'original source exact sha':hashlib.sha256(A.read_bytes()).hexdigest()=='b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62',
'original v0.2 QA preserved':(P/'tests/qa_static.py').exists(),
'all original zone constants retained':all(x in G for x in ['"RIDGE", "x":448.0','"CROSSROADS", "x":608.0','"SUPPLY", "x":755.0']),
'all original hero costs retained':all(x in G for x in ['"cost":32.0','"cost":26.0','"cost":28.0']),
'landing abilities original':all(x in G for x in ['_hit(other,27.0)','h["shield"] = 8.0','h["speed_boost"] = 5.0']),
'Bulwark siege terrain and armor':'_register_scar(p,h["team"])' in G and '0.83 if h["type"] == "bulwark"' in G,
'Dart relocation and third hit effect':'RAZOR RUSH' in G and 'SIGNATURE_THRESHOLD' in G,
'Warden automatic healing and ultimate':'support_cd' in G and 'RESTORATION WAVE' in G,
'combat event renderer exists':'func _draw_combat_events' in G,
'gameplay changed by supply ownership':'battle["energy"][side]' in G,
'storm wind phases draw':'ION STORM' in G and 'CROSSWIND' in G,
'battle v02 save key preserved':'slingfall_field_ascent_battle.json' in G,
'backward v02 schema recovery':'"version":2' in G and 'if not battle.has("scars")' in G,
'no external network dependencies':not any(y in G for y in ['HTTPRequest','OS.shell_open','https://','http://']),
'no JS webview iframe':'extends Control' in G and not any(y in G for y in ['WebView','iframe']),
'native runtime test available':(P/'tests/host_logic_test.gd').exists(),
'all 3 role illustrations retained':all((P/f'assets/{k}.png').exists() or (P/f'assets/{k}.svg').exists() for k in ['bulwark','dart','warden']),
'original v0.2 native scene retained':(P/'Main.tscn').is_file(),
'Godot mobile renderer retained':'gl_compatibility' in (P/'project.godot').read_text(),
'victory and bunker retained':all(x in G for x in ['func _finish','func _upgrade','func _draw_overlay']),
}
for n,passed in CHECKS.items(): print(('PASS' if passed else 'FAIL')+' | '+n)
info={'scope':'STATIC, not Godot runtime','passed':sum(CHECKS.values()),'total':len(CHECKS),'failures':[k for k,v in CHECKS.items() if not v], 'src_sha256':hashlib.sha256(A.read_bytes()).hexdigest(), 'main_sha256':hashlib.sha256((P/'Main.gd').read_bytes()).hexdigest()}
(P/'tests/QA_V03_STATIC.json').write_text(json.dumps(info,indent=2)+'\n')
print(json.dumps(info,indent=2))
sys.exit(0 if all(CHECKS.values()) else 1)
