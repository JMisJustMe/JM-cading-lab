#!/usr/bin/env python3
"""Contract tests for Android Linux-Windows reproducibility v1.4."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Callable
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

import android_cross_os_aggregate as cross_os  # noqa: E402
import android_windows_aggregate as windows_aggregate  # noqa: E402
import android_windows_build as windows_build  # noqa: E402

RUNNERS = ("ubuntu-24.04", "windows-2022")
Mutator = Callable[[str, dict[str, Any]], None]


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def toolchain(runner: str) -> dict[str, Any]:
    platform_name = "linux" if runner.startswith("ubuntu") else "windows"
    return {
        "gradle_version": "8.10.2",
        "gradle_version_sha256": digest("8.10.2"),
        "gradle_banner_sha256": digest(f"gradle-banner:{runner}"),
        "java_version": "17.0.16",
        "java_version_sha256": digest("17.0.16"),
        "java_banner_sha256": digest(f"java-banner:{runner}"),
        "aapt2_version": "Android Asset Packaging Tool (aapt) 2.19",
        "aapt2_sha256": digest(f"aapt2:{platform_name}"),
        "apksigner_version": "0.9",
        "apksigner_sha256": digest(f"apksigner:{platform_name}"),
        "zipalign_sha256": digest(f"zipalign:{platform_name}"),
        "compile_sdk": 35,
        "min_sdk": 24,
        "target_sdk": 35,
    }


def runner_receipt(runner: str, body_id: str) -> dict[str, Any]:
    if runner.startswith("ubuntu"):
        environment = {
            "runner_label": runner,
            "runner_os": "Linux",
            "runner_arch": "X64",
            "image_os": "ubuntu24",
            "image_version": "test",
            "os_release": "NAME=Ubuntu\nVERSION_ID=24.04",
            "os_release_sha256": digest("ubuntu-24.04"),
            "uname": "Linux synthetic x86_64",
            "uname_sha256": digest("Linux synthetic x86_64"),
            "python_platform": "linux",
        }
    else:
        environment = {
            "runner_label": runner,
            "runner_os": "Windows",
            "runner_arch": "X64",
            "image_os": "win22",
            "image_version": "test",
            "os_release": "system=Windows\nrelease=2022",
            "os_release_sha256": digest("windows-2022"),
            "uname": "Windows Server 2022 | AMD64",
            "uname_sha256": digest("Windows Server 2022 | AMD64"),
            "python_platform": "win32",
        }
    return {
        "schema": "jm.android.body-cross-runner-release/1.2",
        "status": "ANDROID_CROSS_RUNNER_RELEASE_BUILD_PASS",
        "runner_label": runner,
        "runner": environment,
        "toolchain": toolchain(runner),
        "body_id": body_id,
    }


def create_source(root: Path, *, mutate: Mutator | None = None) -> None:
    for runner in RUNNERS:
        for body_id in ("alpha", "beta"):
            receipt = runner_receipt(runner, body_id)
            if mutate is not None:
                mutate(runner, receipt)
            write_json(
                root / runner / "windows-shard-00-of-01" / "receipts" / f"{body_id}.json",
                receipt,
            )


def expect_platform_failure(mutator: Mutator, phrase: str) -> None:
    with tempfile.TemporaryDirectory() as temporary:
        source = Path(temporary) / "source"
        create_source(source, mutate=mutator)
        original = cross_os.os_family
        cross_os.os_family = windows_aggregate.windows_os_family
        try:
            try:
                cross_os.collect_platform_evidence(source, RUNNERS)
            except SystemExit as error:
                assert phrase in str(error), (phrase, str(error))
            else:
                raise AssertionError(f"expected failure containing {phrase!r}")
        finally:
            cross_os.os_family = original


def test_batch_wrapper() -> None:
    calls: list[tuple[list[str], int]] = []

    def fake_run(command: list[str], *, timeout: int = 900):
        calls.append((command, timeout))
        return SimpleNamespace(stdout="", stderr="", returncode=0)

    with mock.patch.object(windows_build, "_ORIGINAL_RUN", fake_run):
        with mock.patch.object(windows_build.os, "name", "nt"):
            windows_build.platform_safe_run(
                ["C:/Program Files/Android/gradle.bat", "--version"], timeout=17
            )
        assert calls[-1][0][0].lower().endswith("cmd.exe")
        assert calls[-1][0][1:4] == ["/d", "/c", "call"]
        assert calls[-1][0][4:] == [
            "C:/Program Files/Android/gradle.bat",
            "--version",
        ]
        assert calls[-1][1] == 17

        with mock.patch.object(windows_build.os, "name", "posix"):
            windows_build.platform_safe_run(["gradle", "--version"], timeout=23)
        assert calls[-1] == (["gradle", "--version"], 23)


def test_lf_normalization() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        text = root / "build.gradle.kts"
        binary = root / "payload.bin"
        text.write_bytes(b"one\r\ntwo\rthree\n")
        binary.write_bytes(b"one\r\ntwo")
        changed = windows_build.canonicalize_generated_text(root)
        assert changed == 1
        assert text.read_bytes() == b"one\ntwo\nthree\n"
        assert binary.read_bytes() == b"one\r\ntwo"


def test_positive_platform_contract() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        source = Path(temporary) / "source"
        create_source(source)
        original = cross_os.os_family
        cross_os.os_family = windows_aggregate.windows_os_family
        try:
            families, platform_tools, logical = cross_os.collect_platform_evidence(source, RUNNERS)
        finally:
            cross_os.os_family = original
        assert families == {
            "ubuntu-24.04": "Linux/Ubuntu",
            "windows-2022": "Windows/Server",
        }
        assert len(set(logical.values())) == 1
        assert len(
            {
                value["platform_binary_fingerprint_sha256"]
                for value in platform_tools.values()
            }
        ) == 2


def main() -> int:
    test_batch_wrapper()
    test_lf_normalization()
    test_positive_platform_contract()

    expect_platform_failure(
        lambda runner, receipt: receipt["runner"].update(
            {
                "runner_os": "Linux",
                "image_os": "ubuntu24",
                "uname": "Linux collapsed",
                "os_release": "NAME=Ubuntu",
                "python_platform": "linux",
            }
        )
        if runner == "windows-2022"
        else None,
        "expected Linux and macOS families",
    )
    expect_platform_failure(
        lambda runner, receipt: receipt["toolchain"].update(
            {
                "gradle_version": "8.11",
                "gradle_version_sha256": digest("8.11"),
            }
        )
        if runner == "windows-2022"
        else None,
        "logical toolchains differ across operating systems",
    )
    expect_platform_failure(
        lambda runner, receipt: receipt["toolchain"].update(
            {
                "aapt2_sha256": digest("aapt2:linux"),
                "apksigner_sha256": digest("apksigner:linux"),
                "zipalign_sha256": digest("zipalign:linux"),
            }
        )
        if runner == "windows-2022"
        else None,
        "expected different platform Android executable fingerprints",
    )

    print("ANDROID_LINUX_WINDOWS_REPRODUCIBILITY_CONTRACTS_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
