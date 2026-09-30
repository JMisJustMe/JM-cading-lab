#!/usr/bin/env bash
set -euo pipefail

OUT=routecore-contact-uefi
mkdir -p "$OUT/EFI/BOOT"
base64 -d routecore/uefi-contact-v0-1/BOOTX64.EFI.b64 > "$OUT/EFI/BOOT/BOOTX64.EFI"
echo "c28cb26b2cbd0ba3feb084e590da1a0edd61cf2b4309a52a82cf3d9cc52aae51  $OUT/EFI/BOOT/BOOTX64.EFI" | sha256sum -c -
file "$OUT/EFI/BOOT/BOOTX64.EFI" | tee "$OUT/file.txt"
grep -Fq "PE32+ executable for EFI (application), x86-64" "$OUT/file.txt"

dd if=/dev/zero of="$OUT/uefi-contact.img" bs=1M count=64 status=none
mkfs.vfat -F 32 "$OUT/uefi-contact.img" >/dev/null
mmd -i "$OUT/uefi-contact.img" ::/EFI
mmd -i "$OUT/uefi-contact.img" ::/EFI/BOOT
mcopy -i "$OUT/uefi-contact.img" "$OUT/EFI/BOOT/BOOTX64.EFI" ::/EFI/BOOT/BOOTX64.EFI
mdir -i "$OUT/uefi-contact.img" ::/EFI/BOOT | tee "$OUT/fat-directory.txt"

CODE=/usr/share/OVMF/OVMF_CODE.fd
VARS=/usr/share/OVMF/OVMF_VARS.fd
test -f "$CODE"
test -f "$VARS"
cp "$VARS" "$OUT/OVMF_VARS.fd"

monitor=/tmp/jm-routecore-uefi-hmp.sock
rm -f "$monitor"

qemu-system-x86_64   -machine pc,accel=tcg   -cpu qemu64   -m 256M   -drive if=pflash,format=raw,readonly=on,file="$CODE"   -drive if=pflash,format=raw,file="$OUT/OVMF_VARS.fd"   -drive file="$OUT/uefi-contact.img",format=raw,if=ide,index=0,media=disk   -boot c   -vga std   -display none   -serial file:"$OUT/serial.log"   -monitor unix:"$monitor",server,nowait   -no-reboot   -no-shutdown   > "$OUT/qemu.log" 2>&1 &
qemu_pid=$!

cleanup() {
  kill "$qemu_pid" 2>/dev/null || true
  wait "$qemu_pid" 2>/dev/null || true
  rm -f "$monitor"
}
trap cleanup EXIT

for _ in $(seq 1 100); do
  [ -S "$monitor" ] && break
  sleep 0.1
done
test -S "$monitor"

hmp() {
  python3 - "$monitor" "$1" <<'PY'
import socket, sys, time
path, cmd = sys.argv[1], sys.argv[2]
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(2)
s.connect(path)
try:
    s.recv(4096)
except Exception:
    pass
s.sendall((cmd + "\n").encode())
time.sleep(0.15)
try:
    print(s.recv(65536).decode(errors="replace"))
except Exception:
    pass
s.close()
PY
}

found=0
for i in $(seq 1 36); do
  hmp "screendump $OUT/frame-entry-$i.ppm" >/dev/null
  tesseract "$OUT/frame-entry-$i.ppm" stdout --psm 6 2>/dev/null > "$OUT/frame-entry-$i.txt" || true
  cat "$OUT/frame-entry-$i.txt"
  if grep -Fqi "UEFI FIRMWARE ENTRY CONTACT" "$OUT/frame-entry-$i.txt"; then
    cp "$OUT/frame-entry-$i.ppm" "$OUT/frame-entry.ppm"
    cp "$OUT/frame-entry-$i.txt" "$OUT/frame-entry.txt"
    found=1
    break
  fi
  sleep 0.5
done
test "$found" -eq 1

hmp "sendkey a" >/dev/null

found=0
for i in $(seq 1 24); do
  hmp "screendump $OUT/frame-key-$i.ppm" >/dev/null
  tesseract "$OUT/frame-key-$i.ppm" stdout --psm 6 2>/dev/null > "$OUT/frame-key-$i.txt" || true
  cat "$OUT/frame-key-$i.txt"
  if grep -Fqi "UEFI KEYBOARD PROTOCOL CONTACT" "$OUT/frame-key-$i.txt"; then
    cp "$OUT/frame-key-$i.ppm" "$OUT/frame-key.ppm"
    cp "$OUT/frame-key-$i.txt" "$OUT/frame-key.txt"
    found=1
    break
  fi
  sleep 0.35
done
test "$found" -eq 1
grep -Fqi "SAFE RETURN TO FIRMWARE" "$OUT/frame-key.txt"

hmp "sendkey b" >/dev/null
sleep 0.3
qemu-system-x86_64 --version | head -1 > "$OUT/qemu-version.txt"

python3 - <<'PY'
import hashlib, json, pathlib
d = pathlib.Path("routecore-contact-uefi")
efi = d/"EFI/BOOT/BOOTX64.EFI"
entry = (d/"frame-entry.txt").read_text(errors="replace")
key = (d/"frame-key.txt").read_text(errors="replace")
receipt = {
  "schema": "jm.routecore.uefi-observable-witness/0.1",
  "execution_surface": "GitHub Actions + QEMU x86_64 + OVMF",
  "witness_sha256": hashlib.sha256(efi.read_bytes()).hexdigest(),
  "expected_witness_sha256": "c28cb26b2cbd0ba3feb084e590da1a0edd61cf2b4309a52a82cf3d9cc52aae51",
  "markers": {
    "uefi_firmware_entry_contact": "UEFI FIRMWARE ENTRY CONTACT" in entry.upper(),
    "uefi_keyboard_protocol_contact": "UEFI KEYBOARD PROTOCOL CONTACT" in key.upper(),
    "safe_return_marker": "SAFE RETURN TO FIRMWARE" in key.upper()
  },
  "claim_scope": {
    "exact_observable_descendant_executed_under_ovmf": True,
    "ovmf_simple_text_output_contact": True,
    "ovmf_keyboard_protocol_contact": True,
    "physical_machine_execution": False,
    "physical_keyboard_contact": False,
    "routecore_kernel_boot": False,
    "physical_irq0": False,
    "physical_irq1": False,
    "physical_device_driver_contact": False
  }
}
receipt["pass"] = receipt["witness_sha256"] == receipt["expected_witness_sha256"] and all(receipt["markers"].values())
(d/"JM_ROUTECORE_UEFI_OBSERVABLE_WITNESS_RECEIPT_v0_1.json").write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n")
print(json.dumps(receipt,indent=2,sort_keys=True))
if not receipt["pass"]:
    raise SystemExit(1)
PY
