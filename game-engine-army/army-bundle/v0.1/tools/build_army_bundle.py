#!/usr/bin/env python3
from pathlib import Path
import hashlib
import html
import json
import shutil

HERE=Path(__file__).resolve()
REPO=HERE.parents[4]
OUT=HERE.parents[1]/'dist'
ENGINES=OUT/'engines'

if OUT.exists():
    shutil.rmtree(OUT)
ENGINES.mkdir(parents=True)

SPECS=[
 ('GlyphPlay','creator-stage-playtest','glyphplay/v0.1/dist/*.html'),
 ('GameForge','game-body cartridge compiler','gameforge/v0.1/dist/*.html'),
 ('GlyphForge','asset-control adapter forge','glyphforge/v0.1/dist/*.html'),
 ('PLAYFORM','repeatable playable-expression framework','playform/v0.1/dist/*.html'),
 ('JM GameCore','identity-preserving shared runtime','wave2/v0.2/dist/JM_GAMECORE_SOVEREIGN_v0_2.html'),
 ('JM GAME NATIVE CORE','deterministic fixed-step runtime','wave2/v0.2/dist/JM_GAME_NATIVE_CORE_v0_2.html'),
 ('Kading Game Estate Engine','Kading source to Game IR runtime','wave2/v0.2/dist/KADING_GAME_ESTATE_ENGINE_v0_2.html'),
 ('JM Game Engine Console','identity-preserving operator surface','wave2/v0.2/dist/JM_GAME_ENGINE_CONSOLE_v0_5.html'),
 ('Army Federation','seven-stage federation and coding-body trials','wave2/v0.2/dist/JM_GAME_ENGINE_ARMY_FEDERATION_v0_2.html')
]

rows=[]
for index,(name,role,pattern) in enumerate(SPECS,1):
    matches=sorted((REPO/'game-engine-army').glob(pattern))
    if not matches:
        raise SystemExit(f'missing built engine: {name} ({pattern})')
    candidates=[path for path in matches if 'RECEIPT' not in path.name and path.suffix=='.html']
    source=max(candidates,key=lambda path:path.stat().st_size)
    safe=f'{index:02d}_{name.upper().replace(" ","_").replace("/","_")}.html'
    target=ENGINES/safe
    shutil.copy2(source,target)
    data=target.read_bytes()
    rows.append({
        'index':index,
        'name':name,
        'role':role,
        'file':'engines/'+safe,
        'bytes':len(data),
        'sha256':hashlib.sha256(data).hexdigest(),
        'source':str(source.relative_to(REPO))
    })

registry={
    'schema':'jm.game-engine-army-bundle/0.1',
    'status':'NINE_CURRENT_SCOPE_FIRST_FLOORS',
    'count':len(rows),
    'engines':rows,
    'claimBoundary':'Editable browser first floors. Direct user device proof, native binaries, sustained projects and final crowns remain open.'
}
(OUT/'ENGINE_REGISTRY.json').write_text(json.dumps(registry,indent=2),encoding='utf-8')

cards=''.join(
    f'''<button class="card" data-file="{html.escape(row['file'])}" data-name="{html.escape(row['name'])}"><b>{row['index']:02d}. {html.escape(row['name'])}</b><span>{html.escape(row['role'])}</span><code>{row['sha256'][:12]}</code></button>'''
    for row in rows
)

document=f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>JM Game Engine Army — Waves 1–2</title><style>
:root{{--bg:#040812;--panel:#0d1727;--line:#29425f;--ink:#f8fbff;--mut:#9fb4c9;--gold:#ffd166;--cyan:#62e8ff}}*{{box-sizing:border-box}}html,body{{margin:0;height:100%;overflow:hidden;background:var(--bg);color:var(--ink);font-family:system-ui}}body{{display:grid;grid-template-rows:auto auto 1fr}}header{{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;justify-content:space-between}}h1{{font-size:clamp(1rem,2vw,1.45rem);margin:0;color:var(--gold)}}header small{{color:var(--mut)}}.rail{{display:flex;gap:8px;overflow-x:auto;padding:9px;border-bottom:1px solid var(--line);scroll-snap-type:x mandatory}}.card{{min-width:220px;max-width:220px;min-height:82px;text-align:left;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--ink);padding:10px;scroll-snap-align:start}}.card.active{{border-color:var(--cyan);box-shadow:0 0 0 2px #62e8ff33}}.card span,.card code{{display:block;color:var(--mut);font-size:.72rem;margin-top:5px}}main{{min-height:0;display:grid;grid-template-rows:auto 1fr}}.bar{{display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line)}}.bar b{{color:var(--cyan)}}a{{color:var(--gold)}}iframe{{width:100%;height:100%;border:0;background:#fff}}@media(max-width:700px){{.card{{min-width:185px;max-width:185px}}header small{{display:none}}}}
</style></head><body><header><h1>JM Game Engine Army — Waves 1–2</h1><small>Nine sovereign first floors · phone + laptop · open inside</small></header><nav class="rail">{cards}</nav><main><div class="bar"><b id="name">Select an engine</b><span>·</span><a id="open" href="#" target="_blank">Open separately</a><span style="margin-left:auto;color:var(--mut)">Shared organs ≠ identical bodies</span></div><iframe id="view" title="Engine view"></iframe></main><script>
const cards=[...document.querySelectorAll('.card')],view=document.querySelector('#view'),name=document.querySelector('#name'),open=document.querySelector('#open');function select(card){{cards.forEach(item=>item.classList.toggle('active',item===card));view.src=card.dataset.file;name.textContent=card.dataset.name;open.href=card.dataset.file}}cards.forEach(card=>card.onclick=()=>select(card));select(cards[0]);
</script></body></html>'''

(OUT/'OPEN_FIRST_JM_GAME_ENGINE_ARMY_WAVES_1_2.html').write_text(document,encoding='utf-8')

for path in [OUT/'OPEN_FIRST_JM_GAME_ENGINE_ARMY_WAVES_1_2.html',OUT/'ENGINE_REGISTRY.json']:
    print(path.name,hashlib.sha256(path.read_bytes()).hexdigest(),path.stat().st_size)
