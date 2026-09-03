#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.9 — early remediation artifact-vault recovery.

Reuses the proven v1.2.6 redirect-safe recursive artifact carrier but preserves a
separate receipt for the earlier 2026-08-27 remediation window, including the
03:22–03:24 OneBody / Wave-01 source period.

EARLIER WINDOW != LATER WINDOW.
FROZEN PARENT -> CLEAN DESCENDANT.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE / "recover_contact_sources_from_actions_artifacts_v1_2_6.py"

spec = importlib.util.spec_from_file_location("jm_contact_artifact_recovery_v1_2_6_early", BASE)
parent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parent)

parent.mod.RECEIPT = parent.mod.OUT / "EARLY_ACTIONS_ARTIFACT_SOURCE_RECOVERY_RECEIPT_v1_2_9.json"


def postprocess() -> None:
    p = parent.mod.RECEIPT
    row = json.loads(p.read_text(encoding="utf-8"))
    row["schema"] = "jm.estate.contact-organ-early-actions-artifact-recovery/1.2.9"
    row["inherits"] = "v1.2.6 proven recursive artifact carrier; separate earlier remediation window"
    row["windowRole"] = "PRE_04_30_REMEDIATION_SOURCE_WINDOW"
    row["nestedArchiveInspection"] = {
        "policy": "ZIP/TAR/TGZ recursive target-name exposure only",
        "maxDepth": parent.MAX_DEPTH,
        "maxMembersPerArtifact": parent.MAX_MEMBERS_PER_ARTIFACT,
        **parent.STATS,
    }
    row["claimBoundary"] = (
        "v1.2.9 searches a distinct earlier Actions-artifact window and promotes only exact target-name bytes that satisfy frozen byte/SHA authority. "
        "Window proximity, artifact identity, filename presence, build/install, and physical/device contact alone earn no materialisation claim."
    )
    p.write_text(json.dumps(row, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if "--wrapper-selftest" in sys.argv:
        parent.wrapper_selftest()
        print("Contact Organ v1.2.9 early-window wrapper SELFTEST PASS")
    else:
        parent.mod.main()
        postprocess()
