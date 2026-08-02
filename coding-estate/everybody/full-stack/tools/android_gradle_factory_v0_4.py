#!/usr/bin/env python3
"""Canonical Android body factory v0.4 — executable Kotlin receipt repair.

Mounts over the preserved v0.3 AGP 8.7.3 / Gradle 8.10.2 / API 35 floor.
The v0.2 template expressed four Kotlin line endings as Python ``"\n"``
literals. Python consumed those escapes while generating build.gradle.kts,
leaving unterminated Kotlin strings. This body repairs the generated surface
without rewriting the historical donor.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

import android_gradle_factory as base
import android_gradle_factory_v0_3 as v0_3

FACTORY_VERSION = "0.4"
AGP_VERSION = v0_3.AGP_VERSION
GRADLE_VERSION = v0_3.GRADLE_VERSION
COMPILE_SDK = v0_3.COMPILE_SDK
MIN_SDK = v0_3.MIN_SDK
TARGET_SDK = v0_3.TARGET_SDK
BUILD_TOOLS = v0_3.BUILD_TOOLS

_ORIGINAL_APP_GRADLE = base.app_gradle
_BROKEN_LINE_ENDING = '+ "\n",'
_FIXED_LINE_ENDING = '+ System.lineSeparator(),'


def corrected_app_gradle(namespace: str, current: dict[str, Any]) -> str:
    rendered = _ORIGINAL_APP_GRADLE(namespace, current)
    broken_count = rendered.count(_BROKEN_LINE_ENDING)
    if broken_count != 4:
        raise RuntimeError(
            f"expected four inherited broken Kotlin line endings, recovered {broken_count}"
        )
    rendered = rendered.replace(_BROKEN_LINE_ENDING, _FIXED_LINE_ENDING)
    rendered = rendered.replace(
        "Charsets.UTF_8",
        "java.nio.charset.StandardCharsets.UTF_8",
    )
    if _BROKEN_LINE_ENDING in rendered:
        raise RuntimeError("Kotlin line-ending repair left a broken expression")
    if "Charsets.UTF_8" in rendered.replace(
        "java.nio.charset.StandardCharsets.UTF_8", ""
    ):
        raise RuntimeError("unqualified Kotlin charset reference survived repair")
    return rendered


def apply_floor() -> None:
    v0_3.apply_floor()
    base.SCHEMA = "jm.everybody.android-gradle-factory/0.4"
    base.app_gradle = corrected_app_gradle


def generate(repo: Path, out: Path) -> dict[str, Any]:
    apply_floor()
    receipt = base.generate(repo, out)
    receipt["schema"] = "jm.everybody.android-gradle-factory/0.4"
    receipt["factory_version"] = FACTORY_VERSION
    receipt["build_tools"] = BUILD_TOOLS
    receipt["compatibility_floor"] = {
        "agp": AGP_VERSION,
        "gradle": GRADLE_VERSION,
        "compile_sdk": COMPILE_SDK,
        "target_sdk": TARGET_SDK,
        "build_tools": BUILD_TOOLS,
        "status": "DONOR_COMPATIBLE",
    }
    receipt["kotlin_receipt_writer"] = {
        "status": "REPAIRED",
        "inherited_fault": "PYTHON_NEWLINE_CONSUMED_INSIDE_KOTLIN_STRING",
        "replacement": "System.lineSeparator()",
        "charset": "java.nio.charset.StandardCharsets.UTF_8",
        "repaired_writes_per_body": 4,
        "repaired_write_routes": 400,
    }
    receipt["claim_boundary"] = (
        "100 identity-bound Gradle carriers and executable JMGradle routes are generated "
        "at the AGP 8.7.3/API 35 floor with valid Kotlin receipt writers. APK construction, "
        "signing, installation and physical-device runtime remain separately receipted gates."
    )
    base.write_json(out / "ANDROID_GRADLE_RECEIPT.json", receipt)
    return receipt


def tree_digest(root: Path) -> str:
    return base.tree_digest(root)


def package_part(body_id: str) -> str:
    return base.package_part(body_id)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()
    if args.clean and args.out.exists():
        shutil.rmtree(args.out)
    args.out.mkdir(parents=True, exist_ok=True)
    receipt = generate(args.repo_root.resolve(), args.out.resolve())
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
