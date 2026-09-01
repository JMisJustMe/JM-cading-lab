#!/usr/bin/env bash
set -euo pipefail
V15=systems/routeos-kernel-jm-native-v1.5A
python3 "$V15/tools/primitiveroutec.py" "$V15/source/primitiveroute.jmroute" --out-dir "$V15/generated" --check
python3 -m unittest discover -s "$V15/tests" -v
bash systems/routeos-kernel-jm-native-v1.4A/tools/ci_prepare_protectionroute.sh
mv .routeos-v14a .routeos-v15a
KERNEL=.routeos-v15a/routeos-kernel-v0.1A
python3 "$V15/tools/integrate_primitiveroute.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --generated "$V15/generated/primitiveroute.inc" --receipt .routeos-v15a/PRIMITIVEROUTE_INTEGRATION_RECEIPT.json
clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror -I "$KERNEL/kernel" -c "$KERNEL/kernel/routeos_kernel.c" -o .routeos-v15a/primitiveroute-integration-check.o
