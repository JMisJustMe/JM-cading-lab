#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; TRACE="$ROOT/proof/QEMU_BOOT_TRACE.txt"; ISO="$ROOT/build/routeos-generated-kernel.iso"
for tool in grub-mkrescue xorriso qemu-system-x86_64; do command -v "$tool" >/dev/null || { echo "HOLD: $tool missing"; exit 2; }; done
"$ROOT/build.sh"; rm -rf "$ROOT/build/isodir"; mkdir -p "$ROOT/build/isodir/boot/grub"; cp "$ROOT/build/routeos-kernel.elf" "$ROOT/build/isodir/boot/routeos-kernel.elf"
cat > "$ROOT/build/isodir/boot/grub/grub.cfg" <<'CFG'
set timeout=0
set default=0
menuentry "JM Generated RouteOS Kernel" { multiboot2 /boot/routeos-kernel.elf; boot }
CFG
grub-mkrescue -o "$ISO" "$ROOT/build/isodir" >/dev/null; rm -f "$TRACE"; set +e
timeout --signal=TERM --kill-after=2 12 qemu-system-x86_64 -machine pc,accel=tcg -m 128M -cdrom "$ISO" -boot d -display none -serial stdio -monitor none -no-reboot -no-shutdown 2>&1 | tee "$TRACE"; status=${PIPESTATUS[0]}; set -e
if [[ "$status" -ne 0 && "$status" -ne 124 ]]; then echo "HOLD: QEMU exited $status"; exit "$status"; fi
python3 "$ROOT/tests/verify_trace.py" "$TRACE"; printf 'GENERATED_ROUTEOS_KERNEL_DING PASS (capture_status=%s)\n' "$status"
