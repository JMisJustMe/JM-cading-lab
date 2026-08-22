#!/usr/bin/env python3
from __future__ import annotations
import base64, gzip, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "PUBLICATION_MANIFEST.json").read_text("utf-8"))
CARRIAGE = ROOT / "source-carriage"

parts = sorted(CARRIAGE.glob("part-*.b64"))
assert len(parts) == 4, f"expected 4 carriage parts, found {len(parts)}"
encoded = "".join("".join(p.read_text("ascii").split()) for p in parts)
assert len(encoded) == MANIFEST["carriage"]["base64_chars"], (len(encoded), MANIFEST["carriage"]["base64_chars"])

compressed = base64.b64decode(encoded, validate=True)
assert len(compressed) == MANIFEST["carriage"]["gzip_bytes"]
assert hashlib.sha256(compressed).hexdigest() == MANIFEST["carriage"]["gzip_sha256"]

source = gzip.decompress(compressed)
auth = MANIFEST["source_authority"]
assert len(source) == auth["bytes"]
assert hashlib.sha256(source).hexdigest() == auth["sha256"]

target = ROOT / auth["library_file_name"]
target.write_bytes(source)
print(f"PASS — reconstructed {target.name}: {len(source)} bytes / {auth['sha256']}")
