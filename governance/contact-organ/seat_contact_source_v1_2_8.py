#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.8 — byte-count-complete authority gate.

Clean descendant of v1.2.5. Adds the four exact byte-count authorities recovered
from the frozen Full Tool Estate remediation closeout while preserving their
already-frozen SHA-256 identities.

FROZEN PARENT -> CLEAN DESCENDANT.
NO DING, NO CLAIM.
"""
from pathlib import Path
import importlib.util
import json

HERE = Path(__file__).resolve().parent
BASE = HERE / "seat_contact_source_v1_2_5.py"
OVERLAY = HERE / "source_seat_authority_overlay_v1_2_8.json"

spec = importlib.util.spec_from_file_location("jm_contact_source_seat_v1_2_5", BASE)
parent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parent)
mod = parent.mod

for authority in json.loads(OVERLAY.read_text(encoding="utf-8"))["rows"]:
    rid = authority["recipientId"]
    if rid not in mod.ROWS:
        raise RuntimeError(f"v1.2.8 authority recipient missing: {rid}")
    existing_sha = mod.ROWS[rid].get("expectedSha256")
    if existing_sha != authority["expectedSha256"]:
        raise RuntimeError(f"v1.2.8 SHA authority drift for {rid}: {existing_sha} != {authority['expectedSha256']}")
    mod.ROWS[rid]["expectedBytes"] = authority["expectedBytes"]
    mod.ROWS[rid]["authorityClass"] = authority["authorityClass"]


def authority_selftest() -> None:
    rows = json.loads(OVERLAY.read_text(encoding="utf-8"))["rows"]
    assert len(rows) == 4
    for r in rows:
        actual = mod.ROWS[r["recipientId"]]
        assert actual["expectedBytes"] == r["expectedBytes"]
        assert actual["expectedSha256"] == r["expectedSha256"]
    html = [r for r in mod.ROWS.values() if r["carrierClass"] != "NATIVE_ANDROID_SAF"]
    assert len(html) == 21
    assert all(r.get("expectedBytes") is not None for r in html)
    assert all(r.get("expectedSha256") for r in html)
    assert all(r.get("materializationEligible") for r in html)
    native = [r for r in mod.ROWS.values() if r["carrierClass"] == "NATIVE_ANDROID_SAF"]
    assert len(native) == 1 and native[0]["recipientId"] == "phone-housekeeper"
    print("Contact Organ v1.2.8 byte-count-complete authority SELFTEST PASS")


if __name__ == "__main__":
    import sys
    if "--authority-selftest" in sys.argv:
        authority_selftest()
    else:
        mod.main()
