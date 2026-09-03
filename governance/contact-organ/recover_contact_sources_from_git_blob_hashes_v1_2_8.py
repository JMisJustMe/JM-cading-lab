#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.8 — content-addressed reachable-Git recovery.

Clean repair of v1.2.7 after recovering the four missing byte-count authorities.
Every reachable Git blob is rejected by size first; plausible blobs are SHA-256
checked against all 21 frozen HTML source identities. Exact matches are restored
under canonical filenames and passed through the v1.2.8 source-seat gate.

PATH ABSENCE != BYTE ABSENCE.
FROZEN PARENT -> CLEAN DESCENDANT.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SEAT_SCRIPT = HERE / "seat_contact_source_v1_2_8.py"
SEAT_MODULE = HERE / "seat_contact_source_v1_2_8.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "GIT_BLOB_HASH_SOURCE_RECOVERY_RECEIPT_v1_2_8.json"

spec = importlib.util.spec_from_file_location("jm_contact_seat_v1_2_8_for_hash_recovery", SEAT_MODULE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
ROWS = gate.mod.ROWS
TARGETS = {
    rid: row for rid, row in ROWS.items()
    if row.get("carrierClass") != "NATIVE_ANDROID_SAF" and row.get("materializationEligible")
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(args, *, input_text: str | None = None, binary: bool = False):
    proc = subprocess.run(
        args,
        cwd=ROOT,
        input=(input_text.encode("utf-8") if input_text is not None else None),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"command failed {proc.returncode}: {' '.join(map(str,args))}\n" +
            proc.stderr.decode("utf-8", errors="replace")[-1600:]
        )
    return proc.stdout if binary else proc.stdout.decode("utf-8", errors="strict")


def current_accounting() -> dict:
    p = OUT / "PROPAGATION_RECEIPT_v1_2_3.json"
    if not p.exists():
        return {"totalRecipients": 28, "materialized": 6, "materializationOpen": 22, "unresolved": 0}
    row = json.loads(p.read_text(encoding="utf-8"))
    return {k: row[k] for k in ("totalRecipients", "materialized", "materializationOpen", "unresolved")}


def object_names() -> tuple[list[str], dict[str, list[str]]]:
    text = run(["git", "rev-list", "--objects", "--all"])
    ids: list[str] = []
    names: dict[str, list[str]] = defaultdict(list)
    seen = set()
    for line in text.splitlines():
        if not line.strip():
            continue
        oid, *rest = line.split(" ", 1)
        if oid not in seen:
            ids.append(oid)
            seen.add(oid)
        if rest and rest[0]:
            names[oid].append(rest[0])
    return ids, names


def object_meta(ids: list[str]) -> dict[str, tuple[str, int]]:
    if not ids:
        return {}
    text = run(
        ["git", "cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
        input_text="\n".join(ids) + "\n",
    )
    out = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) != 3 or parts[1] == "missing":
            continue
        out[parts[0]] = (parts[1], int(parts[2]))
    return out


def seat_match(rid: str, data: bytes, temp_root: Path) -> dict:
    row = TARGETS[rid]
    candidate = temp_root / rid / row["expectedFile"]
    candidate.parent.mkdir(parents=True, exist_ok=True)
    candidate.write_bytes(data)
    proc = subprocess.run(
        [sys.executable, str(SEAT_SCRIPT), "--recipient", rid, "--candidate", str(candidate)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError((proc.stdout + "\n" + proc.stderr)[-2200:])
    return {"seatStdoutTail": proc.stdout[-1600:]}


def selftest() -> None:
    assert len(ROWS) == 22
    assert len(TARGETS) == 21
    assert all(r.get("expectedBytes") is not None for r in TARGETS.values())
    assert all(r.get("expectedSha256") for r in TARGETS.values())
    assert all(r.get("materializationEligible") for r in TARGETS.values())
    assert len([r for r in ROWS.values() if r.get("carrierClass") == "NATIVE_ANDROID_SAF"]) == 1
    assert len({(r["expectedBytes"], r["expectedSha256"]) for r in TARGETS.values()}) == 21
    print("Contact Organ v1.2.8 Git blob hash recovery SELFTEST PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        selftest()
        return

    before = current_accounting()
    ids, names = object_names()
    meta = object_meta(ids)

    by_size: dict[int, list[str]] = defaultdict(list)
    for rid, row in TARGETS.items():
        by_size[int(row["expectedBytes"])].append(rid)

    blobs = [(oid, size) for oid, (kind, size) in meta.items() if kind == "blob"]
    plausible = [(oid, size) for oid, size in blobs if size in by_size]
    matches = []
    seated = set()
    bytes_hashed = 0

    with tempfile.TemporaryDirectory(prefix="jm-git-blob-recovery-") as td:
        temp_root = Path(td)
        for oid, size in plausible:
            data = run(["git", "cat-file", "blob", oid], binary=True)
            bytes_hashed += len(data)
            actual_sha = sha256(data)
            for rid in by_size[size]:
                row = TARGETS[rid]
                if actual_sha != row["expectedSha256"]:
                    continue
                hit = {
                    "recipientId": rid,
                    "gitObject": oid,
                    "historicalNames": names.get(oid, []),
                    "bytes": size,
                    "sha256": actual_sha,
                    "canonicalFilename": row["expectedFile"],
                    "state": "EXACT_FROZEN_AUTHORITY_BLOB_MATCH",
                }
                matches.append(hit)
                if rid in seated:
                    continue
                try:
                    hit.update({"state": "EXACT_GIT_BLOB_SOURCE_SEATED", **seat_match(rid, data, temp_root)})
                    seated.add(rid)
                except Exception as exc:
                    hit.update({"state": "EXACT_GIT_BLOB_FOUND__SOURCE_SEAT_FAILED", "error": str(exc)})

    after = current_accounting()
    receipt = {
        "schema": "jm.estate.contact-organ-git-blob-hash-recovery/1.2.8",
        "date": "2026-09-03",
        "inherits": "v1.2.7 contacted failure + v1.2.8 complete byte-count authority",
        "law": "PATH ABSENCE != BYTE ABSENCE. EXACT SIZE + SHA-256 EARNS SOURCE RECOVERY.",
        "targetHtmlAuthorities": len(TARGETS),
        "reachableObjectsEnumerated": len(ids),
        "reachableBlobs": len(blobs),
        "plausibleSizeMatchedBlobs": len(plausible),
        "bytesHashed": bytes_hashed,
        "exactAuthorityBlobMatches": len(matches),
        "seatedRecipientIds": sorted(seated),
        "matches": matches,
        "accountingBefore": before,
        "accountingAfter": after,
        "claimBoundary": "Content-addressed Git recovery promotes only exact frozen byte-count + SHA-256 source identities. Path/name similarity, blob size alone, build/install and physical/device consequences earn no claim."
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
