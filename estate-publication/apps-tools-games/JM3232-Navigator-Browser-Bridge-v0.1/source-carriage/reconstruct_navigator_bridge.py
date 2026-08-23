#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, json, tarfile, shutil, sys

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
MANIFEST=json.loads((ROOT/"SOURCE_PUBLICATION_MANIFEST.json").read_text())
CARR=HERE
parts=MANIFEST["public_carriage"]["parts"]
payload=b""
for p in parts:
    path=CARR/p["name"]
    raw=path.read_bytes()
    if len(raw)!=p["size_bytes"] or hashlib.sha256(raw).hexdigest()!=p["sha256"]:
        raise SystemExit(f"part identity FAIL: {p['name']}")
    payload += raw
archive=base64.b64decode(payload, validate=True)
if len(archive)!=MANIFEST["public_carriage"]["tar_xz_size_bytes"]:
    raise SystemExit("tar.xz byte-count FAIL")
if hashlib.sha256(archive).hexdigest()!=MANIFEST["public_carriage"]["tar_xz_sha256"]:
    raise SystemExit("tar.xz SHA-256 FAIL")
out=ROOT/"reconstructed"
if out.exists(): shutil.rmtree(out)
out.mkdir()
arc=ROOT/"JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1_PUBLIC_SOURCE.tar.xz"
arc.write_bytes(archive)
with tarfile.open(arc,"r:xz") as tf:
    members=tf.getmembers()
    if len(members)!=MANIFEST["public_carriage"]["published_member_count"]:
        raise SystemExit(f"member count FAIL: {len(members)}")
    for m in members:
        target=(out/m.name).resolve()
        if out.resolve() not in target.parents and target!=out.resolve():
            raise SystemExit(f"unsafe archive member: {m.name}")
    tf.extractall(out, filter="data")
print(f"reconstruction PASS: {len(archive)} bytes; {len(members)} members")
