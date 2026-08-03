#!/usr/bin/env python3
"""Federate 100 exact Android release reproducibility and software-inventory receipts."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-release-assurance-master/1.1"
PRIVATE_SUFFIXES = (".p12", ".jks", ".keystore", ".pem", ".key", ".pk8")


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
            f"expected {expected_shards} assurance shard receipts, found {len(batch_paths)}"
        )
    batches = [load_json(path) for path in batch_paths]
    indices = sorted(int(item["shard_index"]) for item in batches)
    if indices != list(range(expected_shards)):
        raise SystemExit(f"release-assurance shard index drift: {indices}")
    for batch in batches:
        if batch["status"] != "ANDROID_RELEASE_ASSURANCE_SHARD_PASS":
            raise SystemExit(f"non-passing assurance shard: {batch['shard_index']}")
        if int(batch["private_keys_in_output"]) != 0:
            raise SystemExit(f"private signing material claimed by shard {batch['shard_index']}")

    receipt_paths = sorted(source.rglob("receipts/*.json"))
    apk_paths = sorted(source.rglob("artifacts/*.apk"))
    if len(receipt_paths) != expected_bodies or len(apk_paths) != expected_bodies:
        raise SystemExit(
            f"expected {expected_bodies} assurance receipts/APKs, found "
            f"{len(receipt_paths)}/{len(apk_paths)}"
        )
    receipts = [load_json(path) for path in receipt_paths]
    receipt_by_id = {str(item["body_id"]): item for item in receipts}
    apk_by_id = {path.stem: path for path in apk_paths}
    if len(receipt_by_id) != expected_bodies or len(apk_by_id) != expected_bodies:
        raise SystemExit("assurance body IDs are not unique")
    if set(receipt_by_id) != set(apk_by_id):
        raise SystemExit("assurance APK and receipt body sets differ")

    delivery = out / "JM_ANDROID_100_RELEASE_ASSURANCE_v1.1"
    if delivery.exists():
        shutil.rmtree(delivery)
    apk_out = delivery / "APKS"
    receipt_out = delivery / "RECEIPTS"
    apk_out.mkdir(parents=True)
    receipt_out.mkdir(parents=True)

    entries: list[dict[str, Any]] = []
    packages: set[str] = set()
    certificates: set[str] = set()
    toolchain_fingerprints: set[str] = set()
    source_digests: set[str] = set()
    apk_inventory_digests: set[str] = set()
    for body_id in sorted(receipt_by_id):
        receipt = receipt_by_id[body_id]
        apk = apk_by_id[body_id]
        if receipt["status"] != "ANDROID_EXACT_RELEASE_REPRODUCIBILITY_AND_SURFACE_PASS":
            raise SystemExit(f"non-passing assurance receipt: {body_id}")
        checks = {
            "unsigned_exact": receipt["unsigned_build_a_sha256"]
            == receipt["unsigned_build_b_sha256"],
            "unsigned_flag": bool(receipt["unsigned_byte_reproducible"]),
            "signed_exact": receipt["signed_build_a_sha256"]
            == receipt["signed_build_b_sha256"],
            "signed_flag": bool(receipt["same_key_signed_byte_reproducible"]),
            "canonical_hash": file_sha256(apk) == receipt["canonical_apk_sha256"],
            "canonical_matches_signed": receipt["canonical_apk_sha256"]
            == receipt["signed_build_a_sha256"],
            "zipalign": bool(receipt["zipalign_verified"]),
            "zero_permissions": int(receipt["permission_count"]) == 0
            and not receipt["permissions"],
            "single_exported": int(receipt["exported_component_count"]) == 1,
            "zero_native": int(receipt["native_payload_count"]) == 0
            and not receipt["native_payload_entries"],
            "zero_key_entries": int(receipt["private_key_entry_count"]) == 0
            and not receipt["private_key_entries"],
            "key_not_retained": not bool(receipt["private_key_retained"]),
            "release": not bool(receipt["compiled_manifest"]["debuggable"]),
            "v2_or_newer": bool(receipt["signing"]["v2_or_newer"]),
            "inventory_present": int(receipt["apk_inventory_count"]) > 0,
            "source_inventory_present": int(receipt["source_inventory_count"]) > 0,
        }
        failed = sorted(key for key, passed in checks.items() if not passed)
        if failed:
            raise SystemExit(f"assurance checks failed for {body_id}: {failed}")
        package = str(receipt["compiled_manifest"]["package"])
        certificate = str(receipt["certificate_sha256"])
        packages.add(package)
        certificates.add(certificate)
        source_digests.add(str(receipt["source_inventory_sha256"]))
        apk_inventory_digests.add(str(receipt["apk_inventory_sha256"]))
        toolchain_fingerprint = hashlib.sha256(
            json.dumps(receipt["toolchain"], sort_keys=True).encode("utf-8")
        ).hexdigest()
        toolchain_fingerprints.add(toolchain_fingerprint)
        shutil.copy2(apk, apk_out / f"{body_id}.apk")
        write_json(receipt_out / f"{body_id}.json", receipt)
        entries.append(
            {
                "body_id": body_id,
                "package": package,
                "identity_sha256": receipt["identity_sha256"],
                "certificate_sha256": certificate,
                "source_inventory_sha256": receipt["source_inventory_sha256"],
                "source_inventory_count": receipt["source_inventory_count"],
                "unsigned_reproducible_sha256": receipt["unsigned_build_a_sha256"],
                "signed_reproducible_sha256": receipt["signed_build_a_sha256"],
                "canonical_apk_sha256": receipt["canonical_apk_sha256"],
                "apk_inventory_sha256": receipt["apk_inventory_sha256"],
                "apk_inventory_count": receipt["apk_inventory_count"],
                "permission_count": receipt["permission_count"],
                "exported_components": receipt["exported_components"],
                "native_payload_count": receipt["native_payload_count"],
                "private_key_entry_count": receipt["private_key_entry_count"],
                "toolchain_fingerprint_sha256": toolchain_fingerprint,
            }
        )

    if len(packages) != expected_bodies:
        raise SystemExit(f"expected {expected_bodies} unique packages, found {len(packages)}")
    if len(certificates) != expected_bodies:
        raise SystemExit(
            f"expected {expected_bodies} sovereign test certificates, found {len(certificates)}"
        )
    if len(source_digests) != expected_bodies:
        raise SystemExit("body-bound source inventory digests are not unique")
    if len(apk_inventory_digests) != expected_bodies:
        raise SystemExit("body-bound APK inventory digests are not unique")
    if len(toolchain_fingerprints) != 1:
        raise SystemExit(f"mixed assurance toolchains recovered: {sorted(toolchain_fingerprints)}")

    private_files = sorted(
        path.relative_to(delivery).as_posix()
        for path in delivery.rglob("*")
        if path.is_file() and path.name.lower().endswith(PRIVATE_SUFFIXES)
    )
    if private_files:
        raise SystemExit(f"private signing material entered assurance delivery: {private_files}")

    master = {
        "schema": SCHEMA,
        "status": "ANDROID_100_EXACT_RELEASE_REPRODUCIBILITY_AND_INVENTORY_FEDERATION_PASS",
        "body_count": expected_bodies,
        "shard_count": expected_shards,
        "clean_release_build_executions": expected_bodies * 2,
        "unsigned_byte_reproducibility_proofs": expected_bodies,
        "same_key_signed_byte_reproducibility_proofs": expected_bodies,
        "zipalign_proofs": expected_bodies,
        "zero_permission_proofs": expected_bodies,
        "single_exported_launcher_proofs": expected_bodies,
        "software_inventory_receipts": expected_bodies,
        "zero_native_payload_proofs": expected_bodies,
        "zero_private_key_entry_proofs": expected_bodies,
        "unique_packages": len(packages),
        "unique_sovereign_test_certificates": len(certificates),
        "unique_source_inventory_digests": len(source_digests),
        "unique_apk_inventory_digests": len(apk_inventory_digests),
        "toolchain_fingerprint_sha256": next(iter(toolchain_fingerprints)),
        "private_keys_in_delivery": len(private_files),
        "production_key_ownership": "OPEN",
        "entries": entries,
        "claim_boundary": (
            "All 100 bodies completed two clean byte-identical unsigned release builds and two "
            "same-key byte-identical signed outputs on one frozen runner/toolchain. Alignment, "
            "permissions, exported launcher surface, source/APK inventories, native payload and "
            "private-key surface were receipted. Cross-runner, cross-OS, production-key, Play Store "
            "and physical-device assurance remain separate gates."
        ),
    }
    write_json(delivery / "JM_ANDROID_100_RELEASE_ASSURANCE_RECEIPT.json", master)
    write_json(out / "JM_ANDROID_100_RELEASE_ASSURANCE_MASTER_RECEIPT.json", master)
    archive = out / "JM_ANDROID_100_RELEASE_ASSURANCE_v1.1.zip"
    deterministic_zip(delivery, archive)
    archive_hash = file_sha256(archive)
    (out / "JM_ANDROID_100_RELEASE_ASSURANCE_v1.1.sha256").write_text(
        f"{archive_hash}  {archive.name}\n",
        encoding="utf-8",
    )
    master["delivery_zip"] = archive.name
    master["delivery_zip_sha256"] = archive_hash
    write_json(out / "JM_ANDROID_100_RELEASE_ASSURANCE_MASTER_RECEIPT.json", master)
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
