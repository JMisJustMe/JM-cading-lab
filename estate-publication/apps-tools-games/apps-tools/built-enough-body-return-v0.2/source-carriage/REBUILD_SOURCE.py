#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent
BODY = ROOT.parent
MANIFEST = json.loads((BODY / "SOURCE_PUBLICATION_MANIFEST.json").read_text(encoding="utf-8"))


def rebuild(target_name: str, part_prefix: str, count: int) -> None:
    target = BODY / target_name
    data = b"".join((ROOT / f"{part_prefix}{i:02d}").read_bytes() for i in range(1, count + 1))
    target.write_bytes(data)


rebuild("index.html", "index.html.part", 3)
rebuild("app.js", "app.js.part", 5)

failures = []
for rel, expected in MANIFEST["expected"].items():
    path = BODY / rel
    if not path.exists():
        failures.append(f"MISSING {rel}")
        continue
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if len(data) != expected["bytes"]:
        failures.append(f"BYTES {rel}: {len(data)} != {expected['bytes']}")
    if digest != expected["sha256"]:
        failures.append(f"SHA256 {rel}: {digest} != {expected['sha256']}")

if failures:
    raise SystemExit("FAIL\n" + "\n".join(failures))

print("PASS — Built Enough v0.2 public source reconstructed and all published source hashes match the governed keeper.")
