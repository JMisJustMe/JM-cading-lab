#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.10 — repaired early remediation artifact recovery.

Clean descendant of v1.2.9 contacted failure. Registers the dynamically loaded
v1.2.6 carrier before dataclass evaluation, overlays the completed v1.2.8 byte
counts, and routes exact recovered candidates through the v1.2.8 source-seat gate.

FROZEN PARENT -> CLEAN DESCENDANT.
EARLY WINDOW != LATER WINDOW.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE / "recover_contact_sources_from_actions_artifacts_v1_2_6.py"
AUTH8 = HERE / "source_seat_authority_overlay_v1_2_8.json"

spec = importlib.util.spec_from_file_location("jm_contact_artifact_recovery_v1_2_6_early_v1210", BASE)
parent = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = parent
spec.loader.exec_module(parent)

# Strengthen the inherited artifact scanner with the completed v1.2.8 byte-count authority.
for authority in json.loads(AUTH8.read_text(encoding="utf-8"))["rows"]:
    rid = authority["recipientId"]
    row = parent.mod.ROWS[rid]
    if row.get("expectedSha256") != authority["expectedSha256"]:
        raise RuntimeError(f"v1.2.10 SHA drift for {rid}")
    row["expectedBytes"] = authority["expectedBytes"]
    row["authorityClass"] = authority["authorityClass"]

parent.mod.SEAT = HERE / "seat_contact_source_v1_2_8.py"
parent.mod.RECEIPT = parent.mod.OUT / "EARLY_ACTIONS_ARTIFACT_SOURCE_RECOVERY_RECEIPT_v1_2_10.json"


def wrapper_selftest() -> None:
    parent.wrapper_selftest()
    html = [r for r in parent.mod.ROWS.values() if r["carrierClass"] != "NATIVE_ANDROID_SAF"]
    assert len(html) == 21
    assert all(r.get("expectedBytes") is not None for r in html)
    assert all(r.get("expectedSha256") for r in html)
    assert parent.mod.SEAT.name == "seat_contact_source_v1_2_8.py"
    print("Contact Organ v1.2.10 early-window repaired wrapper SELFTEST PASS")


def postprocess() -> None:
    p = parent.mod.RECEIPT
    row = json.loads(p.read_text(encoding="utf-8"))
    row["schema"] = "jm.estate.contact-organ-early-actions-artifact-recovery/1.2.10"
    row["inherits"] = "v1.2.9 contacted failure + v1.2.6 proven recursive carrier + v1.2.8 complete source authority"
    row["windowRole"] = "PRE_04_30_REMEDIATION_SOURCE_WINDOW"
    row["authorityGate"] = "21 HTML routes exact byte-count + SHA-256; native Housekeeper separate"
    row["nestedArchiveInspection"] = {
        "policy": "ZIP/TAR/TGZ recursive target-name exposure only",
        "maxDepth": parent.MAX_DEPTH,
        "maxMembersPerArtifact": parent.MAX_MEMBERS_PER_ARTIFACT,
        **parent.STATS,
    }
    row["claimBoundary"] = (
        "v1.2.10 promotes only exact early-artifact source bytes satisfying the completed frozen authority and clean source-seat gate. "
        "Artifact/window proximity, filename presence, build/install, and physical/device consequences alone earn no claim."
    )
    p.write_text(json.dumps(row, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if "--wrapper-selftest" in sys.argv:
        wrapper_selftest()
    else:
        parent.mod.main()
        postprocess()
