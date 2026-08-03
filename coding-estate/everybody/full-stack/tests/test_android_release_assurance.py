#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
import zipfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_release_assurance_aggregate as aggregate  # noqa: E402
import android_release_assurance_batch as assurance  # noqa: E402


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def synthetic_receipt(ordinal: int, apk: Path) -> dict[str, object]:
    body_id = f"body-{ordinal:03d}"
    package = f"com.jmisjustme.body.body_{ordinal:03d}"
    apk_hash = aggregate.file_sha256(apk)
    source_digest = f"{ordinal + 1001:064x}"
    inventory_digest = f"{ordinal + 2001:064x}"
    certificate = f"{ordinal + 3001:064x}"
    toolchain = {
        "gradle_version_sha256": "1" * 64,
        "java_version_sha256": "2" * 64,
        "aapt2_sha256": "3" * 64,
        "apksigner_sha256": "4" * 64,
        "zipalign_sha256": "5" * 64,
        "compile_sdk": 35,
        "min_sdk": 24,
        "target_sdk": 35,
    }
    return {
        "schema": "jm.android.body-release-assurance/1.1",
        "status": "ANDROID_EXACT_RELEASE_REPRODUCIBILITY_AND_SURFACE_PASS",
        "body_id": body_id,
        "body_name": body_id,
        "namespace": package,
        "identity_sha256": f"{ordinal + 4001:064x}",
        "version_code": 1,
        "version_name": f"1.0-rc1-{body_id}",
        "source_inventory": [{"path": "app/source.txt", "bytes": 1, "sha256": source_digest}],
        "source_inventory_count": 1,
        "source_inventory_sha256": source_digest,
        "toolchain": toolchain,
        "unsigned_build_a_sha256": f"{ordinal + 5001:064x}",
        "unsigned_build_b_sha256": f"{ordinal + 5001:064x}",
        "unsigned_byte_reproducible": True,
        "signed_build_a_sha256": apk_hash,
        "signed_build_b_sha256": apk_hash,
        "same_key_signed_byte_reproducible": True,
        "canonical_apk": apk.name,
        "canonical_apk_bytes": apk.stat().st_size,
        "canonical_apk_sha256": apk_hash,
        "certificate_sha256": certificate,
        "compiled_manifest": {
            "package": package,
            "launchable_activity": f"{package}.MainActivity",
            "min_sdk": 24,
            "target_sdk": 35,
            "debuggable": False,
            "version_code": "1",
            "version_name": f"1.0-rc1-{body_id}",
        },
        "signing": {
            "schemes": {"v1": False, "v2": True, "v3": True},
            "certificate_sha256": [certificate],
            "v2_or_newer": True,
        },
        "zipalign_verified": True,
        "permissions": [],
        "permission_count": 0,
        "components": [
            {
                "kind": "activity",
                "name": f"{package}.MainActivity",
                "exported": True,
                "permission": None,
            }
        ],
        "exported_components": [
            {
                "kind": "activity",
                "name": f"{package}.MainActivity",
                "exported": True,
                "permission": None,
            }
        ],
        "exported_component_count": 1,
        "apk_inventory": [{"path": "classes.dex", "bytes": 1, "sha256": inventory_digest}],
        "apk_inventory_count": 1,
        "apk_inventory_sha256": inventory_digest,
        "native_payload_entries": [],
        "native_payload_count": 0,
        "private_key_entries": [],
        "private_key_entry_count": 0,
        "private_key_retained": False,
    }


def populate(source: Path) -> None:
    for shard in range(10):
        root = source / f"artifact-{shard}" / f"assurance-shard-{shard:02d}-of-10"
        artifacts = root / "artifacts"
        receipts = root / "receipts"
        artifacts.mkdir(parents=True)
        receipts.mkdir(parents=True)
        body_ids: list[str] = []
        for ordinal in range(shard, 100, 10):
            body_id = f"body-{ordinal:03d}"
            body_ids.append(body_id)
            apk = artifacts / f"{body_id}.apk"
            with zipfile.ZipFile(apk, "w") as archive:
                archive.writestr("classes.dex", f"dex-{ordinal}")
            receipt = synthetic_receipt(ordinal, apk)
            write_json(receipts / f"{body_id}.json", receipt)
        batch = {
            "schema": "jm.everybody.android-release-assurance-batch/1.1",
            "status": "ANDROID_RELEASE_ASSURANCE_SHARD_PASS",
            "shard_index": shard,
            "shard_count": 10,
            "selected_body_count": 10,
            "passed_body_count": 10,
            "failed_body_count": 0,
            "body_ids": body_ids,
            "private_keys_in_output": 0,
        }
        write_json(root / "BATCH_RECEIPT.json", batch)


