#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.5 — authority-complete source-seat gate.

Loads the v1.2.3A source-seat machine, then strengthens the seven formerly-null
hash rows from the frozen Full Tool Estate remediation closeout. No source bytes
are synthesized; this only makes exact future/recovered bytes automatically
materialisable when they match their historical authority.
"""
from pathlib import Path
import importlib.util
import json

HERE = Path(__file__).resolve().parent
BASE = HERE / "seat_contact_source_v1_2_3A.py"
OVERLAY = HERE / "source_seat_authority_overlay_v1_2_5.json"

spec = importlib.util.spec_from_file_location("jm_contact_source_seat_v1_2_3A", BASE)
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)
mod = repair.mod

for authority in json.loads(OVERLAY.read_text(encoding="utf-8"))["rows"]:
    rid = authority["recipientId"]
    if rid not in mod.ROWS:
        raise RuntimeError(f"Authority overlay recipient missing from v1.2.3 manifest: {rid}")
    mod.ROWS[rid].update({
        "expectedBytes": authority["expectedBytes"],
        "expectedSha256": authority["expectedSha256"],
        "materializationEligible": authority["materializationEligible"],
        "authorityClass": authority["authorityClass"],
    })
    mod.ROWS[rid].pop("openReason", None)


def authority_selftest() -> None:
    overlay = json.loads(OVERLAY.read_text(encoding="utf-8"))
    assert len(overlay["rows"]) == 7
    assert all(mod.ROWS[r["recipientId"]]["expectedSha256"] == r["expectedSha256"] for r in overlay["rows"])
    assert all(mod.ROWS[r["recipientId"]]["materializationEligible"] for r in overlay["rows"])
    html_rows = [r for r in mod.ROWS.values() if r["carrierClass"] != "NATIVE_ANDROID_SAF"]
    assert all(r.get("expectedSha256") for r in html_rows)
    assert all(r.get("materializationEligible") for r in html_rows)
    native = [r for r in mod.ROWS.values() if r["carrierClass"] == "NATIVE_ANDROID_SAF"]
    assert len(native) == 1 and native[0]["recipientId"] == "phone-housekeeper"
    print("Contact Organ v1.2.5 authority-complete source-seat SELFTEST PASS")


if __name__ == "__main__":
    import sys
    if "--authority-selftest" in sys.argv:
        authority_selftest()
    else:
        mod.main()
