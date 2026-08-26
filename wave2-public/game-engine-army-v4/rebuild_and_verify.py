#!/usr/bin/env python3
"""Reconstruct and verify the exact frozen Game Engine Army v4.0 source.

The manifest is sovereign for transport order. Failed legacy carrier parts are
retained as lineage evidence but are never consumed by this verifier.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "transport_manifest_v1.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="write the reconstructed HTML beside this script")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assembled: list[bytes] = []

    forbidden = {ROOT / p for p in manifest.get("superseded_failure_parts", [])}
    for entry in manifest["canonical_parts"]:
        path = ROOT / entry["name"]
        if path in forbidden:
            fail(f"forbidden failed carrier entered canonical stream: {path.name}")
        payload = path.read_bytes()
        if len(payload) != entry["size"]:
            fail(f"size mismatch {path.name}: {len(payload)} != {entry['size']}")
        actual_sha = sha256(payload)
        if actual_sha != entry["sha256"]:
            fail(f"sha256 mismatch {path.name}: {actual_sha}")
        actual_blob = git_blob_sha1(payload)
        if actual_blob != entry["git_blob_sha1"]:
            fail(f"git blob mismatch {path.name}: {actual_blob}")
        assembled.append(payload)

    carrier = b"".join(assembled)
    if len(carrier) != manifest["encoding"]["base64_chars"]:
        fail(f"base64 length mismatch: {len(carrier)}")

    try:
        gz = base64.b64decode(carrier, validate=True)
    except Exception as exc:
        fail(f"invalid base64 carrier: {exc}")

    if len(gz) != manifest["encoding"]["gzip_bytes"]:
        fail(f"gzip size mismatch: {len(gz)}")
    if sha256(gz) != manifest["encoding"]["gzip_sha256"]:
        fail(f"gzip sha256 mismatch: {sha256(gz)}")

    try:
        source = gzip.decompress(gz)
    except Exception as exc:
        fail(f"gzip decompression failed: {exc}")

    if len(source) != manifest["source_bytes"]:
        fail(f"source size mismatch: {len(source)}")
    actual_source_sha = sha256(source)
    if actual_source_sha != manifest["source_sha256"]:
        fail(f"source sha256 mismatch: {actual_source_sha}")

    if args.write:
        out = ROOT / manifest["source_filename"]
        out.write_bytes(source)
        print(f"WROTE: {out}")

    print("PASS: exact-source transport reconstructed byte-for-byte")
    print(f"source_bytes={len(source)}")
    print(f"source_sha256={actual_source_sha}")


if __name__ == "__main__":
    main()
