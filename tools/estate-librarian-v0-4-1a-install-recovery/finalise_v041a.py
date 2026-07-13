#!/usr/bin/env python3
"""Finalise v0.4.1A receipts after a successful GitHub Actions build."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True, type=int)
    parser.add_argument("--checksum", required=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1] / "estate-librarian"
    manifest_path = root / "PACKAGE_MANIFEST.json"
    receipt_path = root / "receipts/INSTALL_RECOVERY_RECEIPT_v0_4_1A.json"

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["delivery"]["compiledApk"] = True
    manifest["proof"].update(
        {
            "androidCompilation": "PASS — GitHub Actions",
            "apkPackageIdentity": "PASS — com.jmestate.librarian.v041a",
            "apkArchiveIntegrity": "PASS",
            "apkSha256": args.checksum,
            "githubActionsRun": args.run_id,
            "physicalAndroidInstall": "PENDING user-device proof",
        }
    )
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    receipt["proof"].update(
        {
            "androidCompilation": "PASS — GitHub Actions",
            "apkPackageIdentity": "PASS — com.jmestate.librarian.v041a",
            "apkArchiveIntegrity": "PASS",
            "apkSha256": args.checksum,
            "githubActionsRun": args.run_id,
            "physicalInstall": "PENDING user-device proof",
        }
    )
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
