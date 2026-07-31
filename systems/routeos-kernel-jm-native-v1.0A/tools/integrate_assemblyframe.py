#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

TARGETS = ["routeos_isr_ud", "routeos_isr_timer", "routeos_isr_syscall", "routeos_enter_frame"]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def find_carrier_source(root: Path) -> Path:
    candidates: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".s", ".asm"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if all(f"{symbol}:" in text for symbol in TARGETS):
            candidates.append(path)
    if len(candidates) != 1:
        raise SystemExit(f"HOLD: expected one handwritten assembly carrier, found {len(candidates)}: {candidates}")
    return candidates[0]


def locate_span(lines: list[str]) -> tuple[int, int]:
    label_indices = {}
    for i, line in enumerate(lines):
        stripped = line.strip()
        for symbol in TARGETS:
            if stripped == f"{symbol}:":
                label_indices[symbol] = i
    if set(label_indices) != set(TARGETS):
        raise SystemExit("HOLD: all four frozen carrier labels were not found")
    ordered = [label_indices[s] for s in TARGETS]
    if ordered != sorted(ordered):
        raise SystemExit("HOLD: handwritten carrier symbol order changed")
    start = ordered[0]
    end = len(lines)
    for i in range(label_indices["routeos_enter_frame"] + 1, len(lines)):
        stripped = lines[i].strip()
        if re.match(r"^\.(?:globl|global)\s+", stripped):
            named = stripped.split(None, 1)[1].split(",", 1)[0].strip()
            if named not in TARGETS:
                end = i
                break
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*:$", stripped):
            named = stripped[:-1]
            if named not in TARGETS:
                end = i
                break
        if stripped.startswith(".section "):
            end = i
            break
    return start, end


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--kernel-root", type=Path, required=True)
    parser.add_argument("--carrier", type=Path, required=True)
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()

    source = find_carrier_source(args.kernel_root)
    raw = source.read_text(encoding="utf-8")
    if raw.count("GENERATED ASSEMBLYENTRY + FRAMECARRIER"):
        raise SystemExit("HOLD: generated carrier already present")
    lines = raw.splitlines(keepends=True)
    start, end = locate_span(lines)
    old_block = "".join(lines[start:end])
    for symbol in TARGETS:
        if old_block.count(f"{symbol}:") != 1:
            raise SystemExit(f"HOLD: handwritten symbol count wrong for {symbol}")
    generated = args.carrier.read_text(encoding="utf-8").rstrip() + "\n"
    output = "".join(lines[:start]) + generated + "".join(lines[end:])
    for symbol in TARGETS:
        if output.count(f"{symbol}:") != 1:
            raise SystemExit(f"HOLD: generated symbol count wrong for {symbol}")
    if output.count("GENERATED ASSEMBLYENTRY + FRAMECARRIER") != 1:
        raise SystemExit("HOLD: generated carrier marker not singular")

    before_sha = sha(raw.encode())
    after_sha = sha(output.encode())
    source.write_text(output, encoding="utf-8")
    meta = json.loads(args.metadata.read_text(encoding="utf-8"))
    receipt = {
        "version": meta["VERSION"],
        "proof_parent": meta["PROOF_PARENT"],
        "machine_parent": meta["MACHINE_PARENT"],
        "source_sha256": meta["source_sha256"],
        "generated_carrier_sha256": sha(args.carrier.read_bytes()),
        "assembly_source_path": str(source),
        "assembly_before_sha256": before_sha,
        "handwritten_block_sha256": sha(old_block.encode()),
        "assembly_after_sha256": after_sha,
        "frame_size_bytes": meta["frame_size_bytes"],
        "symbol_counts": {symbol: output.count(f"{symbol}:") for symbol in TARGETS},
        "generated_marker_count": output.count("GENERATED ASSEMBLYENTRY + FRAMECARRIER"),
    }
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
