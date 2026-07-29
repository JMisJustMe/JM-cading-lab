#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
python3 "$ROOT/build.py"
node "$ROOT/tests/static_test.mjs" "$ROOT"
python3 "$ROOT/tests/browser_proof.py" "$ROOT/build_out/00_OPEN_FIRST_JM_SOVEREIGN_HTML_CARTRIDGE_ADAPTER_v0_1.html" "$ROOT/BROWSER_PROOF_RECEIPT.json"
python3 - "$ROOT" <<'PY'
import json,pathlib,sys
r=pathlib.Path(sys.argv[1]); build=json.loads((r/'build_out/BUILD_RECEIPT.json').read_text()); browser=json.loads((r/'BROWSER_PROOF_RECEIPT.json').read_text())
assert build['packages'][0]['sourceSha256']=='b4e75e41f5f65ade5a438f49987e7cf61ee5c658fdbc7a69c7e75b3365b4d95b'
assert build['packages'][0]['sourceBytes']==48473
assert browser['status']=='PASS'
print('EXACT_TBOYS_SOURCE_SHA256 PASS')
print('SOVEREIGN_HTML_CARTRIDGE_ADAPTER_FINAL_DING PASS')
PY
