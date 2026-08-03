#!/usr/bin/env python3
"""Add compiled-manifest/signature proof and deterministically reseal the APK army."""
from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path
from typing import Any

import android_apk_provenance as provenance

DELIVERY_NAME = "JM_ANDROID_100_SOVEREIGN_BODY_APKS_v0.1"
FIXED_ZIP_TIME = (2026, 8, 2, 0, 0, 0)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def deterministic_zip(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        destination,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for path in sorted(item for item in source.rglob("*") if item.is_file()):
            relative = path.relative_to(source).as_posix()
            info = zipfile.ZipInfo(relative, date_time=FIXED_ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def reseal(master_root: Path, aapt2: Path, apksigner: Path) -> dict[str, Any]:
    delivery = master_root / DELIVERY_NAME
    if not delivery.is_dir():
        raise SystemExit(f"missing assembled Android delivery: {delivery}")

    proof = provenance.verify_delivery(delivery, aapt2, apksigner)
    manifest_path = delivery / "00_OPEN_FIRST_ANDROID_100_MASTER_RECEIPT.json"
    manifest = load_json(manifest_path)
    if manifest.get("body_count") != proof["body_count"]:
        raise SystemExit("construction and provenance body counts disagree")

    manifest.update(
        {
            "status": "ANDROID_100_APK_CONSTRUCTION_MANIFEST_SIGNATURE_FEDERATION_PASS",
            "compiled_manifest_proofs": proof["compiled_manifest_proofs"],
            "embedded_body_asset_proofs": proof["embedded_body_asset_proofs"],
            "signed_apks": proof["signed_apks"],
            "v2_or_newer_signed_apks": proof["v2_or_newer_signed_apks"],
            "debuggable_apks": proof["debuggable_apks"],
            "unique_compiled_packages": proof["unique_compiled_packages"],
            "unique_launchable_activities": proof["unique_launchable_activities"],
            "unique_signer_certificates": proof["unique_signer_certificates"],
            "signer_certificate_sha256": proof["signer_certificate_sha256"],
            "apk_provenance_receipt": "ANDROID_APK_PROVENANCE_RECEIPT.json",
            "claim_boundary": proof["claim_boundary"],
        }
    )
    write_json(manifest_path, manifest)

    zip_path = master_root / f"{DELIVERY_NAME}.zip"
    deterministic_zip(delivery, zip_path)
    zip_sha = file_sha256(zip_path)
    summary = {
        **manifest,
        "delivery_zip": zip_path.name,
        "delivery_zip_bytes": zip_path.stat().st_size,
        "delivery_zip_sha256": zip_sha,
    }
    write_json(master_root / "JM_ANDROID_100_MASTER_RECEIPT.json", summary)
    (master_root / f"{DELIVERY_NAME}.sha256").write_text(
        f"{zip_sha}  {zip_path.name}\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
    return summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master-root", type=Path, required=True)
    parser.add_argument("--aapt2", type=Path, required=True)
    parser.add_argument("--apksigner", type=Path, required=True)
    args = parser.parse_args()
    reseal(args.master_root.resolve(), args.aapt2.resolve(), args.apksigner.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
