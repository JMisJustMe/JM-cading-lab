from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

APPS = Path("apps/index.html")
THEORY = Path("theory/index.html")
CONTRACT = Path("registry/estate-head-public-current.json")
ESTATE_MAP = Path("registry/estate-map.json")
SOURCE_RECEIPT = Path("registry/public-route-repair-wave-01-source-receipt.json")

NOW = datetime.now(timezone.utc).isoformat()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"{label}: expected source marker not found")
    return text.replace(old, new, 1)


def parse_apps(text: str) -> tuple[list[list[str]], dict[str, int]]:
    rows_match = re.search(r"const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=", text, re.S)
    stats_match = re.search(r"const APP_STAT_COUNTS=(\{.*?\});", text, re.S)
    if not rows_match or not stats_match:
        raise SystemExit("Apps registry or embedded count receipt is unreadable")
    return json.loads(rows_match.group(1)), json.loads(stats_match.group(1))


def validate_apps(text: str) -> dict[str, object]:
    rows, shown = parse_apps(text)
    counts = Counter(row[3] for row in rows)
    expected = {
        "room_count": len(rows),
        "full_plus_preserved": counts["full_current"] + counts["full_alt"],
        "routed": counts["routed"],
        "source_needed": counts["registered"],
        "preparation": counts["prep"],
    }
    if shown != expected:
        raise SystemExit(f"Apps count receipt mismatch: {shown} != {expected}")
    if len(rows) != 44:
        raise SystemExit(f"Apps room count changed unexpectedly: {len(rows)}")
    if any(row[0] == "RouteOS" for row in rows):
        raise SystemExit("RouteOS has regressed into the literal Non-Game Apps registry")

    money = [row for row in rows if row[0] == "JM Money Menu"]
    if len(money) != 1 or "242-route v1.1" not in money[0][1] or "public contact v1.2" not in money[0][1]:
        raise SystemExit(f"Money Menu current-head reconciliation failed: {money}")

    theory = [row for row in rows if row[0] == "JM Theory Multihub"]
    if not any("v0.20.1 Source-Body Integrity" in row[1] for row in theory):
        raise SystemExit("Theory v0.20.1 public head is not represented in Apps House")

    required = [
        "RouteOS has returned to its sovereign gaming-platform seat",
        'if(n==="JM Money Menu")return["/money-menu/","Open live Money Menu"]',
        'schema:"JM.NonGameAppsPublicRegistry/1.1"',
        'data-public-route-wave="01"',
    ]
    missing = [marker for marker in required if marker not in text]
    if missing:
        raise SystemExit(f"Apps Wave 01 markers missing: {missing}")

    return {
        "rooms": len(rows),
        "status_counts": dict(sorted(counts.items())),
        "embedded_stat_receipt": shown,
        "money_menu_current": money[0][1],
        "theory_current": next(row[1] for row in theory if "v0.20.1" in row[1]),
    }


def validate_theory(text: str) -> dict[str, object]:
    required = [
        "JM Theory Multihub v0.20.1 — Source-Body Integrity over v0.19 Reconciled Shell",
        "v0.20.1 integrity layer · v0.19 reconciled shell",
        'data-public-route-wave="01"',
        "../estate-head-public-consumer.js?v=2101",
    ]
    missing = [marker for marker in required if marker not in text]
    if missing:
        raise SystemExit(f"Theory Wave 01 markers missing: {missing}")

    consumer = Path("estate-head-public-consumer.js").read_text(encoding="utf-8")
    integrity = Path("theory/source-body-integrity-v12.js").read_text(encoding="utf-8")
    audit = json.loads(
        Path("theory/data/source-body-integrity/v0_20-audit.json").read_text(encoding="utf-8")
    )

    if "source-body-integrity-v12.js?v=2001" not in consumer:
        raise SystemExit("Estate Head consumer no longer loads Theory source-body integrity v12")
    if "const V='v0.20.1',FULL=18,DRAFTS=24" not in integrity:
        raise SystemExit("Theory integrity body no longer declares v0.20.1 / 18 / 24")

    tests = audit.get("integrity_tests", {})
    result = audit.get("result", {})
    if audit.get("audit_id") != "JM_THEORY_SOURCE_BODY_INTEGRITY_v0_20_1":
        raise SystemExit("Theory audit identity mismatch")
    if result.get("correct_source_bodies_located") != 37:
        raise SystemExit("Theory 37/37 source-body proof is not present")
    if tests.get("unique_stable_ids") != 37 or tests.get("unique_sha256_body_hashes") != 37:
        raise SystemExit("Theory stable-ID/hash integrity proof is incomplete")

    return {
        "shell": "v0.19 reconciled shell",
        "integrity_head": "v0.20.1",
        "full_bodies": 18,
        "source_bodies": 37,
        "publication_drafts": 24,
        "census_routes": result.get("decoded_census_routes"),
        "minimum_body_characters": tests.get("minimum_body_characters"),
    }


