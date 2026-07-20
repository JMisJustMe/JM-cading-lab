from __future__ import annotations

import argparse
import json
from pathlib import Path

EXPECTED_IDS = {"jmstudios-b083-physical-body", "zionfolder-v111-frozen-zip"}
EXPECTED_SURFACES = {
    "GitHub repository and named branches",
    "ChatGPT File Library title and content index",
    "governed Estate carrier payload registries",
    "AI Wisebase knowledge base",
}


def fail(message: str) -> None:
    raise SystemExit(f"HELD-ITEM RECOVERY GATE ERROR: {message}")


def expect(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def load(path: Path) -> dict:
    expect(path.is_file(), f"missing {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")
    expect(isinstance(value, dict), f"expected object in {path}")
    return value


def verify(root: Path) -> dict[str, object]:
    held = load(root / "registry/physical-current-best-census-v0.2-held-items.json")
    census = load(root / "registry/estate-physical-current-best-census-v0.2.json")
    studios_audit = load(root / "registry/jmstudios-b082-b083-physical-audit-v0.2.json")
    zion_audit = load(root / "registry/zionfolder-os-v111-physical-audit-v0.2.json")

    expect(held.get("status") == "TWO_TARGETS_HELD_AND_GOVERNED_CONNECTED_SWEEP_COMPLETE", "held register status drift")
    expect(held.get("held_count") == 2 and held.get("resolved_count") == 0, "held/resolved counts drift")
    sweep = held.get("connected_source_sweep", {})
    expect(sweep.get("status") == "COMPLETE_NO_EXACT_BYTES_FOUND", "connected-source sweep is not closed honestly")
    expect(set(sweep.get("surfaces", [])) == EXPECTED_SURFACES, "connected-source sweep coverage drift")
    expect("no exact JMStudios B0.8.3 body" in sweep.get("result", ""), "Wisebase B0.8.3 result boundary missing")
    expect("no relevant Zionfolder v1.1.1 ZIP" in sweep.get("result", ""), "Wisebase Zionfolder ZIP result boundary missing")
    expect("unindexed phone storage" in sweep.get("scope_boundary", ""), "unmounted owner-storage boundary missing")

    targets = held.get("targets", [])
    expect(len(targets) == 2, "expected exactly two held targets")
    target_map = {item.get("id"): item for item in targets if isinstance(item, dict)}
    expect(set(target_map) == EXPECTED_IDS, "held target identities drift")

    studios = target_map["jmstudios-b083-physical-body"]
    expect(studios.get("current_state") == "PHYSICAL_BODY_NOT_LOCATED", "B0.8.3 state was advanced without bytes")
    expect(studios.get("crown_state") == "HELD", "B0.8.3 crown was released")
    expect("AI Wisebase iterative retrieval" in studios.get("searched_surfaces", []), "B0.8.3 Wisebase sweep missing")
    expect(any("No accessible connected source returned bytes" in finding for finding in studios.get("search_findings", [])), "B0.8.3 no-byte finding missing")
    expect("JMStudios v0.9 Original Latest Start Router" in studios.get("rejected_substitutes", []), "B0.8.3 v0.9 guard missing")
    expect("Wisebase donor-estate description without physical bytes" in studios.get("rejected_substitutes", []), "B0.8.3 Wisebase substitute guard missing")
    expect("exact bytes located and hashed" in studios.get("exit_criteria", []), "B0.8.3 byte-proof criterion missing")
    compare = studios.get("must_compare_against", [])
    expect(any("b033ab12" in value for value in compare), "B0.8.2 source comparison hash missing")
    expect(any("b3f46d28" in value for value in compare), "B0.8.2 patch comparison hash missing")

    zion = target_map["zionfolder-v111-frozen-zip"]
    expect(zion.get("current_state") == "ARCHIVE_BYTES_NOT_LOCATED", "Zionfolder ZIP state was advanced without bytes")
    expect(zion.get("crown_state") == "HELD", "Zionfolder ZIP crown was released")
    expect("AI Wisebase iterative retrieval" in zion.get("searched_surfaces", []), "Zionfolder Wisebase sweep missing")
    expect(any("no relevant ZIP" in finding for finding in zion.get("search_findings", [])), "Zionfolder Wisebase no-ZIP finding missing")
    direct = zion.get("proven_direct_body", {})
    expect(direct.get("bytes") == 182692, "Zionfolder proven direct-body byte count drift")
    expect(direct.get("sha256") == "ef0192a67f7c503dfbaba348d3b5e1f5e4b14732d279012a5f2ec63653b21db4", "Zionfolder direct-body hash drift")
    donors = {item.get("filename"): item for item in zion.get("proven_donor_chain", []) if isinstance(item, dict)}
    expect(set(donors) == {"jm-zionfolder-os-v0_8_7.html", "jm-zionfolder-os-v0_6_2.html"}, "Zionfolder donor filenames drift")
    expect(donors["jm-zionfolder-os-v0_8_7.html"].get("sha256") == "4388f288476b9ecf767f80b1e1d52c3334dcca14e14669bea0029a710ec0fe4c", "v0.8.7 donor hash drift")
    expect(donors["jm-zionfolder-os-v0_6_2.html"].get("sha256") == "b3290f6bee629bc65ea2599a3d392b0635013400e048be8490897127a33ce95a", "v0.6.2 donor hash drift")
    expect("a newly reconstructed ZIP presented as the historical frozen archive" in zion.get("rejected_substitutes", []), "historical ZIP anti-reconstruction guard missing")
    expect("Wisebase or transcript reference without archive bytes" in zion.get("rejected_substitutes", []), "Zionfolder reference-only substitute guard missing")
    expect("historical archive bytes located and SHA256 recorded" in zion.get("exit_criteria", []), "Zionfolder historical archive criterion missing")

    census_targets = {item.get("id"): item for item in census.get("first_scope", []) if isinstance(item, dict)}
    expect(census_targets.get("jmstudios-b082-b083", {}).get("status") == "SOURCE_ANCHOR_BODY_CONFIRMED_CONTINUATION_SEARCH_ACTIVE", "canonical census no longer holds B0.8.3")
    expect(census_targets.get("zionfolder-os-v111", {}).get("status") == "DIRECT_HTML_AND_DONOR_CHAIN_CONFIRMED_ZIP_SEARCH_ACTIVE", "canonical census no longer holds Zionfolder ZIP")

    continuation = studios_audit.get("continuation", {})
    expect(continuation.get("crown_state") == "HELD_PENDING_PHYSICAL_BODY", "JMStudios audit released B0.8.3 crown")
    package = zion_audit.get("frozen_package", {})
    expect(package.get("package_crown_state") == "HELD_PENDING_ARCHIVE_BYTES", "Zionfolder audit released ZIP crown")

    boundary = held.get("boundary", "")
    expect("accessible GitHub, indexed Library, governed carrier or Wisebase sweep" in boundary, "connected-scope boundary missing")

    return {
        "status": "PASS_TWO_HELD_TARGETS_GOVERNED_CONNECTED_SWEEP_COMPLETE",
        "held_count": 2,
        "resolved_count": 0,
        "searched_surfaces": 4,
        "targets": [
            "JMStudios B0.8.3 Actual Crown Route",
            "jm-zionfolder-os-v1_1_1.zip",
        ],
        "next_gate": "Owner-side exact bytes plus target-specific exit criteria",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    print(json.dumps(verify(Path(args.root)), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
