#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, json, tarfile, shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MANIFEST = json.loads((ROOT / "SOURCE_PUBLICATION_MANIFEST.json").read_text())
parts = MANIFEST["public_carriage"]["parts"]

expected_names = [f"part-{i:03d}.b64" for i in range(1, len(parts) + 1)]
actual_names = [p["name"] for p in parts]
if actual_names != expected_names:
    raise SystemExit(f"ordered part-name FAIL: {actual_names}")

payload = b""
for p in parts:
    path = HERE / p["name"]
    raw = path.read_bytes()
    actual_sha = hashlib.sha256(raw).hexdigest()
    print(f"{p['name']} actual_bytes={len(raw)} actual_sha256={actual_sha} expected_bytes={p['size_bytes']} expected_sha256={p['sha256']}")
    if len(raw) != p["size_bytes"] or actual_sha != p["sha256"]:
        raise SystemExit(f"part identity FAIL: {p['name']}")
    payload += raw

if len(payload) != MANIFEST["public_carriage"]["base64_size_bytes"]:
    raise SystemExit("base64 byte-count FAIL")
archive = base64.b64decode(payload, validate=True)
if len(archive) != MANIFEST["public_carriage"]["tar_xz_size_bytes"]:
    raise SystemExit("tar.xz byte-count FAIL")
if hashlib.sha256(archive).hexdigest() != MANIFEST["public_carriage"]["tar_xz_sha256"]:
    raise SystemExit("tar.xz SHA-256 FAIL")

out = ROOT / "reconstructed"
if out.exists():
    shutil.rmtree(out)
out.mkdir()
arc = ROOT / "JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1_PUBLIC_SOURCE.tar.xz"
arc.write_bytes(archive)
with tarfile.open(arc, "r:xz") as tf:
    members = tf.getmembers()
    if len(members) != MANIFEST["public_carriage"]["published_member_count"]:
        raise SystemExit(f"member count FAIL: {len(members)}")
    for m in members:
        target = (out / m.name).resolve()
        if out.resolve() not in target.parents and target != out.resolve():
            raise SystemExit(f"unsafe archive member: {m.name}")
    tf.extractall(out, filter="data")
print(f"reconstruction PASS: {len(archive)} bytes; {len(members)} members; {len(parts)} parts")
