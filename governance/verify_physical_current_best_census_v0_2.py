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
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")
    if not isinstance(value, dict):
        fail(f"expected JSON object in {path}")
    return value


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


def verify_fixed_first_pair(census: dict) -> None:
    multimedia = target_by_id(census, "multimedia-unit-v230")
    if multimedia.get("status") != "PHYSICAL_PACKAGE_CONFIRMED":
        fail("Multimedia physical package confirmation was lost")
    if multimedia.get("package") != "JM_ESTATE_MULTIMEDIA_UNIT_v2_3_0_UNIVERSAL_EDITABLE_ZIONFOLDER.zip":
        fail("Multimedia package authority has drifted")
    if multimedia.get("package_bytes") != 37284419:
        fail("Multimedia package byte count has drifted")
    expected_multimedia = {
        "archive_integrity": "PASS",
        "externally_hashed_files": 21,
        "embedded_rooms": "PASS_8_OF_8_BYTE_IDENTICAL",
        "javascript_syntax": "PASS_16_OF_16",
        "standalone_solo_matches_package": "PASS",
    }
    if multimedia.get("fresh_proof") != expected_multimedia:
        fail("Multimedia proof set has drifted")
    if multimedia.get("ruling") != "CURRENT_OPERATING_FRONT_ROOM_AUTHORITY_CONFIRMED":
        fail("Multimedia operating ruling is missing")
    if "stale self-hash" not in multimedia.get("custody_defect", ""):
        fail("Multimedia custody defect is not preserved")

    altogether = target_by_id(census, "altogether-v202")
    if altogether.get("status") != "PHYSICAL_PACKAGE_CONFIRMED":
        fail("Altogether physical package confirmation was lost")
    if altogether.get("package") != "JM_ESTATE_ALTOGETHER_CURRENT_CROWN_v2_0_2_ZIONFOLDER.zip":
        fail("Altogether package authority has drifted")
    if altogether.get("package_bytes") != 82961:
        fail("Altogether package byte count has drifted")
    proof = altogether.get("fresh_proof", {})
    required = {
        "archive_integrity": "PASS",
        "externally_hashed_files": 10,
        "mounted_body_descriptions": 53,
        "houses": 27,
        "full_body_fields_populated": "PASS_53_OF_53",
    }
    for key, expected in required.items():
        if proof.get(key) != expected:
            fail(f"Altogether proof drift at {key}")
    if altogether.get("ruling") != "CURRENT_ASSEMBLY_CROWN_AUTHORITY_CONFIRMED":
        fail("Altogether assembly ruling is missing")
    if "do not replace artifact-level proof" not in altogether.get("boundary", ""):
        fail("Altogether assembly-fuel boundary is missing")