def update_route_contract(contract: dict[str, object], candidate: bool) -> None:
    contract["current_public_subset_version"] = "v0.3.1"
    contract["effective_date"] = "2026-08-06"
    contract["deployment_state"] = (
        "PUBLIC_ROUTE_REPAIR_WAVE_01_CANDIDATE_DEPLOYMENT"
        if candidate
        else "PUBLIC_ROUTE_REPAIR_WAVE_01_LIVE_SOURCE_PARITY_PASS"
    )

    routes = contract.get("public_house_routes", [])
    if not isinstance(routes, list):
        raise SystemExit("Public house route register is unreadable")

    theory_seen = apps_seen = False
    for route in routes:
        if not isinstance(route, dict):
            continue
        if route.get("path") == "theory/index.html":
            theory_seen = True
            route.update(
                {
                    "body": "JM Theory Multihub — Public Source-Body Integrity Head v0.20.1 over Reconciled v0.19 Shell",
                    "state": "LIVE_18_FULL_37_OF_37_SOURCE_BODIES_24_DRAFTS_300_CENSUS_ROUTES",
                }
            )
        elif route.get("path") == "apps/index.html":
            apps_seen = True
            route.update(
                {
                    "body": "JM Non-Game Apps House — Current Public Route Wave 01",
                    "state": "LIVE_GOVERNED_44_ROOM_PUBLIC_SAFE_CATALOGUE_CURRENT_HEADS_RECONCILED",
                }
            )
    if not theory_seen or not apps_seen:
        raise SystemExit(
            f"Public route register missing Theory or Apps: theory={theory_seen}, apps={apps_seen}"
        )

    contract["public_route_repair_wave_01"] = {
        "status": "SOURCE_REPAIRED_LIVE_PROOF_PENDING" if candidate else "PASS",
        "theory": {
            "path": "theory/index.html",
            "shell": "v0.19",
            "integrity_head": "v0.20.1",
            "full_bodies": 18,
            "source_body_integrity": "37/37",
            "publication_drafts": 24,
        },
        "apps": {
            "path": "apps/index.html",
            "rooms": 44,
            "money_menu": "242-route v1.1 authority / public contact v1.2",
            "routeos": "sovereign gaming-platform bridge; not counted as a non-game app",
        },
        "law": "CURRENT AUTHORITY BEFORE CONTINUATION; ADAPTER DOES NOT MERGE BODY IDENTITY.",
        "source_repaired_utc": NOW,
    }


def update_estate_map(node: object) -> None:
    if isinstance(node, dict):
        if node.get("path") == "theory/index.html":
            node["body"] = "JM Theory Multihub — Public Source-Body Integrity Head v0.20.1"
            node["state"] = "LIVE_18_FULL_37_OF_37_SOURCE_BODIES_24_DRAFTS"
        elif node.get("path") == "apps/index.html":
            node["body"] = "JM Non-Game Apps House — Current Public Route Wave 01"
            node["state"] = "LIVE_GOVERNED_44_ROOM_CURRENT_HEADS_RECONCILED"
        for value in node.values():
            update_estate_map(value)
    elif isinstance(node, list):
        for value in node:
            update_estate_map(value)


