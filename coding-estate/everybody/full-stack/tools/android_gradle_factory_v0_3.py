#!/usr/bin/env python3
"""Canonical AGP 8.7.3 / Gradle 8.10.2 / API 35 Android body factory.

This mounts over the preserved v0.2 generator rather than rewriting its receipt.
Android's compatibility floor makes API 35 the strongest supported target for
AGP 8.7.x. A later AGP donor may advance this wrapper without mutating v0.2.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

import android_gradle_factory as base

FACTORY_VERSION = "0.3"
AGP_VERSION = "8.7.3"
GRADLE_VERSION = "8.10.2"
COMPILE_SDK = 35
MIN_SDK = 24
TARGET_SDK = 35
BUILD_TOOLS = "35.0.0"


def apply_floor() -> None:
    base.SCHEMA = "jm.everybody.android-gradle-factory/0.3"
    base.AGP_VERSION = AGP_VERSION
    base.GRADLE_VERSION = GRADLE_VERSION
    base.COMPILE_SDK = COMPILE_SDK
    base.MIN_SDK = MIN_SDK
    base.TARGET_SDK = TARGET_SDK


def generate(repo: Path, out: Path) -> dict[str, Any]:
    apply_floor()
    receipt = base.generate(repo, out)
    receipt["schema"] = "jm.everybody.android-gradle-factory/0.3"
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
    receipt["claim_boundary"] = (
        "100 identity-bound Gradle carriers and executable JMGradle routes generated at the "
        "AGP 8.7.3/API 35 compatibility floor. APK construction, signing, installation and "
        "physical-device runtime remain separately receipted gates."
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
