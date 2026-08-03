#!/usr/bin/env python3
"""Verify compiled Android manifest identity and APK signing provenance."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.android-apk-provenance/0.1"
EXPECTED_BODIES = 100


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


def _required(pattern: str, text: str, label: str) -> str:
    match = re.search(pattern, text, flags=re.MULTILINE)
    if not match:
        raise ValueError(f"missing {label} in Android tool output")
    return match.group(1)


def parse_aapt2_badging(text: str) -> dict[str, Any]:
    package = _required(r"^package: name='([^']+)'", text, "package name")
    launchable = _required(
        r"^launchable-activity: name='([^']+)'", text, "launchable activity"
    )
    # AAPT2 renamed the historical `sdkVersion` badging label to
    # `minSdkVersion`. Accept both official vocabularies while preserving the
    # exact numeric floor check performed by the caller.
    min_sdk = int(
        _required(
            r"^(?:minSdkVersion|sdkVersion):'([0-9]+)'",
            text,
            "minimum SDK",
        )
    )
    target_sdk = int(
        _required(r"^targetSdkVersion:'([0-9]+)'", text, "target SDK")
    )
    version_code_match = re.search(
        r"^package: .*versionCode='([^']+)'", text, re.MULTILINE
    )
    version_name_match = re.search(
        r"^package: .*versionName='([^']+)'", text, re.MULTILINE
    )
    return {
        "package": package,
        "launchable_activity": launchable,
        "min_sdk": min_sdk,
        "target_sdk": target_sdk,
        "debuggable": bool(
            re.search(r"^application-debuggable\s*$", text, re.MULTILINE)
        ),
        "version_code": version_code_match.group(1) if version_code_match else None,
        "version_name": version_name_match.group(1) if version_name_match else None,
    }


def parse_apksigner(text: str) -> dict[str, Any]:
    schemes: dict[str, bool] = {}
    for version, value in re.findall(
        r"^Verified using v([0-9]+(?:\.[0-9]+)?) scheme[^:]*:\s*(true|false)\s*$",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    ):
        schemes[f"v{version}"] = value.lower() == "true"
    certs = [
        value.lower()
        for value in re.findall(
            r"^Signer #\d+ certificate SHA-256 digest:\s*([0-9a-fA-F]+)\s*$",
            text,
            flags=re.MULTILINE,
        )
    ]
    dns = re.findall(
        r"^Signer #\d+ certificate DN:\s*(.+?)\s*$", text, flags=re.MULTILINE
    )
    if not schemes:
        raise ValueError("apksigner output did not expose signature schemes")
    if not certs:
        raise ValueError("apksigner output did not expose a signer certificate digest")
    return {
        "schemes": schemes,
        "certificate_sha256": certs,
        "certificate_dn": dns,
        "v2_or_newer": any(
            enabled
            for scheme, enabled in schemes.items()
            if scheme in {"v2", "v3", "v3.1", "v4"}
        ),
    }


def run_tool(command: list[str]) -> str:
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    combined = "\n".join(part for part in (result.stdout, result.stderr) if part)
    if result.returncode != 0:
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(command)}\n{combined[-6000:]}"
        )
    return combined


def read_body_asset(apk: Path) -> dict[str, Any]:
    with zipfile.ZipFile(apk) as archive:
        names = set(archive.namelist())
        for required in ("AndroidManifest.xml", "classes.dex", "assets/body.json"):
            if required not in names:
                raise ValueError(f"{apk.name} lacks {required}")
        return json.loads(archive.read("assets/body.json").decode("utf-8"))


def verify_delivery(
    delivery: Path,
    aapt2: Path,
    apksigner: Path,
    *,
    expected_bodies: int = EXPECTED_BODIES,
    workers: int = 8,
) -> dict[str, Any]:
    apk_root = delivery / "APKS"
    receipt_root = delivery / "RECEIPTS"
    apks = sorted(apk_root.glob("*.apk"))
    receipts = sorted(receipt_root.glob("*.json"))
    if len(apks) != expected_bodies or len(receipts) != expected_bodies:
        raise SystemExit(
            f"expected {expected_bodies} APKs and receipts, found {len(apks)} and {len(receipts)}"
        )
    if not aapt2.is_file() or not apksigner.is_file():
        raise SystemExit("aapt2 and apksigner must be explicit executable files")
    if workers < 1 or workers > 32:
        raise SystemExit("workers must be between 1 and 32")

    def verify_one(receipt_path: Path) -> dict[str, Any]:
        receipt = load_json(receipt_path)
        body_id = str(receipt["body_id"])
        apk = apk_root / f"{body_id}.apk"
        if not apk.is_file():
            raise RuntimeError(f"missing APK for {body_id}")
        if file_sha256(apk) != receipt["apk_sha256"]:
            raise RuntimeError(f"APK hash drift before provenance proof for {body_id}")

        asset = read_body_asset(apk)
        if asset.get("body", {}).get("id") != body_id:
            raise RuntimeError(f"embedded body ID mismatch for {body_id}")
        if asset.get("namespace") != receipt["namespace"]:
            raise RuntimeError(f"embedded namespace mismatch for {body_id}")
        if asset.get("identity_sha256") != receipt["identity_sha256"]:
            raise RuntimeError(f"embedded identity hash mismatch for {body_id}")

        badging = parse_aapt2_badging(
            run_tool([str(aapt2), "dump", "badging", str(apk)])
        )
        signing = parse_apksigner(
            run_tool(
                [str(apksigner), "verify", "--verbose", "--print-certs", str(apk)]
            )
        )
        expected_activity = f"{receipt['namespace']}.MainActivity"
        if badging["package"] != receipt["namespace"]:
            raise RuntimeError(
                f"compiled package mismatch for {body_id}: {badging['package']}"
            )
        if badging["launchable_activity"] != expected_activity:
            raise RuntimeError(
                f"compiled launchable activity mismatch for {body_id}: "
                f"{badging['launchable_activity']}"
            )
        if badging["min_sdk"] != 24 or badging["target_sdk"] != 35:
            raise RuntimeError(f"compiled SDK floor mismatch for {body_id}: {badging}")
        if not badging["debuggable"]:
            raise RuntimeError(f"expected an explicitly debug-signed build for {body_id}")
        if not signing["v2_or_newer"]:
            raise RuntimeError(f"APK v2-or-newer signature missing for {body_id}")

        return {
            "body_id": body_id,
            "apk_sha256": receipt["apk_sha256"],
            "identity_sha256": receipt["identity_sha256"],
            "namespace": receipt["namespace"],
            "compiled_manifest": badging,
            "signing": signing,
            "embedded_body_asset_sha256": hashlib.sha256(
                json.dumps(asset, ensure_ascii=False, sort_keys=True).encode("utf-8")
            ).hexdigest(),
        }

    entries: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=min(workers, expected_bodies)) as executor:
        futures = {executor.submit(verify_one, path): path for path in receipts}
        for completed, future in enumerate(as_completed(futures), 1):
            try:
                entry = future.result()
            except Exception as exc:
                receipt_path = futures[future]
                raise SystemExit(
                    f"APK provenance proof failed for receipt {receipt_path.name}: {exc}"
                ) from exc
            entries.append(entry)
            print(
                f"[{completed}/{expected_bodies}] "
                f"JM_ANDROID_MANIFEST_SIGNATURE_PASS:{entry['body_id']}",
                flush=True,
            )

    entries.sort(key=lambda item: item["body_id"])
    package_names = {item["compiled_manifest"]["package"] for item in entries}
    activities = {item["compiled_manifest"]["launchable_activity"] for item in entries}
    signer_digests = {
        digest
        for item in entries
        for digest in item["signing"]["certificate_sha256"]
    }
    if len(package_names) != expected_bodies or len(activities) != expected_bodies:
        raise SystemExit("compiled Android package/activity identities are not unique")

    receipt = {
        "schema": SCHEMA,
        "status": "ANDROID_100_APK_MANIFEST_AND_DEBUG_SIGNATURE_PASS",
        "body_count": expected_bodies,
        "compiled_manifest_proofs": expected_bodies,
        "embedded_body_asset_proofs": expected_bodies,
        "signed_apks": expected_bodies,
        "v2_or_newer_signed_apks": expected_bodies,
        "debuggable_apks": expected_bodies,
        "unique_compiled_packages": len(package_names),
        "unique_launchable_activities": len(activities),
        "unique_signer_certificates": len(signer_digests),
        "signer_certificate_sha256": sorted(signer_digests),
        "workers": workers,
        "entries": entries,
        "claim_boundary": (
            "All 100 APKs expose the expected compiled package/launcher/SDK identity and pass "
            "Android APK signature verification with a v2-or-newer scheme. These are debug-build "
            "signatures; release-key ownership, store publication, installation and physical-device "
            "execution remain separate gates."
        ),
    }
    write_json(delivery / "ANDROID_APK_PROVENANCE_RECEIPT.json", receipt)
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delivery", type=Path, required=True)
    parser.add_argument("--aapt2", type=Path, required=True)
    parser.add_argument("--apksigner", type=Path, required=True)
    parser.add_argument("--expected-bodies", type=int, default=EXPECTED_BODIES)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    receipt = verify_delivery(
        args.delivery.resolve(),
        args.aapt2.resolve(),
        args.apksigner.resolve(),
        expected_bodies=args.expected_bodies,
        workers=args.workers,
    )
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
