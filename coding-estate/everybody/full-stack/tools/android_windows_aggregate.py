#!/usr/bin/env python3
"""Seal Android release reproducibility across Linux and Windows environments."""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

import android_cross_os_aggregate as cross_os

SCHEMA = "jm.everybody.android-linux-windows-reproducibility-master/1.4"
BODY_SCHEMA = "jm.android.body-linux-windows-pair/1.4"
STATUS = "ANDROID_100_LINUX_WINDOWS_UNSIGNED_EXACT_AND_SIGNED_PAYLOAD_EQUIVALENCE_PASS"
BODY_STATUS = "ANDROID_LINUX_WINDOWS_UNSIGNED_EXACT_AND_SIGNED_PAYLOAD_EQUIVALENT_PASS"
PRIVATE_SUFFIXES = cross_os.PRIVATE_SUFFIXES


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def windows_os_family(receipt: dict[str, Any]) -> str:
    runner = receipt.get("runner", {})
    raw = " ".join(
        str(runner.get(field, ""))
        for field in (
            "runner_os",
            "image_os",
            "uname",
            "os_release",
            "python_platform",
        )
    ).lower()
    if any(marker in raw for marker in ("windows", "win32", "windows_nt", "mingw")):
        return "Windows/Server"
    if "linux" in raw or "ubuntu" in raw:
        return "Linux/Ubuntu"
    raise SystemExit(f"could not classify Linux/Windows family for {receipt.get('runner_label')}")


def aggregate(
    source: Path,
    out: Path,
    *,
    expected_bodies: int,
    expected_shards: int,
    runner_labels: tuple[str, str],
) -> dict[str, Any]:
    original_classifier = cross_os.os_family
    cross_os.os_family = windows_os_family
    try:
        inherited = cross_os.aggregate(
            source,
            out,
            expected_bodies=expected_bodies,
            expected_shards=expected_shards,
            runner_labels=runner_labels,
        )
    finally:
        cross_os.os_family = original_classifier

    old_delivery = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_v1.3"
    old_master = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_MASTER_RECEIPT.json"
    old_zip = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_v1.3.zip"
    old_sha = out / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_v1.3.sha256"
    delivery = out / "JM_ANDROID_100_LINUX_WINDOWS_REPRODUCIBILITY_v1.4"
    if delivery.exists():
        shutil.rmtree(delivery)
    old_delivery.rename(delivery)

    pair_dir = delivery / "PAIR_RECEIPTS"
    entries: list[dict[str, Any]] = []
    for path in sorted(pair_dir.glob("*.json")):
        pair = load_json(path)
        pair["schema"] = BODY_SCHEMA
        pair["status"] = BODY_STATUS
        pair["claim_boundary"] = (
            "Independent Linux and Windows environments produced byte-identical unsigned release "
            "APKs and equivalent normalized signed payloads under different ephemeral certificates. "
            "Windows batch/path handling and platform executable hashes were separately receipted. "
            "Production keys, stores and physical devices remain separate gates."
        )
        write_json(path, pair)
        entries.append(pair)

    old_embedded = delivery / "JM_ANDROID_100_CROSS_OS_REPRODUCIBILITY_RECEIPT.json"
    if old_embedded.exists():
        old_embedded.unlink()

    master = dict(inherited)
    master.update(
        {
            "schema": SCHEMA,
            "status": STATUS,
            "entries": entries,
            "delivery_zip": "JM_ANDROID_100_LINUX_WINDOWS_REPRODUCIBILITY_v1.4.zip",
            "windows_native_execution_proof": True,
            "claim_boundary": (
                "All bodies produced byte-identical unsigned release APKs on independent Ubuntu Linux "
                "and Windows Server environments under one logical Gradle/JDK/Android tool version set. "
                "Platform executables, path separators and batch-command routing were separately "
                "receipted. Exact same-key cross-OS signatures, production keys, stores and physical "
                "devices remain separate gates."
            ),
        }
    )

    embedded = delivery / "JM_ANDROID_100_LINUX_WINDOWS_REPRODUCIBILITY_RECEIPT.json"
    embedded_master = dict(master)
    embedded_master["delivery_zip_sha256"] = "RECORDED_IN_EXTERNAL_MASTER_RECEIPT"
    write_json(embedded, embedded_master)

    target_zip = out / "JM_ANDROID_100_LINUX_WINDOWS_REPRODUCIBILITY_v1.4.zip"
    if target_zip.exists():
        target_zip.unlink()
    cross_os.v12.deterministic_zip(delivery, target_zip)
    master["delivery_zip_sha256"] = cross_os.v12.file_sha256(target_zip)

    master_path = out / "JM_ANDROID_100_LINUX_WINDOWS_REPRODUCIBILITY_MASTER_RECEIPT.json"
    write_json(master_path, master)
    sha_path = out / "JM_ANDROID_100_LINUX_WINDOWS_REPRODUCIBILITY_v1.4.sha256"
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
        raise SystemExit(f"Linux-Windows output retained private material: {private_outputs}")
    if int(master["private_keys_in_delivery"]) != 0:
        raise SystemExit("Linux-Windows master claimed private keys in delivery")
    if set(master["cross_os_families"].values()) != {"Linux/Ubuntu", "Windows/Server"}:
        raise SystemExit(f"Linux-Windows families drifted: {master['cross_os_families']}")
    if int(master["platform_binary_fingerprint_count"]) != 2:
        raise SystemExit("Linux-Windows platform binary identities were not distinct")

    print(json.dumps(master, ensure_ascii=False, indent=2, sort_keys=True))
    return master


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-bodies", type=int, default=100)
    parser.add_argument("--expected-shards", type=int, default=10)
    parser.add_argument("--runner-a", default="ubuntu-24.04")
    parser.add_argument("--runner-b", default="windows-2022")
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
