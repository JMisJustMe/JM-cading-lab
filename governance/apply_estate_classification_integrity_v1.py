from __future__ import annotations

import json
import re
from pathlib import Path

APPS_PATH = Path("apps/index.html")
GAMES_INDEX_PATH = Path("games-beyond/index.html")
GAMES_APP_PATH = Path("games-beyond/app.js")
GAMES_MANIFEST_PATH = Path("games-beyond/payload-manifest.json")
STRINGLINE_PATH = Path("navigator/stringline.json")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f"Missing {label} marker")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Non-Game Apps House: remove RouteOS from the literal app count and repair
# stale/collapsed authority cards without erasing legitimate parallel branches.
# ---------------------------------------------------------------------------
apps_html = APPS_PATH.read_text(encoding="utf-8")
match = re.search(r"const APPS=(\[.*?\]);\s*const LABELS=", apps_html, re.S)
if not match:
    raise SystemExit("Could not locate the Non-Game Apps APPS registry")
apps = json.loads(match.group(1))

file_family_done = False
estate_family_done = False
jmstudios_done = False
corrected = []

for row in apps:
    name, version, category, status = row

    if name == "RouteOS":
        continue

    if name in {"JM File Grabber / FLL BenefitMerge", "JM File Grabber", "BenefitMerge"}:
        if not file_family_done:
            corrected.extend([
                ["JM File Grabber", "Android Intake / FLL Contact Body", "Estate & Recovery", "full_current"],
                ["BenefitMerge", "v0.1 Android proof · READ 316/985", "Builders, Recovery & Delivery", "full_current"],
                ["BenefitMerge", "v0.2 PWA build · installation pending", "Builders, Recovery & Delivery", "full_current"],
            ])
            file_family_done = True
        continue

    if name == "JM Zionfolder OS":
        corrected.append(["JM Zionfolder OS", "v1.1.1 Scroll Spine Fix", "Estate & Recovery", "full_current"])
        continue

    if name in {"JM Estate OS / TBS Command Shell", "Altogether Assembly / JM Estate OS", "JM Estate OS", "Command Register / Command Panel"}:
        if not estate_family_done:
            corrected.extend([
                ["Altogether Assembly / JM Estate OS", "v2.0.2 Assembly Crown", "Operating Houses", "full_current"],
                ["JM Estate OS", "v0.2.1 TBS Delta 002 · active additive carrier", "Operating Houses", "full_current"],
                ["Command Register / Command Panel", "v0.1 Working Command Surface", "Registers & Governance", "routed"],
            ])
            estate_family_done = True
        continue

    if name.startswith("JMStudios"):
        if not jmstudios_done:
            corrected.append(["JMStudios", "B0.8.2 source anchor · B0.8.3 continuation", "Operating Houses", "routed"])
            jmstudios_done = True
        continue

    if name == "FTR / Ama-Pro / GripRoute Visual Representation Engine":
        corrected.append([
            "FTR / Ama-Pro / GripRoute Adaptive Interaction Engine",
            "v1.1 · Ama-Pro native gaming route",
            "FTR / Devices & Adaptive Interaction",
            "full_current",
        ])
        continue

    corrected.append(row)

if not file_family_done:
    corrected[4:4] = [
        ["JM File Grabber", "Android Intake / FLL Contact Body", "Estate & Recovery", "full_current"],
        ["BenefitMerge", "v0.1 Android proof · READ 316/985", "Builders, Recovery & Delivery", "full_current"],
        ["BenefitMerge", "v0.2 PWA build · installation pending", "Builders, Recovery & Delivery", "full_current"],
    ]
if not estate_family_done:
    corrected[10:10] = [
        ["Altogether Assembly / JM Estate OS", "v2.0.2 Assembly Crown", "Operating Houses", "full_current"],
        ["JM Estate OS", "v0.2.1 TBS Delta 002 · active additive carrier", "Operating Houses", "full_current"],
        ["Command Register / Command Panel", "v0.1 Working Command Surface", "Registers & Governance", "routed"],
    ]
if not jmstudios_done:
    corrected.insert(12, ["JMStudios", "B0.8.2 source anchor · B0.8.3 continuation", "Operating Houses", "routed"])

apps_json = json.dumps(corrected, ensure_ascii=False, separators=(",", ":"))
apps_html = apps_html[: match.start(1)] + apps_json + apps_html[match.end(1) :]
room_count = len(corrected)

