#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://jmisjustme-estate.pages.dev}"
OUT_JSON="${2:-${RUNNER_TEMP:-/tmp}/wave01-parity.json}"
RUN_ID="${GITHUB_RUN_ID:-manual}"
SOURCE_COMMIT="${REPAIR_SHA:-$(git rev-parse HEAD)}"
WORK="${RUNNER_TEMP:-/tmp}/wave01-live"
mkdir -p "$WORK"

ANDROID='Mozilla/5.0 (Linux; Android 16; CPH2305) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36'
LAPTOP='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36'
FILES=(
  index.html
  apps/index.html
  theory/index.html
  theory/wave01-runtime-proof.html
  games-beyond/index.html
  coding-estate/integration/00_OPEN_FIRST.html
  recovery/index.html
  author/index.html
  recent/index.html
  estate-head-public-consumer.js
  theory/source-body-integrity-v12.js
  theory/data/source-body-integrity/v0_20-audit.json
)
DIRECTORIES=(
  /
  /apps/
  /theory/
  /games-beyond/
  /recovery/
  /author/
  /recent/
  /money-menu/
  /coding-estate/integration/
)

prove_raw_parity() {
  local label="$1"
  local ua="$2"
  local pass target code
  pass=0
  for attempt in $(seq 1 60); do
    pass=1
    for path in "${FILES[@]}"; do
      target="$WORK/${label}-$(echo "$path" | tr '/' '_')"
      code="$(curl -sSLo "$target" -w '%{http_code}' --max-time 30 -A "$ua" \
        -H 'Cache-Control: no-cache' "$BASE/$path?wave01=$RUN_ID-$label-$attempt" || true)"
      if [[ "$code" != 200 ]] || ! cmp -s "$path" "$target"; then
        echo "RAW PARITY WAIT: $label $path HTTP=$code"
        pass=0
        break
      fi
    done
    [[ "$pass" == 1 ]] && break
    sleep 3
  done
  [[ "$pass" == 1 ]]
  echo "RAW PARITY PASS: $label / ${#FILES[@]} files"
}

prove_raw_parity android "$ANDROID"
prove_raw_parity laptop "$LAPTOP"

for path in "${DIRECTORIES[@]}"; do
  code="$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 30 \
    -H 'Cache-Control: no-cache' "$BASE$path?wave01-directory=$RUN_ID" || true)"
  echo "DIRECTORY CONTACT: $path HTTP=$code"
  [[ "$code" == 200 ]]
done
echo "DIRECTORY CONTACT PASS: ${#DIRECTORIES[@]} routes"

CHROME=''
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    CHROME="$(command -v "$candidate")"
    break
  fi
done
[[ -n "$CHROME" ]]
echo "BROWSER ENGINE: $CHROME"

prove_browser() {
  local label="$1"
  local ua="$2"
  local profile="$WORK/profile-$label"
  rm -rf "$profile-apps" "$profile-theory"
  echo "BROWSER PROOF START: $label"

  "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
    --user-data-dir="$profile-apps" --user-agent="$ua" --virtual-time-budget=30000 \
    --dump-dom "$BASE/apps/?wave01-browser=$RUN_ID-$label" \
    > "$WORK/apps-$label-dom.html"
  grep -Fq '44 of 44 rooms' "$WORK/apps-$label-dom.html"
  grep -Fq '242-route v1.1 data authority · live public contact v1.2' "$WORK/apps-$label-dom.html"
  grep -Fq 'Public v0.20.1 Source-Body Integrity · v0.19 shell preserved' "$WORK/apps-$label-dom.html"
  grep -Fq 'href="/money-menu/"' "$WORK/apps-$label-dom.html"
  echo "APPS BROWSER PASS: $label"

  "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
    --user-data-dir="$profile-theory" --user-agent="$ua" --virtual-time-budget=70000 \
    --dump-dom "$BASE/theory/wave01-runtime-proof.html?wave01-browser=$RUN_ID-$label" \
    > "$WORK/theory-$label-witness-dom.html"

  echo "THEORY WITNESS DIAGNOSTIC: $label"
  grep -nE 'data-status=|THEORY WAVE 01 RUNTIME|CHECK_' \
    "$WORK/theory-$label-witness-dom.html" | tail -40 || true
  grep -Fq 'data-status="PASS"' "$WORK/theory-$label-witness-dom.html"
  grep -Fq 'THEORY WAVE 01 RUNTIME PASS' "$WORK/theory-$label-witness-dom.html"
  for token in \
    CHECK_version_PASS \
    CHECK_bodies_PASS \
    CHECK_drafts_PASS \
    CHECK_fullBodies_PASS \
    CHECK_phoneRealmsRepaired_PASS \
    CHECK_topFullBodies_PASS \
    CHECK_topIntegrityBodies_PASS \
    CHECK_recoveryPass007_PASS \
    CHECK_proof37of37_PASS \
    CHECK_reconciledShell_PASS \
    CHECK_waveMarker_PASS; do
    grep -Fq "$token" "$WORK/theory-$label-witness-dom.html"
  done
  echo "THEORY RUNTIME WITNESS PASS: $label"

  echo "BROWSER BEHAVIOUR PASS: $label"
}

prove_browser android "$ANDROID"
prove_browser laptop "$LAPTOP"

export WAVE01_OUT_JSON="$OUT_JSON"
export WAVE01_SOURCE_COMMIT="$SOURCE_COMMIT"
export WAVE01_RUN_ID="$RUN_ID"
python3 - <<'PY'
import hashlib
import json
import os
from pathlib import Path

files = [
    'index.html',
    'apps/index.html',
    'theory/index.html',
    'theory/wave01-runtime-proof.html',
    'games-beyond/index.html',
    'coding-estate/integration/00_OPEN_FIRST.html',
    'recovery/index.html',
    'author/index.html',
    'recent/index.html',
    'estate-head-public-consumer.js',
    'theory/source-body-integrity-v12.js',
    'theory/data/source-body-integrity/v0_20-audit.json',
]
proof = {
    'schema': 'JM.PublicRouteRawParity/1.1',
    'status': 'PASS',
    'workflow_run': os.environ['WAVE01_RUN_ID'],
    'source_commit': os.environ['WAVE01_SOURCE_COMMIT'],
    'user_agents': ['Android 16 / Chrome mobile', 'desktop/laptop Chromium'],
    'files': [
        {'path': path, 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}
        for path in files
    ],
    'directory_routes': 9,
    'browser_proof': {
        'apps': [
            '44/44 rendered',
            'Money Menu v1.1/v1.2 current route',
            'Theory v0.20.1 current route',
            'Money Menu live door rendered',
        ],
        'theory_runtime_witness': [
            'JMTheorySourceIntegrityV12.version = v0.20.1',
            '37 source bodies',
            '24 publication drafts',
            '18 full bodies',
            'Phone-Realms repaired',
            'Recovery Pass 007 rendered',
            '37/37 proof rendered',
            'v0.20.1 runtime over 300-route reconciled shell',
        ],
    },
}
Path(os.environ['WAVE01_OUT_JSON']).write_text(
    json.dumps(proof, indent=2, ensure_ascii=False) + '\n', encoding='utf-8'
)
print(json.dumps(proof, indent=2, ensure_ascii=False))
PY

echo "WAVE 01 FULL PARITY PASS: $OUT_JSON"
