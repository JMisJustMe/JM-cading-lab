#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.4 — whole Git-history source recovery.

Search every reachable Git blob, not only the current tree. Exact historical
source blobs are promoted only when their filename plus frozen SHA/byte authority
passes the v1.2.3 gate. Unknown-hash historical hits are recorded, never crowned.

HISTORY ABSENCE != SOURCE ABSENCE.
RECOVER BEFORE REBUILD.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MANIFEST = json.loads((HERE / "source_seat_manifest_v1_2_3.json").read_text(encoding="utf-8"))
ROWS = MANIFEST["rows"]
SEAT = HERE / "seat_contact_source_v1_2_3A.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "GIT_HISTORY_SOURCE_RECOVERY_RECEIPT_v1_2_4.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git(*args: str, binary: bool = False):
    p = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=not binary,
    )
    return p.stdout


def object_index() -> list[tuple[str, str]]:
    rows = []
    raw = git("rev-list", "--objects", "--all")
    for line in raw.splitlines():
        if " " not in line:
            continue
        oid, path = line.split(" ", 1)
        if path:
            rows.append((oid, path))
    return rows


def blob_bytes(oid: str) -> bytes:
    kind = git("cat-file", "-t", oid).strip()
    if kind != "blob":
        raise ValueError(f"{oid} is {kind}, not blob")
    return git("cat-file", "-p", oid, binary=True)


def expected_names(row: dict) -> list[str]:
    names = [row["expectedFile"]]
    if row.get("alternateCarrier"):
        names.append(row["alternateCarrier"])
    return names


def exact_for(row: dict, name: str, data: bytes) -> tuple[bool, str]:
    if name == row.get("alternateCarrier"):
        expected_hash = row.get("alternateCarrierSha256")
        expected_bytes = row.get("alternateCarrierBytes")
    else:
        expected_hash = row.get("expectedSha256")
        expected_bytes = row.get("expectedBytes")
    if expected_hash is None:
        return False, "NO_FROZEN_SHA_AUTHORITY"
    if expected_bytes is not None and len(data) != expected_bytes:
        return False, "BYTE_MISMATCH"
    if sha256(data) != expected_hash:
        return False, "SHA_MISMATCH"
    return True, "EXACT_AUTHORITY_MATCH"


def run_seat(recipient_id: str, filename: str, data: bytes, temp_root: Path) -> dict:
    path = temp_root / recipient_id / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    p = subprocess.run(
        [sys.executable, str(SEAT), "--recipient", recipient_id, "--candidate", str(path)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return {"candidate": str(path), "seatStdoutTail": p.stdout[-1600:]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()

    if args.selftest:
        fixture = b"history-fixture"
        row = {"expectedFile": "x", "expectedSha256": sha256(fixture), "expectedBytes": len(fixture)}
        assert exact_for(row, "x", fixture) == (True, "EXACT_AUTHORITY_MATCH")
        assert exact_for(row, "x", fixture + b"!")[0] is False
        nohash = {"expectedFile": "x", "expectedSha256": None, "expectedBytes": len(fixture)}
        assert exact_for(nohash, "x", fixture) == (False, "NO_FROZEN_SHA_AUTHORITY")
        print("Contact Organ v1.2.4 Git-history recovery SELFTEST PASS")
        return

    index = object_index()
    by_name: dict[str, list[tuple[str, str]]] = {}
    for oid, path in index:
        by_name.setdefault(Path(path).name, []).append((oid, path))

    results = []
    seated_ids = set()
    with tempfile.TemporaryDirectory(prefix="jm-contact-history-") as td:
        temp_root = Path(td)
        for row in ROWS:
            rid = row["recipientId"]
            hits = []
            exact = None
            for name in expected_names(row):
                for oid, historical_path in by_name.get(name, []):
                    try:
                        data = blob_bytes(oid)
                    except Exception as exc:
                        hits.append({"object": oid, "path": historical_path, "name": name, "state": "BLOB_READ_FAILED", "error": str(exc)})
                        continue
                    actual_hash = sha256(data)
                    ok, reason = exact_for(row, name, data)
                    hit = {
                        "object": oid,
                        "path": historical_path,
                        "name": name,
                        "bytes": len(data),
                        "sha256": actual_hash,
                        "state": reason,
                    }
                    hits.append(hit)
                    if ok and exact is None:
                        exact = (name, data, hit)
            if exact is None:
                results.append({
                    "recipientId": rid,
                    "status": "NO_EXACT_GIT_HISTORY_AUTHORITY" if hits else "FILENAME_NOT_IN_REACHABLE_GIT_HISTORY",
                    "hits": hits,
                })
                continue

            name, data, hit = exact
            try:
                seat_detail = run_seat(rid, name, data, temp_root)
                seated_ids.add(rid)
                results.append({
                    "recipientId": rid,
                    "status": "EXACT_GIT_HISTORY_SOURCE_SEATED",
                    "historicalObject": hit["object"],
                    "historicalPath": hit["path"],
                    "sourceName": name,
                    "bytes": len(data),
                    "sha256": sha256(data),
                    **seat_detail,
                })
            except subprocess.CalledProcessError as exc:
                results.append({
                    "recipientId": rid,
                    "status": "EXACT_HISTORY_BLOB_FOUND__SOURCE_SEAT_FAILED",
                    "historicalObject": hit["object"],
                    "historicalPath": hit["path"],
                    "stdout": exc.stdout[-2000:] if exc.stdout else "",
                    "stderr": exc.stderr[-2000:] if exc.stderr else "",
                })
                if args.strict:
                    raise

    propagation = json.loads((OUT / "PROPAGATION_RECEIPT_v1_2_3.json").read_text(encoding="utf-8"))
    receipt = {
        "schema": "jm.estate.contact-organ-git-history-source-recovery/1.2.4",
        "date": "2026-09-03",
        "law": "HISTORY ABSENCE != SOURCE ABSENCE. RECOVER BEFORE REBUILD.",
        "reachableNamedObjectsIndexed": len(index),
        "recipientRows": len(ROWS),
        "exactHistorySourcesSeated": len(seated_ids),
        "seatedRecipientIds": sorted(seated_ids),
        "results": results,
        "accountingAfterHistoryRecovery": {
            "totalRecipients": propagation["totalRecipients"],
            "materialized": propagation["materialized"],
            "materializationOpen": propagation["materializationOpen"],
            "unresolved": propagation["unresolved"],
        },
        "claimBoundary": "Git-history recovery can only promote an exact frozen authority blob. Historical filename matches without frozen SHA authority remain evidence, not source crown. Physical/device Ding remains separate."
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