apps_html = re.sub(
    r"Whole-Estate public door · \d+(?: non-game)? rooms · 0 games(?: · RouteOS flagship bridged)?",
    f"Whole-Estate public door · {room_count} non-game rooms · RouteOS flagship bridged",
    apps_html,
    count=1,
)
apps_html = re.sub(
    r'<div class="stat"><b>\d+</b><span>registered app rooms</span></div>',
    f'<div class="stat"><b>{room_count}</b><span>registered non-game rooms</span></div>',
    apps_html,
    count=1,
)
apps_html = re.sub(
    r'const FILTERS=\[\["all","All \d+"\]',
    f'const FILTERS=[["all","All {room_count}"]',
    apps_html,
    count=1,
)

if ".flagship{" not in apps_html:
    apps_html = apps_html.replace(
        ".controls{position:sticky",
        ".flagship{margin:14px 0;border:1px solid #69e3d966;background:#0f2527;border-radius:19px;padding:16px}.flagship b{display:block;color:var(--cyan);font-size:1.08rem}.flagship p{margin:6px 0 12px;color:var(--muted)}.flagship a{display:inline-flex;text-decoration:none;background:var(--cyan);color:#071317;border-radius:11px;padding:10px 12px;font-weight:950}.controls{position:sticky",
        1,
    )

bridge = '<section class="flagship"><b>RouteOS has returned to its sovereign gaming-platform seat.</b><p>It is no longer counted as an ordinary non-game app. This is a governed bridge into the RouteOS console-platform, cartridge-standard and First-Party SDK room.</p><a href="https://jmisjustme.github.io/JM-cading-lab/games-beyond/routeos/">Enter RouteOS flagship room →</a></section>'
if "RouteOS has returned to its sovereign gaming-platform seat" not in apps_html:
    apps_html = apps_html.replace(
        '<section class="controls">',
        bridge + '<section class="controls">',
        1,
    )

route_for = '''function routeFor(a){const n=a[0],c=a[2];if(n==="JMStudios")return["https://jmisjustme.github.io/JM-cading-lab/games-beyond/","Enter Games&Beyond source route"];if(c==="FTR / Devices & Adaptive Interaction")return["/recovery/","Enter FTR source/recovery gate"];if(c==="Builders, Recovery & Delivery")return["/recovery/","Enter delivery/recovery gate"];if(c==="Lyrics & Language")return["/lyrics/","Enter Lyrics House"];if(c==="Theory & Books")return["/theory/","Enter Theory corridor"];if(c==="Coding & Proof")return["https://jmisjustme.github.io/JM-cading-lab/coding-estate/integration/00_OPEN_FIRST.html","Open Coding Estate"];if(c==="Estate & Recovery"||c==="Registers & Governance"||n==="FLL / CraftikBridge")return["/recovery/","Enter Recovery Gate"];if(c==="Operating Houses")return["/","Return to Living Estate"];return["",""]}'''
apps_html = re.sub(r"function routeFor\(a\)\{.*?\}(?=\n?function render\(\))", route_for, apps_html, count=1, flags=re.S)
APPS_PATH.write_text(apps_html, encoding="utf-8")

# ---------------------------------------------------------------------------
# Games&Beyond: mount the sovereign RouteOS room as a built-in gaming-system
# body and update the visible counts without altering protected payload source.
# ---------------------------------------------------------------------------
manifest = json.loads(GAMES_MANIFEST_PATH.read_text(encoding="utf-8"))
routeos_body = {
    "id": "routeos-platform",
    "name": "RouteOS",
    "version": "v103 → v108A.5 Evidence Ladder",
    "category": "Gaming Systems & Console Platforms",
    "role": "JM gaming platform, console OS, cartridge ecosystem and First-Party SDK",
    "stage": "GOVERNING FLAGSHIP ROOM",
    "path": "routeos/index.html",
    "sourceStatus": "Governing evidence/navigation room. v103 documented anchor, v108A.0 mounted body and v108A.5 validation are preserved without claiming an unreconfirmed complete v108A.5 playable keeper.",
}
extras = [body for body in manifest.get("extraBodies", []) if body.get("id") != "routeos-platform"]
extras.append(routeos_body)
manifest["extraBodies"] = extras
ids = [body_id for body_id in manifest.get("bodyIdsBuiltIn", []) if body_id != "routeos-platform"]
ids.append("routeos-platform")
manifest["bodyIdsBuiltIn"] = ids
manifest["builtInBodyCount"] = manifest.get("payloadBodyCount", 0) + len(extras)
manifest["bodyCount"] = manifest["builtInBodyCount"]
manifest["fullTargetCount"] = manifest["builtInBodyCount"] + len(manifest.get("fullImportAdds", []))
manifest["release"] = "0.5.1-classification-integrity"
manifest["mountBoundary"] = (
    f"{manifest['builtInBodyCount']} bodies are built into the public route, including the sovereign RouteOS gaming-platform room. "
    f"Importing the supplied Eco/Estate full-house JSON adds the {len(manifest.get('fullImportAdds', []))} exact JMStudios roles, producing the complete {manifest['fullTargetCount']}-body local House."
)
GAMES_MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

