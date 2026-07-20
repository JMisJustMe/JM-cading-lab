from __future__ import annotations

import json
import re
from pathlib import Path

INDEX = Path("navigator/index.html")
STRINGLINE = Path("navigator/stringline.json")


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    a = text.find(start)
    if a < 0:
        raise SystemExit(f"Missing start marker: {start}")
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f"Missing end marker: {end}")
    return text[:a] + replacement + text[b:]


body = INDEX.read_text(encoding="utf-8")

body = body.replace(
    "<title>JM3232 Navigator — JM Stringline</title>",
    "<title>JM3232 Navigator v0.1.1 — JM Stringline</title>",
)
body = body.replace(
    '<strong>JM3232 Navigator v0.1</strong><div class="meta">First executable Stringline shell</div>',
    '<strong>JM3232 Navigator v0.1.1</strong><div class="meta">Proof, migration and navigation pass</div>',
)

living = "{name:'Living Estate',note:'Canonical independent public house',route:'../',internal:true},"
apps = "{name:'Non-Game Apps House',note:'All registered non-game apps through one public door',route:'../apps/',internal:true},"
if "name:'Non-Game Apps House'" not in body:
    if living not in body:
        raise SystemExit("Living Estate door marker is missing.")
    body = body.replace(living, living + apps, 1)

body = body.replace(
    "activeTab:'home',history:[],bookmarks:doors.slice(0,4)",
    "activeTab:'home',trail:['home'],history:[],bookmarks:doors.slice(0,5)",
    1,
)
if "nav.trail=Array.isArray(nav.trail)" not in body:
    compact = "let nav=load(KEYS.state,defaultNav),receipts="
    expanded = "let nav=load(KEYS.state,defaultNav);"
    init = "nav.trail=Array.isArray(nav.trail)&&nav.trail.length?nav.trail:[nav.activeTab||'home'];"
    if compact in body:
        body = body.replace(compact, f"let nav=load(KEYS.state,defaultNav);{init}let receipts=", 1)
    elif expanded in body:
        body = body.replace(expanded, expanded + init, 1)
    else:
        raise SystemExit("Navigator state initialization marker is missing.")

body = body.replace(
    "home:'../',estate:'../',theory:'../theory/'",
    "home:'../',estate:'../',apps:'../apps/',tools:'../apps/',theory:'../theory/'",
    1,
)

routing = """function rememberTab(id){nav.trail=Array.isArray(nav.trail)?nav.trail:[];if(nav.trail.at(-1)!==id)nav.trail.push(id);nav.trail=nav.trail.slice(-80)}
function openRoute(raw,title){const parsed=normalizeInput(raw);if(parsed.kind==='empty')return;if(parsed.kind==='command'&&parsed.value==='jm://stringline'){showView('stringline',true);return}const url=parsed.value,internal=isInternal(url),tab={id:uid('tab'),title:titleFor(url,title||parsed.title),url,internal,openedAt:now()};nav.tabs.push(tab);nav.activeTab=tab.id;rememberTab(tab.id);nav.history.unshift({id:uid('history'),title:tab.title,url,internal,at:now()});nav.history=nav.history.slice(0,250);persist();renderAll();receipt('OPEN_ROUTE',`${tab.title} → ${url}`,tab.id);if(internal){$('#previewFrame').src=url;$('#previewNote').innerHTML=`Viewing an internal Estate route: <code>${esc(url)}</code>`;showView('preview',true)}else{const opened=window.open(url,'_blank','noopener,noreferrer');showView('home',true);toast(opened?'Opened through device browser; route retained.':'Pop-up blocked. Tap Go again or allow new tabs.')}}
function activateTab(id,track=true){const tab=nav.tabs.find(t=>t.id===id);if(!tab)return;nav.activeTab=id;if(track)rememberTab(id);persist();renderTabs();if(tab.url==='jm://home'){showView('home',true);return}if(tab.internal){$('#previewFrame').src=tab.url;showView('preview',true)}else{showView('home',true);toast('External route retained. Tap its tab again to reopen.');if(track)window.open(tab.url,'_blank','noopener,noreferrer')}}
function goBack(){nav.trail=Array.isArray(nav.trail)?nav.trail:[];while(nav.trail.length&&nav.trail.at(-1)===nav.activeTab)nav.trail.pop();let id;while(nav.trail.length&&!nav.tabs.some(t=>t.id===(id=nav.trail.at(-1))))nav.trail.pop();activateTab(id||'home',false)}
function closeTab(id){const i=nav.tabs.findIndex(t=>t.id===id);if(i<0||nav.tabs.length===1)return;nav.tabs.splice(i,1);nav.trail=(nav.trail||[]).filter(x=>x!==id);if(nav.activeTab===id){nav.activeTab=nav.tabs[Math.max(0,i-1)].id;rememberTab(nav.activeTab)}persist();renderTabs();receipt('CLOSE_TAB',id,id)}
"""
body = replace_between(body, "function openRoute(raw,title){", "function addBookmark(title,url){", routing)

