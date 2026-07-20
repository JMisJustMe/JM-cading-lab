from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import re
import subprocess
import tempfile


def fail(message: str) -> None:
    raise SystemExit(f"ESTATE CLASSIFICATION ERROR: {message}")


def parse_apps(root: Path) -> tuple[str, list[list[str]], dict[str, int]]:
    path = root / "apps/index.html"
    if not path.is_file():
        fail(f"missing {path}")
    text = path.read_text(encoding="utf-8")
    rows_match = re.search(r"const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=", text, re.S)
    stats_match = re.search(r"const APP_STAT_COUNTS=(\{.*?\});", text, re.S)
    if not rows_match or not stats_match:
        fail("Apps registry or embedded stat receipt is unreadable")
    rows = json.loads(rows_match.group(1))
    shown = json.loads(stats_match.group(1))
    counts = Counter(row[3] for row in rows)
    expected = {
        "room_count": len(rows),
        "full_plus_preserved": counts["full_current"] + counts["full_alt"],
        "routed": counts["routed"],
        "source_needed": counts["registered"],
        "preparation": counts["prep"],
    }
    if shown != expected:
        fail(f"Apps visible counts do not match its registry: {shown} != {expected}")
    if len(rows) != 44:
        fail(f"expected 44 governed non-game rooms, found {len(rows)}")
    return text, rows, expected


def row_for(rows: list[list[str]], name: str) -> list[str]:
    matches = [row for row in rows if row[0] == name]
    if len(matches) != 1:
        fail(f"expected exactly one {name!r} row, found {len(matches)}")
    return matches[0]


def has(rows: list[list[str]], name: str, fragment: str, category: str, status: str) -> bool:
    return any(
        row[0] == name and fragment in row[1] and row[2] == category and row[3] == status
        for row in rows
    )


def check_apps_javascript(text: str) -> None:
    scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", text, re.I | re.S)
    if not scripts:
        fail("Apps House executable script is missing")
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
        handle.write(scripts[-1])
        name = handle.name
    result = subprocess.run(["node", "--check", name], capture_output=True, text=True)
    if result.returncode:
        fail(f"Apps House JavaScript syntax failed: {result.stderr[-800:]}")


