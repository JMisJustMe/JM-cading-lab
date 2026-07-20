from __future__ import annotations

import argparse
import json
from pathlib import Path
import re

CHAIN = "Source Ledger → Latest Body Finder → Source-Body Auditor → Current Best Register → Crown Register → Living Register"
TARGET_IDS = {"multimedia-unit-v230", "altogether-v202", "jmstudios-b082-b083", "zionfolder-os-v111"}


def fail(message: str) -> None:
    raise SystemExit(f"PHYSICAL CURRENT-BEST CENSUS ERROR: {message}")


def expect(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def load_json(path: Path) -> dict:
    expect(path.is_file(), f"missing {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")
    expect(isinstance(value, dict), f"expected JSON object in {path}")
    return value


def parse_apps(path: Path) -> list[list[str]]:
    expect(path.is_file(), f"missing {path}")
    match = re.search(r"const APPS=(\[.*?\]);\s*const APP_STAT_COUNTS=", path.read_text(encoding="utf-8"), re.S)
    expect(match is not None, "Apps House registry is unreadable")
    return json.loads(match.group(1))


def target(census: dict, body_id: str) -> dict:
    matches = [item for item in census.get("first_scope", []) if item.get("id") == body_id]
    expect(len(matches) == 1, f"expected one census target {body_id}")
    return matches[0]


def authority(authority_map: dict, body_id: str) -> dict:
    matches = [item for item in authority_map.get("bodies", []) if item.get("id") == body_id]
    expect(len(matches) == 1, f"expected one authority body {body_id}")
    return matches[0]


def verify_first_pair(census: dict) -> None:
    multimedia = target(census, "multimedia-unit-v230")
    expect(multimedia.get("status") == "PHYSICAL_PACKAGE_CONFIRMED", "Multimedia package confirmation was lost")
    expect(multimedia.get("package") == "JM_ESTATE_MULTIMEDIA_UNIT_v2_3_0_UNIVERSAL_EDITABLE_ZIONFOLDER.zip", "Multimedia package drift")
    expect(multimedia.get("package_bytes") == 37284419, "Multimedia package bytes drift")
    expect(multimedia.get("fresh_proof") == {
        "archive_integrity": "PASS",
        "externally_hashed_files": 21,
        "embedded_rooms": "PASS_8_OF_8_BYTE_IDENTICAL",
        "javascript_syntax": "PASS_16_OF_16",
        "standalone_solo_matches_package": "PASS",
    }, "Multimedia proof drift")
    expect(multimedia.get("ruling") == "CURRENT_OPERATING_FRONT_ROOM_AUTHORITY_CONFIRMED", "Multimedia ruling missing")
    expect("stale self-hash" in multimedia.get("custody_defect", ""), "Multimedia custody defect missing")

    altogether = target(census, "altogether-v202")
    expect(altogether.get("status") == "PHYSICAL_PACKAGE_CONFIRMED", "Altogether package confirmation was lost")
    expect(altogether.get("package") == "JM_ESTATE_ALTOGETHER_CURRENT_CROWN_v2_0_2_ZIONFOLDER.zip", "Altogether package drift")
    expect(altogether.get("package_bytes") == 82961, "Altogether package bytes drift")
    proof = altogether.get("fresh_proof", {})
    for key, value in {
        "archive_integrity": "PASS",
        "externally_hashed_files": 10,
        "mounted_body_descriptions": 53,
        "houses": 27,
        "full_body_fields_populated": "PASS_53_OF_53",
    }.items():
        expect(proof.get(key) == value, f"Altogether proof drift at {key}")
    expect(altogether.get("ruling") == "CURRENT_ASSEMBLY_CROWN_AUTHORITY_CONFIRMED", "Altogether ruling missing")
    expect("do not replace artifact-level proof" in altogether.get("boundary", ""), "Altogether boundary missing")


def verify_jmstudios(root: Path, item: dict) -> str:
    allowed = {"PHYSICAL_PACKAGE_SEARCH_ACTIVE", "SOURCE_ANCHOR_BODY_CONFIRMED_CONTINUATION_SEARCH_ACTIVE"}
    expect(item.get("status") in allowed, f"JMStudios status is not governed: {item.get('status')}")
    if item.get("status") == "PHYSICAL_PACKAGE_SEARCH_ACTIVE":
        return "PACKAGE_SEARCH_ACTIVE"

    audit = load_json(root / item.get("physical_audit", ""))
    expect(audit.get("status") == "PARTIAL_PHYSICAL_CONFIRMATION", "JMStudios audit status drift")
    source = audit.get("source_anchor", {})
    expect(source.get("filename") == "00_OPEN_FIRST_JMSTUDIOS_ORIGINAL_SOURCE_PATCH_MERGE_B0_8_2_CROWN.html", "JMStudios source filename drift")
    expect(source.get("bytes") == 6469894, "JMStudios source bytes drift")
    expect(source.get("sha256") == "b033ab12aee459b6a388732a2b3ab7952c21d035d0fb0cd741f1db36da01406f", "JMStudios source hash drift")
    expect((source.get("embedded_rooms"), source.get("substantive_rooms"), source.get("redirect_rooms")) == (13, 7, 6), "JMStudios room classification drift")
    expect(source.get("room_hash_set_sha256") == "71dab2f6363aadb0459a77502fe4efa024aae210eda858df3e5cc41fb595d13f", "JMStudios room hash-set drift")
    patch = audit.get("source_preserving_patch", {})
    expect(patch.get("sha256") == "b3f46d28478c0064ea18f8da4a128c75702f09984717a4dc26d7155235790890", "JMStudios patch hash drift")
    expect(patch.get("room_payload_relation") == "PASS_13_OF_13_BYTE_IDENTICAL_TO_SOURCE_ANCHOR", "JMStudios source/patch identity proof missing")
    continuation = audit.get("continuation", {})
    expect(continuation.get("physical_state") == "EXACT_BODY_NOT_LOCATED_IN_CURRENT_GITHUB_OR_LIBRARY_SWEEP", "B0.8.3 boundary drift")
    expect(continuation.get("crown_state") == "HELD_PENDING_PHYSICAL_BODY", "B0.8.3 crowned without body")
    return "B0.8.2_SOURCE_BODY_CONFIRMED_B0.8.3_HELD"


def verify_zionfolder(root: Path, item: dict) -> str:
    allowed = {
        "PHYSICAL_PACKAGE_SEARCH_ACTIVE",
        "DIRECT_HTML_BODY_CONFIRMED_ZIP_AND_DONOR_SEARCH_ACTIVE",
        "DIRECT_HTML_AND_DONOR_CHAIN_CONFIRMED_ZIP_SEARCH_ACTIVE",
    }
    expect(item.get("status") in allowed, f"Zionfolder status is not governed: {item.get('status')}")
    if item.get("status") == "PHYSICAL_PACKAGE_SEARCH_ACTIVE":
        return "PACKAGE_SEARCH_ACTIVE"

    audit = load_json(root / item.get("physical_audit", ""))
    body = audit.get("direct_body", {})
    package = audit.get("frozen_package", {})
    expect(body.get("filename") == "jm-zionfolder-os-v1_1_1.html", "Zionfolder filename drift")
    expect(package.get("package_crown_state") == "HELD_PENDING_ARCHIVE_BYTES", "Zionfolder ZIP crowned without bytes")

    if item.get("status") == "DIRECT_HTML_BODY_CONFIRMED_ZIP_AND_DONOR_SEARCH_ACTIVE":
        expect(audit.get("status") in {"PARTIAL_PHYSICAL_CONFIRMATION", "DIRECT_BODY_AND_DONOR_CHAIN_CONFIRMED_PACKAGE_HELD"}, "Zionfolder transitional audit status drift")
        expect(body.get("javascript_syntax") == "PASS_1_OF_1", "Zionfolder JS proof missing")
        return "V1.1.1_DIRECT_BODY_CONFIRMED_PACKAGE_CHAIN_HELD"

    expect(audit.get("status") == "DIRECT_BODY_AND_DONOR_CHAIN_CONFIRMED_PACKAGE_HELD", "Zionfolder donor-chain audit status drift")
    expect(body.get("bytes") == 182692, "Zionfolder raw body bytes drift")
    expect(body.get("sha256") == "ef0192a67f7c503dfbaba348d3b5e1f5e4b14732d279012a5f2ec63653b21db4", "Zionfolder raw body hash drift")
    expect(body.get("javascript_syntax") == "PASS_1_OF_1", "Zionfolder raw JS proof missing")
    correlation = body.get("transcript_correlations", {})
    expect(correlation.get("matching_extracted_copies") == 4, "Zionfolder correlation copy count drift")
    expect(correlation.get("relation_to_raw_file") == "PASS_IDENTICAL_AFTER_TRAILING_WHITESPACE_NORMALISATION", "Zionfolder raw/transcript relation missing")
    expect(package.get("physical_state") == "ZIP_BYTES_NOT_LOCATED_IN_CURRENT_GITHUB_OR_INDEXED_LIBRARY_SWEEP", "Zionfolder ZIP boundary drift")
    donors = {donor.get("body"): donor for donor in audit.get("repair_donors", [])}
    expect(set(donors) == {"JM Zionfolder OS v0.8.7", "JM Zionfolder OS v0.6.2"}, "Zionfolder donor set drift")
    guide = donors["JM Zionfolder OS v0.8.7"]
    empty = donors["JM Zionfolder OS v0.6.2"]
    expect((guide.get("bytes"), guide.get("sha256"), guide.get("javascript_syntax")) == (103962, "4388f288476b9ecf767f80b1e1d52c3334dcca14e14669bea0029a710ec0fe4c", "PASS_1_OF_1"), "Zionfolder v0.8.7 donor proof drift")
    expect((empty.get("bytes"), empty.get("sha256"), empty.get("javascript_syntax")) == (63062, "b3290f6bee629bc65ea2599a3d392b0635013400e048be8490897127a33ce95a", "PASS_1_OF_1"), "Zionfolder v0.6.2 donor proof drift")
    expect(all(donor.get("ruling") == "PHYSICAL_REPAIR_DONOR_CONFIRMED" for donor in donors.values()), "Zionfolder donor crown boundary drift")
    expect("not an Android" in audit.get("claim_boundary", ""), "Zionfolder native-OS boundary missing")
    return "V1.1.1_DIRECT_BODY_AND_DONOR_CHAIN_CONFIRMED_ZIP_HELD"


def verify_authority_and_projection(authority_map: dict, rows: list[list[str]]) -> None:
    multimedia = authority(authority_map, "multimedia-unit")
    expect(multimedia.get("operating_authority") == "v2.3.0 S³", "Multimedia authority drift")
    studios = authority(authority_map, "jmstudios")
    expect("B0.8.2" in studios.get("source_anchor", "") and "B0.8.3" in studios.get("continuation", ""), "JMStudios role split missing")
    expect("v0.9" in studios.get("parked_wrong_turn", ""), "JMStudios wrong-turn guard missing")
    estate = authority(authority_map, "estate-os-family")
    expect(estate.get("operating_front_room") == "JM Estate Multimedia Unit v2.3.0 S³", "Estate OS front-room drift")
    expect(estate.get("assembly_crown") == "Altogether Assembly / JM Estate OS v2.0.2", "Estate OS assembly drift")
    zion = authority(authority_map, "zionfolder-os")
    expect(zion.get("frozen_current_use_anchor") == "v1.1.1 Scroll Spine Fix", "Zionfolder frozen anchor drift")
    expect(set(zion.get("repair_donors", [])) == {"v0.8.7 guide-state repair", "v0.6.2 empty-script gate"}, "Zionfolder authority donor set drift")

    expected = [
        ("JM Estate Multimedia Unit", "v2.3.0 S³", "Operating Houses", "full_current"),
        ("JMStudios", "B0.8.2 source anchor", "Operating Houses", "routed"),
        ("Altogether Assembly / JM Estate OS", "v2.0.2 Assembly Crown", "Operating Houses", "full_current"),
        ("JM Zionfolder OS", "v1.1.1 Scroll Spine Fix", "Estate & Recovery", "full_current"),
    ]
    for name, fragment, category, status in expected:
        matches = [row for row in rows if row[0] == name and fragment in row[1]]
        expect(len(matches) == 1 and matches[0][2:] == [category, status], f"Apps projection drift for {name}")
    family = {"JM Estate Multimedia Unit", "Altogether Assembly / JM Estate OS", "JM Estate OS", "Portal Engine"}
    expect({row[0] for row in rows if row[0] in family} == family, "Estate OS family roles collapsed")


def verify(root: Path) -> dict[str, object]:
    census = load_json(root / "registry/estate-physical-current-best-census-v0.2.json")
    authority_map = load_json(root / "registry/estate-classification-authority-v1.0.json")
    rows = parse_apps(root / "apps/index.html")
    expect(census.get("status") in {"IN_PROGRESS_FIRST_SCOPE_2_OF_4", "IN_PROGRESS_FIRST_SCOPE_2_PACKAGES_2_PARTIAL_BODIES"}, "census status outside governed states")
    expect(census.get("method") == CHAIN, "source-to-living chain drift")
    scope = census.get("first_scope", [])
    expect(len(scope) == 4 and {item.get("id") for item in scope} == TARGET_IDS, "first-scope target set drift")
    verify_first_pair(census)
    studios_state = verify_jmstudios(root, target(census, "jmstudios-b082-b083"))
    zion_state = verify_zionfolder(root, target(census, "zionfolder-os-v111"))
    expect(census.get("first_pair_ruling") == "Multimedia operates the front room. Altogether selects, assembles and exports bodies. They connect; they do not collapse.", "first-pair role separation drift")
    expect("Fresh phone contact was not repeated" in census.get("boundary", ""), "device-contact boundary missing")
    verify_authority_and_projection(authority_map, rows)
    return {
        "status": "PASS_CENSUS_V0_2_SPECIALIST_PACKAGE_GATE",
        "targets": 4,
        "physical_packages_confirmed": 2,
        "partial_physical_bodies_confirmed": int(studios_state != "PACKAGE_SEARCH_ACTIVE") + int(zion_state != "PACKAGE_SEARCH_ACTIVE"),
        "package_or_continuation_searches_held": 2,
        "jmstudios": studios_state,
        "zionfolder": zion_state,
        "next_gate": "Locate B0.8.3 and the Zionfolder v1.1.1 ZIP archive",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.root)), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
