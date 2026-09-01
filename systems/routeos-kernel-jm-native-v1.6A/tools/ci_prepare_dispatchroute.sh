#!/usr/bin/env bash
set -euo pipefail
V=systems/routeos-kernel-jm-native-v1.6A
python3 "$V/tools/dispatchroutec.py" "$V/source/dispatchroute.jmroute" --out-dir "$V/generated" --check
python3 -m unittest discover -s "$V/tests" -v
bash systems/routeos-kernel-jm-native-v1.5A/tools/ci_prepare_primitiveroute.sh
mv .routeos-v15a .routeos-v16a
KERNEL=.routeos-v16a/routeos-kernel-v0.1A
python3 "$V/tools/integrate_dispatchroute.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --generated "$V/generated/dispatchroute.inc" --receipt .routeos-v16a/DISPATCHROUTE_INTEGRATION_RECEIPT.json
clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror -I "$KERNEL/kernel" -c "$KERNEL/kernel/routeos_kernel.c" -o .routeos-v16a/dispatchroute-integration-check.o
