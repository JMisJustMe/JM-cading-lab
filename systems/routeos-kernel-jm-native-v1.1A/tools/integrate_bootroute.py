#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

FRAME_MARKER = "/* GENERATED FRAMECARRIER + INTERRUPTENTRY v1.0A"
OLD_TAIL_START = "\n.section .rodata\n.align 8\nboot_gdt:\n"
OLD_HEADER = "/* RouteOS x86-64 Multiboot2 entry and controlled-entry stubs. */"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--assembly", type=Path, required=True)
    ap.add_argument("--head", type=Path, required=True)
    ap.add_argument("--tail", type=Path, required=True)
    ap.add_argument("--receipt", type=Path, required=True)
    args = ap.parse_args()

    before_bytes = args.assembly.read_bytes()
    before = before_bytes.decode("utf-8")
    if before.count(FRAME_MARKER) != 1:
        raise SystemExit(f"HOLD: framecarrier boundary count is {before.count(FRAME_MARKER)}, expected 1")
    if before.count(OLD_TAIL_START) != 1:
        raise SystemExit(f"HOLD: handwritten boot storage boundary count is {before.count(OLD_TAIL_START)}, expected 1")
    if before.count(OLD_HEADER) != 1:
        raise SystemExit(f"HOLD: handwritten boot header count is {before.count(OLD_HEADER)}, expected 1")

    head = args.head.read_text(encoding="utf-8").rstrip() + "\n\n"
    tail = args.tail.read_text(encoding="utf-8").rstrip() + "\n"
    frame_index = before.index(FRAME_MARKER)
    middle_and_tail = before[frame_index:]
    tail_index = middle_and_tail.index(OLD_TAIL_START)
    middle = middle_and_tail[:tail_index].rstrip() + "\n\n"
    after = head + middle + tail

    if OLD_HEADER in after:
        raise SystemExit("HOLD: handwritten boot head remains")
    for marker in (
        "/* GENERATED BOOTCARRIER + PAGEROUTE + LONGMODEROUTE + PRIVILEGELOADER v1.1A",
        "/* GENERATED BOOT ROUTE STORAGE v1.1A",
        FRAME_MARKER,
    ):
        if after.count(marker) != 1:
            raise SystemExit(f"HOLD: generated marker count wrong: {marker}")
    for symbol in ("_start", "long_mode_entry", "routeos_load_gdt", "routeos_load_tr", "routeos_reload_cr3", "boot_gdt", "boot_pml4", "boot_stack_top"):
        count = len(re.findall(rf"^{re.escape(symbol)}:(?:\s|$)", after, re.M))
        if count != 1:
            raise SystemExit(f"HOLD: integrated symbol count wrong for {symbol}: {count}")
    if len(re.findall(r"^routeos_user_blob_start:$", after, re.M)) != 1 or len(re.findall(r"^routeos_enter_frame:$", after, re.M)) != 1:
        raise SystemExit("HOLD: inherited user/frame carriers were not preserved singularly")

    args.assembly.write_text(after, encoding="utf-8")
    receipt = {
        "assembly_path": str(args.assembly),
        "assembly_before_sha256": sha256(before_bytes),
        "assembly_after_sha256": sha256(after.encode()),
        "generated_head_path": str(args.head),
        "generated_head_sha256": sha256(head.rstrip().encode() + b"\n"),
        "generated_tail_path": str(args.tail),
        "generated_tail_sha256": sha256(tail.encode()),
        "handwritten_boot_head_remaining": after.count(OLD_HEADER),
        "generated_boot_head_count": after.count("GENERATED BOOTCARRIER + PAGEROUTE + LONGMODEROUTE + PRIVILEGELOADER v1.1A"),
        "generated_boot_tail_count": after.count("GENERATED BOOT ROUTE STORAGE v1.1A"),
        "framecarrier_v1_0a_count": after.count(FRAME_MARKER),
        "user_blob_count": after.count("routeos_user_blob_start:"),
    }
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, sort_keys=True))

if __name__ == "__main__":
    main()
