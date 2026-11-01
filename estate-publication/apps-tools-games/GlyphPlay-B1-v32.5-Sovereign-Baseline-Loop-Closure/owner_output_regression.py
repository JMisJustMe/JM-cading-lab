#!/usr/bin/env python3
"""Exercise the existing GlyphPlay B1 exact-source recovery without changing its authority."""
import subprocess
import sys
import tempfile
from pathlib import Path

script = Path(__file__).with_name("reconstruct_glyphplay_v32_5.py")

def recover(*args):
    return subprocess.run([sys.executable, str(script), *args], capture_output=True, text=True)

with tempfile.TemporaryDirectory() as d:
    root = Path(d)
    output = root / "owner-editable.html"

    r = recover("--verify-only", "--output", str(output))
    assert r.returncode == 0 and not output.exists(), (r.stdout, r.stderr)

    r = recover("--output", str(output))
    assert r.returncode == 0, (r.stdout, r.stderr)
    original = output.read_bytes()
    mtime = output.stat().st_mtime_ns

    r = recover("--output", str(output))
    assert r.returncode == 0 and output.stat().st_mtime_ns == mtime
    assert output.read_bytes() == original

    owner_edit = original + b"\n<!-- owner changed this copy -->\n"
    output.write_bytes(owner_edit)
    r = recover("--output", str(output))
    assert r.returncode != 0 and "refusing to overwrite modified output" in r.stderr
    assert output.read_bytes() == owner_edit

    other = root / "alternative.html"
    r = recover("--output", str(other))
    assert r.returncode == 0 and other.read_bytes() == original

    link = root / "linked.html"
    link.symlink_to(output)
    r = recover("--output", str(link))
    assert r.returncode != 0 and "refusing to write through output symlink" in r.stderr
    assert output.read_bytes() == owner_edit

print("GLYPHPLAY_OWNER_OUTPUT_GUARD_PASS: verify-only, new output, idempotent repeat, modified-copy refusal, alternate recovery, symlink refusal")