def verify(root: Path, public_only: bool) -> dict[str, object]:
    text, rows, stats = parse_apps(root)
    check_apps_javascript(text)

    required = [
        ("JM Zionfolder OS", "v1.1.1 Scroll Spine Fix", "Estate & Recovery", "full_current"),
        ("BenefitMerge", "v0.1 Android proof", "Builders, Recovery & Delivery", "full_current"),
        ("BenefitMerge", "v0.2 PWA build", "Builders, Recovery & Delivery", "full_current"),
        ("Altogether Assembly / JM Estate OS", "v2.0.2", "Operating Houses", "full_current"),
        ("JM Estate OS", "v0.2.1", "Operating Houses", "full_current"),
        ("Command Register / Command Panel", "v0.1", "Registers & Governance", "routed"),
        ("JMStudios", "B0.8.2 source anchor", "Operating Houses", "routed"),
        ("FTR / Ama-Pro / GripRoute Adaptive Interaction Engine", "Ama-Pro native gaming route", "FTR / Devices & Adaptive Interaction", "full_current"),
        ("CadenVM / CadenPad", "v0.10 Frozen", "Coding & Proof", "full_current"),
        ("TraceBox / RouteBox", "v5.2 Standalone PWA", "Coding & Proof", "full_current"),
        ("BodyVault", "v0.4.2 TRUE NO-INTERPRETER", "Estate & Recovery", "full_current"),
        ("OWNMADE", "v1.3 PWA Project + File Dock", "Utilities & Incubator", "full_current"),
        ("Gold Mode Coding Hub", "v0.9.5.1 Mobile Hotfix", "Coding & Proof", "full_current"),
        ("JM Theory Multihub", "v0.5 Readable Source Package", "Theory & Books", "full_current"),
        ("Latest Body Finder", "BUILD 050", "Registers & Governance", "routed"),
        ("Source-Body Auditor", "BUILD 050", "Registers & Governance", "routed"),
    ]
    missing = [f"{name} / {fragment}" for name, fragment, category, status in required if not has(rows, name, fragment, category, status)]
    if missing:
        fail("missing or demoted bodies: " + "; ".join(missing))

    if any(row[0] == "RouteOS" for row in rows):
        fail("RouteOS returned to the literal Non-Game Apps registry")
    for marker in (
        "RouteOS has returned to its sovereign gaming-platform seat",
        "package-retrieval + preparation",
    ):
        if marker not in text:
            fail(f"Apps House marker missing: {marker}")

    portal = row_for(rows, "Portal Engine")
    registered = {row[0] for row in rows if row[3] == "registered"}
    if portal[3] == "registered":
        portal_phase = "BUILD050_PRE_PORTAL"
        if "exact standalone package retrieval" not in portal[1]:
            fail("pre-recovery Portal row lacks its explicit package-retrieval boundary")
        if registered != {"Portal Engine"}:
            fail(f"pre-recovery package set is wrong: {sorted(registered)}")
        if stats != {"room_count": 44, "full_plus_preserved": 29, "routed": 11, "source_needed": 1, "preparation": 2}:
            fail(f"pre-recovery Apps state mismatch: {stats}")
    elif portal[3] == "routed":
        portal_phase = "PORTAL_ACCESS_LINE_RECOVERED"
        if "Estate OS v0.3.1" not in portal[1] or "TBS Delta 004.1" not in portal[1]:
            fail("recovered Portal row does not identify its physical carrier and command route")
        if portal[2] != "Operating Houses":
            fail("Portal Engine has lost its Operating Houses primary seat")
        if registered:
            fail(f"no exact-package retrieval cards should remain, found: {sorted(registered)}")
        if stats != {"room_count": 44, "full_plus_preserved": 29, "routed": 12, "source_needed": 0, "preparation": 2}:
            fail(f"Portal-recovered Apps state mismatch: {stats}")
    else:
        fail(f"Portal Engine has an unsupported public status: {portal[3]}")

    quadze_rows = [row for row in rows if row[0] in {"JM QUADZE MultiHub SOLO", "JM QUADZE MultiHub OneBody OS"}]
    if len(quadze_rows) != 1:
        fail(f"expected one QUADZE MultiHub public row, found {len(quadze_rows)}")
    quadze = quadze_rows[0]
    if quadze[0] == "JM QUADZE MultiHub SOLO":
        quadze_phase = "QUADZE_V1_PUBLIC_ANCESTOR"
        if "v1.0 mounted SOLO / SERVE / STORE body" not in quadze[1] or quadze[2:] != ["Operating Houses", "full_current"]:
            fail("QUADZE v1 ancestor card has drifted")
    else:
        quadze_phase = "QUADZE_V4_AUTHORITY_RECOVERED"
        if "v4.1 SOLO" not in quadze[1] or "v4.0 full APK-ready source" not in quadze[1]:
            fail("QUADZE v4 card does not preserve the full-source / SOLO authority split")
        if quadze[2:] != ["Operating Houses", "full_current"]:
            fail("QUADZE v4 has lost its Operating Houses seat or current-body state")

    stringline_path = root / "navigator/stringline.json"
    if not stringline_path.is_file():
        fail("Stringline seed is missing")
    stringline = json.loads(stringline_path.read_text(encoding="utf-8"))
    projects = {project["id"]: project for project in stringline.get("seed_project_strings", [])}
    required_projects = {
        "games-beyond", "coding-os", "operating-houses", "recovery-delivery",
        "ftr-devices", "utilities-incubator", "registers-governance",
    }
    absent = required_projects - projects.keys()
    if absent:
        fail("Stringline projects missing: " + ", ".join(sorted(absent)))
    if not any(body.get("id") == "routeos-platform" and body.get("status") == "FROZEN" for body in projects["games-beyond"].get("bodies", [])):
        fail("Stringline lost frozen RouteOS package authority")
    governance = {body["id"]: body for body in projects["registers-governance"].get("bodies", [])}
    if governance.get("latest-body-finder", {}).get("status") != "MOUNTED":
        fail("Latest Body Finder is not mounted in Stringline")
    if governance.get("source-body-auditor", {}).get("status") != "PROVEN":
        fail("Source-Body Auditor is not proven in Stringline")

    if portal_phase == "PORTAL_ACCESS_LINE_RECOVERED":
        operating_bodies = {body["id"]: body for body in projects["operating-houses"].get("bodies", [])}
        portal_body = operating_bodies.get("portal-engine")
        if not portal_body or portal_body.get("status") != "PROVEN":
            fail("Portal Engine is not proven in the Operating Houses Stringline")
        if portal_body.get("standaloneClaim") != "NOT_CLAIMED":
            fail("Portal Engine standalone-package boundary is missing")
        if quadze_phase == "QUADZE_V1_PUBLIC_ANCESTOR" and "v0.1.7 Portal access-line reconciliation" not in stringline.get("version", ""):
            fail("Stringline has not advanced to the Portal reconciliation seed")
        if quadze_phase == "QUADZE_V4_AUTHORITY_RECOVERED":
            quadze_body = operating_bodies.get("quadze-multihub")
            if not quadze_body or quadze_body.get("status") != "FROZEN":
                fail("QUADZE v4 is not frozen in the Operating Houses Stringline")
            if quadze_body.get("fullSourceAuthority") != "v4.0 APK-ready source":
                fail("QUADZE full-source authority is not v4.0")
            if quadze_body.get("soloAuthority") != "v4.1 SOLO":
                fail("QUADZE SOLO authority is not v4.1")
            if quadze_body.get("v4NativeApk") != "NOT_BUILT_NOT_CLAIMED":
                fail("QUADZE v4 APK boundary is missing")
            if "v0.1.8 QUADZE v4 authority reconciliation" not in stringline.get("version", ""):
                fail("Stringline has not advanced to the QUADZE v4 reconciliation seed")

    if not public_only:
        authority_path = root / "registry/estate-classification-authority-v1.0.json"
        integrity_path = root / "registry/estate-classification-integrity-receipt-v1.0.json"
        if not authority_path.is_file() or not integrity_path.is_file():
            fail("source authority or integrity receipt is missing")
        authority = json.loads(authority_path.read_text(encoding="utf-8"))
        authority_ids = {body.get("id") for body in authority.get("bodies", [])}
        required_authority = {
            "routeos", "zionfolder-os", "estate-os-family", "jmstudios", "benefitmerge",
            "ftr-ama-pro-griproute", "cadenvm", "tracebox-routebox", "bodyvault", "ownmade",
            "theory-readable-v05", "quadze-multihub-v10", "registers-governance-chain",
        }
        missing_authority = required_authority - authority_ids
        if missing_authority:
            fail("classification authority entries missing: " + ", ".join(sorted(missing_authority)))
        integrity = json.loads(integrity_path.read_text(encoding="utf-8"))
        if portal_phase == "BUILD050_PRE_PORTAL":
            if integrity.get("status") != "PASS_BUILD050_ORGANS_RECOVERED":
                fail("pre-Portal integrity receipt crown is wrong")
            if integrity.get("remaining_exact_package_retrieval") != ["Portal Engine standalone package"]:
                fail("pre-Portal retrieval list is wrong")
        elif quadze_phase == "QUADZE_V1_PUBLIC_ANCESTOR":
            if "portal-engine-access-line" not in authority_ids:
                fail("Portal access-line authority entry is missing")
            if integrity.get("status") != "PASS_PORTAL_ACCESS_LINE_RECOVERED":
                fail("Portal recovery integrity receipt crown is wrong")
            if integrity.get("remaining_exact_package_retrieval") != []:
                fail("Portal recovery should close the exact-package retrieval list")
            if integrity.get("proof", {}).get("portal_access_line_headless_qa") != "PASS_7_OF_7":
                fail("Portal headless interaction proof is missing")
        else:
            quadze_authority = next(body for body in authority.get("bodies", []) if body.get("id") == "quadze-multihub-v10")
            if quadze_authority.get("severity") != "RECOVERED_AND_RECONCILED_V4_AUTHORITY":
                fail("QUADZE v4 authority entry is not recovered and reconciled")
            if integrity.get("status") != "PASS_QUADZE_V4_AUTHORITY_RECOVERED":
                fail("QUADZE v4 integrity receipt crown is wrong")
            if integrity.get("proof", {}).get("quadze_v41_solo_headless_qa") != "PASS_2_VIEWPORTS":
                fail("QUADZE v4.1 SOLO headless proof is missing")
            if any("QUADZE MultiHub later v4.x" in item for item in integrity.get("watch_items", [])):
                fail("QUADZE v4 recovery watch item was not closed")

    return {
        "status": "PASS",
        "portal_phase": portal_phase,
        "quadze_phase": quadze_phase,
        "apps_stats": stats,
        "stringline_version": stringline.get("version"),
        "stringline_projects": len(projects),
        "public_only": public_only,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--public-only", action="store_true")
    args = parser.parse_args()
    result = verify(Path(args.root), args.public_only)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
