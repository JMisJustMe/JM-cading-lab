#!/usr/bin/env bash
set -euo pipefail

git merge-base --is-ancestor e25f338d0d0025bdf9d00d502a832702082eda71 HEAD
test -f systems/routeos-kernel-jm-native-v0.8A/proof/FREEZE_LOCK_ANCHOR_v0.8A.md

V09=systems/routeos-kernel-jm-native-v0.9A
python3 "$V09/tools/bodyregistryboundaryc.py" "$V09/source/bodyregistry_userboundary.jmroute" --out-dir "$V09/generated" --check
python3 -m unittest discover -s "$V09/tests" -v

bash systems/routeos-kernel-jm-native-v0.8A/tools/ci_prepare_descriptorinterrupt.sh
mv .routeos-v08a .routeos-v09a
KERNEL=.routeos-v09a/routeos-kernel-v0.1A
python3 "$V09/tools/integrate_bodyregistryboundary.py" \
  --kernel "$KERNEL/kernel/routeos_kernel.c" \
  --registry "$V09/generated/bodyregistry_office.inc" \
  --boundary "$V09/generated/userboundary_office.inc" \
  --receipt .routeos-v09a/BODYREGISTRY_USERBOUNDARY_INTEGRATION_RECEIPT.json

test "$(grep -Fc '/* GENERATED BODYREGISTRY.' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
test "$(grep -Fc '/* GENERATED USERBOUNDARY.' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
! grep -F '/* ---- BODYREGISTRY / ROUTESCHEDULER ---- */' "$KERNEL/kernel/routeos_kernel.c"
