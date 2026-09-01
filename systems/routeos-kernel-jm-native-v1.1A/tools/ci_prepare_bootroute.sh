#!/usr/bin/env bash
set -euo pipefail

git merge-base --is-ancestor 276e9ebaa030ca3fe9eec5365d4190cd4a6a2a96 HEAD
test -f systems/routeos-kernel-jm-native-v1.0A/proof/FREEZE_LOCK_ANCHOR_v1.0A.md

V11=systems/routeos-kernel-jm-native-v1.1A
python3 "$V11/tools/bootroutec.py" "$V11/source/bootcarrier_longmoderoute.jmroute" --out-dir "$V11/generated" --check
python3 -m unittest discover -s "$V11/tests" -v

bash systems/routeos-kernel-jm-native-v1.0A/tools/ci_prepare_framecarrier.sh
mv .routeos-v10a .routeos-v11a
KERNEL=.routeos-v11a/routeos-kernel-v0.1A
python3 "$V11/tools/integrate_bootroute.py" \
  --assembly "$KERNEL/arch/x86_64/boot.S" \
  --head "$V11/generated/bootcarrier_longmoderoute_head.S" \
  --tail "$V11/generated/bootcarrier_longmoderoute_tail.S" \
  --receipt .routeos-v11a/BOOTCARRIER_LONGMODEROUTE_INTEGRATION_RECEIPT.json

clang -target x86_64-unknown-elf -ffreestanding -fno-pic -mno-red-zone \
  -c "$KERNEL/arch/x86_64/boot.S" -o .routeos-v11a/bootroute-integration-check.o

test "$(grep -Fc 'GENERATED BOOTCARRIER + PAGEROUTE + LONGMODEROUTE + PRIVILEGELOADER v1.1A' "$KERNEL/arch/x86_64/boot.S")" -eq 1
test "$(grep -Fc 'GENERATED BOOT ROUTE STORAGE v1.1A' "$KERNEL/arch/x86_64/boot.S")" -eq 1
test "$(grep -Fc 'GENERATED FRAMECARRIER + INTERRUPTENTRY v1.0A' "$KERNEL/arch/x86_64/boot.S")" -eq 1
! grep -F 'RouteOS x86-64 Multiboot2 entry and controlled-entry stubs' "$KERNEL/arch/x86_64/boot.S"
