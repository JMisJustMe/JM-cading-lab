#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.6 — branch/source-package recovery.

Searches body-specific remote branches by actual blob content SHA-256 rather than
final remediation filename. Exact frozen authority may enter the existing
v1.2.5 source-seat gate. Same-body branches without an exact frozen match are
recorded as lineage only.

BRANCH PRESENCE != CURRENT SOURCE AUTHORITY.
EXACT FROZEN SHA -> SOURCE SEAT -> CLEAN DESCENDANT.
RECOVER BEFORE REBUILD. NO DING, NO CLAIM.
"""
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REGISTRY = json.loads((HERE / "branch_source_recovery_registry_v1_2_6.json").read_text(encoding="utf-8"))
BASE = json.loads((HERE / "source_seat_manifest_v1_2_3.json").read_text(encoding="utf-8"))
OVERLAY = json.loads((HERE / "source_seat_authority_overlay_v1_2_5.json").read_text(encoding="utf-8"))
SEAT = HERE / "seat_contact_source_v1_2_5.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "BRANCH_SOURCE_RECOVERY_RECEIPT_v1_2_6.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(*args: str, binary: bool = False, check: bool = True):
    p = subprocess.run(args, cwd=ROOT, check=check, capture_output=True, text=not binary)
    return p.stdout


def build_rows() -> dict[str, dict]:
    rows = {r["recipientId"]: dict(r) for r in BASE["rows"]}
    for a in OVERLAY["rows"]:
        rows[a["recipientId"]].update(a)
        rows[a["recipientId"]].pop("openReason", None)
    routing = {r["recipientId"]: r for r in REGISTRY["rows"]}
    if set(rows) != set(routing):
        raise RuntimeError(f"22-row routing mismatch missing={sorted(set(rows)-set(routing))} extra={sorted(set(routing)-set(rows))}")
    for rid, route in routing.items():
        rows[rid]["branchPatterns"] = list(route["branchPatterns"])
    return rows


ROWS = build_rows()


def authority_variants(row: dict) -> list[dict]:
    out = [{
        "name": row["expectedFile"],
        "bytes": row.get("expectedBytes"),
        "sha256": row.get("expectedSha256"),
        "kind": "EXPECTED_CURRENT_SOURCE",
    }]
    if row.get("alternateCarrier") and row.get("alternateCarrierSha256"):
        out.append({
            "name": row["alternateCarrier"],
            "bytes": row.get("alternateCarrierBytes"),
            "sha256": row.get("alternateCarrierSha256"),
            "kind": "EXACT_EXTRACTION_CARRIER",
        })
    return out


def remote_branches() -> list[str]:
    raw = run("git", "for-each-ref", "--format=%(refname:short)", "refs/remotes/origin")
    rows = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line == "origin/HEAD":
            continue
        rows.append(line)
    return sorted(set(rows))


def matched_branches(row: dict, branches: list[str]) -> list[str]:
    found = []
    for ref in branches:
        short = ref.removeprefix("origin/")
        if any(fnmatch.fnmatch(short.lower(), p.lower()) for p in row["branchPatterns"]):
            found.append(ref)
    return found


def tree_blobs(ref: str) -> list[dict]:
    raw = run("git", "ls-tree", "-r", "-l", ref)
    out = []
    for line in raw.splitlines():
        if "\t" not in line:
            continue
        meta, path = line.split("\t", 1)
        parts = meta.split()
        if len(parts) < 4 or parts[1] != "blob":
            continue
        size = None if parts[3] == "-" else int(parts[3])
        out.append({"blob": parts[2], "size": size, "path": path})
    return out


def source_like(row: dict, blob: dict) -> bool:
    variants = authority_variants(row)
    known_sizes = {v["bytes"] for v in variants if v.get("bytes") is not None}
    if known_sizes and blob["size"] in known_sizes:
        return True
    suffix = Path(blob["path"]).suffix.lower()
    if row["carrierClass"] == "NATIVE_ANDROID_SAF":
        return suffix in {".zip", ".aar", ".apk"}
    return suffix in {".html", ".htm"}


def blob_bytes(blob_sha: str) -> bytes:
    return run("git", "cat-file", "blob", blob_sha, binary=True)


def current_accounting() -> dict:
    p = OUT / "PROPAGATION_RECEIPT_v1_2_3.json"
    if not p.exists():
        return {"totalRecipients": 28, "materialized": 6, "materializationOpen": 22, "unresolved": 0}
    data = json.loads(p.read_text(encoding="utf-8"))
    return {k: data[k] for k in ("totalRecipients", "materialized", "materializationOpen", "unresolved")}


def seat_exact(rid: str, authority: dict, data: bytes, temp_root: Path) -> dict:
    candidate = temp_root / rid / authority["name"]
    candidate.parent.mkdir(parents=True, exist_ok=True)
    candidate.write_bytes(data)
    proc = subprocess.run(
        [sys.executable, str(SEAT), "--recipient", rid, "--candidate", str(candidate)],
        cwd=ROOT, check=True, capture_output=True, text=True,
    )
    return {"seatStdoutTail": proc.stdout[-1600:]}


def selftest() -> None:
    assert len(REGISTRY["rows"]) == 22
    assert len({r["recipientId"] for r in REGISTRY["rows"]}) == 22
    assert all(r["branchPatterns"] for r in REGISTRY["rows"])
    html = [r for r in ROWS.values() if r["carrierClass"] != "NATIVE_ANDROID_SAF"]
    assert len(html) == 21
    assert all(r.get("expectedSha256") for r in html)
    assert ROWS["phone-housekeeper"]["carrierClass"] == "NATIVE_ANDROID_SAF"
    assert ROWS["phone-intertap"]["expectedSha256"] == "43e299559cbc39a462bc854563512a8fc8492a62f26d86b9f0b7b81e82e65612"
    assert fnmatch.fnmatch("intertap-clean-v0-1-4", "*intertap*")
    fixture = b"branch-source-fixture"
    assert sha256(fixture) == hashlib.sha256(fixture).hexdigest()
    print("Contact Organ v1.2.6 branch-source recovery SELFTEST PASS")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--max-lineage-files", type=int, default=20)
    args = ap.parse_args()
    if args.selftest:
        selftest(); return

    before = current_accounting()
    branches = remote_branches()
    exact_hits = []
    exact_seated = []
    native_exact = []
    rows_out = []
    seated: set[str] = set()
    global_blob_cache: dict[str, bytes] = {}

    with tempfile.TemporaryDirectory(prefix="jm-contact-branch-") as td:
        tmp = Path(td)
        for rid, row in ROWS.items():
            refs = matched_branches(row, branches)
            seen_blobs: set[str] = set()
            candidates = []
            matches = []
            for ref in refs:
                try:
                    blobs = tree_blobs(ref)
                except subprocess.CalledProcessError as exc:
                    candidates.append({"branch": ref, "state": "TREE_READ_FAILED", "detail": str(exc)})
                    continue
                for blob in blobs:
                    if blob["blob"] in seen_blobs or not source_like(row, blob):
                        continue
                    seen_blobs.add(blob["blob"])
                    if len(candidates) < args.max_lineage_files:
                        candidates.append({"branch": ref, "path": blob["path"], "bytes": blob["size"], "gitBlob": blob["blob"]})
                    data = global_blob_cache.get(blob["blob"])
                    if data is None:
                        data = blob_bytes(blob["blob"])
                        global_blob_cache[blob["blob"]] = data
                    digest = sha256(data)
                    for authority in authority_variants(row):
                        if authority.get("sha256") != digest:
                            continue
                        if authority.get("bytes") is not None and len(data) != authority["bytes"]:
                            continue
                        hit = {
                            "recipientId": rid, "branch": ref, "path": blob["path"],
                            "gitBlob": blob["blob"], "bytes": len(data), "sha256": digest,
                            "authorityKind": authority["kind"], "authorityName": authority["name"],
                        }
                        matches.append(hit); exact_hits.append(hit)
                        if rid in seated:
                            continue
                        if row["carrierClass"] == "NATIVE_ANDROID_SAF":
                            native_exact.append({**hit, "state": "EXACT_NATIVE_PACKAGE_AUTHORITY_FOUND__NATIVE_DESCENDANT_STILL_REQUIRED"})
                            seated.add(rid)
                            continue
                        try:
                            seat = seat_exact(rid, authority, data, tmp)
                            exact_seated.append({**hit, "state": "EXACT_BRANCH_SOURCE_SEATED", **seat})
                            seated.add(rid)
                        except subprocess.CalledProcessError as exc:
                            matches.append({**hit, "state": "EXACT_MATCH__SOURCE_SEAT_FAILED", "stdout": (exc.stdout or "")[-1400:], "stderr": (exc.stderr or "")[-1400:]})
            state = "EXACT_AUTHORITY_FOUND" if matches else "LINEAGE_BRANCH_FOUND__NOT_EXACT_CURRENT_AUTHORITY" if refs else "NO_MATCHING_BRANCH_ROUTE"
            rows_out.append({
                "recipientId": rid,
                "carrierClass": row["carrierClass"],
                "branchPatterns": row["branchPatterns"],
                "matchedBranches": refs,
                "sourceLikeBlobCount": len(seen_blobs),
                "lineageCandidates": candidates,
                "exactMatches": matches,
                "state": state,
            })

    after = current_accounting()
    receipt = {
        "schema": "jm.estate.contact-organ-branch-source-recovery/1.2.6",
        "date": "2026-09-03",
        "law": "BRANCH PRESENCE != CURRENT SOURCE AUTHORITY. EXACT FROZEN SHA MAY MATERIALISE; LINEAGE DOES NOT CROWN.",
        "remoteBranchesAvailable": len(branches),
        "recipientsScanned": len(ROWS),
        "recipientsWithMatchedBranches": sum(bool(r["matchedBranches"]) for r in rows_out),
        "exactAuthorityHits": len(exact_hits),
        "exactHtmlSourcesSeated": len(exact_seated),
        "exactNativePackagesFound": len(native_exact),
        "seatedRecipientIds": sorted({r["recipientId"] for r in exact_seated}),
        "nativeExactRecipientIds": sorted({r["recipientId"] for r in native_exact}),
        "exactHits": exact_hits,
        "exactSeats": exact_seated,
        "nativeExact": native_exact,
        "rows": rows_out,
        "accountingBefore": before,
        "accountingAfter": after,
        "claimBoundary": "Exact branch source recovery may materialise an HTML descendant only through the pre-existing byte/hash source-seat gate. Same-body lineage is not current-source authority. Native package hits remain unmaterialised until a native descendant is built. Physical Ding remains separate."
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
