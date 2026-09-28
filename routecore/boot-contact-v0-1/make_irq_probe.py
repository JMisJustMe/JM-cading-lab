#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import struct
import sys

EXPECTED_PARENT = "17dc85deef1bf1e2c57e29d45f764a47d9ae60553c290f6e4bf5ccdfd7216e80"
EXPECTED_PROBE = "5b796fe9a9ab52297771c625f696a2ffcc3203aab3e54d412a3bfb50b90201c4"

LOAD = 0x10000
DISK_KERNEL_BASE = 512
IRQ0_HANDLER = 0x10763
TRAMPOLINE = 0x10D20
MESSAGE = 0x10D50
SCHEDULER_TICK = 0x10651
OUTB = 0x10091
SERIAL_WRITE = 0x101D8

ORIGINAL_IRQ0 = bytes.fromhex(
    "5589e5e8e6feffff6a206a20e81df9ffff83c40890c9c3"
)
MESSAGE_BYTES = b"PIT IRQ0 CONTACT\n\x00"

def rel32(next_ip: int, target: int) -> bytes:
    return struct.pack("<i", target - next_ip)

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def main() -> int:
    if len(sys.argv) != 3:
        print("usage: make_irq_probe.py <parent.img> <probe.img>", file=sys.stderr)
        return 2

    parent_path = Path(sys.argv[1])
    probe_path = Path(sys.argv[2])
    parent = parent_path.read_bytes()
    parent_hash = sha256(parent)
    if parent_hash != EXPECTED_PARENT:
        raise SystemExit(f"parent custody failure: {parent_hash}")

    image = bytearray(parent)
    handler_off = DISK_KERNEL_BASE + (IRQ0_HANDLER - LOAD)
    if bytes(image[handler_off:handler_off + len(ORIGINAL_IRQ0)]) != ORIGINAL_IRQ0:
        raise SystemExit("IRQ0 parent bytes do not match frozen kernel")

    code = bytearray()
    code += b"\x55\x89\xE5"  # push ebp; mov ebp,esp

    pos = TRAMPOLINE + len(code)
    code += b"\xE8" + rel32(pos + 5, SCHEDULER_TICK)

    # Preserve original PIC EOI path: outb(0x20, 0x20).
    code += b"\x6A\x20\x6A\x20"
    pos = TRAMPOLINE + len(code)
    code += b"\xE8" + rel32(pos + 5, OUTB)
    code += b"\x83\xC4\x08"

    # Emit only because execution has reached the real IRQ0 handler path.
    code += b"\x68" + struct.pack("<I", MESSAGE)
    pos = TRAMPOLINE + len(code)
    code += b"\xE8" + rel32(pos + 5, SERIAL_WRITE)
    code += b"\x83\xC4\x04\x90\xC9\xC3"

    if TRAMPOLINE + len(code) >= MESSAGE:
        raise SystemExit("probe trampoline overlaps marker")

    jump = b"\xE9" + rel32(IRQ0_HANDLER + 5, TRAMPOLINE)
    image[handler_off:handler_off + len(ORIGINAL_IRQ0)] = (
        jump + b"\x90" * (len(ORIGINAL_IRQ0) - len(jump))
    )

    trampoline_off = DISK_KERNEL_BASE + (TRAMPOLINE - LOAD)
    message_off = DISK_KERNEL_BASE + (MESSAGE - LOAD)
    probe_region = image[trampoline_off:message_off + len(MESSAGE_BYTES)]
    if any(probe_region):
        raise SystemExit("expected zero padding is occupied")

    image[trampoline_off:trampoline_off + len(code)] = code
    image[message_off:message_off + len(MESSAGE_BYTES)] = MESSAGE_BYTES

    probe_hash = sha256(image)
    if probe_hash != EXPECTED_PROBE:
        raise SystemExit(f"probe hash mismatch: {probe_hash}")

    probe_path.write_bytes(image)
    manifest = {
        "schema": "jm.routecore.irq-probe-patch/0.1",
        "parent_sha256": parent_hash,
        "probe_sha256": probe_hash,
        "parent_target": "JM_ROUTECORE_BIOS_BOOT_IMAGE_v0_1",
        "patch_scope": "IRQ0 observability only",
        "irq0_handler_address": hex(IRQ0_HANDLER),
        "trampoline_address": hex(TRAMPOLINE),
        "message_address": hex(MESSAGE),
        "marker": MESSAGE_BYTES.rstrip(b"\x00").decode("ascii").rstrip("\n"),
        "preserved_irq0_operations": [
            "scheduler_tick",
            "PIC master EOI outb(0x20,0x20)",
            "return to ISR32"
        ],
        "not_claimed": [
            "physical hardware",
            "physical device driver contact",
            "IRQ1 keyboard contact"
        ]
    }
    manifest_path = probe_path.with_name("JM_ROUTECORE_IRQ_PROBE_PATCH_MANIFEST_v0_1.json")
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
