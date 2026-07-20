#!/usr/bin/env python3
"""Mount the current public Estate Head contract into the live web estate.

Idempotent, public-safe, and additive. It reads the current authority contract
rather than hard-coding body counts or private source paths.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] if Path(__file__).resolve().parent.name == "scripts" else Path.cwd()
CONTRACT_PATH = ROOT / "registry" / "estate-head-public-current.json"
MAP_PATH = ROOT / "registry" / "estate-map.json"
APP_PATH = ROOT / "estate-app.js"
INDEX_PATH = ROOT / "index.html"
SW_PATH = ROOT / "sw.js"
RECEIPT_JSON = ROOT / "registry" / "estate-head-public-consumption-receipt.json"
RECEIPT_MD = ROOT / "docs" / "JM_ESTATE_HEAD_PUBLIC_CONSUMPTION_RECEIPT.md"
MARKER = "JM_EST_HEAD_PUBLIC_AUTHORITY_V021"


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"Cannot patch {label}: expected source text is missing")
    return text.replace(old, new, 1)


def upsert_named(rows: list[dict], key: str, value: str, record: dict) -> None:
    for index, row in enumerate(rows):
        if row.get(key) == value:
            rows[index] = {**row, **record}
            return
    rows.append(record)


def contract_summary(contract: dict) -> dict:
    return {
        "schema": contract.get("schema"),
        "version": contract.get("current_public_subset_version"),
        "effective_date": contract.get("effective_date"),
        "authority": contract.get("authority"),
        "body_count": contract.get("body_count"),
        "project_head_count": contract.get("project_head_count"),
        "gap_snapshot": contract.get("gap_snapshot", {}),
        "stringline": contract.get("stringline", {}),
        "source_authority_pipeline": contract.get("source_authority_pipeline", {}),
        "canonical_public_door": contract.get("canonical_public_door"),
        "boundary": contract.get("boundary"),
    }


def validate_contract(contract: dict) -> None:
    required = ["schema", "current_public_subset_version", "authority", "body_count", "project_head_count", "deployment_state", "canonical_public_door", "boundary"]
    missing = [key for key in required if contract.get(key) in (None, "")]
    if missing:
        raise RuntimeError(f"Public authority contract missing required fields: {', '.join(missing)}")
    if "private" not in contract["boundary"].lower():
        raise RuntimeError("Public authority boundary must explicitly preserve private-source separation")


def patch_estate_map(contract: dict) -> None:
    data = load_json(MAP_PATH)
    version = contract["current_public_subset_version"]
    data["public_crown_version"] = "1.3"
    data["status"] = "OWNED_WEB_ESTATE_V1_3_LIVE_WITH_ESTATE_HEAD_AUTHORITY"
    data["active_keeper"] = "JM Estate Head governed Living Front Door"
    data["estate_head_public_authority"] = {**contract_summary(contract), "contract": "registry/estate-head-public-current.json", "consumption_state": "LIVE", "projection_rule": "Public state inherits from the Estate Head contract; sovereign House registries retain domain detail."}
    law = "Estate Head public authority governs public current-state labels"
    laws = data.setdefault("laws", [])
    if law not in laws:
        laws.append(law)

    routes = data.setdefault("live_github_routes", [])
    upsert_named(routes, "body", "JM Estate Head — Public Authority", {"body": "JM Estate Head — Public Authority", "path": "registry/estate-head-public-current.json", "state": f"LIVE_PUBLIC_CONTRACT_{version.replace('.', '_').replace('-', '_').upper()}"})
    upsert_named(routes, "body", "JM Non-Game Apps House", {"body": "JM Non-Game Apps House", "path": "apps/index.html", "state": "LIVE_GOVERNED_APPS_HOUSE"})
    for row in routes:
        body = str(row.get("body", "")).lower()
        if "owned web estate" in body:
            row["state"] = "LIVE_CROWN_ROOT_ESTATE_HEAD_GOVERNED"
        elif "theory multihub" in body:
            row["state"] = "LIVE_FULL_BODY_CORRECTION_37_BODIES_297_CENSUS_ROUTES"
        elif "lyrics" in body or "lyricstudio" in body:
            row["state"] = "LIVE_FIRST_PARTY_LYRICSTUDIO_V0_5_1"
        elif "games&beyond" in body or "games house" in body:
            row["state"] = "LIVE_SOVEREIGN_GAMES_HOUSE"

    departments = data.setdefault("registered_departments", [])
    upsert_named(departments, "body", "Estate Head & Command", {"body": "Estate Head & Command", "state": "PUBLIC_AUTHORITY_LIVE", "route": "registry/estate-head-public-current.json", "current_public_subset_version": version, "body_count": contract["body_count"], "project_head_count": contract["project_head_count"], "boundary": contract["boundary"]})
    upsert_named(departments, "body", "Apps and Tools", {"body": "Apps and Tools", "state": "PUBLIC_GOVERNED_HOUSE_LIVE", "route": "apps/"})
    write_json(MAP_PATH, data)


def patch_app(contract: dict) -> None:
    text = APP_PATH.read_text(encoding="utf-8")
    if MARKER not in text:
        text = replace_once(text, "const [estate,games,theory] = await Promise.allSettled([\n    safeFetch('./registry/estate-map.json'),safeFetch('./games-beyond/registry.json'),safeFetch('./registry/theory-wing.json')\n  ]);", "const [estate,games,theory,authority] = await Promise.allSettled([\n    safeFetch('./registry/estate-map.json'),safeFetch('./games-beyond/registry.json'),safeFetch('./registry/theory-wing.json'),safeFetch('./registry/estate-head-public-current.json')\n  ]);", "Estate Head registry fetch")
        text = replace_once(text, "  if(theory.status==='fulfilled') state.data.theory=theory.value.districts||state.data.theory;\n}", "  if(theory.status==='fulfilled') state.data.theory=theory.value.districts||state.data.theory;\n  if(authority.status==='fulfilled') state.data.estate.publicAuthority=authority.value;\n}\n\n// JM_EST_HEAD_PUBLIC_AUTHORITY_V021\nfunction applyEstateHeadPublicAuthority(){\n  const contract=state.data.estate.publicAuthority;if(!contract)return;\n  const houseRoutes={\n    'games-house':{path:'./games-beyond/',state:'LIVE SOVEREIGN HOUSE'},\n    'coding-house':{path:'./coding-estate/everybody/',state:'CURRENT CANONICAL-NATIVE FABRIC'},\n    'tools-house':{path:'./apps/',state:'LIVE GOVERNED APPS HOUSE'},\n    'theory-house':{path:'./theory/',state:'37 FULL BODIES · 297 CENSUS ROUTES'},\n    'studio-house':{path:'./lyrics/',state:'LYRICSTUDIO v0.5.1 LIVE'}\n  };\n  HOUSES.forEach(h=>{const patch=houseRoutes[h.id];if(patch)Object.assign(h,patch)});\n  const title=document.querySelector('.current-work h3');if(title)title.textContent=`JM Estate Head ${contract.current_public_subset_version} — Live Public Authority`;\n  const copy=document.querySelector('.current-work p');if(copy)copy.textContent=`${contract.body_count} public-contract bodies · ${contract.project_head_count} Project Heads · Stringline ${contract.stringline?.version||'active'} · private source routes remain owner-side.`;\n  document.documentElement.dataset.estateHeadAuthority=contract.current_public_subset_version;\n}\n", "Estate Head authority application")
        text = replace_once(text, "  await loadRegistries();\n  $('#liveRouteCount').textContent=state.data.estate.routes.length;", "  await loadRegistries();applyEstateHeadPublicAuthority();\n  $('#liveRouteCount').textContent=state.data.estate.routes.length;", "Estate Head initialization")
    text = text.replace("schema:'JM.WebEstateReceipt/1.0'", "schema:'JM.WebEstateReceipt/1.3'")
    text = text.replace("estate:{version:'1.0'", "estate:{version:'1.3',publicAuthority:state.data.estate.publicAuthority||null")
    APP_PATH.write_text(text, encoding="utf-8")


def patch_index() -> None:
    text = INDEX_PATH.read_text(encoding="utf-8")
    text = text.replace("GitHub Pages corridor", "Cloudflare canonical door")
    text = text.replace("JM Web Estate v1.1 Accessibility", "JM Estate Head — Live Public Authority")
    text = text.replace("Root front door, estate-wide search, living registries, local owner room, PWA installation, offline shell, receipts, accessible controls and direct access to current public bodies.", "The live Estate now reads its current public authority contract while sovereign Houses retain their own bodies, proofs, designs and boundaries.")
    INDEX_PATH.write_text(text, encoding="utf-8")


def patch_service_worker() -> None:
    text = SW_PATH.read_text(encoding="utf-8")
    text = re.sub(r"const CACHE='jm-web-estate-[^']+';", "const CACHE='jm-web-estate-v1.3.0-estate-head';", text, count=1)
    authority = "'./registry/estate-head-public-current.json'"
    if authority not in text:
        text = text.replace("'./registry/estate-map.json'", "'./registry/estate-map.json'," + authority, 1)
    SW_PATH.write_text(text, encoding="utf-8")


def write_receipts(contract: dict) -> None:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    receipt = {"schema": "JM.EstateHeadPublicConsumptionReceipt/1.0", "generated_at": now, "authority_contract": "registry/estate-head-public-current.json", "authority_snapshot": contract_summary(contract), "consumers": ["registry/estate-map.json", "estate-app.js", "index.html", "sw.js"], "state": "PUBLIC_CONSUMPTION_LIVE_IN_REPOSITORY", "deployment_boundary": "Repository consumption is proven by this receipt. Edge publication must be verified separately against the canonical Cloudflare door."}
    write_json(RECEIPT_JSON, receipt)
    RECEIPT_MD.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT_MD.write_text("# JM Estate Head Public Consumption Receipt\n\n" f"- **Generated:** {now}\n" f"- **Contract:** `{contract['current_public_subset_version']}`\n" f"- **Registered bodies:** {contract['body_count']}\n" f"- **Project Heads:** {contract['project_head_count']}\n" "- **Repository consumers:** `registry/estate-map.json`, `estate-app.js`, `index.html`, `sw.js`\n" "- **State:** PUBLIC CONSUMPTION LIVE IN REPOSITORY\n\n" "> The public website now inherits public current-state authority from the Estate Head contract. Sovereign Houses retain their domain detail; private source routes remain owner-side.\n\n" "## Boundary\n\nThis receipt proves repository integration. Cloudflare edge publication must still be checked after deployment.\n", encoding="utf-8")


def mark_contract_live(contract: dict) -> None:
    contract["deployment_state"] = "PUBLIC_CONSUMPTION_LIVE_IN_REPOSITORY"
    contract["public_consumers"] = ["registry/estate-map.json", "estate-app.js", "index.html", "sw.js"]
    contract["deployment_receipt"] = "registry/estate-head-public-consumption-receipt.json"
    contract["boundary"] = "Public contract only. No private source routes, owner notes, custody paths or raw gap evidence are included. Repository consumption is live; Cloudflare edge publication is claimed only after a separate live-door verification."
    write_json(CONTRACT_PATH, contract)


def main() -> None:
    contract = load_json(CONTRACT_PATH)
    validate_contract(contract)
    patch_estate_map(contract)
    patch_app(contract)
    patch_index()
    patch_service_worker()
    write_receipts(contract)
    mark_contract_live(contract)
    print(json.dumps({"status": "PASS", "contract": contract["current_public_subset_version"], "body_count": contract["body_count"], "project_heads": contract["project_head_count"], "marker": MARKER}))


if __name__ == "__main__":
    main()
