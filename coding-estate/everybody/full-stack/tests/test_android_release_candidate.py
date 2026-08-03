#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_release_candidate_aggregate as aggregate  # noqa: E402
import android_release_candidate_batch as release  # noqa: E402


def body_receipt(ordinal: int) -> dict[str, object]:
    body_id = f"body-{ordinal:03d}"
    package = f"com.jmisjustme.body.body_{ordinal:03d}"
    certificate = f"{ordinal + 1:064x}"
    return {
        "schema": "jm.android.body-release-candidate/1.0",
        "status": "ANDROID_RELEASE_CANDIDATE_CONSTRUCTED_SIGNED_PROVENANCE_PASS",
        "body_id": body_id,
        "body_name": body_id,
        "namespace": package,
        "identity_sha256": f"{ordinal + 1000:064x}",
        "compile_sdk": 35,
        "min_sdk": 24,
        "target_sdk": 35,
        "version_code": 1,
        "version_name": f"1.0-rc1-{body_id}",
        "apk": f"{body_id}.apk",
        "apk_bytes": 8,
        "apk_sha256": "",
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
            "certificate_dn": [f"CN=JM Test Release {body_id}"],
            "v2_or_newer": True,
        },
        "certificate_sha256": certificate,
        "embedded_body_asset_sha256": f"{ordinal + 2000:064x}",
        "release_build": True,
        "debuggable": False,
        "private_key_retained": False,
        "test_release_certificate": True,
        "production_key_ownership": "OPEN",
    }


def populate(source: Path) -> None:
    for shard in range(10):
        root = source / f"artifact-{shard}" / f"release-shard-{shard:02d}-of-10"
        artifacts = root / "artifacts"
        receipts = root / "receipts"
        artifacts.mkdir(parents=True)
        receipts.mkdir(parents=True)
        body_ids = []
        for ordinal in range(shard, 100, 10):
            receipt = body_receipt(ordinal)
            body_id = str(receipt["body_id"])
            body_ids.append(body_id)
            apk = artifacts / f"{body_id}.apk"
            apk.write_bytes(f"apk-{ordinal:03d}".encode("ascii"))
            receipt["apk_bytes"] = apk.stat().st_size
            receipt["apk_sha256"] = release.file_sha256(apk)
            (receipts / f"{body_id}.json").write_text(
                json.dumps(receipt, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
        batch = {
            "schema": "jm.everybody.android-release-candidate-batch/1.0",
            "status": "ANDROID_RELEASE_CANDIDATE_SHARD_PASS",
            "shard_index": shard,
            "shard_count": 10,
            "selected_body_count": 10,
            "built_body_count": 10,
            "failed_body_count": 0,
            "body_ids": body_ids,
            "built_body_ids": body_ids,
            "unique_test_release_certificates": 10,
            "ephemeral_keys_generated": 10,
            "private_keys_in_shard_output": 0,
            "release_apks": 10,
            "non_debuggable_apks": 10,
            "v2_or_newer_signed_apks": 10,
            "failures": [],
        }
        (root / "BATCH_RECEIPT.json").write_text(
            json.dumps(batch, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-release-version-") as temp:
        project = Path(temp)
        gradle = project / "app" / "build.gradle.kts"
        gradle.parent.mkdir(parents=True)
        gradle.write_text(
            'android { defaultConfig { versionCode = 1\nversionName = "0.2-cading" } }\n',
            encoding="utf-8",
        )
        name = release.set_release_version(project, "cading", version_code=2)
        text = gradle.read_text(encoding="utf-8")
        assert name == "1.0-rc2-cading"
        assert "versionCode = 2" in text
        assert 'versionName = "1.0-rc2-cading"' in text
        assert "JM Test Release cading" in release.safe_dn("cading")

    with tempfile.TemporaryDirectory(prefix="jm-release-aggregate-") as temp:
        root = Path(temp)
        source = root / "source"
        out = root / "out"
        populate(source)
        master = aggregate.aggregate(source, out, expected_bodies=100, expected_shards=10)
        assert master["status"] == "ANDROID_100_RELEASE_CANDIDATE_CONSTRUCTION_PROVENANCE_PASS"
        assert master["body_count"] == 100
        assert master["release_apks"] == 100
        assert master["non_debuggable_apks"] == 100
        assert master["v2_or_newer_signed_apks"] == 100
        assert master["unique_sovereign_test_certificates"] == 100
        assert master["private_keys_in_delivery"] == 0
        assert len(master["entries"]) == 100
        delivery = out / "JM_ANDROID_100_RELEASE_CANDIDATE_APKS_v1.0"
        assert len(list((delivery / "APKS").glob("*.apk"))) == 100
        assert len(list((delivery / "RECEIPTS").glob("*.json"))) == 100
        assert not list(delivery.rglob("*.p12"))
        archive = out / "JM_ANDROID_100_RELEASE_CANDIDATE_APKS_v1.0.zip"
        first_hash = release.file_sha256(archive)
        master2 = aggregate.aggregate(source, out, expected_bodies=100, expected_shards=10)
        assert master2["delivery_zip_sha256"] == first_hash
        assert release.file_sha256(archive) == first_hash

        broken = source / "artifact-0" / "release-shard-00-of-10" / "receipts" / "body-000.json"
        value = json.loads(broken.read_text(encoding="utf-8"))
        value["debuggable"] = True
        broken.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        try:
            aggregate.aggregate(source, out, expected_bodies=100, expected_shards=10)
        except SystemExit:
            pass
        else:
            raise AssertionError("debuggable release APK receipt was accepted")

    print(
        "JM ANDROID RELEASE CANDIDATE: VERSION ROUTE + 10 SHARDS + 100 UNIQUE "
        "CERTIFICATES + ZERO PRIVATE KEYS + DETERMINISTIC DELIVERY PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
