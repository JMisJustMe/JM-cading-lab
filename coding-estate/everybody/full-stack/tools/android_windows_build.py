#!/usr/bin/env python3
"""Run the proven cross-runner Android builder safely on Windows or POSIX hosts."""
from __future__ import annotations

import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import Any

import android_cross_runner_build as base

_ORIGINAL_RUN = base.release.run


def platform_safe_run(
    command: list[str],
    *,
    timeout: int = 900,
):
    """Execute Windows batch tools through cmd while preserving direct executables elsewhere."""
    prepared = [str(part) for part in command]
    executable = prepared[0].lower()
    if os.name == "nt" and executable.endswith((".bat", ".cmd")):
        prepared = [
            os.environ.get("COMSPEC", "cmd.exe"),
            "/d",
            "/s",
            "/c",
            subprocess.list2cmdline(prepared),
        ]
    return _ORIGINAL_RUN(prepared, timeout=timeout)


def environment_receipt(runner_label: str) -> dict[str, Any]:
    """Produce OS-native evidence without assuming /etc/os-release or uname exists."""
    if os.name == "nt":
        version = platform.version()
        release_name = platform.release()
        platform_text = platform.platform(aliased=False, terse=False)
        uname_text = " | ".join(str(item) for item in platform.uname())
        os_release = (
            f"system={platform.system()}\n"
            f"release={release_name}\n"
            f"version={version}\n"
            f"platform={platform_text}\n"
        )
    else:
        os_release_path = Path("/etc/os-release")
        os_release = (
            os_release_path.read_text(encoding="utf-8")
            if os_release_path.is_file()
            else platform.platform(aliased=False, terse=False)
        )
        try:
            uname_text = platform_safe_run(["uname", "-a"], timeout=30).stdout.strip()
        except Exception:
            uname_text = " | ".join(str(item) for item in platform.uname())
    return {
        "runner_label": runner_label,
        "runner_os": os.environ.get("RUNNER_OS", platform.system()),
        "runner_arch": os.environ.get("RUNNER_ARCH", platform.machine()),
        "image_os": os.environ.get("ImageOS", ""),
        "image_version": os.environ.get("ImageVersion", ""),
        "os_release": os_release.strip(),
        "os_release_sha256": base.text_sha256(os_release),
        "uname": uname_text,
        "uname_sha256": base.text_sha256(uname_text),
        "path_separator": os.pathsep,
        "directory_separator": os.sep,
        "python_platform": sys.platform,
    }


def install_adapter() -> None:
    base.release.run = platform_safe_run
    base.os_receipt = environment_receipt


def main() -> int:
    install_adapter()
    return base.main()


if __name__ == "__main__":
    raise SystemExit(main())
