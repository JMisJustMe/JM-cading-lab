#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "00_OPEN_FIRST_GLYPHPLAY_FORGE_v0_1.html.gz.b64"
TARGET = ROOT / "00_OPEN_FIRST_GLYPHPLAY_FORGE_v0_1.html"
EXPECTED = "7ac7170e4b8a22941b946d187e82461904baedea033ede0b5e19930112f2c591"


def main() -> int:
    encoded = "".join(SOURCE.read_text(encoding="utf-8").split())
    encoded += "=" * (-len(encoded) % 4)
    try:
        compressed = base64.b64decode(encoded, validate=True)
        payload = gzip.decompress(compressed)
    except Exception as exc:
        raise SystemExit(f"GlyphPlay source carrier decode held: {exc}") from exc
    actual = hashlib.sha256(payload).hexdigest()
    if actual != EXPECTED:
        raise SystemExit(f"GlyphPlay source carrier mismatch: {actual} != {EXPECTED}")
    TARGET.write_bytes(payload)
    print(f"GLYPHPLAY_FORGE_MATERIALIZE_PASS {actual} {TARGET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
