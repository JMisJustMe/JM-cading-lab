#!/usr/bin/env python3
"""Existing JM build-entry compatibility route to the sovereign M001 CP21 gate.

This path is used by jm-build-entry-gate.yml. Delegate rather than keeping an
outdated second implementation which inspected ADDED files only.
The original M001 donor, output admission and improved build-entry remain
the authorities. No Library/file mutations, direct-link release or quota claim.
"""
from pathlib import Path
import runpy

ENTRY = (
    Path(__file__).resolve().parents[1]
    / "agent-runtime/host-adapters/storage-admission"
    / "JM_M001_BUILD_ENTRY_CP21_INTEGRATION.py"
)

if __name__ == "__main__":
    if ENTRY.is_symlink() or not ENTRY.is_file():
        raise SystemExit("JM M001 CP21 existing build-entry authority missing: HOLD")
    runpy.run_path(str(ENTRY), run_name="__main__")
