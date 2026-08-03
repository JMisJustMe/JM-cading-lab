#!/usr/bin/env python3
"""Aggregate 10 release-candidate shards into one runtime-ready 100-APK delivery."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-release-candidate-master/1.0"


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
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def deterministic_zip(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(item for item in source.rglob("*") if item.is_file()):
            info = zipfile.ZipInfo(path.relative_to(source).as_posix())
            info.date_time = (1980, 1, 1, 0, 0, 0)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())


def aggregate(
    source: Path,
    out: Path,
    *,
    expected_bodies: int = 100,
    expected_shards: int = 10,
) -> dict[str, Any]:
    batch_paths = sorted(source.rglob("BATCH_RECEIPT.json"))
    if len(batch_paths) != expected_shards:
        raise SystemExit(
            f"expected {expected_shards} release batch receipts, found {len(batch_paths)}"
        )
    batches = [load_json(path) for path in batch_paths]
    indices = sorted(int(item["shard_index"]) for item in batches)
    if indices != list(range(expected_shards)):
        raise SystemExit(f"release shard index drift: {indices}")
    for batch in batches:
        if batch["status"] != "ANDROID_RELEASE_CANDIDATE_SHARD_PASS":
            raise SystemExit(f"non-passing release shard: {batch['shard_index']}")
        if int(batch["private_keys_in_shard_output"]) != 0:
            raise SystemExit(f"private key leakage claimed by shard {batch['shard_index']}")

    receipt_paths = sorted(source.rglob("receipts/*.json"))
    apk_paths = sorted(source.rglob("artifacts/*.apk"))
    if len(receipt_paths) != expected_bodies or len(apk_paths) != expected_bodies:
        raise SystemExit(
            f"expected {expected_bodies} release receipts/APKs, found "
            f"{len(receipt_paths)}/{len(apk_paths)}"
        )

    receipts = [load_json(path) for path in receipt_paths]
    receipt_by_id = {str(item["body_id"]): item for item in receipts}
    apk_by_id = {path.stem: path for path in apk_paths}
    if len(receipt_by_id) != expected_bodies or len(apk_by_id) != expected_bodies:
        raise SystemExit("release body IDs are not unique")
    if set(receipt_by_id) != set(apk_by_id):
        raise SystemExit("release APK/receipt body sets differ")

    delivery = out / "JM_ANDROID_100_RELEASE_CANDIDATE_APKS_v1.0"
    if delivery.exists():
        shutil.rmtree(delivery)
    apk_out = delivery / "APKS"
    receipt_out = delivery / "RECEIPTS"
    apk_out.mkdir(parents=True)
    receipt_out.mkdir(parents=True)

    entries: list[dict[str, Any]] = []
    packages: set[str] = set()
    certificates: set[str] = set()
    activities: set[str] = set()
    for body_id in sorted(receipt_by_id):
        receipt = receipt_by_id[body_id]
        apk = apk_by_id[body_id]
        if receipt["status"] != "ANDROID_RELEASE_CANDIDATE_CONSTRUCTED_SIGNED_PROVENANCE_PASS":
            raise SystemExit(f"non-passing release body receipt: {body_id}")
        if file_sha256(apk) != receipt["apk_sha256"]:
            raise SystemExit(f"release APK hash mismatch: {body_id}")
        if not receipt["release_build"] or receipt["debuggable"]:
            raise SystemExit(f"debuggable or non-release APK survived: {body_id}")
        if receipt["private_key_retained"]:
            raise SystemExit(f"private key retention survived receipt: {body_id}")
        if not receipt["signing"]["v2_or_newer"]:
            raise SystemExit(f"v2-or-newer signature missing: {body_id}")
        manifest = receipt["compiled_manifest"]
        package = str(manifest["package"])
        activity = str(manifest["launchable_activity"])
        certificate = str(receipt["certificate_sha256"])
        packages.add(package)
        activities.add(activity)
        certificates.add(certificate)
        shutil.copy2(apk, apk_out / f"{body_id}.apk")
        write_json(receipt_out / f"{body_id}.json", receipt)
        entries.append(
            {
                "body_id": body_id,
                "apk_sha256": receipt["apk_sha256"],
                "identity_sha256": receipt["identity_sha256"],
                "namespace": receipt["namespace"],
                "compiled_manifest": manifest,
                "signing": receipt["signing"],
                "certificate_sha256": certificate,
                "embedded_body_asset_sha256": receipt["embedded_body_asset_sha256"],
                "release_build": True,
                "debuggable": False,
                "test_release_certificate": True,
                "production_key_ownership": "OPEN",
            }
        )

    if len(packages) != expected_bodies or len(activities) != expected_bodies:
        raise SystemExit("release package/activity identities are not unique")
    if len(certificates) != expected_bodies:
        raise SystemExit(
            f"expected {expected_bodies} sovereign test certificates, found {len(certificates)}"
        )
    if list(delivery.rglob("*.p12")) or list(delivery.rglob("*.jks")) or list(delivery.rglob("*.keystore")):
        raise SystemExit("private signing material entered release delivery")

    provenance = {
        "schema": "jm.everybody.android-release-candidate-provenance/1.0",
        "status": "ANDROID_100_RELEASE_CANDIDATE_PROVENANCE_PASS",
        "body_count": expected_bodies,
        "release_apks": expected_bodies,
        "non_debuggable_apks": expected_bodies,
        "v2_or_newer_signed_apks": expected_bodies,
        "unique_packages": len(packages),
        "unique_activities": len(activities),
        "unique_sovereign_test_certificates": len(certificates),
        "private_keys_in_delivery": 0,
        "entries": entries,
        "claim_boundary": (
            "All 100 APKs are non-debuggable release builds aligned and signed with unique ephemeral "
            "sovereign test certificates. Production key ownership, store publication and physical "
            "device behaviour remain separate gates."
        ),
    }
    write_json(delivery / "ANDROID_APK_PROVENANCE_RECEIPT.json", provenance)

    master = {
        "schema": SCHEMA,
        "status": "ANDROID_100_RELEASE_CANDIDATE_CONSTRUCTION_PROVENANCE_PASS",
        "body_count": expected_bodies,
        "shard_count": expected_shards,
        "release_apks": expected_bodies,
        "non_debuggable_apks": expected_bodies,
        "v2_or_newer_signed_apks": expected_bodies,
        "unique_packages": len(packages),
        "unique_activities": len(activities),
        "unique_sovereign_test_certificates": len(certificates),
        "private_keys_in_delivery": 0,
        "entries": entries,
        "claim_boundary": provenance["claim_boundary"],
    }
    write_json(out / "JM_ANDROID_100_RELEASE_CANDIDATE_MASTER_RECEIPT.json", master)
    archive = out / "JM_ANDROID_100_RELEASE_CANDIDATE_APKS_v1.0.zip"
    deterministic_zip(delivery, archive)
    archive_hash = file_sha256(archive)
    (out / "JM_ANDROID_100_RELEASE_CANDIDATE_APKS_v1.0.sha256").write_text(
        f"{archive_hash}  {archive.name}\n",
        encoding="utf-8",
    )
    master["delivery_zip"] = archive.name
    master["delivery_zip_sha256"] = archive_hash
    write_json(out / "JM_ANDROID_100_RELEASE_CANDIDATE_MASTER_RECEIPT.json", master)
    print(json.dumps(master, ensure_ascii=False, indent=2, sort_keys=True))
    return master


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-bodies", type=int, default=100)
    parser.add_argument("--expected-shards", type=int, default=10)
    args = parser.parse_args()
    aggregate(
        args.source.resolve(),
        args.out.resolve(),
        expected_bodies=args.expected_bodies,
        expected_shards=args.expected_shards,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
