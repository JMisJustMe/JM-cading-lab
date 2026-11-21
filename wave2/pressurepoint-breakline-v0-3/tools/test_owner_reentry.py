#!/usr/bin/env python3
"""Bounded regression for the original PRESSUREPOINT v0.3 recovery command."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / 'tools' / 'verify_pressurepoint_breakline_v0_3.py'
MANIFEST = json.loads((ROOT / 'PUBLICATION_MANIFEST.json').read_text(encoding='utf-8'))
AUTHORITY = MANIFEST['authority']
# Explicitly remove git from PATH: recovery must not depend on a Git installation.
ENV = dict(os.environ, PATH='/jm-no-external-git')


def run(path):
    return subprocess.run(
        [sys.executable, str(VERIFY), '--output', str(path)],
        capture_output=True, text=True, env=ENV, check=False,
    )


def require(condition, message):
    if not condition:
        raise AssertionError(message)


with tempfile.TemporaryDirectory(prefix='jm-pressurepoint-owner-') as folder:
    root = Path(folder)
    output = root / 'owner-source.html'
    first = run(output)
    require(first.returncode == 0, 'first recovery failed: ' + first.stdout + first.stderr)
    original = output.read_bytes()
    require(len(original) == AUTHORITY['bytes'], 'recovered byte count mismatch')
    require(hashlib.sha256(original).hexdigest() == AUTHORITY['sha256'], 'exact source SHA mismatch')
    require('RECONSTRUCTED' in first.stdout, 'first recovery receipt absent')

    before_mtime = output.stat().st_mtime_ns
    repeat = run(output)
    require(repeat.returncode == 0 and 'ALREADY EXACT' in repeat.stdout, 'idempotent repeat failed')
    require(output.stat().st_mtime_ns == before_mtime, 'identical owner source was rewritten')

    edited = original + b'\n<!-- owner edit: must survive recovery -->\n'
    output.write_bytes(edited)
    refused = run(output)
    require(refused.returncode != 0, 'modified owner source was accepted for overwrite')
    require(output.read_bytes() == edited, 'modified owner source was lost')

    alternate = root / 'original-recovered.html'
    recovered = run(alternate)
    require(recovered.returncode == 0, 'alternate recovery failed')
    require(alternate.read_bytes() == original, 'alternate recovery changed original bytes')

    symlink = root / 'owner-link.html'
    symlink.symlink_to(output)
    link_result = run(symlink)
    require(link_result.returncode != 0, 'symlink output was accepted')
    require(output.read_bytes() == edited, 'symlink target was changed')

    directory_result = run(root)
    require(directory_result.returncode != 0, 'directory output was accepted')

print('PRESSUREPOINT_OWNER_REENTRY_PASS: no-git, exact source, first output, idempotence, edit preservation, alternate recovery, symlink, directory')
