#!/usr/bin/env bash
set -euo pipefail
OWNER_REPO="${1:-JMisJustMe/JM-cading-lab}"
BRANCH="${2:-games-beyond-push-ready-v1-0}"

echo "Cloning $OWNER_REPO..."
tmp="$(mktemp -d)"
git clone "https://github.com/${OWNER_REPO}.git" "$tmp/repo"
rsync -av --delete --exclude='.git' ./ "$tmp/repo/"
cd "$tmp/repo"
git checkout -b "$BRANCH"
git add .
git commit -m "Mount Games&Beyond push-ready package v1.0"
git push -u origin "$BRANCH"
echo "Pushed branch: $BRANCH"
