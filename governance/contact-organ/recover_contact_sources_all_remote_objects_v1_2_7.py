#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.7 — all-remote-object exact source recovery.

Searches every unique Git blob reachable from every remote branch, independent of
branch name and final remediation filename. The scan is SHA-first and authority
strict: only an exact frozen SHA (and frozen byte count where known) may enter the
existing v1.2.5 source-seat gate.

This is deliberately broader than v1.2.6 branch routing while remaining stricter
than semantic/filename matching.

REMOTE OBJECT PRESENCE != SOURCE AUTHORITY.
EXACT FROZEN SHA -> SOURCE SEAT -> CLEAN DESCENDANT.
RECOVER BEFORE REBUILD. NO DING, NO CLAIM.
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
BASE_MANIFEST = json.loads((HERE / "source_seat_manifest_v1_2_3.json").read_text(encoding="utf-8"))
OVERLAY = json.loads((HERE / "source_seat_authority_overlay_v1_2_5.json").read_text(encoding="utf-8"))
SEAT = HERE / "seat_contact_source_v1_2_5.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "ALL_REMOTE_OBJECT_SOURCE_RECOVERY_RECEIPT_v1_2_7.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sh(*args: str, binary: bool = False, check: bool = True):
    p = subprocess.run(args, cwd=ROOT, check=check, capture_output=True, text=not binary)
    return p.stdout


def build_rows() -> dict[str, dict]:
    rows = {r["recipientId"]: dict(r) for r in BASE_MANIFEST["rows"]}
    for a in OVERLAY["rows"]:
        rid = a["recipientId"]
        if rid not in rows:
            raise RuntimeError(f"overlay recipient missing from base manifest: {rid}")
        rows[rid].update(a)
        rows[rid].pop("openReason", None)
    if len(rows) != 22:
        raise RuntimeError(f"expected 22 open recipient rows, got {len(rows)}")
    return rows


ROWS = build_rows()


def authorities() -> list[dict]:
    out = []
    for rid, row in ROWS.items():
        expected_sha = row.get("expectedSha256")
        if expected_sha:
            out.append({
                "recipientId": rid,
                "carrierClass": row["carrierClass"],
                "authorityKind": "EXPECTED_CURRENT_SOURCE",
                "authorityName": row["expectedFile"],
                "expectedBytes": row.get("expectedBytes"),
                "sha256": expected_sha,
            })
        if row.get("alternateCarrier") and row.get("alternateCarrierSha256"):
            out.append({
                "recipientId": rid,
                "carrierClass": row["carrierClass"],
                "authorityKind": "EXACT_EXTRACTION_CARRIER",
                "authorityName": row["alternateCarrier"],
                "expectedBytes": row.get("alternateCarrierBytes"),
                "sha256": row["alternateCarrierSha256"],
            })
    return out


AUTHORITIES = authorities()
BY_SIZE: dict[int, list[dict]] = defaultdict(list)
UNKNOWN_SIZE: list[dict] = []
for a in AUTHORITIES:
    if a.get("expectedBytes") is None:
        UNKNOWN_SIZE.append(a)
    else:
        BY_SIZE[int(a["expectedBytes"])].append(a)


def current_accounting() -> dict:
    p = OUT / "PROPAGATION_RECEIPT_v1_2_3.json"
    if not p.exists():
        return {"totalRecipients": 28, "materialized": 6, "materializationOpen": 22, "unresolved": 0}
    data = json.loads(p.read_text(encoding="utf-8"))
    return {k: data[k] for k in ("totalRecipients", "materialized", "materializationOpen", "unresolved")}


def list_remote_objects() -> list[tuple[str, str]]:
    raw = sh("git", "rev-list", "--objects", "--remotes")
    rows = []
    seen = set()
    for line in raw.splitlines():
        line = line.rstrip()
        if not line:
            continue
        if " " in line:
            oid, path = line.split(" ", 1)
        else:
            oid, path = line, ""
        if oid in seen:
            continue
        seen.add(oid)
        rows.append((oid, path))
    return rows


