#!/usr/bin/env python3
from __future__ import annotations
import base64, hashlib, json, lzma, re, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / "wave2-public/current-source/CURRENT_SOURCE_PUBLICATION_MANIFEST.json").read_text(encoding="utf-8"))

def sha256(b): return hashlib.sha256(b).hexdigest()
def git_blob_sha1(b): return hashlib.sha1(f"blob {len(b)}\0".encode("ascii") + b).hexdigest()
def fail(m): raise SystemExit("FAIL: " + m)

def node_check_html(body: bytes, ident: str):
    text=body.decode("utf-8")
    scripts=re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", text, re.I|re.S)
    if not scripts: fail(f"{ident}: no script body found")
    with tempfile.TemporaryDirectory() as td:
        for i,s in enumerate(scripts,1):
            p=Path(td)/f"{ident}-{i}.js"; p.write_text(s,encoding="utf-8")
            r=subprocess.run(["node","--check",str(p)],capture_output=True,text=True)
            if r.returncode: fail(f"{ident}: node syntax {i}: {r.stderr.strip()}")

for item in MANIFEST["items"]:
    if item["transport"] == "raw_utf8":
        p=ROOT/item["path"]; b=p.read_bytes()
        if len(b)!=item["bytes"]: fail(f"{item['id']}: raw size")
        if sha256(b)!=item["sha256"]: fail(f"{item['id']}: raw sha256")
        if git_blob_sha1(b)!=item["git_blob_sha1"]: fail(f"{item['id']}: raw git blob")
    else:
        encoded=[]
        for part in item["parts"]:
            p=ROOT/part["path"]; pb=p.read_bytes()
            if len(pb)!=part["bytes"]: fail(f"{item['id']}: part size {part['path']}")
            if git_blob_sha1(pb)!=part["git_blob_sha1"]: fail(f"{item['id']}: part git blob {part['path']}")
            encoded.append(pb.decode("ascii"))
        try:
            b=lzma.decompress(base64.b64decode("".join(encoded),validate=True),format=lzma.FORMAT_ALONE)
        except Exception as e: fail(f"{item['id']}: reconstruction {e}")
        if len(b)!=item["source_bytes"]: fail(f"{item['id']}: source size")
        if sha256(b)!=item["source_sha256"]: fail(f"{item['id']}: source sha256")
    text=b.decode("utf-8")
    for marker in item["markers"]:
        if marker not in text: fail(f"{item['id']}: missing marker {marker}")
    low=text.lower()
    for forbidden in MANIFEST["public_safety"]["forbidden_markers"]:
        if forbidden.lower() in low: fail(f"{item['id']}: forbidden public marker {forbidden}")
    node_check_html(b,item["id"])
print("PASS: Wave 2 current-source public carriage exact")
print("items=128-hand-v0.8,cardbored-v0.5,combound-v1.7,fight-clash-boxout-v1.1")
print("device_contact_crowns=separate")
