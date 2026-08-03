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

SCHEMA = "jm.everybody.android-gradle-batch/0.3"
ERROR_TAIL_LINES = 120
# The verified JM Android Forge donor uses AGP 8.7.3. Android's compatibility
# floor for that plugin is API 35; the batch pins the generated carrier to the
# matching API instead of silently combining the donor with unsupported API 36.
DONOR_COMPILE_SDK = 35
DONOR_TARGET_SDK = 35


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


def combined_failure_lines(result: subprocess.CompletedProcess[str]) -> list[str]:
    combined = "\n".join(part for part in (result.stdout, result.stderr) if part).replace("\r\n", "\n")
    lines = combined.splitlines()
    if not lines:
        return ["Gradle returned no diagnostic output."]
    anchors = (
        "FAILURE:",
        "* What went wrong:",
        "Script compilation error",
        "e:",
        "error:",
        "Execution failed for task",
        "Could not compile",
        "Could not resolve",
        "Caused by:",
    )
    anchor_indexes = [index for index, line in enumerate(lines) if any(anchor.lower() in line.lower() for anchor in anchors)]
    start = max(0, (anchor_indexes[0] - 15) if anchor_indexes else len(lines) - ERROR_TAIL_LINES)
    selected = lines[start:]
    return selected[-ERROR_TAIL_LINES:]


def print_failure(body_id: str, result: subprocess.CompletedProcess[str]) -> list[str]:
    lines = combined_failure_lines(result)
    print(f"JMGRADLE_FAILURE_DETAIL_BEGIN:{body_id}", file=sys.stderr, flush=True)
    for line in lines:
        print(line, file=sys.stderr, flush=True)
    print(f"JMGRADLE_FAILURE_DETAIL_END:{body_id}", file=sys.stderr, flush=True)
    return lines


def build_shard(repo: Path, out: Path, shard_index: int, shard_count: int) -> dict[str, Any]:
    if shard_count < 1:
        raise ValueError("shard_count must be positive")
    if not 0 <= shard_index < shard_count:
        raise ValueError("shard_index must be within shard_count")

    gradle = shutil.which("gradle")
    if not gradle:
        raise SystemExit("Gradle executable not found; no Android build was claimed.")

    # Override the generic carrier default at actual construction time so the
    # emitted Gradle files, route manifests and receipts all agree on API 35.
    factory.COMPILE_SDK = DONOR_COMPILE_SDK
    factory.TARGET_SDK = DONOR_TARGET_SDK

    generated = out / "generated"
    if generated.exists():
        shutil.rmtree(generated)
    generated.mkdir(parents=True)
    factory_receipt = factory.generate(repo, generated)
    if factory_receipt["sdk"]["compile"] != DONOR_COMPILE_SDK or factory_receipt["sdk"]["target"] != DONOR_TARGET_SDK:
        raise SystemExit("Android donor SDK override did not reach the generated factory receipt")

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
        if route["sdk"]["compile"] != DONOR_COMPILE_SDK or route["sdk"]["target"] != DONOR_TARGET_SDK:
            raise SystemExit(f"generated SDK route mismatch for {body_id}: {route['sdk']}")
        print(f"[{ordinal}/{len(selected)}] JMGRADLE_BUILD_START:{body_id}", flush=True)
        result = run_gradle(gradle, project)
        stdout_path = logs_root / f"{body_id}.stdout.log"
        stderr_path = logs_root / f"{body_id}.stderr.log"
        stdout_path.write_text(result.stdout, encoding="utf-8")
        stderr_path.write_text(result.stderr, encoding="utf-8")

        if result.returncode != 0:
            detail = print_failure(body_id, result)
            failure = {
                "body_id": body_id,
                "returncode": result.returncode,
                "stdout_log": f"logs/{body_id}.stdout.log",
                "stderr_log": f"logs/{body_id}.stderr.log",
                "diagnostic_tail": detail,
            }
            failures.append(failure)
            write_json(receipts_root / f"{body_id}.failure.json", failure)
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
                "gradle_receipt_present": gradle_receipt_path.is_file(),
                "apk_identity_present": apk_identity_path.is_file(),
            }
            failures.append(failure)
            write_json(receipts_root / f"{body_id}.failure.json", failure)
            print(f"JMGRADLE_BUILD_INCOMPLETE:{body_id}:{json.dumps(failure, sort_keys=True)}", file=sys.stderr, flush=True)
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
            failure = {"body_id": body_id, "error": "body identity mismatch in generated Gradle receipts"}
            failures.append(failure)
            write_json(receipts_root / f"{body_id}.failure.json", failure)
            continue
        if route["namespace"] != apk_identity.get("namespace"):
            failure = {"body_id": body_id, "error": "application namespace mismatch"}
            failures.append(failure)
            write_json(receipts_root / f"{body_id}.failure.json", failure)
            continue

        receipt = {
            "schema": "jm.android.body-apk-build/0.2",
            "status": "APK_CONSTRUCTED_IDENTITY_HELD",
            "body_id": body_id,
            "body_name": route["body_name"],
            "namespace": route["namespace"],
            "identity_sha256": route["identity_sha256"],
            "compile_sdk": DONOR_COMPILE_SDK,
            "target_sdk": DONOR_TARGET_SDK,
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
        "compile_sdk": DONOR_COMPILE_SDK,
        "target_sdk": DONOR_TARGET_SDK,
        "body_ids": [project.parent.name for project in selected],
        "built_body_ids": [item["body_id"] for item in body_receipts],
        "failures": failures,
        "factory_receipt_sha256": hashlib.sha256(
            json.dumps(factory_receipt, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest(),
        "claim_boundary": "Shard completion proves build output, not installation or device runtime.",
    }
    write_json(shard_root / "BATCH_RECEIPT.json", batch)
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
    batch = build_shard(args.repo_root.resolve(), args.out.resolve(), args.shard_index, args.shard_count)
    return 0 if batch["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