def batch_object_info(oids: list[str]) -> dict[str, tuple[str, int]]:
    if not oids:
        return {}
    proc = subprocess.run(
        ["git", "cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
        cwd=ROOT, input="\n".join(oids) + "\n", capture_output=True, text=True, check=True,
    )
    out = {}
    for line in proc.stdout.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        oid, typ, size = parts
        out[oid] = (typ, int(size))
    return out


def blob_bytes(oid: str) -> bytes:
    return sh("git", "cat-file", "blob", oid, binary=True)


def eligible_unknown_size_path(path: str, authority: dict) -> bool:
    suffix = Path(path).suffix.lower()
    if authority["carrierClass"] == "NATIVE_ANDROID_SAF":
        return suffix in {".zip", ".aar", ".apk"}
    return suffix in {".html", ".htm"}


def seat_exact(authority: dict, data: bytes, temp_root: Path) -> dict:
    rid = authority["recipientId"]
    candidate = temp_root / rid / authority["authorityName"]
    candidate.parent.mkdir(parents=True, exist_ok=True)
    candidate.write_bytes(data)
    proc = subprocess.run(
        [sys.executable, str(SEAT), "--recipient", rid, "--candidate", str(candidate)],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    return {"seatStdoutTail": proc.stdout[-1800:]}


def refs_containing(oid: str, limit: int = 20) -> list[str]:
    proc = subprocess.run(
        ["git", "branch", "-r", "--contains", oid], cwd=ROOT, capture_output=True, text=True, check=False,
    )
    rows = [x.strip() for x in proc.stdout.splitlines() if x.strip() and "->" not in x]
    return rows[:limit]


def selftest() -> None:
    assert len(ROWS) == 22
    assert len(AUTHORITIES) >= 22
    html = [r for r in ROWS.values() if r["carrierClass"] != "NATIVE_ANDROID_SAF"]
    assert len(html) == 21
    assert all(r.get("expectedSha256") for r in html)
    assert ROWS["phone-housekeeper"]["carrierClass"] == "NATIVE_ANDROID_SAF"
    assert any(a["authorityKind"] == "EXACT_EXTRACTION_CARRIER" and a["recipientId"] == "cross-continuity" for a in AUTHORITIES)
    assert any(a["sha256"] == "345038e8ece9755f55b0caa60d98b7ac63dbd43c97b422c09e2d804b3ac7fe98" for a in AUTHORITIES)
    fixture = b"all-remote-object-fixture"
    assert sha256(fixture) == hashlib.sha256(fixture).hexdigest()
    print("Contact Organ v1.2.7 all-remote-object recovery SELFTEST PASS")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--max-ref-provenance", type=int, default=20)
    args = ap.parse_args()
    if args.selftest:
        selftest(); return

    before = current_accounting()
    objects = list_remote_objects()
    info = batch_object_info([oid for oid, _ in objects])

    blobs = []
    for oid, path in objects:
        typ_size = info.get(oid)
        if not typ_size or typ_size[0] != "blob":
            continue
        blobs.append({"oid": oid, "path": path, "size": typ_size[1]})

    size_pruned = []
    suffix_pruned = []
    for b in blobs:
        if b["size"] in BY_SIZE:
            size_pruned.append(b)
            continue
        if UNKNOWN_SIZE and any(eligible_unknown_size_path(b["path"], a) for a in UNKNOWN_SIZE):
            suffix_pruned.append(b)

    candidates = []
    seen = set()
    for b in size_pruned + suffix_pruned:
        if b["oid"] in seen:
            continue
        seen.add(b["oid"])
        candidates.append(b)

    exact_hits = []
    exact_seats = []
    native_exact = []
    seat_failures = []
    seated_recipient_ids = set()
    hashed_bytes = 0

    with tempfile.TemporaryDirectory(prefix="jm-contact-all-remotes-") as td:
        tmp = Path(td)
        for b in candidates:
            data = blob_bytes(b["oid"])
            hashed_bytes += len(data)
            digest = sha256(data)

            auths = list(BY_SIZE.get(len(data), []))
            auths.extend(a for a in UNKNOWN_SIZE if eligible_unknown_size_path(b["path"], a))
            matched = [a for a in auths if a["sha256"] == digest and (a.get("expectedBytes") is None or int(a["expectedBytes"]) == len(data))]
            for a in matched:
                hit = {
                    "recipientId": a["recipientId"],
                    "carrierClass": a["carrierClass"],
                    "authorityKind": a["authorityKind"],
                    "authorityName": a["authorityName"],
                    "objectId": b["oid"],
                    "firstNamedPath": b["path"],
                    "bytes": len(data),
                    "sha256": digest,
                    "remoteRefsContaining": refs_containing(b["oid"], args.max_ref_provenance),
                }
                exact_hits.append(hit)
                rid = a["recipientId"]
                if rid in seated_recipient_ids:
                    continue
                if a["carrierClass"] == "NATIVE_ANDROID_SAF":
                    native_exact.append({**hit, "state": "EXACT_NATIVE_PACKAGE_FOUND__NATIVE_DESCENDANT_STILL_REQUIRED"})
                    seated_recipient_ids.add(rid)
                    continue
                try:
                    seat = seat_exact(a, data, tmp)
                    exact_seats.append({**hit, "state": "EXACT_REMOTE_OBJECT_SOURCE_SEATED", **seat})
                    seated_recipient_ids.add(rid)
                except subprocess.CalledProcessError as exc:
                    seat_failures.append({
                        **hit,
                        "state": "EXACT_REMOTE_OBJECT_FOUND__SOURCE_SEAT_FAILED",
                        "stdout": (exc.stdout or "")[-1800:],
                        "stderr": (exc.stderr or "")[-1800:],
                    })

    after = current_accounting()
    receipt = {
        "schema": "jm.estate.contact-organ-all-remote-object-source-recovery/1.2.7",
        "date": "2026-09-03",
        "law": "REMOTE OBJECT PRESENCE != SOURCE AUTHORITY. EXACT FROZEN SHA ONLY.",
        "remoteObjectEntries": len(objects),
        "uniqueBlobObjects": len(blobs),
        "knownSizeAuthorityCount": sum(len(v) for v in BY_SIZE.values()),
        "unknownSizeAuthorityCount": len(UNKNOWN_SIZE),
        "knownSizeCandidateBlobs": len(size_pruned),
        "unknownSizeSourceLikeCandidateBlobs": len(suffix_pruned),
        "uniqueCandidateBlobsHashed": len(candidates),
        "candidateBytesHashed": hashed_bytes,
        "exactAuthorityHits": len(exact_hits),
        "exactHtmlSourcesSeated": len(exact_seats),
        "exactNativePackagesFound": len(native_exact),
        "seatedRecipientIds": sorted({x["recipientId"] for x in exact_seats}),
        "nativeExactRecipientIds": sorted({x["recipientId"] for x in native_exact}),
        "exactHits": exact_hits,
        "exactSeats": exact_seats,
        "nativeExact": native_exact,
        "seatFailures": seat_failures,
        "accountingBefore": before,
        "accountingAfter": after,
        "claimBoundary": "Only exact frozen SHA/byte authority from a Git blob may enter the existing source-seat materialisation gate. Native package hits remain unmaterialised until a qualified native descendant is built. Build/install and physical Ding remain separate."
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
