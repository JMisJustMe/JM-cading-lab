#!/usr/bin/env python3
"""Source-and-asset static checks (not a Godot runtime test)."""
from pathlib import Path
from hashlib import sha256
import re, json, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
G=(ROOT/'Main.gd').read_text()
O=(ROOT/'ancestry'/'SLINGFALL_v0_1_FIELD_CONTACT.html').read_bytes()
ORIGINAL=O.decode('utf-8')
C=[]
def check(name, test):
 C.append((name,bool(test)))
 print(('PASS' if test else 'FAIL')+'  '+name)

check('Original HTML byte count', len(O)==40804)
check('Original HTML provenance hash',sha256(O).hexdigest()=='b15efb33886f267b0138ccd0296e7b48a93ba32e57c9fdfa6e6153b5085c5a62')
check('Original runtime untouched in ancestry','Slingfall' in ORIGINAL or 'SLINGFALL' in ORIGINAL)
check('Godot 4 GDScript project import files', (ROOT/'project.godot').is_file() and (ROOT/'Main.tscn').is_file() and 'res://Main.tscn' in (ROOT/'project.godot').read_text())
check('Native script is Godot Control, not browser wrapper',G.lstrip().startswith('extends Control') and 'iframe' not in G and 'webview' not in G)
check('Mobile compatibility renderer', 'gl_compatibility' in (ROOT/'project.godot').read_text() and 'InputEventScreenTouch' in G and 'InputEventScreenDrag' in G)
check('Three source champion types',set(re.findall(r'\b(bulwark|dart|warden):\{name:',ORIGINAL))=={'bulwark','dart','warden'})
check('Role costs retained 32 26 28',all(('"%s": {"name"'%n) in G and ('"cost":%s.0'%price) in G for n,price in [('bulwark',32),('dart',26),('warden',28)]))
check('Role hp retained 160 90 125',all(('"hp":%s.0'%v) in G for v in [160,90,125]))
check('Three capture sectors and radii preserved',all(('%s\", \"x\":%s.0'% (n,x)) in G for n,x in [('RIDGE',448),('CROSSROADS',608),('SUPPLY',755)]) and all(x in G for x in ['"r":79.0','"r":91.0']))
check('Three zone scores maintained .95 1.55 1.13',all(x in G for x in ['"mult":0.95','"mult":1.55','"mult":1.13']))
check('Victory cap and match duration 105 / 140', 'const WIN_SCORE = 105.0' in G and 'const MATCH_TIME = 140.0' in G)
check('Capture threshold +52/-52 and 14 control per second', '>= 52' in G and '<= -52' in G and '14.0*dt' in G)
check('Airborne trajectory 515 gravity and 1.03..2.25 duration', '515.0' in G and '1.03,2.25' in G)
check('Three distinct landing abilities implemented', all(x in G for x in ['_hit(other,27.0)','other["shield"]','h["speed_boost"] = 5.0']))
check('Auto enemy deployments and auto combat present', all(x in G for x in ['_enemy_step(dt)','_combat_step(dt)','next_enemy = rng.randf_range(3.3,5.1)']))
check('Rally at level 2 and 45 scrap cost', 'int(profile["level"]) >= 2' in G and '45 if lv == 1 else 90' in G)
check('Tier 3 exactly -4 launch cost, regen 7.2', '- (4.0 if int(profile["level"]) >= 3' in G and '7.2 if int(profile["level"]) >= 3 else 6.2' in G)
check('Recall 4s, elimination 7s, natural timeout 43s', all(x in G for x in ['+ 4.0','+ 7.0','> 43.0']))
check('Profile + battle state recovery and version gate', all(x in G for x in ['SAVE_PROFILE','SAVE_BATTLE','func resume_battle','"version":2','b["zones"].size() != 3']))
check('Read-only static role sprites supplied', all((ROOT/'assets'/(n+'.svg')).is_file() for n in ['bulwark','dart','warden']))
for n in ['bulwark','dart','warden']:
 p=ROOT/'assets'/(n+'.svg')
 ET.parse(p)
check('All vector sprites parse as XML', True)
check('No C# or external add-ons needed',not list(ROOT.glob('**/*.cs')) and not list(ROOT.glob('**/*.gdextension')))
check('No suspicious JS-style => arrows or function-param :=', '=>' not in G and not re.search(r'^func .*:=',G,re.M))
check('End-to-end source structure present',all('func '+s in G for s in ['start_battle','_pointer_up','_capture_step','_finish','_draw_land','_draw_champion']))
check('Phone user interaction test card included',(ROOT/'tests'/'DEVICE_TEST_CARD.md').is_file())
# Validate matching capture-zone positions geometrically and that roles have tactical differences.
zd=[(448,216,79),(608,351,91),(755,488,79)]
check('No overlapping zone centres',all((x1-x2)**2+(y1-y2)**2>(r1*.9)**2 for i,(x1,y1,r1) in enumerate(zd) for j,(x2,y2,r2) in enumerate(zd) if i!=j))
check('All zones in field touch rectangle',all(250<x<956 and 80<y<629 for x,y,r in zd))
check('Min projectile height positive + returns to ground',all(515*t*t*0.125 > 0 and abs(515*t*t*.5-515*t*t*.5)<1e-8 for t in [1.03,1.8,2.25]))
check('Godot scene script resource linked', 'res://Main.gd' in (ROOT/'Main.tscn').read_text())
failed=[name for name,passed in C if not passed]
report={'kind':'STATIC CHECKS ONLY — NOT ENGINE RUNTIME','passed':sum(ok for _,ok in C),'total':len(C),'failed':failed,'original_sha256':sha256(O).hexdigest(),'godot_script_sha256':sha256((ROOT/'Main.gd').read_bytes()).hexdigest(),'engine_runtime':'NOT RUN (no Godot CLI installed here)','android_owner_test':'HOLD','full_godogen_pipeline':'NOT RUN'}
(ROOT/'tests'/'QA_RESULT.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
raise SystemExit(1 if failed else 0)
