#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, lzma

ROOT = Path(__file__).resolve().parent
PARTS = ROOT / "source-carriage"
OUT = ROOT / "Signuances_SINGLE.html"
EXPECTED_XZ = "addde0faadfe715a6bcd2487febd1a8da0de55709ce9714ce90e77f01ac981cf"
EXPECTED_HTML = "fad2ddc3122ca47a7e1d130a0c27980822a1c542ba7ac52ceb2498fec497d631"
EXPECTED_BYTES = 220954

files = sorted(PARTS.glob("part-*.b64"))
if len(files) != 16:
    raise SystemExit(f"expected 16 carriage parts, found {len(files)}")
encoded = b"".join(p.read_bytes().strip() for p in files)
xz = base64.b64decode(encoded, validate=True)
if hashlib.sha256(xz).hexdigest() != EXPECTED_XZ:
    raise SystemExit("XZ carriage SHA-256 mismatch")
html = lzma.decompress(xz)
if len(html) != EXPECTED_BYTES:
    raise SystemExit(f"HTML byte count mismatch: {len(html)}")
if hashlib.sha256(html).hexdigest() != EXPECTED_HTML:
    raise SystemExit("HTML SHA-256 mismatch")
OUT.write_bytes(html)
print(f"PASS {OUT.name} {len(html)} bytes {EXPECTED_HTML}")
