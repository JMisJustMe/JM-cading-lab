#!/usr/bin/env python3
"""Regression lock for Windows-generated HTML newline canonicalization."""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

import android_windows_build as windows_build  # noqa: E402


def main() -> int:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        html = root / "assets" / "index.html"
        kotlin = root / "MainActivity.kt"
        binary = root / "payload.bin"
        html.parent.mkdir(parents=True)
        html.write_bytes(b"<main>\r\nJM\r\n</main>\r\n")
        kotlin.write_bytes(b"fun main() {\r\n}\r\n")
        binary.write_bytes(b"\x00\r\n\xff")

        changed = windows_build.canonicalize_generated_text(root)
        assert changed == 2
        assert html.read_bytes() == b"<main>\nJM\n</main>\n"
        assert kotlin.read_bytes() == b"fun main() {\n}\n"
        assert binary.read_bytes() == b"\x00\r\n\xff"
        assert ".html" in windows_build.TEXT_SUFFIXES

    print("ANDROID_WINDOWS_HTML_LF_CANONICALIZATION_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
