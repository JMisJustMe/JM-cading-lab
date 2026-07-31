#!/usr/bin/env bash
set -euo pipefail

git merge-base --is-ancestor a05b26b3901460cfa5623cbb3063d961a9952214 HEAD
test -f systems/routeos-kernel-jm-native-v0.9A/proof/FREEZE_LOCK_ANCHOR_v0.9A.md

V10=systems/routeos-kernel-jm-native-v1.0A
python3 "$V10/tools/framecarrierc.py" "$V10/source/framecarrier_interruptentry.jmroute" --out-dir "$V10/generated" --check
python3 -m unittest discover -s "$V10/tests" -v

bash systems/routeos-kernel-jm-native-v0.9A/tools/ci_prepare_bodyregistryboundary.sh
mv .routeos-v09a .routeos-v10a
KERNEL=.routeos-v10a/routeos-kernel-v0.1A
python3 "$V10/tools/integrate_framecarrier.py" \
  --assembly "$KERNEL/arch/x86_64/boot.S" \
  --office "$V10/generated/framecarrier_interruptentry.S" \
  --receipt .routeos-v10a/FRAMECARRIER_INTERRUPTENTRY_INTEGRATION_RECEIPT.json

clang -target x86_64-unknown-elf -ffreestanding -fno-pic -mno-red-zone \
  -c "$KERNEL/arch/x86_64/boot.S" -o .routeos-v10a/framecarrier-integration-check.o

test "$(grep -Fc '/* GENERATED FRAMECARRIER + INTERRUPTENTRY v1.0A' "$KERNEL/arch/x86_64/boot.S")" -eq 1
test "$(grep -Fc '.macro JM_PUSH_FRAME_REGS' "$KERNEL/arch/x86_64/boot.S")" -eq 1
test "$(grep -Fc '.macro JM_INTERRUPT_ENTRY' "$KERNEL/arch/x86_64/boot.S")" -eq 1
test "$(grep -Fc 'routeos_enter_frame:' "$KERNEL/arch/x86_64/boot.S")" -eq 1
! grep -F '.macro PUSH_REGS' "$KERNEL/arch/x86_64/boot.S"
! grep -F '.macro ROUTEOS_ISR' "$KERNEL/arch/x86_64/boot.S"
