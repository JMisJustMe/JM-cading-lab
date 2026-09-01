#!/usr/bin/env bash
set -euo pipefail
V=systems/routeos-kernel-jm-native-v1.9A
python3 "$V/tools/orchestrationroutec.py" "$V/source/orchestrationroute.jmroute" --out-dir "$V/generated" --check
python3 -m unittest discover -s "$V/tests" -v
bash systems/routeos-kernel-jm-native-v1.8A/tools/ci_prepare_contractroute.sh
mv .routeos-v18a .routeos-v19a
KERNEL=.routeos-v19a/routeos-kernel-v0.1A
python3 "$V/tools/integrate_orchestrationroute.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --generated "$V/generated/orchestrationroute.inc" --receipt .routeos-v19a/ORCHESTRATIONROUTE_INTEGRATION_RECEIPT.json
clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror -I "$KERNEL/kernel" -c "$KERNEL/kernel/routeos_kernel.c" -o .routeos-v19a/orchestrationroute-integration-check.o
