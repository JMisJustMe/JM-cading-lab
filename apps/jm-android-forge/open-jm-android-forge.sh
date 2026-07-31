#!/usr/bin/env sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$APP_DIR/../.." && pwd)
if ! command -v pwsh >/dev/null 2>&1; then
  echo "PowerShell Core (pwsh) is not present. Nothing was installed. Open index.html in browser fallback mode instead."
  exit 1
fi
exec pwsh -NoProfile -File "$REPO_ROOT/tools/Start-JMAndroidForge.ps1" -RepoRoot "$REPO_ROOT"
