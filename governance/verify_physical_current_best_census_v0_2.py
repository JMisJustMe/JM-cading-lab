from __future__ import annotations

import argparse
import json
from pathlib import Path
import re


CHAIN = "Source Ledger → Latest Body Finder → Source-Body Auditor → Current Best Register → Crown Register → Living Register"
TARGET_IDS = {
    "multimedia-unit-v230",
    "altogether-v202",
    "jmstudios-b082-b083",
    "zionfolder-os-v111",
}


def fail(message: str) -> None:
    raise SystemExit(f"PHYSICAL CURRENT-BEST CENSUS ERROR: {message}")


def load_json(path: Path) -> dict:
    if not path.is_file():
        fail(f"missing {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")


def parse_apps(path: Path) -> list[list[str]]:
    if not path.is_file():
        fail(f"missing {path}")
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=", text, re.S)
    if not match:
        fail("Apps House registry is unreadable")
    return json.loads(match.group(1))


def one_row(rows: list[list[str]], name: str, fragment: str) -> list[str]:
    matches = [row for row in rows if row[0] == name and fragment in row[1]]
    if len(matches) != 1:
        fail(f"expected one Apps row for {name!r} / {fragment!r}, found {len(matches)}")
    return matches[0]


def authority_body(authority: dict, body_id: str) -> dict:
    matches = [body for body in authority.get("bodies", []) if body.get("id") == body_id]
    if len(matches) != 1:
        fail(f"expected one classification authority body {body_id!r}, found {len(matches)}")
    return matches[0]


def target_by_id(census: dict, target_id: str) -> dict:
    matches = [target for target in census.get("first_scope", []) if target.get("id") == target_id]
    if len(matches) != 1:
        fail(f"expected one census target {target_id!r}, found {len(matches)}")
    return matches[0]


