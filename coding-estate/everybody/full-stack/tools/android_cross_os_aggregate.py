#!/usr/bin/env python3
"""Seal Android release reproducibility across Linux and macOS environments."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any

import android_cross_runner_aggregate as v12

SCHEMA = "jm.everybody.android-cross-os-reproducibility-master/1.3"
BODY_SCHEMA = "jm.android.body-cross-os-pair/1.3"
STATUS = "ANDROID_100_CROSS_OS_UNSIGNED_EXACT_AND_SIGNED_PAYLOAD_EQUIVALENCE_PASS"
BODY_STATUS = "ANDROID_CROSS_OS_UNSIGNED_EXACT_AND_SIGNED_PAYLOAD_EQUIVALENT_PASS"
LOGICAL_TOOLCHAIN_FIELDS = (
    "gradle_version_sha256",
    "java_version_sha256",
    "aapt2_version",
    "apksigner_version",
    "compile_sdk",
    "min_sdk",
    "target_sdk",
)
PLATFORM_BINARY_FIELDS = ("aapt2_sha256", "apksigner_sha256", "zipalign_sha256")
PRIVATE_SUFFIXES = v12.PRIVATE_SUFFIXES


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def selected(value: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: value.get(field) for field in fields}


def fingerprint(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()


def os_family(receipt: dict[str, Any]) -> str:
    runner = receipt.get("runner", {})
    raw = " ".join(
        str(runner.get(field, ""))
        for field in ("runner_os", "image_os", "uname", "os_release")
    ).lower()
    if "darwin" in raw or "macos" in raw or "mac os" in raw:
        return "Darwin/macOS"
    if "linux" in raw or "ubuntu" in raw:
        return "Linux/Ubuntu"
    raise SystemExit(f"could not classify operating-system family for {receipt.get('runner_label')}")


def collect_platform_evidence(
    source: Path,
    runner_labels: tuple[str, str],
) -> tuple[dict[str, str], dict[str, dict[str, Any]], dict[str, str]]:
    receipts = [load_json(path) for path in sorted(source.rglob("receipts/*.json"))]
    by_runner: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for receipt in receipts:
        by_runner[str(receipt["runner_label"])].append(receipt)
    if set(by_runner) != set(runner_labels):
        raise SystemExit(f"cross-OS runner labels drifted: {sorted(by_runner)}")

    families: dict[str, str] = {}
    platform_tools: dict[str, dict[str, Any]] = {}
    logical_fingerprints: dict[str, str] = {}
    for label in runner_labels:
        runner_receipts = by_runner[label]
        recovered_families = {os_family(receipt) for receipt in runner_receipts}
        if len(recovered_families) != 1:
            raise SystemExit(f"mixed OS-family evidence for {label}: {sorted(recovered_families)}")
        families[label] = next(iter(recovered_families))

        logical = {
            fingerprint(selected(receipt["toolchain"], LOGICAL_TOOLCHAIN_FIELDS))
            for receipt in runner_receipts
        }
        if len(logical) != 1:
            raise SystemExit(f"logical toolchain drift inside {label}: {sorted(logical)}")
        logical_fingerprints[label] = next(iter(logical))

        platform = {
            fingerprint(selected(receipt["toolchain"], PLATFORM_BINARY_FIELDS))
            for receipt in runner_receipts
        }
        if len(platform) != 1:
            raise SystemExit(f"platform Android binary drift inside {label}: {sorted(platform)}")
        representative = runner_receipts[0]["toolchain"]
        platform_tools[label] = {
            **selected(representative, PLATFORM_BINARY_FIELDS),
            "platform_binary_fingerprint_sha256": next(iter(platform)),
        }

    if len(set(families.values())) != 2:
        raise SystemExit(f"expected Linux and macOS families, recovered {families}")
    if len(set(logical_fingerprints.values())) != 1:
        raise SystemExit(f"logical toolchains differ across operating systems: {logical_fingerprints}")
    platform_fingerprints = {
        value["platform_binary_fingerprint_sha256"] for value in platform_tools.values()
    }
    if len(platform_fingerprints) != 2:
        raise SystemExit(
            "cross-OS proof expected different platform Android executable fingerprints"
        )
    return families, platform_tools, logical_fingerprints


def aggregate(
    source: Path,
    out: Path,
    *,
    expected_bodies: int,
    expected_shards: int,
    runner_labels: tuple[str, str],
) -> dict[str, Any]:
    families, platform_tools, logical_fingerprints = collect_platform_evidence(
        source, runner_labels
    )

    original_fields = v12.TOOLCHAIN_FIELDS
    v12.TOOLCHAIN_FIELDS = LOGICAL_TOOLCHAIN_FIELDS
    try:
        inherited = v12.aggregate(
            source,
            out,
            expected_bodies=expected_bodies,
            expected_shards=expected_shards,
            runner_labels=runner_labels,
        )
    finally:
        v12.TOOLCHAIN_FIELDS = original_fields

    old_delivery = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2"
    old_master = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_MASTER_RECEIPT.json"
    old_zip = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2.zip"
    old_sha = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2.sha256"
    delivery = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_v1.3"
    if delivery.exists():
        shutil.rmtree(delivery)
    old_delivery.rename(delivery)

    pair_dir = delivery / "PAIR_RECEIPTS"
    entries: list[dict[str, Any]] = []
    for path in sorted(pair_dir.glob("*.json")):
        pair = load_json(path)
        pair["schema"] = BODY_SCHEMA
        pair["status"] = BODY_STATUS
        pair["os_families"] = families
        pair["logical_toolchain_fingerprint_sha256"] = next(
            iter(logical_fingerprints.values())
        )
        pair["platform_android_tools"] = platform_tools
        pair["claim_boundary"] = (
            "Independent Linux and macOS environments produced byte-identical unsigned release APKs "
            "and equivalent normalized signed payloads under different ephemeral certificates. "
            "Platform Android executable hashes were deliberately different and separately receipted. "
            "Windows, production keys, stores and physical devices remain separate gates."
        )
        write_json(path, pair)
        entries.append(pair)

    embedded_old = delivery / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_RECEIPT.json"
    if embedded_old.exists():
        embedded_old.unlink()

    master = dict(inherited)
    master.update(
        {
            "schema": SCHEMA,
            "status": STATUS,
            "runner_labels": list(runner_labels),
            "cross_os_families": families,
            "cross_os_family_count": len(set(families.values())),
            "logical_toolchain_fingerprint_sha256": next(
                iter(logical_fingerprints.values())
            ),
            "platform_android_tools": platform_tools,
            "platform_binary_fingerprint_count": len(
                {
                    value["platform_binary_fingerprint_sha256"]
                    for value in platform_tools.values()
                }
            ),
            "entries": entries,
            "delivery_zip": "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_v1.3.zip",
            "claim_boundary": (
                "All bodies produced byte-identical unsigned release APKs on independent Ubuntu Linux "
                "and macOS environments under one logical Gradle/JDK/Android tool version set. "
                "Platform-specific Android executable hashes differed and were preserved as evidence. "
                "Windows, exact same-key cross-OS signatures, production keys, stores and physical "
                "devices remain separate gates."
            ),
        }
    )
    embedded = delivery / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_RECEIPT.json"
    embedded_master = dict(master)
    embedded_master["delivery_zip_sha256"] = "RECORDED_IN_EXTERNAL_MASTER_RECEIPT"
    write_json(embedded, embedded_master)

    target_zip = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_v1.3.zip"
    if target_zip.exists():
        target_zip.unlink()
    v12.deterministic_zip(delivery, target_zip)
    master["delivery_zip_sha256"] = v12.file_sha256(target_zip)

    master_path = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_MASTER_RECEIPT.json"
    write_json(master_path, master)
    sha_path = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_v1.3.sha256"
    sha_path.write_text(
        f"{master['delivery_zip_sha256']}  {target_zip.name}\n",
        encoding="utf-8",
    )

    for stale in (old_master, old_zip, old_sha):
        if stale.exists():
            stale.unlink()

    private_outputs = sorted(
        path.relative_to(out).as_posix()
        for path in out.rglob("*")
        if path.is_file() and path.name.lower().endswith(PRIVATE_SUFFIXES)
    )
    if private_outputs:
        raise SystemExit(f"cross-OS output retained private material: {private_outputs}")
    if int(master["private_keys_in_delivery"]) != 0:
        raise SystemExit("cross-OS master claimed private keys in delivery")

    print(json.dumps(master, ensure_ascii=False, indent=2, sort_keys=True))
    return master


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-bodies", type=int, default=100)
    parser.add_argument("--expected-shards", type=int, default=10)
    parser.add_argument("--runner-a", default="ubuntu-24.04")
    parser.add_argument("--runner-b", default="macos-14")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    receipt = aggregate(
        args.source.resolve(),
        args.out.resolve(),
        expected_bodies=args.expected_bodies,
        expected_shards=args.expected_shards,
        runner_labels=(args.runner_a, args.runner_b),
    )
    return 0 if receipt["status"] == STATUS else 1


if __name__ == "__main__":
    raise SystemExit(main())
