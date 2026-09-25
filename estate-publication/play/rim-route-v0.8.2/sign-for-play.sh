#!/usr/bin/env bash
set -euo pipefail

# Owner-controlled signing helper. It deliberately contains no key material.
# Required environment variables:
#   JM_PLAY_UPLOAD_KEYSTORE=/secure/path/upload.jks
#   JM_PLAY_UPLOAD_ALIAS=your-upload-key-alias
# Optional:
#   JM_PLAY_UPLOAD_STOREPASS / JM_PLAY_UPLOAD_KEYPASS

IN=${1:-release/JM_RIM_ROUTE_v0.8.2_UNSIGNED_READY.aab}
OUT=${2:-release/JM_RIM_ROUTE_v0.8.2_PLAY_UPLOAD.aab}
: "${JM_PLAY_UPLOAD_KEYSTORE:?Set JM_PLAY_UPLOAD_KEYSTORE to the owner-controlled upload keystore}"
: "${JM_PLAY_UPLOAD_ALIAS:?Set JM_PLAY_UPLOAD_ALIAS to the upload-key alias}"
cp "$IN" "$OUT"
ARGS=(-keystore "$JM_PLAY_UPLOAD_KEYSTORE" -sigalg SHA256withRSA -digestalg SHA-256)
if [[ -n "${JM_PLAY_UPLOAD_STOREPASS:-}" ]]; then ARGS+=(-storepass "$JM_PLAY_UPLOAD_STOREPASS"); fi
if [[ -n "${JM_PLAY_UPLOAD_KEYPASS:-}" ]]; then ARGS+=(-keypass "$JM_PLAY_UPLOAD_KEYPASS"); fi
jarsigner "${ARGS[@]}" "$OUT" "$JM_PLAY_UPLOAD_ALIAS"
jarsigner -verify -verbose -certs "$OUT"
echo "SIGNED FOR PLAY: $OUT"