def verify(root: Path) -> dict[str, object]:
    census = load_json(root / "registry/estate-physical-current-best-census-v0.2.json")
    authority = load_json(root / "registry/estate-classification-authority-v1.0.json")
    rows = parse_apps(root / "apps/index.html")

    if census.get("status") != "IN_PROGRESS_FIRST_SCOPE_2_OF_4":
        fail("canonical census is not in the proven first-pair 2-of-4 state")
    if census.get("method") != CHAIN:
        fail("source-to-living chain order has drifted")

    targets = census.get("first_scope", [])
    ids = {target.get("id") for target in targets}
    if ids != TARGET_IDS or len(targets) != 4:
        fail(f"first-scope target set is wrong: {sorted(ids)}")

    confirmed = [target for target in targets if target.get("status") == "PHYSICAL_PACKAGE_CONFIRMED"]
    active = [target for target in targets if target.get("status") == "PHYSICAL_PACKAGE_SEARCH_ACTIVE"]
    if {target.get("id") for target in confirmed} != {"multimedia-unit-v230", "altogether-v202"}:
        fail("only Multimedia and Altogether may be physically confirmed in the first-pair state")
    if {target.get("id") for target in active} != {"jmstudios-b082-b083", "zionfolder-os-v111"}:
        fail("JMStudios and Zionfolder must remain active package searches")

    multimedia_target = target_by_id(census, "multimedia-unit-v230")
    if multimedia_target.get("package") != "JM_ESTATE_MULTIMEDIA_UNIT_v2_3_0_UNIVERSAL_EDITABLE_ZIONFOLDER.zip":
        fail("Multimedia package authority has drifted")
    if multimedia_target.get("package_bytes") != 37284419:
        fail("Multimedia package byte count has drifted")
    multimedia_proof = multimedia_target.get("fresh_proof", {})
    expected_multimedia = {
        "archive_integrity": "PASS",
        "externally_hashed_files": 21,
        "embedded_rooms": "PASS_8_OF_8_BYTE_IDENTICAL",
        "javascript_syntax": "PASS_16_OF_16",
        "standalone_solo_matches_package": "PASS",
    }
    if multimedia_proof != expected_multimedia:
        fail("Multimedia fresh proof set has drifted")
    if multimedia_target.get("ruling") != "CURRENT_OPERATING_FRONT_ROOM_AUTHORITY_CONFIRMED":
        fail("Multimedia current operating ruling is missing")
    if "stale self-hash" not in multimedia_target.get("custody_defect", ""):
        fail("Multimedia custody defect is not preserved honestly")

    altogether_target = target_by_id(census, "altogether-v202")
    if altogether_target.get("package") != "JM_ESTATE_ALTOGETHER_CURRENT_CROWN_v2_0_2_ZIONFOLDER.zip":
        fail("Altogether package authority has drifted")
    if altogether_target.get("package_bytes") != 82961:
        fail("Altogether package byte count has drifted")
    altogether_proof = altogether_target.get("fresh_proof", {})
    if altogether_proof.get("archive_integrity") != "PASS":
        fail("Altogether archive integrity is not proven")
    if altogether_proof.get("externally_hashed_files") != 10:
        fail("Altogether external file census is not ten")
    if altogether_proof.get("mounted_body_descriptions") != 53:
        fail("Altogether mounted body count is not 53")
    if altogether_proof.get("houses") != 27:
        fail("Altogether house count is not 27")
    if altogether_proof.get("full_body_fields_populated") != "PASS_53_OF_53":
        fail("Altogether full-body field proof is incomplete")
    if altogether_target.get("ruling") != "CURRENT_ASSEMBLY_CROWN_AUTHORITY_CONFIRMED":
        fail("Altogether assembly ruling is missing")
    if "do not replace artifact-level proof" not in altogether_target.get("boundary", ""):
        fail("Altogether assembly-fuel boundary is missing")

    if census.get("first_pair_ruling") != "Multimedia operates the front room. Altogether selects, assembles and exports bodies. They connect; they do not collapse.":
        fail("first-pair role separation has drifted")
    if "Fresh phone contact was not repeated" not in census.get("boundary", ""):
        fail("device-contact boundary is missing")

    multimedia = authority_body(authority, "multimedia-unit")
    if multimedia.get("operating_authority") != "v2.3.0 S³":
        fail("Multimedia classification authority is not v2.3.0 S³")

    jmstudios = authority_body(authority, "jmstudios")
    if "B0.8.2" not in jmstudios.get("source_anchor", ""):
        fail("JMStudios B0.8.2 source anchor is missing")
    if "B0.8.3" not in jmstudios.get("continuation", ""):
        fail("JMStudios B0.8.3 continuation is missing")
    if "v0.9" not in jmstudios.get("parked_wrong_turn", ""):
        fail("JMStudios v0.9 wrong-turn guard is missing")

    estate_os = authority_body(authority, "estate-os-family")
    if estate_os.get("operating_front_room") != "JM Estate Multimedia Unit v2.3.0 S³":
        fail("Estate OS family lost the Multimedia front-room role")
    if estate_os.get("assembly_crown") != "Altogether Assembly / JM Estate OS v2.0.2":
        fail("Estate OS family lost the Altogether assembly role")
    if "v0.2.1" not in estate_os.get("active_additive_carrier", ""):
        fail("Estate OS additive carrier role is missing")

    zion = authority_body(authority, "zionfolder-os")
    if zion.get("frozen_current_use_anchor") != "v1.1.1 Scroll Spine Fix":
        fail("Zionfolder frozen current-use anchor is not v1.1.1")
    if set(zion.get("repair_donors", [])) != {"v0.8.7 guide-state repair", "v0.6.2 empty-script gate"}:
        fail("Zionfolder repair-donor set has drifted")

    expected_rows = [
        ("JM Estate Multimedia Unit", "v2.3.0 S³", "Operating Houses", "full_current"),
        ("JMStudios", "B0.8.2 source anchor", "Operating Houses", "routed"),
        ("Altogether Assembly / JM Estate OS", "v2.0.2 Assembly Crown", "Operating Houses", "full_current"),
        ("JM Zionfolder OS", "v1.1.1 Scroll Spine Fix", "Estate & Recovery", "full_current"),
    ]
    for name, fragment, category, status in expected_rows:
        row = one_row(rows, name, fragment)
        if row[2:] != [category, status]:
            fail(f"Apps projection drift for {name}: {row[2:]}")

    family_names = {
        "JM Estate Multimedia Unit",
        "Altogether Assembly / JM Estate OS",
        "JM Estate OS",
        "Portal Engine",
    }
    if {row[0] for row in rows if row[0] in family_names} != family_names:
        fail("Estate OS family roles have been collapsed or removed")

    return {
        "status": "PASS_CENSUS_V0_2_FIRST_PAIR_CONFIRMED",
        "targets": 4,
        "physical_packages_confirmed": 2,
        "physical_package_searches_active": 2,
        "confirmed": ["JM Estate Multimedia Unit v2.3.0 S³", "Altogether Assembly / JM Estate OS v2.0.2"],
        "held": ["JMStudios B0.8.2 / B0.8.3", "JM Zionfolder OS v1.1.1"],
        "next_gate": "Inspect JMStudios and Zionfolder exact physical packages",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.root)), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
