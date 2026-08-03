#!/usr/bin/env python3
"""Build, align, sovereign-test-sign and receipt one shard of release APK bodies."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import android_apk_provenance as provenance
import android_gradle_factory_v0_4 as factory

SCHEMA = "jm.everybody.android-release-candidate-batch/1.0"
STORE_PASSWORD = "jm-test-release-v1"
COMPILE_SDK = 35
TARGET_SDK = 35
MIN_SDK = 24


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


def run(command: list[str], *, timeout: int = 900) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if result.returncode != 0:
        combined = "\n".join(part for part in (result.stdout, result.stderr) if part)
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(command)}\n{combined[-10000:]}"
        )
    return result


def safe_dn(body_id: str) -> str:
    clean = re.sub(r"[^A-Za-z0-9_. -]+", "-", body_id)[:48]
    return f"CN=JM Test Release {clean},OU=Sovereign Body Test Keys,O=JMisJustMe,L=Nottingham,C=GB"


def set_release_version(project: Path, body_id: str, *, version_code: int = 1) -> str:
    gradle = project / "app" / "build.gradle.kts"
    text = gradle.read_text(encoding="utf-8")
    text, code_count = re.subn(
        r"versionCode\s*=\s*[0-9]+",
        f"versionCode = {version_code}",
        text,
        count=1,
    )
    version_name = f"1.0-rc{version_code}-{body_id}"
    text, name_count = re.subn(
        r'versionName\s*=\s*"[^"]+"',
        f'versionName = "{version_name}"',
        text,
        count=1,
    )
    if code_count != 1 or name_count != 1:
        raise RuntimeError(f"release version markers were not uniquely replaced for {body_id}")
    gradle.write_text(text, encoding="utf-8")
    return version_name


def build_unsigned(gradle: str, project: Path) -> Path:
    run(
        [
            gradle,
            "--no-daemon",
            "--console=plain",
            "--stacktrace",
            "-p",
            str(project),
            "clean",
            "assembleRelease",
        ]
    )
    candidates = sorted((project / "app" / "build" / "outputs" / "apk" / "release").glob("*.apk"))
    if len(candidates) != 1:
        raise RuntimeError(f"expected one release APK under {project}, found {len(candidates)}")
    return candidates[0]


def generate_key(keytool: str, keystore: Path, body_id: str) -> None:
    run(
        [
            keytool,
            "-genkeypair",
            "-noprompt",
            "-storetype",
            "PKCS12",
            "-keystore",
            str(keystore),
            "-storepass",
            STORE_PASSWORD,
            "-keypass",
            STORE_PASSWORD,
            "-alias",
            "jmrelease",
            "-keyalg",
            "RSA",
            "-keysize",
            "3072",
            "-sigalg",
            "SHA256withRSA",
            "-validity",
            "3650",
            "-dname",
            safe_dn(body_id),
        ],
        timeout=120,
    )


def align_and_sign(
    unsigned: Path,
    signed: Path,
    keystore: Path,
    *,
    zipalign: Path,
    apksigner: Path,
) -> None:
    aligned = signed.with_suffix(".aligned.apk")
    run([str(zipalign), "-f", "-p", "4", str(unsigned), str(aligned)], timeout=120)
    run(
        [
            str(apksigner),
            "sign",
            "--ks",
            str(keystore),
            "--ks-key-alias",
            "jmrelease",
            "--ks-pass",
            f"pass:{STORE_PASSWORD}",
            "--key-pass",
            f"pass:{STORE_PASSWORD}",
            "--v1-signing-enabled",
            "false",
            "--v2-signing-enabled",
            "true",
            "--v3-signing-enabled",
            "true",
            "--v4-signing-enabled",
            "false",
            "--out",
            str(signed),
            str(aligned),
        ],
        timeout=120,
    )
    aligned.unlink(missing_ok=True)


def read_body_asset(apk: Path) -> dict[str, Any]:
    with zipfile.ZipFile(apk) as archive:
        for required in ("AndroidManifest.xml", "classes.dex", "assets/body.json"):
            if required not in archive.namelist():
                raise RuntimeError(f"release APK {apk.name} lacks {required}")
        return json.loads(archive.read("assets/body.json").decode("utf-8"))


def verify_release(
    apk: Path,
    route: dict[str, Any],
    body_id: str,
    version_name: str,
    *,
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
    asset = read_body_asset(apk)
    expected_activity = f"{route['namespace']}.MainActivity"
    checks = {
        "package": badging["package"] == route["namespace"],
        "activity": badging["launchable_activity"] == expected_activity,
        "sdk": badging["min_sdk"] == MIN_SDK and badging["target_sdk"] == TARGET_SDK,
        "non_debuggable": not badging["debuggable"],
        "version_code": str(badging["version_code"]) == "1",
        "version_name": badging["version_name"] == version_name,
        "body_id": asset.get("body", {}).get("id") == body_id,
        "namespace": asset.get("namespace") == route["namespace"],
        "identity": asset.get("identity_sha256") == route["identity_sha256"],
        "v2_or_newer": bool(signing["v2_or_newer"]),
        "one_certificate": len(signing["certificate_sha256"]) == 1,
    }
    failed = sorted(key for key, passed in checks.items() if not passed)
    if failed:
        raise RuntimeError(f"release provenance failed for {body_id}: {failed}; {badging}; {signing}")
    return {
        "compiled_manifest": badging,
        "signing": signing,
        "embedded_body_asset_sha256": hashlib.sha256(
            json.dumps(asset, ensure_ascii=False, sort_keys=True).encode("utf-8")
        ).hexdigest(),
    }


def build_shard(
    repo: Path,
    out: Path,
    shard_index: int,
    shard_count: int,
    *,
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
) -> dict[str, Any]:
    if shard_count < 1 or not 0 <= shard_index < shard_count:
        raise ValueError("invalid release-candidate shard coordinates")
    gradle = shutil.which("gradle")
    keytool = shutil.which("keytool")
    if not gradle or not keytool:
        raise SystemExit("Gradle and keytool are required for release-candidate construction")
    for tool in (aapt2, apksigner, zipalign):
        if not tool.is_file():
            raise SystemExit(f"missing explicit Android release tool: {tool}")

    factory.COMPILE_SDK = COMPILE_SDK
    factory.TARGET_SDK = TARGET_SDK
    generated = out / "generated"
    if generated.exists():
        shutil.rmtree(generated)
    generated.mkdir(parents=True)
    factory.generate(repo, generated)
    projects = sorted(generated.glob("bodies/*/android-gradle"), key=lambda item: item.parent.name)
    if len(projects) != 100:
        raise SystemExit(f"expected 100 generated release projects, found {len(projects)}")
    selected = [project for index, project in enumerate(projects) if index % shard_count == shard_index]

    root = out / f"release-shard-{shard_index:02d}-of-{shard_count:02d}"
    if root.exists():
        shutil.rmtree(root)
    artifacts = root / "artifacts"
    receipts = root / "receipts"
    failures = root / "failures"
    logs = root / "logs"
    for path in (artifacts, receipts, failures, logs):
        path.mkdir(parents=True)

    passed: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix=f"jm-release-keys-{shard_index}-") as key_temp:
        key_root = Path(key_temp)
        for ordinal, project in enumerate(selected, 1):
            body_id = project.parent.name
            phase = "route_recovery"
            print(f"[{ordinal}/{len(selected)}] JM_ANDROID_RELEASE_BUILD_START:{body_id}", flush=True)
            try:
                route = json.loads((project / "jmgradle.route.json").read_text(encoding="utf-8"))
                phase = "release_version"
                version_name = set_release_version(project, body_id)
                phase = "assemble_release"
                unsigned = build_unsigned(gradle, project)
                (logs / f"{body_id}.unsigned-path.txt").write_text(str(unsigned) + "\n", encoding="utf-8")
                phase = "sovereign_test_key"
                keystore = key_root / f"{body_id}.p12"
                generate_key(keytool, keystore, body_id)
                phase = "zipalign_and_sign"
                signed = artifacts / f"{body_id}.apk"
                align_and_sign(unsigned, signed, keystore, zipalign=zipalign, apksigner=apksigner)
                phase = "release_provenance"
                verified = verify_release(
                    signed,
                    route,
                    body_id,
                    version_name,
                    aapt2=aapt2,
                    apksigner=apksigner,
                )
                certificate = verified["signing"]["certificate_sha256"][0]
                receipt = {
                    "schema": "jm.android.body-release-candidate/1.0",
                    "status": "ANDROID_RELEASE_CANDIDATE_CONSTRUCTED_SIGNED_PROVENANCE_PASS",
                    "body_id": body_id,
                    "body_name": route["body_name"],
                    "namespace": route["namespace"],
                    "identity_sha256": route["identity_sha256"],
                    "compile_sdk": COMPILE_SDK,
                    "min_sdk": MIN_SDK,
                    "target_sdk": TARGET_SDK,
                    "version_code": 1,
                    "version_name": version_name,
                    "apk": signed.name,
                    "apk_bytes": signed.stat().st_size,
                    "apk_sha256": file_sha256(signed),
                    "compiled_manifest": verified["compiled_manifest"],
                    "signing": verified["signing"],
                    "certificate_sha256": certificate,
                    "embedded_body_asset_sha256": verified["embedded_body_asset_sha256"],
                    "release_build": True,
                    "debuggable": False,
                    "private_key_retained": False,
                    "test_release_certificate": True,
                    "production_key_ownership": "OPEN",
                    "claim_boundary": (
                        "This APK is a non-debuggable release build aligned and signed with a sovereign "
                        "ephemeral test-release certificate. It proves the release-shaped route, not "
                        "production key custody, store publication or physical-device behaviour."
                    ),
                }
                write_json(receipts / f"{body_id}.json", receipt)
                passed.append(receipt)
                print(f"JM_ANDROID_RELEASE_BUILD_PASS:{body_id}:{certificate}", flush=True)
            except Exception as error:
                failure = {
                    "schema": "jm.android.body-release-candidate-faulthold/1.0",
                    "status": "ANDROID_RELEASE_CANDIDATE_FAULTHOLD",
                    "body_id": body_id,
                    "phase": phase,
                    "error_type": type(error).__name__,
                    "error": str(error),
                }
                write_json(failures / f"{body_id}.json", failure)
                failed.append(failure)
                print(f"JM_ANDROID_RELEASE_BUILD_FAIL:{body_id}:{phase}:{error}", file=sys.stderr, flush=True)

        retained = list(key_root.glob("*"))
        # Temporary keys are deliberately outside the shard output and are removed
        # by TemporaryDirectory after this receipt is written.
        generated_key_count = len(retained)

    certificates = [item["certificate_sha256"] for item in passed]
    if len(certificates) != len(set(certificates)):
        raise SystemExit("release shard did not preserve sovereign certificate uniqueness")
    batch = {
        "schema": SCHEMA,
        "status": "ANDROID_RELEASE_CANDIDATE_SHARD_PASS"
        if not failed and len(passed) == len(selected)
        else "ANDROID_RELEASE_CANDIDATE_SHARD_FAIL",
        "shard_index": shard_index,
        "shard_count": shard_count,
        "selected_body_count": len(selected),
        "built_body_count": len(passed),
        "failed_body_count": len(failed),
        "body_ids": [project.parent.name for project in selected],
        "built_body_ids": [item["body_id"] for item in passed],
        "unique_test_release_certificates": len(set(certificates)),
        "ephemeral_keys_generated": generated_key_count,
        "private_keys_in_shard_output": 0,
        "release_apks": len(list(artifacts.glob("*.apk"))),
        "non_debuggable_apks": sum(not item["debuggable"] for item in passed),
        "v2_or_newer_signed_apks": sum(item["signing"]["v2_or_newer"] for item in passed),
        "failures": failed,
        "claim_boundary": (
            "This shard proves release construction, alignment, test signing and compiled provenance. "
            "Production key custody and runtime remain separate gates."
        ),
    }
    write_json(root / "BATCH_RECEIPT.json", batch)
    print(json.dumps(batch, ensure_ascii=False, indent=2, sort_keys=True))
    return batch


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--shard-index", type=int, required=True)
    parser.add_argument("--shard-count", type=int, default=10)
    parser.add_argument("--aapt2", type=Path, required=True)
    parser.add_argument("--apksigner", type=Path, required=True)
    parser.add_argument("--zipalign", type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    receipt = build_shard(
        args.repo_root.resolve(),
        args.out.resolve(),
        args.shard_index,
        args.shard_count,
        aapt2=args.aapt2.resolve(),
        apksigner=args.apksigner.resolve(),
        zipalign=args.zipalign.resolve(),
    )
    return 0 if receipt["status"] == "ANDROID_RELEASE_CANDIDATE_SHARD_PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
