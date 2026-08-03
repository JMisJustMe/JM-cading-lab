#!/usr/bin/env python3
"""Contract and negative-gate tests for Android cross-OS reproducibility v1.3."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

import android_cross_os_aggregate as cross_os  # noqa: E402

RUNNERS = ("ubuntu-24.04", "macos-14")
Mutator = Callable[[str, dict[str, Any]], None]


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def toolchain(runner: str) -> dict[str, Any]:
    platform = "linux" if runner.startswith("ubuntu") else "darwin"
    return {
        "gradle_version": "8.10.2",
        "gradle_version_sha256": digest("8.10.2"),
        "gradle_banner_sha256": digest(f"gradle-banner:{runner}"),
        "java_version": "17.0.16",
        "java_version_sha256": digest("17.0.16"),
        "java_banner_sha256": digest(f"java-banner:{runner}"),
        "aapt2_version": "Android Asset Packaging Tool (aapt) 2.19",
        "aapt2_sha256": digest(f"aapt2:{platform}"),
        "apksigner_version": "0.9",
        "apksigner_sha256": digest(f"apksigner:{platform}"),
        "zipalign_sha256": digest(f"zipalign:{platform}"),
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
            "image_version": "20260801.1",
            "os_release": "NAME=Ubuntu\nVERSION_ID=24.04",
            "os_release_sha256": digest("ubuntu-24.04"),
            "uname": "Linux synthetic 6.11 x86_64",
            "uname_sha256": digest("Linux synthetic 6.11 x86_64"),
        }
    else:
        environment = {
            "runner_label": runner,
            "runner_os": "macOS",
            "runner_arch": "ARM64",
            "image_os": "macos14",
            "image_version": "20260801.1",
            "os_release": "",
            "os_release_sha256": digest(""),
            "uname": "Darwin synthetic 23.6 arm64",
            "uname_sha256": digest("Darwin synthetic 23.6 arm64"),
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
                root / runner / "cross-os-shard-00-of-01" / "receipts" / f"{body_id}.json",
                receipt,
            )


def expect_failure(mutator: Mutator, phrase: str) -> None:
    with tempfile.TemporaryDirectory() as temporary:
        source = Path(temporary) / "source"
        create_source(source, mutate=mutator)
        try:
            cross_os.collect_platform_evidence(source, RUNNERS)
        except SystemExit as error:
            assert phrase in str(error), (phrase, str(error))
        else:
            raise AssertionError(f"expected failure containing {phrase!r}")


def test_os_family_classifier() -> None:
    assert cross_os.os_family(runner_receipt("ubuntu-24.04", "alpha")) == "Linux/Ubuntu"
    assert cross_os.os_family(runner_receipt("macos-14", "alpha")) == "Darwin/macOS"


def test_positive_platform_contract() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        source = Path(temporary) / "source"
        create_source(source)
        families, platform_tools, logical = cross_os.collect_platform_evidence(source, RUNNERS)
        assert families == {
            "ubuntu-24.04": "Linux/Ubuntu",
            "macos-14": "Darwin/macOS",
        }
        assert len(set(logical.values())) == 1
        assert len(
            {
                value["platform_binary_fingerprint_sha256"]
                for value in platform_tools.values()
            }
        ) == 2
        assert platform_tools["ubuntu-24.04"]["aapt2_sha256"] != (
            platform_tools["macos-14"]["aapt2_sha256"]
        )


def main() -> int:
    test_os_family_classifier()
    test_positive_platform_contract()

    expect_failure(
        lambda runner, receipt: receipt["runner"].update(
            {
                "runner_os": "Linux",
                "image_os": "ubuntu24",
                "uname": "Linux collapsed x86_64",
                "os_release": "NAME=Ubuntu",
            }
        )
        if runner == "macos-14"
        else None,
        "expected Linux and macOS families",
    )
    expect_failure(
        lambda runner, receipt: receipt["toolchain"].update(
            {
                "java_version": "17.0.17",
                "java_version_sha256": digest("17.0.17"),
            }
        )
        if runner == "macos-14"
        else None,
        "logical toolchains differ across operating systems",
    )
    expect_failure(
        lambda runner, receipt: receipt["toolchain"].update(
            {
                "aapt2_sha256": digest("aapt2:linux"),
                "apksigner_sha256": digest("apksigner:linux"),
                "zipalign_sha256": digest("zipalign:linux"),
            }
        )
        if runner == "macos-14"
        else None,
        "expected different platform Android executable fingerprints",
    )
    expect_failure(
        lambda runner, receipt: receipt["toolchain"].update(
            {"aapt2_sha256": digest(f"aapt2:{runner}:{receipt['body_id']}")}
        )
        if receipt["body_id"] == "beta"
        else None,
        "platform Android binary drift inside",
    )

    print("ANDROID_CROSS_OS_REPRODUCIBILITY_CONTRACTS_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
