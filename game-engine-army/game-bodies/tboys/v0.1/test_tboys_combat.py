from pathlib import Path
import json, re, subprocess, tempfile

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / 'OPEN_FIRST_TBOYS_COMBAT_ANCHOR_v0_1.html').read_text(encoding='utf-8')
MANIFEST = json.loads((ROOT / 'TBOYS_COMBAT_MANIFEST.json').read_text(encoding='utf-8'))

assert MANIFEST['gameIdentity'] == 'T‑Boys'
assert len(MANIFEST['states']) == 10
for marker in ['STRIKE', 'GUARD', 'BURST', 'RIVAL', 'ROUND', 'requestAnimationFrame', 'enemy AI']:
    assert marker in HTML or marker in json.dumps(MANIFEST)
for forbidden in MANIFEST['forbiddenGenericRouteMarkers']:
    assert forbidden not in HTML
assert '<script type="module"' not in HTML
assert 'http://' not in HTML and 'https://' not in HTML
script = re.search(r'<script>(.*)</script>', HTML, re.S)
assert script
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as handle:
    handle.write(script.group(1))
    js_path = handle.name
subprocess.run(['node', '--check', js_path], check=True)
print('TBOYS_DISTINCT_COMBAT_RUNTIME_GATE_PASS')