views = """function showView(name,reset=false){const target=$('#view-'+name);document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v===target));document.querySelectorAll('.navbtn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===(name==='preview'?'home':name)));if(reset&&target)target.scrollTop=0;if(name==='stringline')renderStringline();if(name==='history')renderHistory();if(name==='bookmarks')renderBookmarks();if(name==='receipts')renderReceipts()}
"""
body = replace_between(body, "function showView(", "function renderTabs(){", views)

body = body.replace(
    "nav.tabs.push(tab);nav.activeTab=tab.id;persist();renderTabs();showView('home');$('#addressInput').focus()",
    "nav.tabs.push(tab);nav.activeTab=tab.id;rememberTab(tab.id);persist();renderTabs();showView('home',true);$('#addressInput').focus()",
    1,
)

hydrate = """async function hydrateStringline(){const local=load(KEYS.stringline,null);try{const res=await fetch('./stringline.json',{cache:'no-store'});if(!res.ok)throw new Error('seed unavailable');const seed=await res.json(),mergeBodies=(official=[],owned=[])=>{const map=new Map(official.map(b=>[b.id,b]));owned.forEach(b=>map.set(b.id||b.name,{...(map.get(b.id)||{}),...b}));return[...map.values()]},official=seed.seed_project_strings||[],owned=local?.projects||[],ownedMap=new Map(owned.map(p=>[p.id,p]));const projects=official.map(p=>{const prior=ownedMap.get(p.id);ownedMap.delete(p.id);return prior?{...prior,...p,bodies:mergeBodies(p.bodies,prior.bodies)}:p});projects.push(...ownedMap.values());const changed=local?.seedVersion!==seed.version;stringline={projects,lifecycle:[...new Set([...(seed.lifecycle_states||[]),...(local?.lifecycle||[])])],seedVersion:seed.version};persist();renderAll();receipt(local?.projects?.length?(changed?'STRINGLINE_SEED_MERGE':'STRINGLINE_REENTRY'):'STRINGLINE_IGNITION',local?.projects?.length?(changed?`Merged ${seed.version} without erasing local bodies.`:'Restored local Stringline body.'):`Loaded ${seed.version}.`)}catch{stringline=local?.projects?.length?local:{projects:[],lifecycle:stringline.lifecycle};renderAll();toast('Stringline seed could not load; preserved local body remains available.')}}
"""
body = replace_between(body, "async function hydrateStringline(){", "$('#addressForm').onsubmit", hydrate)

body = re.sub(
    r"\$\('#backBtn'\)\.onclick=.*?;document\.querySelectorAll\('\.navbtn\[data-view\]'\)\.forEach\(b=>b\.onclick=\(\)=>showView\(b\.dataset\.view\)\);",
    "$('#backBtn').onclick=goBack;document.querySelectorAll('.navbtn[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view,true));",
    body,
    count=1,
)

required = [
    "JM3232 Navigator v0.1.1",
    "Non-Game Apps House",
    "function goBack()",
    "STRINGLINE_SEED_MERGE",
    "apps:'../apps/'",
]
missing = [item for item in required if item not in body]
if missing:
    raise SystemExit(f"v0.1.1 transform incomplete: {missing}")
INDEX.write_text(body, encoding="utf-8")

seed = json.loads(STRINGLINE.read_text(encoding="utf-8"))
seed["version"] = "v0.1.1 proof and migration seed"
projects = seed.setdefault("seed_project_strings", [])
if not any(project.get("id") == "non-game-apps" for project in projects):
    apps_project = {
        "id": "non-game-apps",
        "name": "Non-Game Apps",
        "headChat": "Non-game Apps Organization",
        "headRecord": "Non-Game Apps House Record",
        "status": "STANDING",
        "keeper": "All the apps share one front door while their bodies remain sovereign.",
        "bodies": [
            {
                "id": "apps-house",
                "name": "Non-Game Apps House",
                "type": "App estate",
                "role": "Public-safe catalogue and corridor for registered non-game apps",
                "status": "PROVEN",
                "route": "../apps/",
            }
        ],
    }
    theory_index = next((i for i, project in enumerate(projects) if project.get("id") == "theory"), len(projects))
    projects.insert(theory_index, apps_project)
STRINGLINE.write_text(json.dumps(seed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print("JM3232 Navigator v0.1.1 transform complete.")
