#!/usr/bin/env python3
"""Recover the exact FUTARIZED v3.1 browser sources from existing carriage.

No network, ChatGPT, extra packages, or mutation of a changed owner source.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = {
    "FUTARIZED_PART_I_LIVING_REFIT.html": (
        "part-i.part00.b64", "part-i.part01a.b64", "part-i.part01b.b64",
        "part-i.part01c.b64", "part-i.part01d.b64",
    ),
    "FUTARIZED_PART_II_FUTARIAN_FIELD.html": (
        "part-ii.part00.b64", "part-ii.part01.b64",
    ),
}


def recover(destination: Path, check_only: bool = False) -> None:
    manifest = json.loads((ROOT / "PUBLICATION_MANIFEST.json").read_text("utf-8"))
    ready: dict[str, bytes] = {}
    # Validate BOTH exact originals and existing destination files before writing either.
    for name, parts in PARTS.items():
        encoded = b"".join((ROOT / "source-carriage" / part).read_bytes() for part in parts)
        packed = base64.b64decode(b"".join(encoded.split()), validate=True)
        body = gzip.decompress(packed)
        expected = manifest["source_members"][name]
        digest = hashlib.sha256(body).hexdigest()
        if len(body) != expected["bytes"] or digest != expected["sha256"]:
            raise ValueError(f"{name}: recovered bytes/SHA-256 do not match publication authority")
        target = destination / name
        if target.exists() and target.read_bytes() != body:
            raise FileExistsError(f"{target}: modified source protected; choose an empty output directory")
        ready[name] = body
    if check_only:
        print("PASS: both FUTARIZED v3.1 sources recover exactly; no files written")
        return
    destination.mkdir(parents=True, exist_ok=True)
    for name, body in ready.items():
        target = destination / name
        if not target.exists():
            target.write_bytes(body)
        if target.read_bytes() != body:
            raise IOError(f"{target}: independent post-write readback mismatch")
        print(f"PASS: {name} {len(body)} bytes {hashlib.sha256(body).hexdigest()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT,
                        help="Existing source directory or a separate owner-editable copy")
    parser.add_argument("--check", action="store_true", help="Verify source carriage without writing")
    args = parser.parse_args()
    recover(args.out, args.check)
