#!/usr/bin/env python3
"""Prove same-certificate Cading release upgrade continuity on Android."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

import android_apk_provenance as provenance
import android_emulator_runtime as runtime
import android_gradle_factory_v0_4 as factory
import android_lifecycle_endurance as lifecycle
import android_release_candidate_batch as release


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def package_version_code(adb: Path, package: str) -> int:
    text = runtime.run(
        [str(adb), "shell", "dumpsys", "package", package],
        timeout=60,
    ).stdout
    match = re.search(r"\bversionCode=([0-9]+)\b", text)
    if not match:
        raise RuntimeError(f"Android package state did not expose versionCode for {package}")
    return int(match.group(1))


def verify_signed_version(
    apk: Path,
    route: dict[str, Any],
    *,
    expected_code: int,
    expected_name: str,
    aapt2: Path,
    apksigner: Path,
) -> dict[str, Any]:
    badging = provenance.parse_aapt2_badging(
        provenance.run_tool([str(aapt2), "dump", "badging", str(apk)])
    )
    signing = provenance.parse_apksigner(
        provenance.run_tool(
            [str(apksigner), "verify", "--verbose", "--print-certs", str(apk)]
        )
    )
    expected_activity = f"{route['namespace']}.MainActivity"
    checks = {
        "package": badging["package"] == route["namespace"],
        "activity": badging["launchable_activity"] == expected_activity,
        "min_sdk": badging["min_sdk"] == 24,
        "target_sdk": badging["target_sdk"] == 35,
        "non_debuggable": not badging["debuggable"],
        "version_code": str(badging["version_code"]) == str(expected_code),
        "version_name": badging["version_name"] == expected_name,
        "v2_or_newer": bool(signing["v2_or_newer"]),
        "one_certificate": len(signing["certificate_sha256"]) == 1,
    }
    failed = sorted(key for key, passed in checks.items() if not passed)
    if failed:
        raise RuntimeError(f"release upgrade provenance failed: {failed}; {badging}; {signing}")
    return {"compiled_manifest": badging, "signing": signing}


def build_signed_version(
    gradle: str,
    project: Path,
    route: dict[str, Any],
    body_id: str,
    version_code: int,
    keystore: Path,
    target: Path,
    *,
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
) -> dict[str, Any]:
    version_name = release.set_release_version(project, body_id, version_code=version_code)
    unsigned = release.build_unsigned(gradle, project)
    release.align_and_sign(
        unsigned,
        target,
        keystore,
        zipalign=zipalign,
        apksigner=apksigner,
    )
    verified = verify_signed_version(
        target,
        route,
        expected_code=version_code,
        expected_name=version_name,
        aapt2=aapt2,
        apksigner=apksigner,
    )
    verified["version_code"] = version_code
    verified["version_name"] = version_name
    verified["apk_sha256"] = release.file_sha256(target)
    return verified


def prove(
    repo: Path,
    out: Path,
    adb: Path,
    *,
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
) -> dict[str, Any]:
    gradle = shutil.which("gradle")
    keytool = shutil.which("keytool")
    if not gradle or not keytool:
        raise SystemExit("Gradle and keytool are required for release upgrade proof")
    factory.COMPILE_SDK = 35
    factory.TARGET_SDK = 35
    generated = out / "generated"
    if generated.exists():
        shutil.rmtree(generated)
    generated.mkdir(parents=True)
    factory.generate(repo, generated)
    project = generated / "bodies" / "cading" / "android-gradle"
    if not project.is_dir():
        raise SystemExit("Cading release project was not generated")
    route = json.loads((project / "jmgradle.route.json").read_text(encoding="utf-8"))
    package = str(route["namespace"])
    activity = f"{package}.MainActivity"
    out.mkdir(parents=True, exist_ok=True)
    v1_apk = out / "cading-release-rc1.apk"
    v2_apk = out / "cading-release-rc2.apk"

    with tempfile.TemporaryDirectory(prefix="jm-cading-release-key-") as temp:
        keystore = Path(temp) / "cading.p12"
        release.generate_key(keytool, keystore, "cading")
        v1 = build_signed_version(
            gradle,
            project,
            route,
            "cading",
            1,
            keystore,
            v1_apk,
            aapt2=aapt2,
            apksigner=apksigner,
            zipalign=zipalign,
        )
        v2 = build_signed_version(
            gradle,
            project,
            route,
            "cading",
            2,
            keystore,
            v2_apk,
            aapt2=aapt2,
            apksigner=apksigner,
            zipalign=zipalign,
        )

        cert1 = v1["signing"]["certificate_sha256"][0]
        cert2 = v2["signing"]["certificate_sha256"][0]
        if cert1 != cert2:
            raise RuntimeError("Cading release upgrade certificates differ")

        runtime.run([str(adb), "uninstall", package], timeout=120, allow_failure=True)
        install1 = runtime.run([str(adb), "install", str(v1_apk)], timeout=180)
        if "Success" not in install1.stdout:
            raise RuntimeError(f"Cading release rc1 install failed: {install1.stdout}")
        if package_version_code(adb, package) != 1:
            raise RuntimeError("Cading rc1 did not register versionCode 1")
        lifecycle.clear_logcat(adb)
        contact1 = lifecycle.launch_contact(adb, package, activity, label="release_rc1_launch")
        window1 = lifecycle.scan_runtime_window(adb, package, label="release_rc1_window")

        install2 = runtime.run([str(adb), "install", "-r", str(v2_apk)], timeout=180)
        if "Success" not in install2.stdout:
            raise RuntimeError(f"Cading release rc2 upgrade failed: {install2.stdout}")
        if package_version_code(adb, package) != 2:
            raise RuntimeError("Cading rc2 did not register versionCode 2")
        lifecycle.clear_logcat(adb)
        contact2 = lifecycle.launch_contact(adb, package, activity, label="release_rc2_relaunch")
        window2 = lifecycle.scan_runtime_window(adb, package, label="release_rc2_window")

        receipt = {
            "schema": "jm.android.cading-release-upgrade/1.0",
            "status": "ANDROID_CADING_SAME_CERTIFICATE_RELEASE_UPGRADE_PASS",
            "body_id": "cading",
            "package": package,
            "activity": activity,
            "identity_sha256": route["identity_sha256"],
            "certificate_sha256": cert1,
            "release_rc1": v1,
            "release_rc2": v2,
            "rc1_install_success": True,
            "rc1_version_code_proof": 1,
            "rc1_contact": contact1,
            "rc1_fault_window": window1,
            "same_certificate_upgrade": True,
            "rc2_upgrade_install_success": True,
            "rc2_version_code_proof": 2,
            "rc2_contact": contact2,
            "rc2_fault_window": window2,
            "private_key_retained": False,
            "production_key_ownership": "OPEN",
            "claim_boundary": (
                "Cading proved an in-place non-debuggable release-candidate upgrade from versionCode 1 "
                "to 2 under one ephemeral test-release certificate on Android API 35. Production key "
                "custody, store update delivery and physical-device behaviour remain separate gates."
            ),
        }
        write_json(out / "CADING_RELEASE_UPGRADE_RECEIPT.json", receipt)

    runtime.run([str(adb), "uninstall", package], timeout=120, allow_failure=True)
    if list(out.rglob("*.p12")) or list(out.rglob("*.jks")) or list(out.rglob("*.keystore")):
        raise RuntimeError("Cading upgrade output retained private signing material")
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--adb", type=Path, required=True)
    parser.add_argument("--aapt2", type=Path, required=True)
    parser.add_argument("--apksigner", type=Path, required=True)
    parser.add_argument("--zipalign", type=Path, required=True)
    args = parser.parse_args()
    prove(
        args.repo_root.resolve(),
        args.out.resolve(),
        args.adb.resolve(),
        aapt2=args.aapt2.resolve(),
        apksigner=args.apksigner.resolve(),
        zipalign=args.zipalign.resolve(),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