def main() -> int:
    permissions = assurance.parse_permissions(
        "package: x\nuses-permission: name='android.permission.CAMERA'\n"
        "uses-permission-sdk-23: name=\"android.permission.POST_NOTIFICATIONS\"\n"
    )
    assert permissions == ["android.permission.CAMERA", "android.permission.POST_NOTIFICATIONS"]

    xmltree = """
E: manifest
  E: application
    E: activity
      A: android:name(0x01010003)="com.example.MainActivity" (Raw: "com.example.MainActivity")
      A: android:exported(0x0101054c)=(type 0x12)0xffffffff
      E: intent-filter
    E: service
      A: android:name(0x01010003)="com.example.InternalService" (Raw: "com.example.InternalService")
      A: android:exported(0x0101054c)=(type 0x12)0x0
"""
    components = assurance.parse_components(xmltree)
    assert len(components) == 2
    assert components[0]["name"] == "com.example.MainActivity"
    assert components[0]["exported"] is True
    assert components[1]["exported"] is False
    assurance.verify_exported_surface(components, "com.example.MainActivity")
    try:
        assurance.verify_exported_surface(components, "com.example.OtherActivity")
    except RuntimeError:
        pass
    else:
        raise AssertionError("unexpected exported activity was accepted")

    with tempfile.TemporaryDirectory(prefix="jm-assurance-inventory-") as temp:
        apk = Path(temp) / "sample.apk"
        with zipfile.ZipFile(apk, "w") as archive:
            archive.writestr("AndroidManifest.xml", b"manifest")
            archive.writestr("classes.dex", b"dex")
            archive.writestr("resources.arsc", b"resources")
            archive.writestr("assets/body.json", b"{}")
        first = assurance.apk_inventory(apk)
        second = assurance.apk_inventory(apk)
        assert first == second
        assert {item["path"] for item in first} == {
            "AndroidManifest.xml",
            "classes.dex",
            "resources.arsc",
            "assets/body.json",
        }

    with tempfile.TemporaryDirectory(prefix="jm-assurance-aggregate-") as temp:
        root = Path(temp)
        source = root / "source"
        out = root / "out"
        populate(source)
        master = aggregate.aggregate(source, out, expected_bodies=100, expected_shards=10)
        assert master["status"] == "ANDROID_100_EXACT_RELEASE_REPRODUCIBILITY_AND_INVENTORY_FEDERATION_PASS"
        assert master["body_count"] == 100
        assert master["clean_release_build_executions"] == 200
        assert master["unsigned_byte_reproducibility_proofs"] == 100
        assert master["same_key_signed_byte_reproducibility_proofs"] == 100
        assert master["zero_permission_proofs"] == 100
        assert master["single_exported_launcher_proofs"] == 100
        assert master["zero_native_payload_proofs"] == 100
        assert master["zero_private_key_entry_proofs"] == 100
        assert master["unique_packages"] == 100
        assert master["unique_sovereign_test_certificates"] == 100
        assert master["private_keys_in_delivery"] == 0
        assert len(master["entries"]) == 100
        archive = out / "JM_ANDROID_100_RELEASE_ASSURANCE_v1.1.zip"
        first_hash = aggregate.file_sha256(archive)
        second = aggregate.aggregate(source, out, expected_bodies=100, expected_shards=10)
        assert second["delivery_zip_sha256"] == first_hash
        assert aggregate.file_sha256(archive) == first_hash

        broken = source / "artifact-0" / "assurance-shard-00-of-10" / "receipts" / "body-000.json"
        value = json.loads(broken.read_text(encoding="utf-8"))
        value["signed_build_b_sha256"] = "0" * 64
        write_json(broken, value)
        try:
            aggregate.aggregate(source, out, expected_bodies=100, expected_shards=10)
        except SystemExit:
            pass
        else:
            raise AssertionError("signed reproducibility drift was accepted")

    print(
        "JM ANDROID RELEASE ASSURANCE: MANIFEST SURFACE + INVENTORY + 200 BUILDS + "
        "100 EXACT REPRODUCIBILITY RECEIPTS PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
