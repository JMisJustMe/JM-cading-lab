#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "00_OPEN_FIRST_GLYPHPLAY_FORGE_v0_1.html"
MANIFEST = ROOT / "ENGINE_MANIFEST.json"

if not HTML.exists():
    subprocess.run([sys.executable, str(ROOT / "tools" / "materialize.py")], check=True)

text = HTML.read_text(encoding="utf-8")
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
required = [
    'id="worldCanvas"',
    'id="view-playform"',
    'id="view-bodies"',
    'id="view-code"',
    'id="view-package"',
    'const BODY_PROFILES=',
    "cading:{",
    "quadze:{",
    "recorp:{",
    "flowtalk:{",
    "formeula:{",
    "contactcode:{",
    'id="exportJson"',
    'id="exportHtml"',
    'id="importFile"',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(f"Missing required engine structures: {missing}")

scripts = re.findall(r"<script(?: [^>]*)?>(.*?)</script>", text, re.S | re.I)
js = scripts[-1]
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
    handle.write(js)
    js_path = Path(handle.name)
try:
    result = subprocess.run(["node", "--check", str(js_path)], capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(result.stderr)
finally:
    js_path.unlink(missing_ok=True)

actual = hashlib.sha256(HTML.read_bytes()).hexdigest()
if actual != manifest["html_sha256"]:
    raise SystemExit(f"HTML hash mismatch: {actual} != {manifest['html_sha256']}")
if len(manifest["body_profiles"]) != 6:
    raise SystemExit("Expected six first body-trial profiles")

print(
    json.dumps(
        {
            "status": "GLYPHPLAY_FORGE_STRUCTURE_PASS",
            "html_sha256": actual,
            "body_profiles": manifest["body_profiles"],
        }
    )
)
