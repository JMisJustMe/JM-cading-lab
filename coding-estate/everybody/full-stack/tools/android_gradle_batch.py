#!/usr/bin/env python3
"""Build and receipt one deterministic shard of sovereign Android body projects."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import android_gradle_factory as factory

SCHEMA = "jm.everybody.android-gradle-batch/0.1"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run_gradle(gradle: str, project: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            gradle,
            "--no-daemon",
            "--console=plain",
            "--stacktrace",
            "-p",
            str(project),
            "packageZion",
        ],
        check=False,
        capture_output=True,
        text=True,
    )


def build_shard(repo: Path, out: Path, shard_index: int, shard_count: int) -> dict[str, Any]:
    if shard_count < 1:
        raise ValueError("shard_count must be positive")
    if not 0 <= shard_index < shard_count:
        raise ValueError("shard_index must be within shard_count")

    gradle = shutil.which("gradle")
    if not gradle:
        raise SystemExit("Gradle executable not found; no Android build was claimed.")

    generated = out / "generated"
    if generated.exists():
        shutil.rmtree(generated)
    generated.mkdir(parents=True)
    factory_receipt = factory.generate(repo, generated)

    projects = sorted(generated.glob("bodies/*/android-gradle"), key=lambda path: path.parent.name)
    if len(projects) != 100:
        raise SystemExit(f"expected 100 Android body projects, recovered {len(projects)}")

    selected = [project for index, project in enumerate(projects) if index % shard_count == shard_index]
    if not selected:
        raise SystemExit(f"shard {shard_index}/{shard_count} selected no projects")

    shard_root = out / f"shard-{shard_index:02d}-of-{shard_count:02d}"
    if shard_root.exists():
        shutil.rmtree(shard_root)
    receipts_root = shard_root / "receipts"
    artifacts_root = shard_root / "artifacts"
    logs_root = shard_root / "logs"
    receipts_root.mkdir(parents=True)
    artifacts_root.mkdir(parents=True)
    logs_root.mkdir(parents=True)

    body_receipts: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    for ordinal, project in enumerate(selected, 1):
        body_id = project.parent.name
        route = json.loads((project / "jmgradle.route.json").read_text(encoding="utf-8"))
        print(f"[{ordinal}/{len(selected)}] JMGRADLE_BUILD_START:{body_id}", flush=True)
        result = run_gradle(gradle, project)
        (logs_root / f"{body_id}.stdout.log").write_text(result.stdout, encoding="utf-8")
        (logs_root / f"{body_id}.stderr.log").write_text(result.stderr, encoding="utf-8")

        if result.returncode != 0:
            failure = {
                "body_id": body_id,
                "returncode": result.returncode,
                "stdout_log": f"logs/{body_id}.stdout.log",
                "stderr_log": f"logs/{body_id}.stderr.log",
            }
            failures.append(failure)
            print(f"JMGRADLE_BUILD_FAIL:{body_id}:exit={result.returncode}", file=sys.stderr, flush=True)
            continue

        apk_candidates = sorted((project / "app" / "build" / "outputs" / "apk" / "debug").glob("*.apk"))
        zion_candidates = sorted((project / "app" / "build" / "zion").glob("*.zip"))
        gradle_receipt_path = project / "app" / "build" / "jm" / "build-receipt.json"
        apk_identity_path = project / "app" / "build" / "jm" / "apk-identity-receipt.json"

        if len(apk_candidates) != 1 or len(zion_candidates) != 1 or not gradle_receipt_path.is_file() or not apk_identity_path.is_file():
            failure = {
                "body_id": body_id,
                "returncode": 0,
                "error": "expected APK, Zion ZIP and Gradle receipts were not all produced",
                "apk_count": len(apk_candidates),
                "zion_count": len(zion_candidates),
            }
            failures.append(failure)
            print(f"JMGRADLE_BUILD_INCOMPLETE:{body_id}", file=sys.stderr, flush=True)
            continue

        apk = apk_candidates[0]
        zion = zion_candidates[0]
        apk_out = artifacts_root / f"{body_id}.apk"
        zion_out = artifacts_root / f"{body_id}.zion.zip"
        shutil.copy2(apk, apk_out)
        shutil.copy2(zion, zion_out)

        gradle_receipt = json.loads(gradle_receipt_path.read_text(encoding="utf-8"))
        apk_identity = json.loads(apk_identity_path.read_text(encoding="utf-8"))
        if gradle_receipt.get("body_id") != body_id or apk_identity.get("body_id") != body_id:
            failures.append({"body_id": body_id, "error": "body identity mismatch in generated Gradle receipts"})
            continue
        if route["namespace"] != apk_identity.get("namespace"):
            failures.append({"body_id": body_id, "error": "application namespace mismatch"})
            continue

        receipt = {
            "schema": "jm.android.body-apk-build/0.1",
            "status": "APK_CONSTRUCTED_IDENTITY_HELD",
            "body_id": body_id,
            "body_name": route["body_name"],
            "namespace": route["namespace"],
            "identity_sha256": route["identity_sha256"],
            "apk": apk_out.name,
            "apk_bytes": apk_out.stat().st_size,
            "apk_sha256": file_sha256(apk_out),
            "zion": zion_out.name,
            "zion_bytes": zion_out.stat().st_size,
            "zion_sha256": file_sha256(zion_out),
            "gradle": route["gradle"],
            "agp": route["agp"],
            "jmgradle_tasks": route["tasks"],
            "automatic_install": False,
            "device_runtime_proof": "OPEN",
            "claim_boundary": "This proves APK construction and body identity retention. Signing provenance, installation and physical-device behaviour remain separate gates.",
        }
        write_json(receipts_root / f"{body_id}.json", receipt)
        body_receipts.append(receipt)
        print(f"JMGRADLE_BUILD_PASS:{body_id}:{receipt['apk_sha256']}", flush=True)

    batch = {
        "schema": SCHEMA,
        "status": "PASS" if not failures and len(body_receipts) == len(selected) else "FAIL",
        "shard_index": shard_index,
        "shard_count": shard_count,
        "selected_body_count": len(selected),
        "built_body_count": len(body_receipts),
        "failed_body_count": len(failures),
        "body_ids": [project.parent.name for project in selected],
        "built_body_ids": [item["body_id"] for item in body_receipts],
        "failures": failures,
        "factory_receipt_sha256": hashlib.sha256(
            json.dumps(factory_receipt, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest(),
        "claim_boundary": "Shard completion proves build output, not installation or device runtime.",
    }
    write_json(shard_root / "BATCH_RECEIPT.json", batch)
    if batch["status"] != "PASS":
        raise SystemExit(json.dumps(batch, ensure_ascii=False, indent=2, sort_keys=True))
    print(json.dumps(batch, ensure_ascii=False, indent=2, sort_keys=True))
    return batch


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--shard-index", type=int, required=True)
    parser.add_argument("--shard-count", type=int, default=10)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    build_shard(args.repo_root.resolve(), args.out.resolve(), args.shard_index, args.shard_count)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
