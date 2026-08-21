#!/usr/bin/env python3
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent
TARGET = ROOT.parent / "app.js"
PARTS = [ROOT / f"app.js.part{i:02d}" for i in range(1, 6)]
EXPECTED_BYTES = 29127
EXPECTED_SHA256 = "17b388989141db1fca3f2c28836a0fe7c3bf0f28893f646f4ebe0e7d851b9fbe"

data = b"".join(part.read_bytes() for part in PARTS)
actual_sha256 = hashlib.sha256(data).hexdigest()
assert len(data) == EXPECTED_BYTES, f"byte mismatch: {len(data)} != {EXPECTED_BYTES}"
assert actual_sha256 == EXPECTED_SHA256, f"sha256 mismatch: {actual_sha256} != {EXPECTED_SHA256}"
TARGET.write_bytes(data)
print(f"PASS {TARGET} {len(data)} bytes {actual_sha256}")
