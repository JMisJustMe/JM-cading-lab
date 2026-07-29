#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"; BASE="$ROOT/../routeos-two-generated-bodies-v0.3"; KERNEL_BASE="$ROOT/../routeos-generated-kernel-v0.4"; BUILD="$ROOT/build"; GENK="$BUILD/generated_kernel"; GENU="$BUILD/generated_users"
rm -rf "$BUILD"; mkdir -p "$GENK" "$GENU"
test ! -e "$ROOT/kernel/routeos_kernel.c"; test ! -e "$ROOT/arch/x86_64/boot.S"; test ! -e "$ROOT/linker.ld"
node "$KERNEL_BASE/compiler/generate_routeos_kernel.mjs" "$KERNEL_BASE/source/routeos_kernel_blueprint.jm.cading" "$GENK"
node "$ROOT/compiler/apply_contact_action_overlay.mjs" "$ROOT/source/contact_action_overlay.jm.cading" "$GENK"
node "$BASE/compiler/lower_routeos_user.mjs" "$BASE/source/generated_user_body_1.jm.cading" "$GENU"
node "$BASE/compiler/lower_routeos_user.mjs" "$BASE/source/generated_user_body_2.jm.cading" "$GENU"
CC="${CC:-clang}"; LD="${LD:-ld.lld}"; CFLAGS=(-target x86_64-unknown-elf -std=c11 -O2 -Wall -Wextra -Werror -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mno-red-zone -mno-sse -mno-sse2 -mno-mmx -mno-80387 -mcmodel=small)
"$CC" "${CFLAGS[@]}" -c "$GENK/routeos_kernel.c" -o "$BUILD/routeos_kernel.o"
"$CC" -target x86_64-unknown-elf -ffreestanding -fno-pic -mno-red-zone -c "$GENK/boot.S" -o "$BUILD/boot.o"
for body in 1 2; do "$CC" -target x86_64-unknown-elf -ffreestanding -fno-pic -mno-red-zone -c "$GENU/generated_user_body_${body}.S" -o "$BUILD/generated_user_body_${body}.o"; done
"$LD" -nostdlib -z max-page-size=0x1000 -T "$GENK/linker.ld" "$BUILD/boot.o" "$BUILD/generated_user_body_1.o" "$BUILD/generated_user_body_2.o" "$BUILD/routeos_kernel.o" -o "$BUILD/routeos-kernel.elf"
python3 "$ROOT/tests/verify_generated_kernel.py" "$ROOT" "$BASE" "$KERNEL_BASE" "$BUILD/routeos-kernel.elf"
printf 'CONTACT_ACTION_GENERATED_KERNEL_BUILD PASS %s\n' "$BUILD/routeos-kernel.elf"
