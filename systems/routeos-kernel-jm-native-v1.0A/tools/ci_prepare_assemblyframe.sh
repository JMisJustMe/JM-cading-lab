#!/usr/bin/env bash
set -euo pipefail

git merge-base --is-ancestor a05b26b3901460cfa5623cbb3063d961a9952214 HEAD
test -f systems/routeos-kernel-jm-native-v0.9A/proof/FREEZE_LOCK_ANCHOR_v0.9A.md

V10=systems/routeos-kernel-jm-native-v1.0A
python3 "$V10/tools/assemblyframec.py" "$V10/source/assemblyentry_framecarrier.jmroute" --out-dir "$V10/generated" --check
python3 -m unittest discover -s "$V10/tests" -v

bash systems/routeos-kernel-jm-native-v0.9A/tools/ci_prepare_bodyregistryboundary.sh
mv .routeos-v09a .routeos-v10a
KERNEL=.routeos-v10a/routeos-kernel-v0.1A
python3 "$V10/tools/integrate_assemblyframe.py" \
  --kernel-root "$KERNEL" \
  --carrier "$V10/generated/assemblyentry_framecarrier.S" \
  --metadata "$V10/generated/assemblyentry_framecarrier.json" \
  --receipt .routeos-v10a/ASSEMBLYENTRY_FRAMECARRIER_INTEGRATION_RECEIPT.json

ASSEMBLY_PATH="$(python3 -c 'import json; print(json.load(open(".routeos-v10a/ASSEMBLYENTRY_FRAMECARRIER_INTEGRATION_RECEIPT.json"))["assembly_source_path"])')"
test "$(grep -Fc 'GENERATED ASSEMBLYENTRY + FRAMECARRIER' "$ASSEMBLY_PATH")" -eq 1
for symbol in routeos_isr_ud routeos_isr_timer routeos_isr_syscall routeos_enter_frame; do
  test "$(grep -Ec "^${symbol}:$" "$ASSEMBLY_PATH")" -eq 1
done
