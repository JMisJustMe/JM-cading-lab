#!/usr/bin/env python3
"""Pair independent Ubuntu runners and seal exact Android release reproducibility receipts."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

import android_release_assurance_aggregate as assurance_aggregate

SCHEMA = "jm.everybody.android-cross-runner-reproducibility-master/1.2"
PRIVATE_SUFFIXES = assurance_aggregate.PRIVATE_SUFFIXES
MANIFEST_FIELDS = (
    "package",
    "launchable_activity",
    "min_sdk",
    "target_sdk",
    "debuggable",
    "version_code",
    "version_name",
)
TOOLCHAIN_FIELDS = (
    "gradle_version_sha256",
    "java_version_sha256",
    "aapt2_sha256",
    "apksigner_sha256",
    "zipalign_sha256",
    "compile_sdk",
    "min_sdk",
    "target_sdk",
)


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


def selected(value: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: value.get(field) for field in fields}


def receipt_files(receipt_path: Path, body_id: str) -> tuple[Path, Path]:
    root = receipt_path.parent.parent
    unsigned = root / "unsigned" / f"{body_id}.apk"
    signed = root / "signed" / f"{body_id}.apk"
    if not unsigned.is_file() or not signed.is_file():
        raise SystemExit(f"cross-runner public APK evidence missing for {body_id} under {root}")
    return unsigned, signed


def aggregate(
    source: Path,
    out: Path,
    *,
    expected_bodies: int,
    expected_shards: int,
    runner_labels: tuple[str, str],
) -> dict[str, Any]:
    batch_paths = sorted(source.rglob("BATCH_RECEIPT.json"))
    expected_batches = expected_shards * len(runner_labels)
    if len(batch_paths) != expected_batches:
        raise SystemExit(
            f"expected {expected_batches} cross-runner batches, found {len(batch_paths)}"
        )
    batches = [load_json(path) for path in batch_paths]
    by_runner_batches: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for batch in batches:
        if batch["status"] != "ANDROID_CROSS_RUNNER_BUILD_SHARD_PASS":
            raise SystemExit(
                f"non-passing cross-runner batch: {batch.get('runner_label')}:{batch.get('shard_index')}"
            )
        if int(batch["private_keys_in_output"]) != 0:
            raise SystemExit(f"private material claimed by runner {batch['runner_label']}")
        by_runner_batches[str(batch["runner_label"])].append(batch)
    if set(by_runner_batches) != set(runner_labels):
        raise SystemExit(f"cross-runner labels drifted: {sorted(by_runner_batches)}")
    for label in runner_labels:
        indices = sorted(int(item["shard_index"]) for item in by_runner_batches[label])
        if indices != list(range(expected_shards)):
            raise SystemExit(f"cross-runner shard drift for {label}: {indices}")

    receipt_paths = sorted(source.rglob("receipts/*.json"))
    expected_receipts = expected_bodies * len(runner_labels)
    if len(receipt_paths) != expected_receipts:
        raise SystemExit(
            f"expected {expected_receipts} cross-runner body receipts, found {len(receipt_paths)}"
        )
    pairs: dict[str, dict[str, tuple[dict[str, Any], Path]]] = defaultdict(dict)
    for path in receipt_paths:
        receipt = load_json(path)
        if receipt["status"] != "ANDROID_CROSS_RUNNER_RELEASE_BUILD_PASS":
            raise SystemExit(f"non-passing cross-runner body receipt: {path}")
        body_id = str(receipt["body_id"])
        label = str(receipt["runner_label"])
        if label not in runner_labels:
            raise SystemExit(f"unexpected runner label {label} for {body_id}")
        if label in pairs[body_id]:
            raise SystemExit(f"duplicate {label} receipt for {body_id}")
        pairs[body_id][label] = (receipt, path)
    if len(pairs) != expected_bodies:
        raise SystemExit(f"expected {expected_bodies} cross-runner body pairs, found {len(pairs)}")

    delivery = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2"
    if delivery.exists():
        shutil.rmtree(delivery)
    canonical_out = delivery / "UNSIGNED_CANONICAL"
    pair_out = delivery / "PAIR_RECEIPTS"
    signed_out = delivery / "SIGNED_PUBLIC_EVIDENCE"
    for path in (canonical_out, pair_out, signed_out):
        path.mkdir(parents=True)

    pair_entries: list[dict[str, Any]] = []
    all_certificates: set[str] = set()
    packages: set[str] = set()
    runner_os_digests: dict[str, set[str]] = defaultdict(set)
    toolchain_pairs: set[str] = set()
    for body_id in sorted(pairs):
        runner_map = pairs[body_id]
        if set(runner_map) != set(runner_labels):
            raise SystemExit(f"incomplete cross-runner pair for {body_id}: {sorted(runner_map)}")
        left_label, right_label = runner_labels
        left, left_path = runner_map[left_label]
        right, right_path = runner_map[right_label]
        left_unsigned, left_signed = receipt_files(left_path, body_id)
        right_unsigned, right_signed = receipt_files(right_path, body_id)

        left_unsigned_hash = file_sha256(left_unsigned)
        right_unsigned_hash = file_sha256(right_unsigned)
        left_signed_hash = file_sha256(left_signed)
        right_signed_hash = file_sha256(right_signed)
        checks = {
            "left_unsigned_hash": left_unsigned_hash == left["unsigned_apk_sha256"],
            "right_unsigned_hash": right_unsigned_hash == right["unsigned_apk_sha256"],
            "left_signed_hash": left_signed_hash == left["signed_apk_sha256"],
            "right_signed_hash": right_signed_hash == right["signed_apk_sha256"],
            "unsigned_exact": left_unsigned_hash == right_unsigned_hash,
            "source_inventory": left["source_inventory_sha256"]
            == right["source_inventory_sha256"],
            "unsigned_inventory": left["unsigned_inventory_sha256"]
            == right["unsigned_inventory_sha256"],
            "normalized_signed_payload": left["normalized_signed_inventory_sha256"]
            == right["normalized_signed_inventory_sha256"],
            "normalized_signed_inventory": left["normalized_signed_inventory"]
            == right["normalized_signed_inventory"],
            "identity": left["identity_sha256"] == right["identity_sha256"],
            "namespace": left["namespace"] == right["namespace"],
            "manifest": selected(left["compiled_manifest"], MANIFEST_FIELDS)
            == selected(right["compiled_manifest"], MANIFEST_FIELDS),
            "permissions": left["permissions"] == right["permissions"] == [],
            "components": left["components"] == right["components"],
            "one_exported": int(left["exported_component_count"]) == 1
            and int(right["exported_component_count"]) == 1,
            "zero_native": int(left["native_payload_count"]) == 0
            and int(right["native_payload_count"]) == 0,
            "zero_key_entries": int(left["private_key_entry_count"]) == 0
            and int(right["private_key_entry_count"]) == 0,
            "v2_or_newer": bool(left["signing"]["v2_or_newer"])
            and bool(right["signing"]["v2_or_newer"]),
            "independent_certificates": left["certificate_sha256"]
            != right["certificate_sha256"],
            "pinned_toolchain": selected(left["toolchain"], TOOLCHAIN_FIELDS)
            == selected(right["toolchain"], TOOLCHAIN_FIELDS),
        }
        failed = sorted(key for key, passed in checks.items() if not passed)
        if failed:
            raise SystemExit(f"cross-runner comparison failed for {body_id}: {failed}")

        packages.add(str(left["compiled_manifest"]["package"]))
        left_cert = str(left["certificate_sha256"])
        right_cert = str(right["certificate_sha256"])
        all_certificates.update((left_cert, right_cert))
        runner_os_digests[left_label].add(str(left["runner"]["os_release_sha256"]))
        runner_os_digests[right_label].add(str(right["runner"]["os_release_sha256"]))
        toolchain_pair = hashlib.sha256(
            json.dumps(selected(left["toolchain"], TOOLCHAIN_FIELDS), sort_keys=True).encode("utf-8")
        ).hexdigest()
        toolchain_pairs.add(toolchain_pair)

        shutil.copy2(left_unsigned, canonical_out / f"{body_id}.apk")
        body_signed = signed_out / body_id
        body_signed.mkdir(parents=True)
        shutil.copy2(left_signed, body_signed / f"{left_label}.apk")
        shutil.copy2(right_signed, body_signed / f"{right_label}.apk")
        pair_receipt = {
            "schema": "jm.android.body-cross-runner-pair/1.2",
            "status": "ANDROID_CROSS_RUNNER_UNSIGNED_EXACT_AND_SIGNED_PAYLOAD_EQUIVALENT_PASS",
            "body_id": body_id,
            "body_name": left["body_name"],
            "namespace": left["namespace"],
            "identity_sha256": left["identity_sha256"],
            "runner_labels": list(runner_labels),
            "runner_a": left["runner"],
            "runner_b": right["runner"],
            "toolchain": selected(left["toolchain"], TOOLCHAIN_FIELDS),
            "toolchain_fingerprint_sha256": toolchain_pair,
            "source_inventory_sha256": left["source_inventory_sha256"],
            "unsigned_apk_sha256": left_unsigned_hash,
            "unsigned_byte_identical_across_runners": True,
            "unsigned_inventory_sha256": left["unsigned_inventory_sha256"],
            "normalized_signed_inventory_sha256": left["normalized_signed_inventory_sha256"],
            "normalized_signed_payload_equivalent": True,
            "runner_a_signed_apk_sha256": left_signed_hash,
            "runner_b_signed_apk_sha256": right_signed_hash,
            "runner_a_certificate_sha256": left_cert,
            "runner_b_certificate_sha256": right_cert,
            "certificates_independent": True,
            "compiled_manifest": selected(left["compiled_manifest"], MANIFEST_FIELDS),
            "permissions": left["permissions"],
            "components": left["components"],
            "exported_component_count": left["exported_component_count"],
            "native_payload_count": left["native_payload_count"],
            "private_key_entry_count": left["private_key_entry_count"],
            "signer_dependent_entries_a": left["signer_dependent_entries"],
            "signer_dependent_entries_b": right["signer_dependent_entries"],
            "claim_boundary": (
                "Two independent Ubuntu runner images produced byte-identical unsigned release APKs "
                "and equivalent signed payload inventories under different ephemeral test certificates. "
                "Exact same-key signed bytes across runners, production key custody and non-Linux "
                "operating systems remain separate gates."
            ),
        }
        write_json(pair_out / f"{body_id}.json", pair_receipt)
        pair_entries.append(pair_receipt)

    if len(packages) != expected_bodies:
        raise SystemExit(f"expected {expected_bodies} unique packages, found {len(packages)}")
    if len(all_certificates) != expected_bodies * len(runner_labels):
        raise SystemExit(
            f"expected {expected_bodies * len(runner_labels)} independent certificates, "
            f"found {len(all_certificates)}"
        )
    if any(len(values) != 1 for values in runner_os_digests.values()):
        raise SystemExit(f"runner OS identity drift within one label: {runner_os_digests}")
    os_identities = {next(iter(values)) for values in runner_os_digests.values()}
    if len(os_identities) != len(runner_labels):
        raise SystemExit("cross-runner proof did not recover two distinct OS identities")
    if len(toolchain_pairs) != 1:
        raise SystemExit(f"mixed pinned toolchains recovered: {sorted(toolchain_pairs)}")

    private_files = sorted(
        path.relative_to(delivery).as_posix()
        for path in delivery.rglob("*")
        if path.is_file() and path.name.lower().endswith(PRIVATE_SUFFIXES)
    )
    if private_files:
        raise SystemExit(f"private material entered cross-runner delivery: {private_files}")

    master = {
        "schema": SCHEMA,
        "status": "ANDROID_100_CROSS_RUNNER_UNSIGNED_EXACT_AND_SIGNED_PAYLOAD_EQUIVALENCE_PASS",
        "body_count": expected_bodies,
        "runner_count": len(runner_labels),
        "runner_labels": list(runner_labels),
        "distinct_runner_os_identities": len(os_identities),
        "independent_release_builds": expected_bodies * len(runner_labels),
        "unsigned_byte_identical_pairs": expected_bodies,
        "source_inventory_identical_pairs": expected_bodies,
        "unsigned_inventory_identical_pairs": expected_bodies,
        "normalized_signed_payload_equivalent_pairs": expected_bodies,
        "v2_or_newer_signature_proofs": expected_bodies * len(runner_labels),
        "independent_test_certificates": len(all_certificates),
        "zero_permission_pair_proofs": expected_bodies,
        "single_exported_launcher_pair_proofs": expected_bodies,
        "zero_native_payload_pair_proofs": expected_bodies,
        "zero_private_key_entry_pair_proofs": expected_bodies,
        "unique_packages": len(packages),
        "pinned_toolchain_fingerprint_sha256": next(iter(toolchain_pairs)),
        "private_keys_in_delivery": len(private_files),
        "production_key_ownership": "OPEN",
        "entries": pair_entries,
        "claim_boundary": (
            "All 100 bodies produced byte-identical unsigned release APKs on independent Ubuntu "
            "24.04 and Ubuntu 22.04 runners with pinned Gradle/JDK/Android tools. Independently signed "
            "outputs preserved equivalent normalized payloads under 200 distinct ephemeral test "
            "certificates. Exact same-key signed bytes across runners, non-Linux OS, production key, "
            "Play Store and physical-device proof remain separate gates."
        ),
    }
    write_json(delivery / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_RECEIPT.json", master)
    write_json(out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_MASTER_RECEIPT.json", master)
    archive = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2.zip"
    deterministic_zip(delivery, archive)
    archive_hash = file_sha256(archive)
    (out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2.sha256").write_text(
        f"{archive_hash}  {archive.name}\n",
        encoding="utf-8",
    )
    master["delivery_zip"] = archive.name
    master["delivery_zip_sha256"] = archive_hash
    write_json(out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_MASTER_RECEIPT.json", master)
    print(json.dumps(master, ensure_ascii=False, indent=2, sort_keys=True))
    return master


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--expected-bodies", type=int, required=True)
    parser.add_argument("--expected-shards", type=int, required=True)
    parser.add_argument("--runner-a", required=True)
    parser.add_argument("--runner-b", required=True)
    args = parser.parse_args()
    aggregate(
        args.source.resolve(),
        args.out.resolve(),
        expected_bodies=args.expected_bodies,
        expected_shards=args.expected_shards,
        runner_labels=(args.runner_a, args.runner_b),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
