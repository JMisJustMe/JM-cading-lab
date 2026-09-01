#!/usr/bin/env bash
set -euo pipefail

V14=systems/routeos-kernel-jm-native-v1.4A
python3 "$V14/tools/protectionroutec.py" "$V14/source/protectionroute.jmroute" --out-dir "$V14/generated" --check
python3 -m unittest discover -s "$V14/tests" -v
bash systems/routeos-kernel-jm-native-v1.3A/tools/ci_prepare_serialroute.sh
mv .routeos-v13a .routeos-v14a
KERNEL=.routeos-v14a/routeos-kernel-v0.1A
python3 "$V14/tools/integrate_protectionroute.py" --kernel "$KERNEL/kernel/routeos_kernel.c" --generated-dir "$V14/generated" --receipt .routeos-v14a/PROTECTIONROUTE_INTEGRATION_RECEIPT.json
clang -target x86_64-unknown-elf -std=c11 -ffreestanding -fno-stack-protector -fno-pic -mno-red-zone -mgeneral-regs-only -Wall -Wextra -Werror -I "$KERNEL/kernel" -c "$KERNEL/kernel/routeos_kernel.c" -o .routeos-v14a/protectionroute-integration-check.o
