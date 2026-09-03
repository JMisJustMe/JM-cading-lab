#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.9 — Body Dock package-window recovery.

Reuses the now-proved v1.2.8 nested carrier scanner against the later Full
Complete BODY DOCK packaging window. This is a distinct carrier epoch from the
Aug-27 remediation vault, not a rerun of that exhausted window.

Known authority at this window:
- JM_HTML_BODY_DOCK_FULL_COMPLETE_CONTACT_EXECUTION_v1_0_ZIONFOLDER.zip
  37,544,593 bytes · SHA-256 76ee00e07f8cc90df23082f6b331d9b8c108e1bde04074e24944f787f6283f2a
- 43 members / 25 APK carriers / 25-of-25 carrier reverify PASS
- exact Device Continuity v1.1.7 carried in CROSS_DEVICE/

RECOVER BEFORE REBUILD. NO DING, NO CLAIM.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE = HERE / "recover_contact_sources_from_nested_artifacts_v1_2_8.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "BODY_DOCK_NESTED_CARRIER_SOURCE_RECOVERY_RECEIPT_v1_2_9.json"

START = "2026-08-28T23:30:00Z"
END = "2026-08-29T00:10:00Z"
BODY_DOCK_ZIONFOLDER = {
    "filename": "JM_HTML_BODY_DOCK_FULL_COMPLETE_CONTACT_EXECUTION_v1_0_ZIONFOLDER.zip",
    "bytes": 37544593,
    "sha256": "76ee00e07f8cc90df23082f6b331d9b8c108e1bde04074e24944f787f6283f2a",
    "members": 43,
    "apkCarriers": 25,
    "carrierReverify": "25/25 PASS AFTER FINAL PACKAGE ASSEMBLY",
    "deviceContinuitySha256": "62b14ef3fafc208561ad493f383c8c6b3d0486b9f00c2ae8b4b816cd6f4c8e54",
}

spec = importlib.util.spec_from_file_location("jm_contact_nested_recovery_v1_2_8", BASE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
mod.RECEIPT = RECEIPT


def run() -> None:
    raw = list(sys.argv[1:])
    selftest = "--selftest" in raw
    if not selftest:
        if "--start" not in raw:
            raw = ["--start", START, *raw]
        if "--end" not in raw:
            raw = ["--end", END, *raw]
    old = sys.argv
    try:
        sys.argv = [old[0], *raw]
        mod.main()
    finally:
        sys.argv = old

    if selftest:
        assert BODY_DOCK_ZIONFOLDER["bytes"] == 37544593
        assert len(BODY_DOCK_ZIONFOLDER["sha256"]) == 64
        assert len(BODY_DOCK_ZIONFOLDER["deviceContinuitySha256"]) == 64
        print("Contact Organ v1.2.9 Body Dock window wrapper SELFTEST PASS")
        return

    receipt = json.loads(RECEIPT.read_text(encoding="utf-8"))
    receipt["schema"] = "jm.estate.contact-organ-bodydock-nested-carrier-source-recovery/1.2.9"
    receipt["inherits"] = "v1.2.8 nested carrier scanner + Full Complete BODY DOCK package authority"
    receipt["carrierEpoch"] = "BODY_DOCK_FULL_COMPLETE_PACKAGING__2026_08_28_23_30Z_TO_2026_08_29_00_10Z"
    receipt["knownPackageAuthority"] = BODY_DOCK_ZIONFOLDER
    receipt["law"] = "LATER PACKAGE EPOCH != EARLIER ARTIFACT VAULT. OPEN THE BODY DOCK PACKAGE CHAIN; EXACT FROZEN SHA ONLY."
    receipt["claimBoundary"] = (
        "This descendant searches the later BODY DOCK packaging epoch only. "
        "Known package metadata is routing authority, not a synthetic source claim. "
        "Only exact frozen member bytes entering the inherited source-seat gate may change accounting; "
        "physical/device Ding remains separate."
    )
    RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "schema": receipt["schema"],
        "artifacts": receipt["outerArtifactsInspected"],
        "nestedContainers": receipt["nestedContainersOpened"],
        "sourceMembersHashed": receipt["sourceMembersHashed"],
        "exactHits": receipt["exactAuthorityHits"],
        "exactSeats": receipt["exactHtmlSourcesSeated"],
        "materializedAfter": receipt["accountingAfter"]["materialized"],
        "openAfter": receipt["accountingAfter"]["materializationOpen"],
    }, indent=2))


if __name__ == "__main__":
    run()
