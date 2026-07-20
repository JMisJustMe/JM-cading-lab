from __future__ import annotations

import json
from pathlib import Path


class CensusError(RuntimeError):
    pass


def load(path: Path) -> dict:
    if not path.is_file():
        raise CensusError(f"missing {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise CensusError(f"expected object at {path}")
    return value


def verify(root: Path) -> dict[str, object]:
    census = load(root / "registry/estate-physical-current-best-census-v0.2-wave1.json")
    authority = load(root / "registry/estate-classification-authority-v1.0.json")

    if census.get("schema") != "JM.EstatePhysicalCurrentBestCensus/0.2-wave1":
        raise CensusError("unexpected census schema")
    if census.get("status") != "WAVE_1_PHYSICAL_VALIDATION_COMPLETE":
        raise CensusError("Wave 1 is not physically validated")
    if census.get("full_census_crowned") is not False:
        raise CensusError("full-census boundary was lost")

    rows = census.get("records")
    if not isinstance(rows, list) or len(rows) != 4:
        raise CensusError("Wave 1 must contain exactly four governed records")
    by_id = {row.get("id"): row for row in rows if isinstance(row, dict)}
    required = {
        "multimedia-unit-v2.3.0-s3",
        "altogether-assembly-v2.0.2",
        "zionfolder-os-v1.1.1",
        "jmstudios-source-line",
    }
    if set(by_id) != required:
        raise CensusError(f"Wave 1 record set drifted: {sorted(by_id)}")

    mm = by_id["multimedia-unit-v2.3.0-s3"]
    if (
        mm.get("authority_lane") != "STANDALONE_OPERATING_FRONT_ROOM"
        or mm.get("state") != "PHYSICALLY_VALIDATED_CURRENT_BEST"
        or mm.get("bytes") != 15795685
        or mm.get("sha256") != "6446bf28210e907fb2a41102df9a0942c853f10a69902a9f5907c6b11514ea0f"
        or mm.get("room_count") != 8
        or mm.get("javascript_syntax") != "PASS"
    ):
        raise CensusError("Multimedia Unit physical authority drifted")

    alt = by_id["altogether-assembly-v2.0.2"]
    if (
        alt.get("authority_lane") != "HOSTED_COMPLETE_BODY_ASSEMBLY_CROWN"
        or alt.get("state") != "PHYSICALLY_EXTRACTED_AND_VALIDATED"
        or alt.get("bytes") != 80118
        or alt.get("sha256") != "620910386c24025061ee55f1fdd850882243ba311f25e2bc631765304c44286b"
        or alt.get("host") != "JM Estate Multimedia Unit v2.3.0 S3"
        or alt.get("javascript_syntax") != "PASS"
    ):
        raise CensusError("Altogether hosted complete-body authority drifted")
    if "standalone-package authority is not claimed" not in str(alt.get("boundary", "")):
        raise CensusError("Altogether standalone-package boundary was weakened")

    zion = by_id["zionfolder-os-v1.1.1"]
    if (
        zion.get("authority_lane") != "STANDALONE_FROZEN_WORKSPACE_OS"
        or zion.get("state") != "PHYSICALLY_VALIDATED_CURRENT_BEST"
        or zion.get("bytes") != 182692
        or zion.get("sha256") != "ef0192a67f7c503dfbaba348d3b5e1f5e4b14732d279012a5f2ec63653b21db4"
        or zion.get("javascript_syntax") != "PASS"
        or zion.get("duplicate_static_dom_ids") != []
    ):
        raise CensusError("Zionfolder OS physical authority drifted")

    studios = by_id["jmstudios-source-line"]
    if studios.get("authority_lane") != "DEFERRED_SOURCE_CUSTODY_NOT_MISSING" or studios.get("state") != "DEFERRED":
        raise CensusError("JMStudios deferment was converted into a missing or false-current claim")
    studios_boundary = str(studios.get("boundary", ""))
    if "B0.8.2" not in studios_boundary or "B0.8.3" not in studios_boundary or "B1.2ALL.1" not in studios_boundary:
        raise CensusError("JMStudios lineage separation is incomplete")

    counts = census.get("counts")
    expected_counts = {
        "physically_validated": 3,
        "deferred": 1,
        "standalone_authorities": 2,
        "hosted_complete_body_authorities": 1,
    }
    if counts != expected_counts:
        raise CensusError(f"Wave 1 counts drifted: {counts}")

    auth_rows = authority.get("bodies")
    if not isinstance(auth_rows, list):
        raise CensusError("classification authority bodies unreadable")
    auth = {row.get("id"): row for row in auth_rows if isinstance(row, dict)}

    if auth.get("multimedia-unit", {}).get("operating_authority") != "v2.3.0 S³":
        raise CensusError("classification authority lost Multimedia Unit v2.3.0")
    estate = auth.get("estate-os-family", {})
    if estate.get("operating_front_room") != "JM Estate Multimedia Unit v2.3.0 S³":
        raise CensusError("Estate OS family lost its v2.3.0 front room")
    if estate.get("assembly_crown") != "Altogether Assembly / JM Estate OS v2.0.2":
        raise CensusError("Estate OS family lost Altogether v2.0.2 assembly crown")
    if auth.get("zionfolder-os", {}).get("frozen_current_use_anchor") != "v1.1.1 Scroll Spine Fix":
        raise CensusError("classification authority lost Zionfolder OS v1.1.1")
    jmstudios = auth.get("jmstudios", {})
    if jmstudios.get("source_anchor") != "B0.8.2 Original Source Patch Merge" or "B0.8.3" not in str(jmstudios.get("continuation", "")):
        raise CensusError("classification authority lost JMStudios source/continuation separation")

    return {
        "status": "PASS_PHYSICAL_CURRENT_BEST_CENSUS_WAVE_1",
        "physically_validated": 3,
        "deferred_not_missing": 1,
        "standalone_authorities": 2,
        "hosted_complete_body_authorities": 1,
        "full_census_crowned": False,
    }


def main() -> None:
    result = verify(Path("."))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
