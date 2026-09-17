#!/usr/bin/env python3
from pathlib import Path
import hashlib
import html
import json
import re

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
DIST.mkdir(exist_ok=True)

ORDER=['shared.mjs','gamecore.mjs','nativecore.mjs','kading.mjs','console.mjs','federation.mjs','proof.mjs']
chunks=[]
for name in ORDER:
    text=(ROOT/name).read_text(encoding='utf-8')
    text=re.sub(r'^import .*?;\s*$', '', text, flags=re.MULTILINE)
    text=text.replace('export default ','').replace('export ','')
    chunks.append(text)
runtime='\n'.join(chunks)

ITEMS=[
 ('JM_GAMECORE_SOVEREIGN_v0_2.html','JM GameCore v0.2','GameCore','Identity-preserving BodyRegistry, ServiceBus, StateVault, TraceService, RecoveryService and HostBridge.'),
 ('JM_GAME_NATIVE_CORE_v0_2.html','JM GAME NATIVE CORE v0.2','NativeCore','Deterministic fixed-step runtime with profile-bound verbs, collision, fault/recovery and target ABI contracts.'),
 ('KADING_GAME_ESTATE_ENGINE_v0_2.html','Kading Game Estate Engine v0.2','Kading','Kading source to AST to Game IR to interpreter receipt.'),
 ('JM_GAME_ENGINE_CONSOLE_v0_5.html','JM Game Engine Console v0.5','EngineConsole','Operator surface that selects, launches and services engines without owning their internals.'),
 ('JM_GAME_ENGINE_ARMY_FEDERATION_v0_2.html','JM Game Engine Army Federation v0.2','Federation','Seven-stage identity-preserving federation and five coding-body difference trials.')
]

TEMPLATE='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>{title}</title><style>
html,body{{margin:0;min-height:100%;background:#050914;color:#f7fbff;font-family:system-ui}}
main{{max-width:1100px;margin:auto;padding:18px}}section{{border:1px solid #2d4665;border-radius:18px;background:#0e1728;padding:16px;margin:12px 0}}
h1{{color:#ffd166}}button{{min-height:44px;border:1px solid #2d4665;border-radius:12px;background:#13263a;color:#fff;padding:10px 14px;font-weight:800}}
pre{{white-space:pre-wrap;word-break:break-word;background:#040912;border:1px solid #243b57;border-radius:12px;padding:12px;max-height:55vh;overflow:auto}}
</style></head><body><main><h1>{title}</h1><p>{description}</p><section><b>Role:</b> {role}<br><b>Claim:</b> functional browser/JavaScript first floor; final native binaries and crown remain open.</section><button id="run">Run verified proof</button><pre id="out">READY</pre></main><script>{runtime}
const out=document.querySelector('#out');document.querySelector('#run').onclick=()=>{{try{{out.textContent=JSON.stringify(runWave2Proof(),null,2)}}catch(error){{out.textContent='FAULT: '+error.stack}}}};
</script></body></html>'''

receipt={'schema':'jm.wave2-dist/0.2','files':{}}
for filename,title,role,description in ITEMS:
    document=TEMPLATE.format(title=html.escape(title),role=role,description=html.escape(description),runtime=runtime)
    data=document.encode('utf-8')
    (DIST/filename).write_bytes(data)
    receipt['files'][filename]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'role':role}

(DIST/'BUILD_RECEIPT_v0_2.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(json.dumps(receipt,indent=2))
