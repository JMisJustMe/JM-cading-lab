#!/usr/bin/env python3
"""Recover and verify the exact provenance-sealed Android v0.5 source estate."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Any


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def recover(lock_path: Path, out: Path) -> dict[str, Any]:
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    if lock.get("status") != "PROVENANCE_SEALED_SOURCE_LOCK":
        raise SystemExit("runtime source lock is not provenance sealed")
    if out.exists():
        shutil.rmtree(out)
    artifact_root = out / "artifact"
    delivery_root = out / "delivery"
    artifact_root.mkdir(parents=True)

    result = subprocess.run(
        [
            "gh",
            "run",
            "download",
            str(lock["source_workflow_run_id"]),
            "--repo",
            str(lock["repository"]),
            "--name",
            str(lock["source_artifact_name"]),
            "--dir",
            str(artifact_root),
        ],
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"failed to recover locked Android artifact\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )

    inner = artifact_root / str(lock["inner_delivery_zip"])
    if not inner.is_file():
        matches = list(artifact_root.rglob(str(lock["inner_delivery_zip"])))
        if len(matches) != 1:
            raise SystemExit(f"locked inner delivery ZIP not recovered: {matches}")
        inner = matches[0]
    actual_sha = file_sha256(inner)
    if actual_sha != lock["inner_delivery_zip_sha256"]:
        raise SystemExit(
            f"locked inner delivery hash drift: {actual_sha} != {lock['inner_delivery_zip_sha256']}"
        )

    with zipfile.ZipFile(inner) as archive:
        archive.extractall(delivery_root)
    provenance_path = delivery_root / "ANDROID_APK_PROVENANCE_RECEIPT.json"
    if not provenance_path.is_file():
        raise SystemExit("provenance receipt is not mounted inside the locked delivery")
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    if provenance.get("status") != "ANDROID_100_APK_MANIFEST_AND_DEBUG_SIGNATURE_PASS":
        raise SystemExit(f"unexpected provenance status: {provenance.get('status')}")
    if provenance.get("body_count") != lock["body_count"]:
        raise SystemExit("locked source and provenance body counts disagree")

    apks = sorted((delivery_root / "APKS").glob("*.apk"))
    zions = sorted((delivery_root / "ZION").glob("*.zip"))
    if len(apks) != lock["apk_count"] or len(zions) != lock["zion_count"]:
        raise SystemExit(
            f"locked source count mismatch: APKs={len(apks)} Zions={len(zions)}"
        )

    receipt = {
        "schema": "jm.everybody.android-runtime-source-recovery/0.1",
        "status": "ANDROID_V0_5_LOCKED_SOURCE_RECOVERY_PASS",
        "source_workflow_run_id": lock["source_workflow_run_id"],
        "source_artifact_id": lock["source_artifact_id"],
        "source_head_sha": lock["source_head_sha"],
        "inner_delivery_zip_sha256": actual_sha,
        "body_count": provenance["body_count"],
        "apk_count": len(apks),
        "zion_count": len(zions),
        "provenance_status": provenance["status"],
        "delivery": str(delivery_root.resolve()),
    }
    write_json(out / "SOURCE_RECOVERY_RECEIPT.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lock", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    recover(args.lock.resolve(), args.out.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
