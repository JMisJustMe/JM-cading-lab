#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
MANIFEST = json.loads((ROOT / "LINKAGE_MANIFEST.json").read_text(encoding="utf-8"))

def sha256(p: Path) -> str:
    h=hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

assert MANIFEST["schema"] == "jm.wave2.bodymesh-onegame.reconciliation/1.0"
assert len(MANIFEST["source_bodies"]) == 6
for item in MANIFEST["source_bodies"]:
    p = REPO / item["path"]
    assert p.is_file(), f"missing authority body: {item['path']}"
    assert p.stat().st_size == item["bytes"], f"size mismatch: {item['path']}"
    assert sha256(p) == item["sha256"], f"sha256 mismatch: {item['path']}"

for link in MANIFEST["typed_links"]:
    assert link.get("merge") is False, f"typed link lost mesh != merge boundary: {link}"
    target = link.get("public_target")
    if target:
        assert (REPO / target).is_file(), f"missing published linkage target: {target}"

assert set(MANIFEST["proof_surfaces"]) == {"SOURCE","BROWSER","PHONE","APK","PUBLIC"}
assert "complete current executable OneGame body" in MANIFEST["roles"]["OneGame"]["not_claimed"]
assert "current phone proof" in MANIFEST["roles"]["OneGame"]["not_claimed"]
assert "universal empirical validation" in MANIFEST["roles"]["BodyMesh"]["not_claimed"]
print("PASS BodyMesh/OneGame public authority spine: 6/6 exact")
print("PASS typed links: BodyMesh -> OneGame -> sovereign referenced bodies; mesh != merge")
print("PASS claim boundary: publication DING preserved; executable/device/APK/public-release crowns remain separate")
