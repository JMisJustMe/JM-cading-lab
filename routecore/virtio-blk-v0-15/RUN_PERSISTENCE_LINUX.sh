#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BOOT="$HERE/build/jm_routecore_native64_virtio_blk_v0_15.img"
SEED="$HERE/build/jm_routecore_native64_virtio_blk_v0_15.data.img"
RUNTIME="$HERE/runtime"
DATA="$RUNTIME/jm_routecore_native64_virtio_blk_v0_15.data.runtime.img"
mkdir -p "$RUNTIME"
command -v qemu-system-x86_64 >/dev/null || { echo 'QEMU not found'; exit 2; }
[ -f "$BOOT" ] && [ -f "$SEED" ] || python3 "$HERE/build.py" >/dev/null
cp "$SEED" "$DATA"
run_boot(){
  local log="$1" mode="$2"
  rm -f "$log"
  qemu-system-x86_64 -machine pc -m 128M \
    -drive if=none,id=jmboot,format=raw,file="$BOOT",snapshot=on \
    -device ide-hd,drive=jmboot,bus=ide.0,bootindex=1 \
    -drive if=none,id=jmdata,format=raw,file="$DATA" \
    -device virtio-blk-pci,drive=jmdata,disable-modern=on \
    -boot c -serial file:"$log" -display none -monitor none -no-reboot -no-shutdown &
  local pid=$! ok=0
  for _ in $(seq 1 225); do
    if [ -f "$log" ] && grep -q 'JM_PROCESS_EXIT_SURVIVOR_T0' "$log"; then ok=1; break; fi
    if ! kill -0 "$pid" 2>/dev/null; then break; fi
    sleep 0.2
  done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  if [ "$ok" != 1 ]; then
    echo "FAIL boot did not reach final marker: $log"
    [ -f "$log" ] && cat "$log" || true
    exit 3
  fi
  python3 "$HERE/VERIFY_RUNTIME.py" "$log" "$mode"
  python3 "$HERE/INSPECT_VIRTIO_DISK.py" "$DATA" --expect-payload
}
run_boot "$RUNTIME/boot1.log" --expect-format
run_boot "$RUNTIME/boot2.log" --expect-existing
echo 'DING CANDIDATE — two-boot virtio-blk persistence route returned. Preserve logs + separate data carrier for receipt.'
