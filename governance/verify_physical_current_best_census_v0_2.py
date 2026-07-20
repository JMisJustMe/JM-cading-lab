from __future__ import annotations

import argparse
import json
from pathlib import Path
import re


CHAIN = [
    "Source Ledger",
    "Latest Body Finder",
    "Source-Body Auditor",
    "Current Best Register",
    "Crown Register",
    "Living Register",
]

TARGET_IDS = {
    "multimedia-unit-v230-s3",
    "jmstudios-b082-b083",
    "altogether-estate-os-v202",
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


def one_row(rows: list[list[str]], name: str, version_fragment: str | None = None) -> list[str]:
    matches = [
        row for row in rows
        if row[0] == name and (version_fragment is None or version_fragment in row[1])
    ]
    if len(matches) != 1:
        fail(f"expected one Apps row for {name!r} / {version_fragment!r}, found {len(matches)}")
    return matches[0]


def authority_body(authority: dict, body_id: str) -> dict:
    matches = [body for body in authority.get("bodies", []) if body.get("id") == body_id]
    if len(matches) != 1:
        fail(f"expected one classification authority body {body_id!r}, found {len(matches)}")
    return matches[0]


def verify(root: Path) -> dict[str, object]:
    census = load_json(root / "registry/physical-current-best-census-v0.2.json")
    authority = load_json(root / "registry/estate-classification-authority-v1.0.json")
    rows = parse_apps(root / "apps/index.html")

    if census.get("status") != "ACTIVE_BATCH_1_OPERATING_HOUSES":
        fail("census is not in the governed active Batch 1 state")
    if census.get("method") != CHAIN:
        fail("source-to-living chain order has drifted")

    batch = census.get("batch", {})
    targets = census.get("targets", [])
    ids = {target.get("id") for target in targets}
    if ids != TARGET_IDS or len(targets) != 4:
        fail(f"Batch 1 targets are wrong: {sorted(ids)}")
    if batch.get("target_count") != 4:
        fail("Batch 1 target count is not four")
    if batch.get("physical_crowns_granted") != 0 or batch.get("physical_crowns_held") != 4:
        fail("opening gate must hold all four physical crowns")
    if batch.get("state") != "OPEN_AND_GATED":
        fail("Batch 1 is not explicitly open and gated")

    for target in targets:
        stages = target.get("stages", {})
        required_stage_keys = {
            "source_ledger",
            "latest_body_finder",
            "source_body_auditor",
            "current_best_register",
            "crown_register",
            "living_register",
        }
        if set(stages) != required_stage_keys:
            fail(f"{target.get('id')} does not carry all six stages")
        if stages.get("crown_register") != "HELD":
            fail(f"{target.get('id')} was crowned before physical audit")
        if not str(stages.get("source_body_auditor", "")).startswith("PENDING_"):
            fail(f"{target.get('id')} auditor stage is not honestly pending")
        if "NOT_PHYSICAL_CENSUS_CROWN" not in str(stages.get("living_register", "")):
            fail(f"{target.get('id')} public projection boundary is missing")
        if not target.get("required_evidence"):
            fail(f"{target.get('id')} has no evidence demand")
        if not target.get("prohibited_shortcut"):
            fail(f"{target.get('id')} has no shortcut guard")

    multimedia = authority_body(authority, "multimedia-unit")
    if multimedia.get("operating_authority") != "v2.3.0 S³":
        fail("Multimedia Unit operating authority is not v2.3.0 S³")

    jmstudios = authority_body(authority, "jmstudios")
    if "B0.8.2" not in jmstudios.get("source_anchor", ""):
        fail("JMStudios B0.8.2 source anchor is missing")
    if "B0.8.3" not in jmstudios.get("continuation", ""):
        fail("JMStudios B0.8.3 continuation is missing")
    if "v0.9" not in jmstudios.get("parked_wrong_turn", ""):
        fail("JMStudios wrong-turn guard is missing")

    estate_os = authority_body(authority, "estate-os-family")
    if estate_os.get("operating_front_room") != "JM Estate Multimedia Unit v2.3.0 S³":
        fail("Estate OS family lost the Multimedia front-room role")
    if estate_os.get("assembly_crown") != "Altogether Assembly / JM Estate OS v2.0.2":
        fail("Estate OS family lost the Altogether v2.0.2 assembly role")
    if "v0.2.1" not in estate_os.get("active_additive_carrier", ""):
        fail("Estate OS additive carrier role is missing")

    zion = authority_body(authority, "zionfolder-os")
    if zion.get("frozen_current_use_anchor") != "v1.1.1 Scroll Spine Fix":
        fail("Zionfolder frozen current-use anchor is not v1.1.1")
    donors = set(zion.get("repair_donors", []))
    if donors != {"v0.8.7 guide-state repair", "v0.6.2 empty-script gate"}:
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
    present_family = {row[0] for row in rows if row[0] in family_names}
    if present_family != family_names:
        fail("Estate OS family roles have been collapsed or removed")

    return {
        "status": "PASS_CENSUS_V0_2_BATCH_1_OPEN",
        "targets": 4,
        "physical_crowns_granted": 0,
        "physical_crowns_held": 4,
        "authority_roles_verified": [
            "Multimedia front room",
            "JMStudios source/continuation split",
            "Altogether assembly crown classification",
            "Zionfolder frozen-use anchor and donors",
        ],
        "next_gate": "Source-Body Auditor exact package inspection",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.root)), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
