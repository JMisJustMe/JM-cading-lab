#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "PUBLICATION_MANIFEST.json").read_text("utf-8"))
POINTER = json.loads((ROOT / "CURRENT_HEAD_POINTER.json").read_text("utf-8"))
SOURCE = ROOT / MANIFEST["source_authority"]["library_file_name"]
text = SOURCE.read_text("utf-8")

assert SOURCE.stat().st_size == 160711
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == "60da0d1f303a1e17d3580d3261123bbdd51f9f7022199fee0f502fa60e70839d"
assert POINTER["source_sha256"] == MANIFEST["source_authority"]["sha256"]
assert POINTER["source_bytes"] == MANIFEST["source_authority"]["bytes"]
assert POINTER["version"] == "v0.4"
assert "v0.3" in POINTER["ancestor"]
assert MANIFEST["governance"]["v0_3_lineage_preserved"] is True
assert MANIFEST["governance"]["playzone_boundary_preserved"] is True
assert MANIFEST["publication_boundary"]["source_only"] is True

required = [
    "JM Playform — Offpage v0.4 Crown Forge",
    "VERSION==='0.4.0'",
    "NAV.length===16",
    "ISSUES.length===2",
    "SCENES.length===10",
    "CHARACTERS.length===4",
    "OBJECTS.length===4",
    "VISUALANG.length===9",
    "panelsForScene().length===8",
    "document.body.textContent.includes('PlayZone')",
    "runChecks().length===14",
    "window.__JM_RUN_TEST__",
    "window.__JM_STATE__",
]
for item in required:
    assert item in text, f"missing contract marker: {item}"

scripts = re.findall(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>", text, re.I)
assert len(scripts) == 1, f"expected 1 inline script, found {len(scripts)}"
tmp = ROOT / ".playform-inline-check.js"
tmp.write_text(scripts[0], "utf-8")
try:
    subprocess.run(["node", "--check", str(tmp)], check=True)
finally:
    tmp.unlink(missing_ok=True)

patterns = [
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    r"PKCS8",
    r"\bPRIVATE_KEY\b",
    r"\bprivateKey\b",
    r"\.jks\b|\bkeystore\b|\bstorepass\b|\bkeypass\b",
    r"\bgh[pousr]_[A-Za-z0-9]{20,}\b",
    r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b",
    r"\bBearer\s+[A-Za-z0-9._~+/-]{20,}",
]
hits = [pat for pat in patterns if re.search(pat, text, re.I)]
assert not hits, f"public-safety signatures detected: {hits}"

remote_assets = re.findall(r"<(?:script|link|img)[^>]+(?:src|href)=[\"']https?://", text, re.I)
assert not remote_assets, "remote runtime asset references found"

for forbidden in ["*.apk", "*.aab", "*.apks", "*.jks", "*.keystore"]:
    assert not list(ROOT.rglob(forbidden)), f"forbidden publication payload: {forbidden}"

receipt = (ROOT / "JM_PLAYFORM_v0_4_FREEZE_LOCK_ANCHOR.md").read_text("utf-8")
assert "v0.3 lineage preserved beneath v0.4" in receipt
assert "PlayZone protection boundary" in receipt

print("PASS — Playform Offpage v0.4 public-source publication boundary")
