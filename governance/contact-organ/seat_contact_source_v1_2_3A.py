#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.3A — native-seat repair wrapper.

The first v1.2.3 intake body correctly established the generic source-seat gate
but exposed one pre-contact implementation edge: after a native package had
already been copied into source carriage, the native receipt helper could try to
copy that seated file onto itself. This descendant repairs only that edge and
otherwise delegates to v1.2.3 unchanged.

RECOVER/REPAIR FORWARD. FROZEN HISTORY IS NOT REWRITTEN.
"""
from pathlib import Path
import importlib.util
import json
import shutil

HERE = Path(__file__).resolve().parent
BASE = HERE / "seat_contact_source_v1_2_3.py"

spec = importlib.util.spec_from_file_location("jm_contact_source_seat_v1_2_3", BASE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def fixed_seat_native_package(row: dict, candidate: Path, verification: dict) -> dict:
    target = mod.source_carriage_path(row)
    target.parent.mkdir(parents=True, exist_ok=True)
    source = candidate.resolve()
    target_resolved = target.resolve()
    if source != target_resolved:
        shutil.copyfile(source, target)
    if not target.exists():
        raise mod.GateError(f"{row['recipientId']}: native package source carriage missing after seat")
    if mod.digest(target) != verification["actualSha256"]:
        if source != target_resolved:
            target.unlink(missing_ok=True)
        raise mod.GateError(f"{row['recipientId']}: source-carriage copy SHA changed")

    outdir = mod.OUT / row["recipientId"]
    receipt = {
        "schema": "jm.estate.contact-organ-source-seat-receipt/1.2.3A",
        "recipientId": row["recipientId"],
        "carrierClass": row["carrierClass"],
        "sourceClass": "EXACT_NATIVE_PACKAGE_SEAT",
        "input": mod.relative(candidate),
        "seatedSource": mod.relative(target),
        **verification,
        "parentMutated": False,
        "genericHtmlPatch": "PROHIBITED",
        "nativeAdapter": row.get("nativeAdapter"),
        "materialized": False,
        "repair": "NATIVE_ALREADY_SEATED_SOURCE_IS_NOT_COPIED_ONTO_ITSELF",
        "next": "Mount/compile the native adapter into a clean Android source/package descendant, then build/install/contact under separate gates.",
        "physicalDing": "OPEN"
    }
    mod.write_json(outdir / "SOURCE_SEAT_RECEIPT_v1_2_3A.json", receipt)
    return receipt


mod.seat_native_package = fixed_seat_native_package

if __name__ == "__main__":
    mod.main()
