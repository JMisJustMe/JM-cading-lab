#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
python3 scripts/checksums.py
zip -r releases/JM_ESTATE_LIBRARIAN_v0_4_ZIONFOLDER.zip . -x 'releases/*.zip' '.git/*'
echo 'Release ZIP written to releases/'