def main() -> None:
    apps = APPS.read_text(encoding="utf-8")
    apps = replace_once(
        apps,
        "<title>JM Non-Game Apps House</title>",
        "<title>JM Non-Game Apps House — Current Public Route Wave 01</title>",
        "Apps title",
    )
    apps = replace_once(
        apps,
        '<section class="hero" id="house">',
        '<section class="hero" id="house" data-public-route-wave="01">',
        "Apps Wave marker",
    )
    apps = replace_once(
        apps,
        '<div class="eyebrow">Current public-safe projection</div>',
        '<div class="eyebrow">Current public-safe projection · Route Repair Wave 01</div>',
        "Apps eyebrow",
    )
    apps = replace_once(
        apps,
        '["JM Theory Multihub","Public v1.12.0 edition","Theory & Books","full_current"]',
        '["JM Theory Multihub","Public v0.20.1 Source-Body Integrity · v0.19 shell preserved","Theory & Books","full_current"]',
        "Apps Theory current head",
    )
    apps = replace_once(
        apps,
        '["JM Money Menu","32 Active Routes v0.1","Commercial & Practical","full_current"]',
        '["JM Money Menu","242-route v1.1 data authority · live public contact v1.2","Commercial & Practical","full_current"]',
        "Apps Money Menu current head",
    )
    apps = replace_once(
        apps,
        'function routeFor(a){const n=a[0],c=a[2];if(n==="JMStudios")',
        'function routeFor(a){const n=a[0],c=a[2];if(n==="JM Money Menu")return["/money-menu/","Open live Money Menu"];if(n==="JMStudios")',
        "Apps Money Menu live route",
    )
    apps = replace_once(
        apps,
        'schema:"JM.NonGameAppsPublicRegistry/1.0"',
        'schema:"JM.NonGameAppsPublicRegistry/1.1"',
        "Apps export schema",
    )
    APPS.write_text(apps, encoding="utf-8")

    theory = THEORY.read_text(encoding="utf-8")
    theory = replace_once(
        theory,
        '<meta name="description" content="JM Theory Multihub v0.19 — all 256 First Stage project routes now carry deep recovery, exact body-card identity or current-state reconciliation; 17 full/canonical bodies remain honestly counted.">',
        '<meta name="description" content="JM Theory Multihub public head: v0.20.1 source-body integrity over the reconciled v0.19 shell, preserving 18 full bodies, 37/37 earlier source bodies, 24 publication drafts and 300 census routes.">',
        "Theory meta description",
    )
    theory = replace_once(
        theory,
        '<title>JM Theory Multihub v0.19 — All 256 First Stage Routes Reconciled</title>',
        '<title>JM Theory Multihub v0.20.1 — Source-Body Integrity over v0.19 Reconciled Shell</title>',
        "Theory title",
    )
    theory = replace_once(
        theory,
        "<body>",
        '<body data-public-route-wave="01">',
        "Theory Wave marker",
    )
    theory = replace_once(
        theory,
        '<small>v0.19 · All 256 First Stage Routes Reconciled</small>',
        '<small>v0.20.1 integrity layer · v0.19 reconciled shell</small>',
        "Theory brand authority",
    )
    theory = replace_once(
        theory,
        '<div class="eyebrow">Current public Theory Wing front door</div>',
        '<div class="eyebrow">Current public Theory Wing front door · Route Repair Wave 01</div>',
        "Theory eyebrow",
    )
    theory = replace_once(
        theory,
        '<script src="../estate-head-public-consumer.js" data-jm-estate-head-consumer></script>',
        '<script src="../estate-head-public-consumer.js?v=2101" data-jm-estate-head-consumer></script>',
        "Theory consumer cache key",
    )
    THEORY.write_text(theory, encoding="utf-8")

    apps_proof = validate_apps(apps)
    theory_proof = validate_theory(theory)

    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    update_route_contract(contract, candidate=True)
    CONTRACT.write_text(json.dumps(contract, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    estate_map = json.loads(ESTATE_MAP.read_text(encoding="utf-8"))
    update_estate_map(estate_map)
    estate_map["public_route_repair_wave_01"] = {
        "status": "SOURCE_REPAIRED_LIVE_PROOF_PENDING",
        "theory": "v0.20.1 integrity over v0.19 shell",
        "apps_rooms": 44,
        "money_menu_public_contact": "v1.2",
        "recorded_utc": NOW,
    }
    ESTATE_MAP.write_text(json.dumps(estate_map, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    apps_status = """# JM Non-Game Apps House — Public Route Status v1.1

**Wave:** Public Route Repair Wave 01  
**Rooms:** 44  
**Current-head repair:** Money Menu v1.1/v1.2 and Theory v0.20.1 seated  
**RouteOS:** sovereign gaming-platform bridge; not counted as a non-game app  
**State:** SOURCE REPAIRED / LIVE PROOF PENDING

Many bodies. One living line. None erased.
"""
    Path("apps/PUBLIC_ROUTE_STATUS_v1_1.md").write_text(apps_status, encoding="utf-8")

    theory_status = """# JM Theory Multihub — Public Route Status v0.20.1

**Public head:** v0.20.1 source-body integrity layer  
**Preserved shell:** v0.19 all-256 reconciliation  
**Full bodies:** 18  
**Earlier source bodies:** 37/37  
**Publication drafts:** 24  
**Census routes:** 300 visible after mounted layers  
**State:** SOURCE REPAIRED / LIVE PROOF PENDING

The room preserves formation. The body preserves current-best content.
"""
    Path("theory/PUBLIC_ROUTE_STATUS_v0_20_1.md").write_text(theory_status, encoding="utf-8")

    receipt = {
        "schema": "JM.PublicRouteRepairWave/1.0",
        "wave": "01",
        "recorded_utc": NOW,
        "status": "SOURCE_REPAIRED_LIVE_PROOF_PENDING",
        "theory": theory_proof,
        "apps": apps_proof,
        "contract": {
            "version": "v0.3.1",
            "state": contract["deployment_state"],
        },
        "identity_merges": 0,
        "whole_estate_ding": "OPEN",
        "laws": [
            "CURRENT AUTHORITY BEFORE CONTINUATION.",
            "ROUTE CONTACTS BODY; BODY IDENTITY REMAINS SOVEREIGN.",
            "SOURCE BODY CONTACT IS NOT LIVE HTTP CONTACT.",
            "NO DING, NO CLAIM.",
        ],
    }
    SOURCE_RECEIPT.write_text(
        json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