def verify_jmstudios(root: Path, target: dict) -> str:
    allowed = {
        "PHYSICAL_PACKAGE_SEARCH_ACTIVE",
        "SOURCE_ANCHOR_BODY_CONFIRMED_CONTINUATION_SEARCH_ACTIVE",
    }
    status = target.get("status")
    if status not in allowed:
        fail(f"JMStudios census status is not governed: {status}")
    if status == "PHYSICAL_PACKAGE_SEARCH_ACTIVE":
        return "PACKAGE_SEARCH_ACTIVE"

    audit_path = root / target.get("physical_audit", "")
    audit = load_json(audit_path)
    if audit.get("status") != "PARTIAL_PHYSICAL_CONFIRMATION":
        fail("JMStudios partial audit status is wrong")
    source = audit.get("source_anchor", {})
    if source.get("filename") != "00_OPEN_FIRST_JMSTUDIOS_ORIGINAL_SOURCE_PATCH_MERGE_B0_8_2_CROWN.html":
        fail("JMStudios source-anchor filename drift")
    if source.get("bytes") != 6469894:
        fail("JMStudios source-anchor byte count drift")
    if source.get("sha256") != "b033ab12aee459b6a388732a2b3ab7952c21d035d0fb0cd741f1db36da01406f":
        fail("JMStudios source-anchor hash drift")
    if source.get("embedded_rooms") != 13 or source.get("substantive_rooms") != 7 or source.get("redirect_rooms") != 6:
        fail("JMStudios room classification drift")
    if source.get("room_hash_set_sha256") != "71dab2f6363aadb0459a77502fe4efa024aae210eda858df3e5cc41fb595d13f":
        fail("JMStudios room hash-set drift")
    patch = audit.get("source_preserving_patch", {})
    if patch.get("sha256") != "b3f46d28478c0064ea18f8da4a128c75702f09984717a4dc26d7155235790890":
        fail("JMStudios link-polish patch hash drift")
    if patch.get("room_payload_relation") != "PASS_13_OF_13_BYTE_IDENTICAL_TO_SOURCE_ANCHOR":
        fail("JMStudios source/patch room identity proof is missing")
    continuation = audit.get("continuation", {})
    if continuation.get("physical_state") != "EXACT_BODY_NOT_LOCATED_IN_CURRENT_GITHUB_OR_LIBRARY_SWEEP":
        fail("JMStudios B0.8.3 physical boundary is missing")
    if continuation.get("crown_state") != "HELD_PENDING_PHYSICAL_BODY":
        fail("JMStudios B0.8.3 was crowned without its body")
    return "B0.8.2_SOURCE_BODY_CONFIRMED_B0.8.3_HELD"


def verify_zionfolder(root: Path, target: dict) -> str:
    allowed = {
        "PHYSICAL_PACKAGE_SEARCH_ACTIVE",
        "DIRECT_HTML_BODY_CONFIRMED_ZIP_AND_DONOR_SEARCH_ACTIVE",
    }
    status = target.get("status")
    if status not in allowed:
        fail(f"Zionfolder census status is not governed: {status}")
    if status == "PHYSICAL_PACKAGE_SEARCH_ACTIVE":
        return "PACKAGE_SEARCH_ACTIVE"

    audit_path = root / target.get("physical_audit", "")
    audit = load_json(audit_path)
    if audit.get("status") != "PARTIAL_PHYSICAL_CONFIRMATION":
        fail("Zionfolder partial audit status is wrong")
    body = audit.get("direct_body", {})
    if body.get("filename") != "jm-zionfolder-os-v1_1_1.html":
        fail("Zionfolder direct-body filename drift")
    if body.get("bytes") != 182691:
        fail("Zionfolder direct-body byte count drift")
    if body.get("sha256") != "f58785d5ef58a6d58ae04e0d028d99030ff77f3c67554d4ae145432db82a859d":
        fail("Zionfolder direct-body hash drift")
    if body.get("byte_identity") != "PASS_4_OF_4":
        fail("Zionfolder four-copy identity proof is missing")
    if body.get("javascript_syntax") != "PASS_1_OF_1":
        fail("Zionfolder JavaScript proof is missing")
    package = audit.get("frozen_package", {})
    if package.get("physical_state") != "ZIP_BYTES_NOT_LOCATED_IN_CURRENT_GITHUB_OR_LIBRARY_SWEEP":
        fail("Zionfolder ZIP boundary is missing")
    if package.get("package_crown_state") != "HELD_PENDING_ARCHIVE_BYTES":
        fail("Zionfolder ZIP was crowned without archive bytes")
    if len(audit.get("repair_donors", [])) != 2:
        fail("Zionfolder donor audit set is incomplete")
    if "not an Android" not in audit.get("claim_boundary", ""):
        fail("Zionfolder native-OS claim boundary is missing")
    return "V1.1.1_DIRECT_BODY_CONFIRMED_ZIP_AND_DONORS_HELD"


