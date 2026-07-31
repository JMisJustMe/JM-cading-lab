#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "source" / "chunks"
TARGET = ROOT / "00_OPEN_FIRST_GLYPHPLAY_FORGE_v0_1.html"
EXPECTED_PARTS = 6
EXPECTED_ENCODED_LENGTH = 21480
EXPECTED_HTML_SHA256 = "7ac7170e4b8a22941b946d187e82461904baedea033ede0b5e19930112f2c591"


def main() -> int:
    files = sorted(PARTS.glob("part-*.b64"))
    if len(files) != EXPECTED_PARTS:
        raise SystemExit(
            f"GlyphPlay source carrier held: expected {EXPECTED_PARTS} chunks, found {len(files)}"
        )

    encoded = "".join(
        "".join(path.read_text(encoding="utf-8").split()) for path in files
    )
    if len(encoded) != EXPECTED_ENCODED_LENGTH:
        raise SystemExit(
            "GlyphPlay source carrier held: "
            f"expected {EXPECTED_ENCODED_LENGTH} base64 characters, found {len(encoded)}"
        )

    try:
        compressed = base64.b64decode(encoded, validate=True)
        payload = gzip.decompress(compressed)
    except Exception as exc:
        raise SystemExit(f"GlyphPlay source carrier decode held: {exc}") from exc

    actual = hashlib.sha256(payload).hexdigest()
    if actual != EXPECTED_HTML_SHA256:
        raise SystemExit(
            f"GlyphPlay source carrier mismatch: {actual} != {EXPECTED_HTML_SHA256}"
        )

    TARGET.write_bytes(payload)
    chunk_hashes = {
        path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in files
    }
    print(
        "GLYPHPLAY_FORGE_MATERIALIZE_PASS "
        f"{actual} {TARGET} chunks={len(files)} chunk_hashes={chunk_hashes}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