games_index = GAMES_INDEX_PATH.read_text(encoding="utf-8")
games_index = games_index.replace("twenty-three sovereign mounted rooms", f"{manifest['fullTargetCount']} sovereign mounted rooms")
games_index = games_index.replace("Accessible Full House v0.5", "Accessible Full House v0.5.1")
games_index = re.sub(r"Accessible House v0\.5 · \d+ built-in · \d+ full", f"Accessible House v0.5.1 · {manifest['builtInBodyCount']} built-in · {manifest['fullTargetCount']} full", games_index, count=1)
games_index = re.sub(r"Twenty-one exact bodies enter directly through the public route\. Import the supplied Eco/Estate full-house backup to add the two exact JMStudios roles and complete the twenty-three-body House\.", f"{manifest['builtInBodyCount']} exact bodies enter directly through the public route, including the sovereign RouteOS flagship room. Import the supplied Eco/Estate full-house backup to add the two exact JMStudios roles and complete the {manifest['fullTargetCount']}-body House.", games_index, count=1)
if 'href="routeos/"' not in games_index:
    games_index = games_index.replace(
        '<div class="heroActions">',
        '<div class="heroActions"><a class="btn green" href="routeos/">ROUTEOS FLAGSHIP</a>',
        1,
    )
GAMES_INDEX_PATH.write_text(games_index, encoding="utf-8")

games_app = GAMES_APP_PATH.read_text(encoding="utf-8")
games_app = games_app.replace("RELEASE='0.5.0'", "RELEASE='0.5.1-classification-integrity'")
GAMES_APP_PATH.write_text(games_app, encoding="utf-8")

# ---------------------------------------------------------------------------
# JM Stringline: establish separate project strings instead of a collapsed
# Coding/OS bucket, while retaining the existing project ID for local merges.
# ---------------------------------------------------------------------------
stringline = json.loads(STRINGLINE_PATH.read_text(encoding="utf-8"))
stringline["version"] = "v0.1.2 classification-integrity seed"
line = "A body may serve many houses. It keeps one governing identity unless JM deliberately changes it."
if line not in stringline.get("governing_lines", []):
    stringline.setdefault("governing_lines", []).append(line)
projects = stringline.get("seed_project_strings", [])
project_map = {project["id"]: project for project in projects}

games = project_map.get("games-beyond")
if games:
    games["status"] = "STANDING"
    games["keeper"] = "One front door. Many sovereign game rooms. Platform bodies keep their governing achievement."
    games_bodies = [body for body in games.get("bodies", []) if body.get("id") != "routeos-platform"]
    games_bodies.append({
        "id": "routeos-platform",
        "name": "RouteOS",
        "type": "Gaming platform / console OS / cartridge ecosystem",
        "role": "Flagship JM console-platform body with cartridge standard and First-Party SDK",
        "status": "MOUNTED",
        "route": "https://jmisjustme.github.io/JM-cading-lab/games-beyond/routeos/",
    })
    games["bodies"] = games_bodies

coding = project_map.get("coding-os")
if coding:
    coding["name"] = "Coding Estate"
    coding["headChat"] = "Coding Estate Project Head"
    coding["headRecord"] = "JM Coding Estate Current-Best Record"
    coding["keeper"] = "Use my actual coding bodies every single time. Hosting does not swallow identity."
    coding["status"] = "THREADING"
    coding["bodies"] = [
        {
            "id": "coding-estate-public",
            "name": "JM Coding Estate",
            "type": "Coding house / runtimes / compilers",
            "role": "Public coding-estate integration route",
            "status": "STANDING",
            "route": "https://jmisjustme.github.io/JM-cading-lab/coding-estate/integration/00_OPEN_FIRST.html",
        },
        {
            "id": "gold-mode-coding-hub",
            "name": "Gold Mode Coding Hub",
            "type": "Coding house",
            "role": "Current public card claims v0.9.4; exact package reconfirmation remains open",
            "status": "THREADING",
        },
    ]

