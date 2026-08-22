#!/usr/bin/env python3
from pathlib import Path
import base64, gzip, hashlib

ROOT = Path(__file__).resolve().parent
PARTS = ROOT / "source-carriage"
OUT = ROOT / "00_OPEN_FIRST_JM_PLAYFORM_OFFPAGE_v0_4.html"
EXPECTED_GZIP_SHA256 = "7d4514bb32cc63e35f064da45addd9a3b63ad304fbd8657ba6ad7595b4820012"
EXPECTED_SOURCE_SHA256 = "60da0d1f303a1e17d3580d3261123bbdd51f9f7022199fee0f502fa60e70839d"
EXPECTED_SOURCE_BYTES = 160711

joined = "".join((PARTS / f"part-{i:02d}.b64").read_text().strip() for i in range(1, 5))
gz = base64.b64decode(joined, validate=True)
if hashlib.sha256(gz).hexdigest() != EXPECTED_GZIP_SHA256:
    raise SystemExit("gzip carriage SHA-256 mismatch")
source = gzip.decompress(gz)
if len(source) != EXPECTED_SOURCE_BYTES:
    raise SystemExit(f"source byte mismatch: {len(source)}")
if hashlib.sha256(source).hexdigest() != EXPECTED_SOURCE_SHA256:
    raise SystemExit("source SHA-256 mismatch")
OUT.write_bytes(source)
print(f"PLAYFORM v0.4 exact source reconstructed: {len(source)} bytes {EXPECTED_SOURCE_SHA256}")
