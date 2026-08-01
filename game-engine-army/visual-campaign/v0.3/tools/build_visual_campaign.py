#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STYLE_ORDER = ["styles/core.css", "styles/engine-themes.css", "styles/mobile.css"]
SCRIPT_ORDER = [
    "addons/core.js",
    "addons/engine-adapters.js",
    "addons/audio.js",
    "addons/accessibility.js",
    "addons/performance.js",
    "addons/fx.js",
    "addons/ui.js",
]
SPECS = [
    (1, "glyphplay", "GlyphPlay", "creator-stage-interaction-playtest", "glyphplay/OPEN_FIRST_GLYPHPLAY_VISUAL_OVERHAUL_v0_2.html"),
    (2, "gameforge", "GameForge", "game-body build graph and deterministic cartridge compiler", "gameforge/OPEN_FIRST_GAMEFORGE_SOVEREIGN_REBUILD_v0_1.html"),
    (3, "glyphforge", "GlyphForge", "asset body, physical input, named action and adapter contract", "glyphforge/OPEN_FIRST_GLYPHFORGE_SOVEREIGN_REBUILD_v0_1.html"),
    (4, "playform", "PLAYFORM", "expression to ordered two-cycle playable loop", "playform/OPEN_FIRST_PLAYFORM_SOVEREIGN_REBUILD_v0_1.html"),
    (5, "jmgamecore", "JM GameCore", "identity-preserving shared runtime services", "wave2/JM_GAMECORE_SOVEREIGN_v0_2.html"),
    (6, "jm-game-native-core", "JM GAME NATIVE CORE", "deterministic fixed-step runtime and target contracts", "wave2/JM_GAME_NATIVE_CORE_v0_2.html"),
    (7, "kading-game-estate-engine", "Kading Game Estate Engine", "Kading source to AST to Game IR runtime", "wave2/KADING_GAME_ESTATE_ENGINE_v0_2.html"),
    (8, "jm-game-engine-console", "JM Game Engine Console", "identity-preserving operator surface", "wave2/JM_GAME_ENGINE_CONSOLE_v0_5.html"),
    (9, "army-federation", "JM Game Engine Army Federation", "seven-stage federation and coding-body trials", "wave2/JM_GAME_ENGINE_ARMY_FEDERATION_v0_2.html"),
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_join(paths: list[str]) -> str:
    return "\n\n".join((ROOT / item).read_text(encoding="utf-8") for item in paths)


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "_", value.upper()).strip("_")


def inject(source: str, engine_id: str, name: str, role: str, package_id: str, css: str, javascript: str) -> str:
    if "</head>" not in source.lower() or "</body>" not in source.lower():
        raise ValueError(f"{engine_id}: base HTML is missing head/body terminators")
    source = re.sub(r"<html(?![^>]*data-jmvc-engine)", f'<html data-jmvc-engine="{engine_id}"', source, count=1, flags=re.I)
    source = re.sub(r"<title>(.*?)</title>", lambda m: f"<title>{m.group(1)} · Visual Campaign v0.3</title>", source, count=1, flags=re.I | re.S)
    meta = (
        f'<meta name="jmvc-engine" content="{html.escape(engine_id)}">\n'
        f'<meta name="jmvc-package" content="{html.escape(package_id)}">\n'
        f'<style id="jmvc-visual-campaign-css">\n{css}\n</style>\n'
    )
    boot = json.dumps({"id": engine_id, "name": name, "role": role, "package": package_id}, separators=(",", ":")).replace("<", "\\u003c")
    runtime = f'<script id="jmvc-visual-campaign-runtime">\nwindow.__JMVC_BOOT__={boot};\n{javascript}\n</script>\n'
    source = re.sub(r"</head>", meta + "</head>", source, count=1, flags=re.I)
    source = re.sub(r"</body>", runtime + "</body>", source, count=1, flags=re.I)
    return source


