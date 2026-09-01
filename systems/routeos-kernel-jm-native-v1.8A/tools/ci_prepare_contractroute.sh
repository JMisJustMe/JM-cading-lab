#!/usr/bin/env bash
set -euo pipefail
V=systems/routeos-kernel-jm-native-v1.8A
python3 "$V/tools/contractroutec.py" "$V/source/contractroute.jmroute" --out-dir "$V/generated" --check
python3 -m unittest discover -s "$V/tests" -v
bash systems/routeos-kernel-jm-native-v1.7A/tools/ci_prepare_entryroute.sh
mv .routeos-v17a .routeos-v18a
KERNEL=.routeos-v18a/routeos-kernel-v0.1A
python3 "$V/tools/integrate_contractroute.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --generated "$V/generated/contractroute.inc" --receipt .routeos-v18a/CONTRACTROUTE_INTEGRATION_RECEIPT.json
clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror -I "$KERNEL/kernel" -c "$KERNEL/kernel/routeos_kernel.c" -o .routeos-v18a/contractroute-integration-check.o
