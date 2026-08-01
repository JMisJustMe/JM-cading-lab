#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

SEAMS = [
    ("descriptorinstall", "static void gdt_install(void) {", "static void idt_set(uint8_t vector, void (*handler)(void), uint8_t attr) {", "descriptorinstall.inc"),
    ("vectorroute", "static void idt_set(uint8_t vector, void (*handler)(void), uint8_t attr) {", "static void jm_interruptroute_announce(void) {", "vectorroute.inc"),
    ("interruptcontroller", "static void pic_pit_install(void) {", "/* GENERATED BODYREGISTRY. EDIT source/bodyregistry_userboundary.jmroute, NOT THIS FILE. */", "interruptcontroller.inc"),
    ("usermap_bodyframe", "static void mark_user_page(uint64_t address) {", "/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */", "usermap_bodyframe.inc"),
]
MARKERS = [
    "/* GENERATED DESCRIPTORINSTALL v1.4A SOURCE ",
    "/* GENERATED VECTORROUTE v1.4A SOURCE ",
    "/* GENERATED INTERRUPTCONTROLLER v1.4A SOURCE ",
    "/* GENERATED USERMAPROUTE + BODYFRAMEINSTALL v1.4A SOURCE ",
]
RETENTION_MARKER = "/* PROTECTIONROUTE v1.4A EXACT ELF OFFICE RETENTION CONTRACT."
RESIDUE = [
    "static void gdt_install(void) {",
    "static void idt_set(uint8_t vector, void (*handler)(void), uint8_t attr) {",
    "static void idt_install(void) {",
    "static void pic_pit_install(void) {",
    "static void mark_user_page(uint64_t address) {",
    "static void user_boundary_install(void) {",
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kernel", type=Path, required=True)
    ap.add_argument("--generated-dir", type=Path, required=True)
    ap.add_argument("--receipt", type=Path, required=True)
    args = ap.parse_args()

    text = args.kernel.read_text()
    if any(marker in text for marker in MARKERS) or RETENTION_MARKER in text:
        raise SystemExit("HOLD: generated ProtectionRoute already present")

    retention_path = args.generated_dir / "office_retention.inc"
    retention = retention_path.read_text().rstrip() + "\n\n"
    if retention.count(RETENTION_MARKER) != 1:
        raise SystemExit("HOLD: office retention contract marker mismatch")

    removed: dict[str, str] = {}
    for index, (name, start, end, generated_name) in enumerate(SEAMS):
        if text.count(start) != 1 or text.count(end) != 1:
            raise SystemExit(f"HOLD: {name} seam is not singular")
        left = text.index(start)
        right = text.index(end, left)
        old = text[left:right]
        generated = (args.generated_dir / generated_name).read_text().rstrip() + "\n\n"
        if index == 0:
            generated = retention + generated
        text = text[:left] + generated + text[right:]
        removed[name] = sha(old.encode())

    for marker in MARKERS:
        if text.count(marker) != 1:
            raise SystemExit(f"HOLD: generated marker count mismatch: {marker}")
    if text.count(RETENTION_MARKER) != 1:
        raise SystemExit("HOLD: office retention contract integration mismatch")
    residue = {signature: text.count(signature) for signature in RESIDUE}
    if any(residue.values()):
        raise SystemExit(f"HOLD: handwritten ProtectionRoute residue remains: {residue}")

    args.kernel.write_text(text)
    record = {
        "version": "v1.4A",
        "kernel": str(args.kernel),
        "removed_handwritten_sha256": removed,
        "generated_marker_counts": {marker: text.count(marker) for marker in MARKERS},
        "office_retention_contract_sha256": sha(retention_path.read_bytes()),
        "office_retention_contract_count": text.count(RETENTION_MARKER),
        "handwritten_residue": residue,
        "integrated_kernel_sha256": sha(text.encode()),
    }
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
