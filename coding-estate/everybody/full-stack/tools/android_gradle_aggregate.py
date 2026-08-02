#!/usr/bin/env python3
"""Aggregate ten Android body shards into one verified 100-body delivery."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-gradle-aggregate/0.1"
EXPECTED_SHARDS = 10
EXPECTED_BODIES = 100
FIXED_ZIP_TIME = (2026, 8, 2, 0, 0, 0)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def unique_file(root: Path, name: str) -> Path:
    matches = [path for path in root.rglob(name) if path.is_file()]
    if len(matches) != 1:
        raise SystemExit(f"expected one {name!r}, found {len(matches)}")
    return matches[0]


def deterministic_zip(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(p for p in source.rglob("*") if p.is_file()):
            relative = path.relative_to(source).as_posix()
            info = zipfile.ZipInfo(relative, date_time=FIXED_ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())


def aggregate(source: Path, out: Path) -> dict[str, Any]:
    batch_paths = sorted(path for path in source.rglob("BATCH_RECEIPT.json") if path.is_file())
    if len(batch_paths) != EXPECTED_SHARDS:
        raise SystemExit(f"expected {EXPECTED_SHARDS} batch receipts, found {len(batch_paths)}")

    batches = [load_json(path) for path in batch_paths]
    shard_indexes = {int(item["shard_index"]) for item in batches}
    if shard_indexes != set(range(EXPECTED_SHARDS)):
        raise SystemExit(f"shard indexes incomplete: {sorted(shard_indexes)}")
    for batch in batches:
        if batch.get("status") != "PASS":
            raise SystemExit(f"non-passing shard {batch.get('shard_index')}: {batch.get('failures')}")
        if int(batch.get("failed_body_count", -1)) != 0:
            raise SystemExit(f"shard {batch['shard_index']} retained failures")

    receipt_paths = sorted(path for path in source.rglob("receipts/*.json") if path.is_file())
    receipts = [load_json(path) for path in receipt_paths]
    if len(receipts) != EXPECTED_BODIES:
        raise SystemExit(f"expected {EXPECTED_BODIES} body receipts, found {len(receipts)}")

    body_ids = [str(item["body_id"]) for item in receipts]
    if len(set(body_ids)) != EXPECTED_BODIES:
        raise SystemExit("body receipt IDs are duplicated or missing")

    delivery = out / "JM_ANDROID_100_SOVEREIGN_BODY_APKS_v0.1"
    if delivery.exists():
        shutil.rmtree(delivery)
    apk_root = delivery / "APKS"
    zion_root = delivery / "ZION"
    receipt_root = delivery / "RECEIPTS"
    apk_root.mkdir(parents=True)
    zion_root.mkdir(parents=True)
    receipt_root.mkdir(parents=True)

    verified: list[dict[str, Any]] = []
    for receipt in sorted(receipts, key=lambda item: item["body_id"]):
        body_id = str(receipt["body_id"])
        if receipt.get("status") != "APK_CONSTRUCTED_IDENTITY_HELD":
            raise SystemExit(f"body {body_id} lacks APK construction status")
        if receipt.get("automatic_install") is not False or receipt.get("device_runtime_proof") != "OPEN":
            raise SystemExit(f"body {body_id} crossed the installation/device claim boundary")

        apk = unique_file(source, str(receipt["apk"]))
        zion = unique_file(source, str(receipt["zion"]))
        actual_apk_sha = file_sha256(apk)
        actual_zion_sha = file_sha256(zion)
        if actual_apk_sha != receipt["apk_sha256"]:
            raise SystemExit(f"APK hash mismatch for {body_id}")
        if actual_zion_sha != receipt["zion_sha256"]:
            raise SystemExit(f"Zion hash mismatch for {body_id}")
        if apk.stat().st_size != int(receipt["apk_bytes"]):
            raise SystemExit(f"APK size mismatch for {body_id}")
        if zion.stat().st_size != int(receipt["zion_bytes"]):
            raise SystemExit(f"Zion size mismatch for {body_id}")

        apk_out = apk_root / f"{body_id}.apk"
        zion_out = zion_root / f"{body_id}.zion.zip"
        receipt_out = receipt_root / f"{body_id}.json"
        shutil.copy2(apk, apk_out)
        shutil.copy2(zion, zion_out)
        write_json(receipt_out, receipt)
        verified.append(
            {
                "body_id": body_id,
                "namespace": receipt["namespace"],
                "identity_sha256": receipt["identity_sha256"],
                "apk_sha256": actual_apk_sha,
                "zion_sha256": actual_zion_sha,
            }
        )

    namespaces = [item["namespace"] for item in verified]
    identities = [item["identity_sha256"] for item in verified]
    apk_hashes = [item["apk_sha256"] for item in verified]
    if len(set(namespaces)) != EXPECTED_BODIES:
        raise SystemExit("Android namespaces are not unique across all bodies")
    if len(set(identities)) != EXPECTED_BODIES:
        raise SystemExit("body identity hashes are not unique across all bodies")
    if len(set(apk_hashes)) != EXPECTED_BODIES:
        raise SystemExit("APK hashes are not unique across all bodies")

    manifest = {
        "schema": SCHEMA,
        "status": "ANDROID_100_APK_CONSTRUCTION_FEDERATION_PASS",
        "shard_count": EXPECTED_SHARDS,
        "body_count": EXPECTED_BODIES,
        "unique_body_ids": len(set(body_ids)),
        "unique_namespaces": len(set(namespaces)),
        "unique_identity_hashes": len(set(identities)),
        "unique_apk_hashes": len(set(apk_hashes)),
        "bodies": verified,
        "automatic_install": False,
        "device_runtime_proofs": 0,
        "claim_boundary": "All 100 APKs were constructed and identity-verified. Installation, signing provenance and physical-device execution are not claimed.",
    }
    write_json(delivery / "00_OPEN_FIRST_ANDROID_100_MASTER_RECEIPT.json", manifest)
    write_json(delivery / "SHARD_RECEIPTS.json", sorted(batches, key=lambda item: item["shard_index"]))
    (delivery / "README.md").write_text(
        "# JM Android 100 Sovereign Body APKs v0.1\n\n"
        "This package contains 100 separately constructed APKs, 100 Zion project carriers and 100 body receipts.\n\n"
        "The build proves identity-bound APK construction. It does not claim automatic installation, physical-device execution, sensor proof or final body-native product crowns.\n",
        encoding="utf-8",
    )

    zip_path = out / "JM_ANDROID_100_SOVEREIGN_BODY_APKS_v0.1.zip"
    deterministic_zip(delivery, zip_path)
    zip_sha = file_sha256(zip_path)
    summary = {
        **manifest,
        "delivery_zip": zip_path.name,
        "delivery_zip_bytes": zip_path.stat().st_size,
        "delivery_zip_sha256": zip_sha,
    }
    write_json(out / "JM_ANDROID_100_MASTER_RECEIPT.json", summary)
    (out / "JM_ANDROID_100_SOVEREIGN_BODY_APKS_v0.1.sha256").write_text(
        f"{zip_sha}  {zip_path.name}\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
    return summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    aggregate(args.source.resolve(), args.out.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
