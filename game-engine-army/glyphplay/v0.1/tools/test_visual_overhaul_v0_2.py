#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "visual-overhaul.css").read_text(encoding="utf-8")
JS = (ROOT / "visual-overhaul.js").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
MANIFEST = json.loads((ROOT / "VISUAL_OVERHAUL_MANIFEST.json").read_text(encoding="utf-8"))

assert MANIFEST["schema"] == "jm.glyphplay-visual-overhaul/0.2"
assert len(MANIFEST["bodyLenses"]) == 7
assert "final polish remain open" in MANIFEST["claimBoundary"]

for marker in [
    "#visualOverhaul", ".visualDock", ".visualQuality", ".panel.left.visual-open",
    "prefers-reduced-motion", "env(safe-area-inset-bottom)", "backdrop-filter"
]:
    assert marker in CSS, marker

for marker in [
    "GlyphPlayVisualOverhaul", "requestAnimationFrame", "draw", "routes", "entity",
    "burst", "ripple", "shake", "Math.min(1.75", "particles.length<130",
    "GlyphPlayApp.project", "cading", "quadze", "recorp", "flowtalk",
    "formeula", "contactcode"
]:
    assert marker in JS, marker

assert '<link rel="stylesheet" href="visual-overhaul.css">' in INDEX
assert '<script src="visual-overhaul.js"></script>' in INDEX
assert "http://" not in CSS + JS
assert "https://" not in CSS + JS
assert 'type="module"' not in JS
assert "<\\/script>" not in JS

with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
    handle.write(JS)
    path = handle.name
subprocess.run(["node", "--check", path], check=True)
print(json.dumps({
    "status": "PASS",
    "bodyLenses": MANIFEST["bodyLenses"],
    "jsBytes": len(JS.encode("utf-8")),
    "cssBytes": len(CSS.encode("utf-8")),
}, indent=2))