new_projects = {
    "operating-houses": {
        "id": "operating-houses",
        "name": "Operating Houses & Launchers",
        "headChat": "Operating Houses Project Head",
        "headRecord": "Operating Houses Current-Best Map",
        "status": "STANDING",
        "keeper": "Connect does not mean merge. Front room, assembly, creative house and carrier remain separate roles.",
        "bodies": [
            {"id": "multimedia-unit", "name": "JM Estate Multimedia Unit", "type": "Operating front room", "role": "v2.3.0 S³ current operating front-room authority", "status": "PROVEN"},
            {"id": "altogether-estate-os", "name": "Altogether Assembly / JM Estate OS", "type": "Assembly crown", "role": "v2.0.2 search, selection, assembly packets and full-body export", "status": "PROVEN"},
            {"id": "estate-os-delta", "name": "JM Estate OS", "type": "Additive carrier lineage", "role": "v0.2.1 TBS Delta 002 active additive-carrier lineage", "status": "MOUNTED"},
            {"id": "jmstudios", "name": "JMStudios", "type": "Creative house", "role": "B0.8.2 source anchor + B0.8.3 continuation", "status": "MOUNTED"},
        ],
    },
    "recovery-delivery": {
        "id": "recovery-delivery",
        "name": "Builders, Recovery & Delivery",
        "headChat": "Builders and Recovery Project Head",
        "headRecord": "Current-Best and Delivery Register",
        "status": "STANDING",
        "keeper": "A newer version does not automatically own source, device-proof, frozen-anchor and operating crowns.",
        "bodies": [
            {"id": "zionfolder-os", "name": "JM Zionfolder OS", "type": "Workspace OS", "role": "v1.1.1 Scroll Spine Fix frozen/current workspace anchor", "status": "FROZEN"},
            {"id": "benefitmerge-v01", "name": "BenefitMerge", "type": "Device-proven recovery body", "role": "v0.1 Android READ 316/985", "status": "PROVEN"},
            {"id": "benefitmerge-v02", "name": "BenefitMerge", "type": "Newest PWA build", "role": "v0.2 installation pending", "status": "THREADING"},
            {"id": "bodyvault", "name": "BodyVault", "type": "Vault / recovery", "role": "v0.4.2 TRUE NO-INTERPRETER current vault anchor", "status": "FROZEN"},
        ],
    },
    "ftr-devices": {
        "id": "ftr-devices",
        "name": "FTR / Devices & Adaptive Interaction",
        "headChat": "FTR / Ama-Pro Project Head",
        "headRecord": "Adaptive Interaction Infrastructure Record",
        "status": "THREADING",
        "keeper": "GripRoute improves the phone route. Ama-Pro is the native gaming route. AmaCore carries device operating logic.",
        "bodies": [
            {"id": "ftr-griproute", "name": "GripRoute", "type": "Adaptive phone-route infrastructure", "role": "Improves phone control and route contact", "status": "MOUNTED"},
            {"id": "ama-pro", "name": "Ama-Pro", "type": "Native gaming-route device system", "role": "Physical body + software body + route concept", "status": "THREADING"},
            {"id": "amacore", "name": "AmaCore", "type": "OS/device infrastructure", "role": "FTR operating logic and device negotiation core", "status": "THREADING"},
        ],
    },
}
for project_id, project in new_projects.items():
    if project_id in project_map:
        project_map[project_id].update(project)
    else:
        projects.insert(max(0, len(projects) - 1), project)
stringline["seed_project_strings"] = projects
stringline["boundary"] = "This seed powers local-first Stringline navigation and classification authority. Public projections may summarize private bodies, but they may not replace governing identity, source authority or proof-lane distinctions."
STRINGLINE_PATH.write_text(json.dumps(stringline, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print(json.dumps({
    "apps_non_game_rooms": room_count,
    "games_built_in": manifest["builtInBodyCount"],
    "games_full_target": manifest["fullTargetCount"],
    "stringline_version": stringline["version"],
}, indent=2))