def verify(root: Path) -> dict[str, object]:
    census = load_json(root / "registry/estate-physical-current-best-census-v0.2.json")
    authority = load_json(root / "registry/estate-classification-authority-v1.0.json")
    rows = parse_apps(root / "apps/index.html")

    if census.get("status") not in {
        "IN_PROGRESS_FIRST_SCOPE_2_OF_4",
        "IN_PROGRESS_FIRST_SCOPE_2_PACKAGES_2_PARTIAL_BODIES",
    }:
        fail("canonical census status is outside the governed first-scope states")
    if census.get("method") != CHAIN:
        fail("source-to-living chain order has drifted")

    targets = census.get("first_scope", [])
    if {target.get("id") for target in targets} != TARGET_IDS or len(targets) != 4:
        fail("first-scope target set has drifted")

    verify_fixed_first_pair(census)
    jm_state = verify_jmstudios(root, target_by_id(census, "jmstudios-b082-b083"))
    zion_state = verify_zionfolder(root, target_by_id(census, "zionfolder-os-v111"))

    if census.get("first_pair_ruling") != "Multimedia operates the front room. Altogether selects, assembles and exports bodies. They connect; they do not collapse.":
        fail("first-pair role separation has drifted")
    if "Fresh phone contact was not repeated" not in census.get("boundary", ""):
        fail("device-contact boundary is missing")

    multimedia = authority_body(authority, "multimedia-unit")
    if multimedia.get("operating_authority") != "v2.3.0 S³":
        fail("Multimedia classification authority drift")
    jmstudios = authority_body(authority, "jmstudios")
    if "B0.8.2" not in jmstudios.get("source_anchor", "") or "B0.8.3" not in jmstudios.get("continuation", ""):
        fail("JMStudios source/continuation role split is missing")
    if "v0.9" not in jmstudios.get("parked_wrong_turn", ""):
        fail("JMStudios wrong-turn guard is missing")
    estate_os = authority_body(authority, "estate-os-family")
    if estate_os.get("operating_front_room") != "JM Estate Multimedia Unit v2.3.0 S³":
        fail("Estate OS front-room role drift")
    if estate_os.get("assembly_crown") != "Altogether Assembly / JM Estate OS v2.0.2":
        fail("Estate OS assembly role drift")
    zion = authority_body(authority, "zionfolder-os")
    if zion.get("frozen_current_use_anchor") != "v1.1.1 Scroll Spine Fix":
        fail("Zionfolder frozen anchor drift")
    if set(zion.get("repair_donors", [])) != {"v0.8.7 guide-state repair", "v0.6.2 empty-script gate"}:
        fail("Zionfolder repair-donor set drift")

    expected_rows = [
        ("JM Estate Multimedia Unit", "v2.3.0 S³", "Operating Houses", "full_current"),
        ("JMStudios", "B0.8.2 source anchor", "Operating Houses", "routed"),
        ("Altogether Assembly / JM Estate OS", "v2.0.2 Assembly Crown", "Operating Houses", "full_current"),
        ("JM Zionfolder OS", "v1.1.1 Scroll Spine Fix", "Estate & Recovery", "full_current"),
    ]
    for name, fragment, category, status in expected_rows:
        if one_row(rows, name, fragment)[2:] != [category, status]:
            fail(f"Apps projection drift for {name}")

    family_names = {"JM Estate Multimedia Unit", "Altogether Assembly / JM Estate OS", "JM Estate OS", "Portal Engine"}
    if {row[0] for row in rows if row[0] in family_names} != family_names:
        fail("Estate OS family roles were collapsed or removed")

    partial = sum(state != "PACKAGE_SEARCH_ACTIVE" for state in [jm_state, zion_state])
    return {
        "status": "PASS_CENSUS_V0_2_SPECIALIST_PACKAGE_GATE",
        "targets": 4,
        "physical_packages_confirmed": 2,
        "partial_physical_bodies_confirmed": partial,
        "package_or_continuation_searches_held": 2,
        "jmstudios": jm_state,
        "zionfolder": zion_state,
        "next_gate": "Locate B0.8.3, Zionfolder v1.1.1 ZIP and both Zionfolder donor bodies",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.root)), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
