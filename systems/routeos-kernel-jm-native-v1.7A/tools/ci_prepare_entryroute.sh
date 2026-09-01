#!/usr/bin/env bash
set -euo pipefail
V=systems/routeos-kernel-jm-native-v1.7A
python3 "$V/tools/entryroutec.py" "$V/source/entryroute.jmroute" --out-dir "$V/generated" --check
python3 -m unittest discover -s "$V/tests" -v
bash systems/routeos-kernel-jm-native-v1.6A/tools/ci_prepare_dispatchroute.sh
mv .routeos-v16a .routeos-v17a
KERNEL=.routeos-v17a/routeos-kernel-v0.1A
python3 "$V/tools/integrate_entryroute.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --head "$V/generated/entryroute_head.inc" --tail "$V/generated/entryroute_tail.inc" --receipt .routeos-v17a/ENTRYROUTE_INTEGRATION_RECEIPT.json
clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror -I "$KERNEL/kernel" -c "$KERNEL/kernel/routeos_kernel.c" -o .routeos-v17a/entryroute-integration-check.o
