#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; TRACE="$ROOT/proof/QEMU_BOOT_TRACE.txt"; ISO="$ROOT/build/routeos-contact-action.iso"; MON="$ROOT/build/qemu-monitor.sock"
for tool in grub-mkrescue xorriso qemu-system-x86_64; do command -v "$tool" >/dev/null || { echo "HOLD: $tool missing"; exit 2; }; done
"$ROOT/build.sh"; rm -rf "$ROOT/build/isodir"; mkdir -p "$ROOT/build/isodir/boot/grub"; cp "$ROOT/build/routeos-kernel.elf" "$ROOT/build/isodir/boot/routeos-kernel.elf"
cat > "$ROOT/build/isodir/boot/grub/grub.cfg" <<'CFG'
set timeout=0
set default=0
menuentry "JM RouteOS Contact-to-Action Kernel" { multiboot2 /boot/routeos-kernel.elf; boot }
CFG
grub-mkrescue -o "$ISO" "$ROOT/build/isodir" >/dev/null; rm -f "$TRACE" "$MON"; set +e
timeout --signal=TERM --kill-after=2 14 qemu-system-x86_64 -machine pc,accel=tcg -m 128M -cdrom "$ISO" -boot d -display none -serial file:"$TRACE" -monitor unix:"$MON",server,nowait -no-reboot -no-shutdown &
qpid=$!; set -e
python3 "$ROOT/tests/inject_keyboard.py" "$TRACE" "$MON"
set +e; wait "$qpid"; status=$?; set -e
cat "$TRACE"
if [[ "$status" -ne 0 && "$status" -ne 124 ]]; then echo "HOLD: QEMU exited $status"; exit "$status"; fi
python3 "$ROOT/tests/verify_trace.py" "$TRACE"; printf 'ROUTEOS_CONTACT_TO_ACTION_DING PASS (capture_status=%s)\n' "$status"
