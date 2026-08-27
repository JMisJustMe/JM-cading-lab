#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, csv, gzip, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LEDGER = ROOT / "FINAL_CARRIER_LEDGER.tsv"
MANIFEST = ROOT / "PUBLICATION_MANIFEST.json"
CARRIER = ROOT / "carrier"

def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def die(msg: str) -> None:
    raise SystemExit("GLYPHPLAY_BASELINE_PROOF_FAIL: " + msg)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default=str(ROOT / "reconstructed" / "00_OPEN_FIRST_GLYPHPLAY_B1_v32_5_SOVEREIGN_BASELINE_LOOP_CLOSURE.html"))
    ap.add_argument("--verify-only", action="store_true")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    with LEDGER.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f, delimiter="\t"))
    if len(rows) != manifest["deterministic_carrier"]["live_objects"]:
        die(f"ledger row count {len(rows)} != {manifest['deterministic_carrier']['live_objects']}")

    expected_names = [row["filename"] for row in rows]
    actual_names = sorted(p.name for p in CARRIER.glob("*.b64"))
    if sorted(expected_names) != actual_names:
        die("carrier file set differs from ledger")

    pieces = []
    for expected_order, row in enumerate(rows, 1):
        try:
            order = int(row["order"]); size = int(row["bytes"])
        except Exception as exc:
            die(f"malformed ledger row {expected_order}: {exc}")
        if order != expected_order:
            die(f"ledger order {order} at row {expected_order}")
        path = CARRIER / row["filename"]
        data = path.read_bytes()
        if len(data) != size:
            die(f"{path.name}: bytes {len(data)} != {size}")
        if git_blob_sha1(data) != row["git_blob_sha1"]:
            die(f"{path.name}: Git blob SHA mismatch")
        try:
            data.decode("ascii")
        except UnicodeDecodeError:
            die(f"{path.name}: non-ASCII carrier")
        pieces.append(data)

    joined = b"".join(pieces)
    if len(joined) != manifest["deterministic_carrier"]["base64_bytes"]:
        die("joined base64 size mismatch")
    try:
        packed = base64.b64decode(joined, validate=True)
    except Exception as exc:
        die(f"strict base64 decode failed: {exc}")
    if len(packed) != manifest["deterministic_carrier"]["gzip_bytes"]:
        die("gzip byte count mismatch")
    if hashlib.sha256(packed).hexdigest() != manifest["deterministic_carrier"]["gzip_sha256"]:
        die("gzip SHA-256 mismatch")
    try:
        source = gzip.decompress(packed)
    except Exception as exc:
        die(f"gzip decompression failed: {exc}")
    authority = manifest["authority"]
    if len(source) != authority["bytes"]:
        die("source byte count mismatch")
    if hashlib.sha256(source).hexdigest() != authority["sha256"]:
        die("source SHA-256 mismatch")

    text = source.decode("utf-8")
    for marker in manifest["required_source_markers"]:
        if marker not in text:
            die(f"required source marker missing: {marker}")
    for marker in manifest["public_safety_forbidden_markers"]:
        if marker in text:
            die(f"public-safety forbidden marker present: {marker}")

    if not args.verify_only:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(source)

    print("GLYPHPLAY_BASELINE_PROOF_PASS")
    print(f"carrier_objects={len(rows)} base64_bytes={len(joined)} gzip_bytes={len(packed)} source_bytes={len(source)}")
    print(f"source_sha256={hashlib.sha256(source).hexdigest()}")
    print("claim=frozen_reusable_baseline; not_latest_not_current_not_final")

if __name__ == "__main__":
    main()
