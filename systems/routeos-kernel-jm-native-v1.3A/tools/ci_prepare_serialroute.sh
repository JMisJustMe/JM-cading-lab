#!/usr/bin/env bash
set -euo pipefail
git merge-base --is-ancestor 5ccde5f1c8f1692cbffcc87595fecddf7b25b349 HEAD
test -f systems/routeos-kernel-jm-native-v1.2A/proof/FREEZE_LOCK_ANCHOR_v1.2A.md
V13=systems/routeos-kernel-jm-native-v1.3A
python3 "$V13/tools/serialroutec.py" "$V13/source/serialroute.jmroute" --out-dir "$V13/generated" --check
python3 -m unittest discover -s "$V13/tests" -v
bash systems/routeos-kernel-jm-native-v1.2A/tools/ci_prepare_imagecarrier.sh
mv .routeos-v12a .routeos-v13a
KERNEL=.routeos-v13a/routeos-kernel-v0.1A
python3 "$V13/tools/integrate_serialroute.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --generated "$V13/generated/serialroute_office.inc" --receipt .routeos-v13a/SERIALROUTE_INTEGRATION_RECEIPT.json
clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror -I "$KERNEL/kernel" -c "$KERNEL/kernel/routeos_kernel.c" -o .routeos-v13a/serialroute-integration-check.o
test "$(grep -Fc 'GENERATED SERIALROUTE v1.3A' "$KERNEL/kernel/routeos_kernel.c")" -eq 1
! grep -F 'static void serial_init(void)' "$KERNEL/kernel/routeos_kernel.c"
