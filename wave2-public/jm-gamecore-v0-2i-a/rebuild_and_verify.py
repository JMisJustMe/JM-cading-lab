#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, gzip, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "transport_manifest_v1.json"

def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def git_blob_sha1(b: bytes) -> str:
    return hashlib.sha1(f"blob {len(b)}\0".encode("ascii") + b).hexdigest()

def fail(msg: str) -> None:
    raise SystemExit(f"FAIL: {msg}")

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    chunks = []
    for e in m["canonical_parts"]:
        p = ROOT / e["name"]
        b = p.read_bytes()
        if len(b) != e["size"]: fail(f"size mismatch {e['name']}")
        if sha256(b) != e["sha256"]: fail(f"sha256 mismatch {e['name']}")
        if git_blob_sha1(b) != e["git_blob_sha1"]: fail(f"git blob mismatch {e['name']}")
        chunks.append(b)
    carrier = b"".join(chunks)
    if len(carrier) != m["encoding"]["base64_chars"]: fail("base64 length mismatch")
    gz = base64.b64decode(carrier, validate=True)
    if len(gz) != m["encoding"]["gzip_bytes"]: fail("gzip size mismatch")
    if sha256(gz) != m["encoding"]["gzip_sha256"]: fail("gzip sha256 mismatch")
    src = gzip.decompress(gz)
    if len(src) != m["source_bytes"]: fail("source size mismatch")
    if sha256(src) != m["source_sha256"]: fail("source sha256 mismatch")
    text = src.decode("utf-8")
    for marker in ("JM GameCore", "T-Boys", "Catching Run", "Aiming Run"):
        if marker not in text: fail(f"missing source marker: {marker}")
    lowered = text.lower()
    for forbidden in ("-----begin private key-----","-----begin rsa private key-----",".keystore","pkcs8"):
        if forbidden in lowered: fail(f"public-safety exclusion failed: {forbidden}")
    if args.write:
        (ROOT / m["source_filename"]).write_bytes(src)
    print("PASS: JM GameCore v0.2I-A exact public source reconstructed")
    print(f"source_bytes={len(src)}")
    print(f"source_sha256={sha256(src)}")

if __name__ == "__main__":
    main()
