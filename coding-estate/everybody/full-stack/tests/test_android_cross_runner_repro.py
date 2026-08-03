#!/usr/bin/env python3
"""Contract and negative-gate tests for Android cross-runner reproducibility v1.2."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools"
sys.path.insert(0, str(TOOLS))

import android_cross_runner_aggregate as aggregate  # noqa: E402
import android_cross_runner_build as build  # noqa: E402

RUNNERS = ("ubuntu-24.04", "ubuntu-22.04")
PRIVATE_SUFFIXES = (".p12", ".jks", ".keystore", ".pem", ".key", ".pk8")
Mutator = Callable[[str, str, dict[str, Any], Path, Path], object]


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_apk(path: Path, body_id: str, *, certificate: str | None = None) -> list[dict[str, Any]]:
    path.parent.mkdir(parents=True, exist_ok=True)
    entries = {
        "AndroidManifest.xml": f"manifest:{body_id}".encode(),
        "classes.dex": f"dex:{body_id}".encode(),
        "resources.arsc": f"resources:{body_id}".encode(),
        "assets/body.json": json.dumps({"body_id": body_id}, sort_keys=True).encode(),
    }
    if certificate is not None:
        entries["META-INF/JM.RSA"] = f"certificate:{certificate}".encode()
        entries["META-INF/MANIFEST.MF"] = b"signed-manifest"
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, payload in sorted(entries.items()):
            info = zipfile.ZipInfo(name)
            info.date_time = (1980, 1, 1, 0, 0, 0)
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, payload)
    rows: list[dict[str, Any]] = []
    with zipfile.ZipFile(path) as archive:
        for info in sorted(archive.infolist(), key=lambda item: item.filename):
            payload = archive.read(info.filename)
            rows.append(
                {
                    "path": info.filename,
                    "bytes": len(payload),
                    "compressed_bytes": info.compress_size,
                    "compression": info.compress_type,
                    "crc32": f"{info.CRC:08x}",
                    "sha256": sha256_bytes(payload),
                }
            )
    return rows


def toolchain() -> dict[str, Any]:
    return {
        "gradle_version_sha256": "1" * 64,
        "java_version_sha256": "2" * 64,
        "aapt2_sha256": "3" * 64,
        "apksigner_sha256": "4" * 64,
        "zipalign_sha256": "5" * 64,
        "compile_sdk": 35,
        "min_sdk": 24,
        "target_sdk": 35,
    }


def component(body_id: str) -> dict[str, Any]:
    return {
        "kind": "activity",
        "name": f"com.jmisjustme.body.{body_id}.MainActivity",
        "exported": True,
        "permission": None,
    }


def create_runner_shard(
    source: Path,
    runner: str,
    shard: int,
    body_ids: list[str],
    *,
    mutate: Mutator | None = None,
) -> None:
    root = source / f"JM_ANDROID_CROSS_RUNNER_{runner}_SHARD_{shard}_v1.2" / (
        f"cross-runner-{runner}-shard-{shard:02d}-of-02"
    )
    receipts = root / "receipts"
    unsigned_dir = root / "unsigned"
    signed_dir = root / "signed"
    certs: list[str] = []
    for body_id in body_ids:
        certificate = sha256_bytes(f"{runner}:{body_id}:certificate".encode())
        certs.append(certificate)
        unsigned = unsigned_dir / f"{body_id}.apk"
        signed = signed_dir / f"{body_id}.apk"
        unsigned_inventory = write_apk(unsigned, body_id)
        signed_inventory = write_apk(signed, body_id, certificate=certificate)
        normalized = build.normalized_signed_inventory(signed_inventory)
        receipt = {
            "schema": "jm.android.body-cross-runner-release/1.2",
            "status": "ANDROID_CROSS_RUNNER_RELEASE_BUILD_PASS",
            "runner_label": runner,
            "runner": {
                "runner_label": runner,
                "runner_os": "Linux",
                "runner_arch": "X64",
                "image_os": runner,
                "image_version": "test",
                "os_release": runner,
                "os_release_sha256": sha256_bytes(runner.encode()),
                "uname": f"Linux {runner}",
                "uname_sha256": sha256_bytes(f"Linux {runner}".encode()),
            },
            "toolchain": toolchain(),
            "body_id": body_id,
            "body_name": body_id,
            "namespace": f"com.jmisjustme.body.{body_id}",
            "identity_sha256": sha256_bytes(f"identity:{body_id}".encode()),
            "version_code": 1,
            "version_name": f"1.2-{body_id}",
            "source_inventory_count": 3,
            "source_inventory_sha256": sha256_bytes(f"source:{body_id}".encode()),
            "unsigned_apk": unsigned.name,
            "unsigned_apk_bytes": unsigned.stat().st_size,
            "unsigned_apk_sha256": aggregate.file_sha256(unsigned),
            "unsigned_inventory_count": len(unsigned_inventory),
            "unsigned_inventory_sha256": sha256_bytes(
                json.dumps(unsigned_inventory, sort_keys=True).encode()
            ),
            "signed_apk": signed.name,
            "signed_apk_bytes": signed.stat().st_size,
            "signed_apk_sha256": aggregate.file_sha256(signed),
            "certificate_sha256": certificate,
            "compiled_manifest": {
                "package": f"com.jmisjustme.body.{body_id}",
                "launchable_activity": f"com.jmisjustme.body.{body_id}.MainActivity",
                "min_sdk": 24,
                "target_sdk": 35,
                "debuggable": False,
                "version_code": 1,
                "version_name": f"1.2-{body_id}",
            },
            "signing": {"v2_or_newer": True},
            "zipalign_verified": True,
            "permissions": [],
            "permission_count": 0,
            "components": [component(body_id)],
            "exported_components": [component(body_id)],
            "exported_component_count": 1,
            "signed_inventory_count": len(signed_inventory),
            "signed_inventory_sha256": sha256_bytes(
                json.dumps(signed_inventory, sort_keys=True).encode()
            ),
            "normalized_signed_inventory": normalized,
            "normalized_signed_inventory_count": len(normalized),
            "normalized_signed_inventory_sha256": sha256_bytes(
                json.dumps(normalized, sort_keys=True).encode()
            ),
            "signer_dependent_entries": sorted(
                set(item["path"] for item in signed_inventory)
                - set(item["path"] for item in normalized)
            ),
            "native_payload_entries": [],
            "native_payload_count": 0,
            "private_key_entries": [],
            "private_key_entry_count": 0,
            "private_key_retained": False,
        }
        if mutate is not None:
            mutate(runner, body_id, receipt, unsigned, signed)
        write_json(receipts / f"{body_id}.json", receipt)
    batch = {
        "schema": "jm.everybody.android-cross-runner-build/1.2",
        "status": "ANDROID_CROSS_RUNNER_BUILD_SHARD_PASS",
        "runner_label": runner,
        "runner": {"os_release_sha256": sha256_bytes(runner.encode())},
        "toolchain": toolchain(),
        "shard_index": shard,
        "shard_count": 2,
        "selected_body_count": len(body_ids),
        "passed_body_count": len(body_ids),
        "failed_body_count": 0,
        "body_ids": body_ids,
        "unsigned_apks": len(body_ids),
        "signed_apks": len(body_ids),
        "v2_or_newer_signature_proofs": len(body_ids),
        "zero_permission_proofs": len(body_ids),
        "single_exported_launcher_proofs": len(body_ids),
        "zero_native_payload_proofs": len(body_ids),
        "zero_private_key_entry_proofs": len(body_ids),
        "unique_test_certificates": len(set(certs)),
        "private_keys_in_output": 0,
        "failures": [],
    }
    write_json(root / "BATCH_RECEIPT.json", batch)


def create_fixture(source: Path, *, mutate: Mutator | None = None) -> list[str]:
    body_ids = ["alpha", "beta", "gamma", "delta"]
    shards = (body_ids[0::2], body_ids[1::2])
    for runner in RUNNERS:
        for shard, selected in enumerate(shards):
            create_runner_shard(source, runner, shard, list(selected), mutate=mutate)
    return body_ids


def expect_failure(mutator: Mutator, phrase: str) -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        source = root / "source"
        out = root / "out"
        create_fixture(source, mutate=mutator)
        try:
            aggregate.aggregate(
                source,
                out,
                expected_bodies=4,
                expected_shards=2,
                runner_labels=RUNNERS,
            )
        except SystemExit as error:
            assert phrase in str(error), (phrase, str(error))
        else:
            raise AssertionError(f"expected failure containing {phrase!r}")


def test_normalized_signed_inventory() -> None:
    entries = [
        {"path": "classes.dex", "sha256": "a"},
        {"path": "META-INF/JM.RSA", "sha256": "b"},
        {"path": "META-INF/MANIFEST.MF", "sha256": "c"},
        {"path": "assets/body.json", "sha256": "d"},
    ]
    assert build.normalized_signed_inventory(entries) == [entries[0], entries[3]]


def test_positive_federation() -> None:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        source = root / "source"
        out = root / "out"
        body_ids = create_fixture(source)
        receipt = aggregate.aggregate(
            source,
            out,
            expected_bodies=4,
            expected_shards=2,
            runner_labels=RUNNERS,
        )
        assert receipt["status"] == (
            "ANDROID_100_CROSS_RUNNER_UNSIGNED_EXACT_AND_SIGNED_PAYLOAD_EQUIVALENCE_PASS"
        )
        assert receipt["body_count"] == 4
        assert receipt["independent_release_builds"] == 8
        assert receipt["unsigned_byte_identical_pairs"] == 4
        assert receipt["normalized_signed_payload_equivalent_pairs"] == 4
        assert receipt["independent_test_certificates"] == 8
        assert receipt["distinct_runner_os_identities"] == 2
        assert receipt["private_keys_in_delivery"] == 0
        delivery = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2"
        recovered = sorted(path.stem for path in (delivery / "UNSIGNED_CANONICAL").glob("*.apk"))
        assert recovered == sorted(body_ids)
        assert not any(
            path.name.lower().endswith(PRIVATE_SUFFIXES)
            for path in delivery.rglob("*")
            if path.is_file()
        )
        archive = out / "JM_ANDROID_100_CROSS_RUNNER_REPRODUCIBILITY_v1.2.zip"
        first = aggregate.file_sha256(archive)
        archive.unlink()
        aggregate.deterministic_zip(delivery, archive)
        assert aggregate.file_sha256(archive) == first


def main() -> int:
    test_normalized_signed_inventory()
    test_positive_federation()

    expect_failure(
        lambda runner, body, receipt, unsigned, signed: (
            unsigned.write_bytes(unsigned.read_bytes() + b"drift"),
            receipt.__setitem__("unsigned_apk_sha256", aggregate.file_sha256(unsigned)),
        )
        if runner == RUNNERS[1] and body == "alpha"
        else None,
        "unsigned_exact",
    )
    expect_failure(
        lambda runner, body, receipt, unsigned, signed: receipt.__setitem__(
            "certificate_sha256", sha256_bytes(f"shared:{body}".encode())
        ),
        "independent_certificates",
    )
    expect_failure(
        lambda runner, body, receipt, unsigned, signed: receipt["runner"].__setitem__(
            "os_release_sha256", sha256_bytes(RUNNERS[0].encode())
        )
        if runner == RUNNERS[1]
        else None,
        "two distinct OS identities",
    )
    expect_failure(
        lambda runner, body, receipt, unsigned, signed: receipt["toolchain"].__setitem__(
            "java_version_sha256", "9" * 64
        )
        if runner == RUNNERS[1] and body == "beta"
        else None,
        "pinned_toolchain",
    )
    expect_failure(
        lambda runner, body, receipt, unsigned, signed: receipt.__setitem__(
            "normalized_signed_inventory_sha256", "f" * 64
        )
        if runner == RUNNERS[1] and body == "gamma"
        else None,
        "normalized_signed_payload",
    )

    print("ANDROID_CROSS_RUNNER_REPRODUCIBILITY_CONTRACTS_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