def launcher_document(engines: list[dict[str, object]], documents: dict[str, str]) -> str:
    embedded = json.dumps(documents, ensure_ascii=False, separators=(",", ":")).replace("</script>", "<\\/script>")
    cards = "".join(
        f'<button class="engine-card" data-engine="{e["id"]}"><span>{e["ordinal"]:02d}</span><b>{html.escape(str(e["name"]))}</b><small>{html.escape(str(e["role"]))}</small><code>{str(e["sha256"])[:12]}</code></button>'
        for e in engines
    )
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#05080f"><title>JM Game Engine Army — Visual Campaign v0.3</title><style>
:root{{--bg:#04070d;--panel:#0b1521;--line:#263d55;--ink:#f8fbff;--mut:#9bb0c2;--gold:#ffd166;--cyan:#64eaff}}*{{box-sizing:border-box}}html,body{{margin:0;height:100%;overflow:hidden;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}}body{{display:grid;grid-template-rows:auto auto 1fr}}header{{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(9px,env(safe-area-inset-top)) 12px 9px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,#10263a,#060b12)}}h1{{margin:0;color:var(--gold);font-size:clamp(1rem,2.3vw,1.4rem)}}header small{{display:block;color:var(--mut)}}.actions{{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}}button,input{{font:inherit}}button{{cursor:pointer}}.actions button,.bar button{{min-height:40px;border:1px solid var(--line);border-radius:11px;background:#112336;color:var(--ink);padding:7px 10px}}.rail{{display:flex;gap:7px;overflow:auto;padding:8px;border-bottom:1px solid var(--line);scroll-snap-type:x mandatory;background:#06101a}}.engine-card{{min-width:210px;max-width:210px;min-height:94px;text-align:left;border:1px solid var(--line);border-radius:15px;background:linear-gradient(150deg,#112438,#09131f);color:var(--ink);padding:10px;scroll-snap-align:start}}.engine-card.active{{border-color:var(--cyan);box-shadow:0 0 0 2px #64eaff33}}.engine-card span{{float:right;color:var(--gold);font-weight:900}}.engine-card b,.engine-card small,.engine-card code{{display:block}}.engine-card small,.engine-card code{{color:var(--mut);font-size:.7rem;margin-top:6px}}main{{min-height:0;display:grid;grid-template-rows:auto 1fr}}.bar{{display:flex;align-items:center;gap:7px;padding:7px 10px;border-bottom:1px solid var(--line);background:#08131e}}.bar b{{color:var(--cyan)}}.bar .spacer{{margin-left:auto}}iframe{{width:100%;height:100%;border:0;background:#05080f}}.empty{{display:grid;place-items:center;height:100%;color:var(--mut)}}@media(max-width:700px){{header small{{display:none}}.actions button:nth-child(3){{display:none}}.engine-card{{min-width:176px;max-width:176px;min-height:86px}}.bar span{{display:none}}}}
</style></head><body><header><div><h1>JM Game Engine Army — Visual Campaign v0.3</h1><small>Nine sovereign browser bodies · one portable direct-file launcher · all add-ons embedded</small></div><div class="actions"><button id="download">Download selected</button><button id="newtab">Open separately</button><button id="receipt">Campaign receipt</button></div></header><nav class="rail">{cards}</nav><main><div class="bar"><b id="name">Select an engine</b><span id="role"></span><span class="spacer"></span><button id="reload">Reload body</button></div><iframe id="view" title="JM engine body"></iframe></main><script>
const DOCS={embedded};const META={json.dumps({e['id']:{'name':e['name'],'role':e['role'],'sha256':e['sha256']} for e in engines}, ensure_ascii=False).replace('</script>','<\\/script>')};const cards=[...document.querySelectorAll('.engine-card')],view=document.querySelector('#view'),nameEl=document.querySelector('#name'),roleEl=document.querySelector('#role');let current=null,url=null;function mount(id){{current=id;cards.forEach(c=>c.classList.toggle('active',c.dataset.engine===id));if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([DOCS[id]],{{type:'text/html'}}));view.src=url;nameEl.textContent=META[id].name;roleEl.textContent='· '+META[id].role}}cards.forEach(c=>c.onclick=()=>mount(c.dataset.engine));document.querySelector('#newtab').onclick=()=>current&&open(url,'_blank');document.querySelector('#reload').onclick=()=>current&&mount(current);document.querySelector('#download').onclick=()=>{{if(!current)return;const a=document.createElement('a'),u=URL.createObjectURL(new Blob([DOCS[current]],{{type:'text/html'}}));a.href=u;a.download=current.toUpperCase().replace(/[^A-Z0-9]+/g,'_')+'_VISUAL_v0_3.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}};document.querySelector('#receipt').onclick=()=>{{const data={{schema:'jm.game-engine-army.visual-campaign/0.3',engines:META,selected:current,claimBoundary:'Browser visual/package floor. Device certification and final crowns remain open.'}},a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{{type:'application/json'}}));a.href=u;a.download='JM_GAME_ENGINE_ARMY_VISUAL_CAMPAIGN_RECEIPT_v0_3.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}};mount(cards[0].dataset.engine);
</script></body></html>'''


def pwa_index(engines: list[dict[str, object]]) -> str:
    cards = "".join(
        f'<a class="card" href="engines/{e["file"]}"><span>{e["ordinal"]:02d}</span><b>{html.escape(str(e["name"]))}</b><small>{html.escape(str(e["role"]))}</small></a>'
        for e in engines
    )
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#05080f"><link rel="manifest" href="manifest.webmanifest"><title>JM Game Engine Army Visual Campaign</title><style>*{{box-sizing:border-box}}html,body{{margin:0;min-height:100%;background:#05080f;color:#f7fbff;font-family:system-ui}}main{{max-width:1100px;margin:auto;padding:18px}}h1{{color:#ffd166}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}}.card{{min-height:120px;border:1px solid #2b455d;border-radius:18px;background:linear-gradient(145deg,#12253a,#09131f);color:#fff;padding:14px;text-decoration:none}}.card span{{float:right;color:#ffd166;font-weight:900}}.card b,.card small{{display:block}}.card small{{color:#9fb4c7;margin-top:8px}}p{{color:#a9bfd1}}</style></head><body><main><h1>JM Game Engine Army — Visual Campaign v0.3</h1><p>Installable HTTP/HTTPS package. For direct phone storage, use the portable single-file launcher instead.</p><div class="grid">{cards}</div></main><script>if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');</script></body></html>'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    base = args.base_root.resolve()
    out = args.out.resolve()
    if out.exists():
        shutil.rmtree(out)
    (out / "engines").mkdir(parents=True)
    (out / "packages").mkdir()
    (out / "editable-source").mkdir()
    (out / "pwa" / "engines").mkdir(parents=True)
    (out / "pwa" / "icons").mkdir()

    css = read_join(STYLE_ORDER)
    javascript = read_join(SCRIPT_ORDER)
    addon_registry = json.loads((ROOT / "ADDON_REGISTRY.json").read_text(encoding="utf-8"))
    engine_receipts: list[dict[str, object]] = []
    documents: dict[str, str] = {}

    for ordinal, engine_id, name, role, relative in SPECS:
        source_path = base / relative
        if not source_path.is_file():
            raise FileNotFoundError(f"missing base engine {engine_id}: {source_path}")
        source = source_path.read_text(encoding="utf-8")
        package_id = f"jm.game-engine-army.{engine_id}.visual/0.3"
        document = inject(source, engine_id, name, role, package_id, css, javascript)
        filename = f"{ordinal:02d}_{safe_name(name)}_VISUAL_v0_3.html"
        data = document.encode("utf-8")
        (out / "engines" / filename).write_bytes(data)
        shutil.copy2(out / "engines" / filename, out / "pwa" / "engines" / filename)
        package_dir = out / "packages" / engine_id
        package_dir.mkdir()
        package_file = package_dir / f"OPEN_FIRST_{safe_name(name)}_VISUAL_v0_3.html"
        package_file.write_bytes(data)
        package_meta = {
            "schema": "jm.game-engine-army.visual-package/0.3",
            "id": engine_id,
            "name": name,
            "role": role,
            "file": package_file.name,
            "bytes": len(data),
            "sha256": sha(data),
            "addons": [item["id"] for item in addon_registry["addons"]],
            "claimBoundary": "Visual and packaging first floor; engine simulation remains authoritative.",
        }
        (package_dir / "PACKAGE_RECEIPT.json").write_text(json.dumps(package_meta, indent=2) + "\n", encoding="utf-8")
        (package_dir / "README.md").write_text(f"# {name} Visual Package v0.3\n\nOpen `{package_file.name}` directly in a modern browser.\n", encoding="utf-8")
        engine_receipts.append({"ordinal": ordinal, "id": engine_id, "name": name, "role": role, "file": filename, "bytes": len(data), "sha256": sha(data), "package": str(package_dir.relative_to(out))})
        documents[engine_id] = document

    launcher = launcher_document(engine_receipts, documents)
    launcher_path = out / "OPEN_FIRST_JM_GAME_ENGINE_ARMY_VISUAL_CAMPAIGN_v0_3.html"
    launcher_path.write_text(launcher, encoding="utf-8")
    (out / "ADDON_REGISTRY.json").write_text(json.dumps(addon_registry, indent=2) + "\n", encoding="utf-8")

    for relative in ["README.md", "ADDON_REGISTRY.json", *STYLE_ORDER, *SCRIPT_ORDER, "tools/build_visual_campaign.py", "tools/test_visual_campaign.py", "tools/screenshot_smoke.py"]:
        source = ROOT / relative
        target = out / "editable-source" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    pwa = out / "pwa"
    (pwa / "index.html").write_text(pwa_index(engine_receipts), encoding="utf-8")
    manifest = {
        "name": "JM Game Engine Army Visual Campaign",
        "short_name": "JM Engine Army",
        "start_url": "./index.html",
        "display": "standalone",
        "background_color": "#05080f",
        "theme_color": "#05080f",
        "icons": [{"src": "icons/jm-engine-army.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable"}],
    }
    (pwa / "manifest.webmanifest").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    icon = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#64eaff"/><stop offset=".52" stop-color="#c69cff"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="#05080f"/><path d="M96 142h320v228H96z" fill="none" stroke="url(#g)" stroke-width="28"/><path d="M150 312l78-112 58 76 76-104" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><circle cx="150" cy="312" r="18" fill="#64eaff"/><circle cx="228" cy="200" r="18" fill="#c69cff"/><circle cx="286" cy="276" r="18" fill="#7fffb0"/><circle cx="362" cy="172" r="18" fill="#ffd166"/></svg>'''
    (pwa / "icons" / "jm-engine-army.svg").write_text(icon, encoding="utf-8")
    cache_files = ["./", "./index.html", "./manifest.webmanifest", "./icons/jm-engine-army.svg", *[f"./engines/{e['file']}" for e in engine_receipts]]
    sw = f"const CACHE='jm-engine-army-visual-v03';const FILES={json.dumps(cache_files)};addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));"
    (pwa / "sw.js").write_text(sw, encoding="utf-8")
    (pwa / "PWA_README.md").write_text("# PWA package\n\nServe this directory over HTTP or HTTPS. Service workers do not install from `file://`.\n", encoding="utf-8")

    receipt = {
        "schema": "jm.game-engine-army.visual-campaign/0.3",
        "status": "NINE_VISUAL_PACKAGES_BUILT_DEVICE_CONTACT_AND_FINAL_CROWN_OPEN",
        "engineCount": len(engine_receipts),
        "addonCount": len(addon_registry["addons"]),
        "engines": engine_receipts,
        "portableLauncher": {"file": launcher_path.name, "bytes": launcher_path.stat().st_size, "sha256": sha(launcher_path.read_bytes())},
        "pwa": {"entry": "pwa/index.html", "cacheFileCount": len(cache_files)},
        "sourceFiles": STYLE_ORDER + SCRIPT_ORDER,
        "claimBoundary": "Strongest current browser visual/package layer. Direct Android profiling, authored art/audio, GPU/WebGL materials, native binaries, sustained projects and final crowns remain open.",
    }
    receipt["receiptSha256"] = sha(json.dumps(receipt, sort_keys=True, separators=(",", ":")).encode("utf-8"))
    (out / "VISUAL_CAMPAIGN_RECEIPT.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    lines = []
    for path in sorted(p for p in out.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt"):
        lines.append(f"{sha(path.read_bytes())}  {path.relative_to(out).as_posix()}")
    (out / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
