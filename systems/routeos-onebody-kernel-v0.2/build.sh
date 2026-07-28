#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD="$ROOT/build"
mkdir -p "$BUILD/generated"
node "$ROOT/compiler/lower_routeos_user.mjs" "$ROOT/source/generated_user_body_1.jm.cading" "$BUILD/generated"
CC="${CC:-clang}"
LD="${LD:-ld.lld}"
CFLAGS=(-target x86_64-unknown-elf -std=c11 -O2 -Wall -Wextra -Werror \
  -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mno-red-zone \
  -mno-sse -mno-sse2 -mno-mmx -mno-80387 -mcmodel=small)
"$CC" "${CFLAGS[@]}" -c "$ROOT/kernel/routeos_kernel.c" -o "$BUILD/routeos_kernel.o"
"$CC" -target x86_64-unknown-elf -ffreestanding -fno-pic -mno-red-zone \
  -c "$ROOT/arch/x86_64/boot.S" -o "$BUILD/boot.o"
"$CC" -target x86_64-unknown-elf -ffreestanding -fno-pic -mno-red-zone \
  -c "$BUILD/generated/generated_user_body_1.S" -o "$BUILD/generated_user_body_1.o"
"$LD" -nostdlib -z max-page-size=0x1000 -T "$ROOT/linker.ld" \
  "$BUILD/boot.o" "$BUILD/generated_user_body_1.o" "$BUILD/routeos_kernel.o" -o "$BUILD/routeos-kernel.elf"
python3 "$ROOT/tests/static_verify.py" "$BUILD/routeos-kernel.elf"
python3 "$ROOT/tests/verify_generated_body.py" \
  "$BUILD/routeos-kernel.elf" \
  "$ROOT/source/generated_user_body_1.jm.cading" \
  "$BUILD/generated/generated_user_body_1.onebody.json" \
  "$BUILD/generated/generated_user_body_1.S" \
  "$BUILD/generated/generated_user_body_1.lowering_receipt.json"
printf 'BUILT %s\n' "$BUILD/routeos-kernel.elf"
