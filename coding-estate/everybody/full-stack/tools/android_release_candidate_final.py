#!/usr/bin/env python3
"""Bind release provenance, 100-body runtime and Cading upgrade into one v1.0 receipt."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def finalize(
    release_master_path: Path,
    release_provenance_path: Path,
    runtime_path: Path,
    upgrade_path: Path,
    out: Path,
) -> dict[str, Any]:
    construction = load_json(release_master_path)
    provenance = load_json(release_provenance_path)
    runtime = load_json(runtime_path)
    upgrade = load_json(upgrade_path)

    if construction["status"] != "ANDROID_100_RELEASE_CANDIDATE_CONSTRUCTION_PROVENANCE_PASS":
        raise SystemExit("release construction master did not pass")
    if provenance["status"] != "ANDROID_100_RELEASE_CANDIDATE_PROVENANCE_PASS":
        raise SystemExit("release provenance did not pass")
    if runtime["status"] != "ANDROID_100_EMULATOR_INSTALL_LAUNCH_FORCE_STOP_REOPEN_FEDERATION_PASS":
        raise SystemExit("release runtime federation did not pass")
    if upgrade["status"] != "ANDROID_CADING_SAME_CERTIFICATE_RELEASE_UPGRADE_PASS":
        raise SystemExit("Cading same-certificate release upgrade did not pass")

    release_entries = {str(item["body_id"]): item for item in provenance["entries"]}
    runtime_entries = {str(item["body_id"]): item for item in runtime["entries"]}
    if len(release_entries) != 100 or len(runtime_entries) != 100:
        raise SystemExit("release/runtime federation did not expose 100 unique entries")
    if set(release_entries) != set(runtime_entries):
        raise SystemExit("release and runtime body sets differ")

    combined: list[dict[str, Any]] = []
    for body_id in sorted(release_entries):
        release_entry = release_entries[body_id]
        runtime_entry = runtime_entries[body_id]
        package = str(release_entry["compiled_manifest"]["package"])
        checks = {
            "apk_hash": release_entry["apk_sha256"] == runtime_entry["apk_sha256"],
            "identity": release_entry["identity_sha256"] == runtime_entry["identity_sha256"],
            "package": package == runtime_entry["package"],
            "release": bool(release_entry["release_build"]),
            "non_debuggable": not bool(release_entry["debuggable"]),
            "signature": bool(release_entry["signing"]["v2_or_newer"]),
            "runtime_faults": not runtime_entry.get("runtime_faults"),
            "force_stop": bool(runtime_entry["force_stop_exit_proof"]),
        }
        failed = sorted(key for key, passed in checks.items() if not passed)
        if failed:
            raise SystemExit(f"release/runtime cross-check failed for {body_id}: {failed}")
        combined.append(
            {
                "body_id": body_id,
                "package": package,
                "apk_sha256": release_entry["apk_sha256"],
                "identity_sha256": release_entry["identity_sha256"],
                "certificate_sha256": release_entry["certificate_sha256"],
                "compiled_manifest": release_entry["compiled_manifest"],
                "signing": release_entry["signing"],
                "install_success": runtime_entry["install_success"],
                "first_launch": runtime_entry["first_launch"],
                "force_stop_exit_proof": runtime_entry["force_stop_exit_proof"],
                "relaunch": runtime_entry["relaunch"],
                "runtime_faults": runtime_entry["runtime_faults"],
            }
        )

    certificates = {item["certificate_sha256"] for item in combined}
    packages = {item["package"] for item in combined}
    if len(certificates) != 100 or len(packages) != 100:
        raise SystemExit("release federation lost sovereign certificate/package uniqueness")
    if construction["private_keys_in_delivery"] != 0 or provenance["private_keys_in_delivery"] != 0:
        raise SystemExit("release federation claims private key material in delivery")
    if upgrade["private_key_retained"]:
        raise SystemExit("Cading upgrade receipt retained a private key")

    receipt = {
        "schema": "jm.everybody.android-release-candidate-final/1.0",
        "status": "ANDROID_100_RELEASE_CANDIDATE_BUILD_SIGN_RUNTIME_UPGRADE_FEDERATION_PASS",
        "body_count": 100,
        "release_apks": 100,
        "non_debuggable_apks": 100,
        "v2_or_newer_signed_apks": 100,
        "unique_packages": len(packages),
        "unique_sovereign_test_certificates": len(certificates),
        "private_keys_in_delivery": 0,
        "install_proofs": 100,
        "first_launch_proofs": 100,
        "force_stop_exit_proofs": 100,
        "relaunch_proofs": 100,
        "runtime_fault_free_proofs": 100,
        "cading_same_certificate_upgrade": True,
        "cading_upgrade_from_version_code": 1,
        "cading_upgrade_to_version_code": 2,
        "production_key_ownership": "OPEN",
        "entries": combined,
        "cading_upgrade": upgrade,
        "claim_boundary": (
            "All 100 bodies produced non-debuggable release APKs, retained compiled identity, passed "
            "Android v2-or-newer signing under unique ephemeral test-release certificates, installed, "
            "launched, force-stopped and reopened on API 35. Cading also upgraded in place from "
            "versionCode 1 to 2 under one test certificate. Production key custody, Play Store "
            "publication and physical-device behaviour remain separate gates."
        ),
    }
    write_json(out / "JM_ANDROID_100_RELEASE_CANDIDATE_FINAL_RECEIPT.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-master", type=Path, required=True)
    parser.add_argument("--release-provenance", type=Path, required=True)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--upgrade", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    finalize(
        args.release_master.resolve(),
        args.release_provenance.resolve(),
        args.runtime.resolve(),
        args.upgrade.resolve(),
        args.out.resolve(),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
