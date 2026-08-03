#!/usr/bin/env python3
"""Build one cross-runner Android release shard with public unsigned/signed evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

import android_gradle_factory_v0_4 as factory
import android_release_assurance_batch as assurance
import android_release_candidate_batch as release

SCHEMA = "jm.everybody.android-cross-runner-build/1.2"
SIGNER_DEPENDENT_PATHS = {"stamp-cert-sha256"}
SIGNER_DEPENDENT_SUFFIXES = (".SF", ".RSA", ".DSA", ".EC")
PRIVATE_SUFFIXES = assurance.PRIVATE_SUFFIXES


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def text_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalized_signed_inventory(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for entry in entries:
        path = str(entry["path"])
        upper = path.upper()
        if path in SIGNER_DEPENDENT_PATHS:
            continue
        if upper.startswith("META-INF/") and (
            upper.endswith(SIGNER_DEPENDENT_SUFFIXES) or upper.endswith("/MANIFEST.MF")
        ):
            continue
        normalized.append(entry)
    return normalized


def os_receipt(runner_label: str) -> dict[str, Any]:
    os_release_path = Path("/etc/os-release")
    os_release = os_release_path.read_text(encoding="utf-8") if os_release_path.is_file() else ""
    uname = release.run(["uname", "-a"], timeout=30).stdout.strip()
    return {
        "runner_label": runner_label,
        "runner_os": os.environ.get("RUNNER_OS", "Linux"),
        "runner_arch": os.environ.get("RUNNER_ARCH", "X64"),
        "image_os": os.environ.get("ImageOS", ""),
        "image_version": os.environ.get("ImageVersion", ""),
        "os_release": os_release.strip(),
        "os_release_sha256": text_sha256(os_release),
        "uname": uname,
        "uname_sha256": text_sha256(uname),
    }


def build_one(
    gradle: str,
    keytool: str,
    project: Path,
    body_id: str,
    root: Path,
    *,
    runner_label: str,
    runner: dict[str, Any],
    toolchain: dict[str, Any],
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
) -> dict[str, Any]:
    route = json.loads((project / "jmgradle.route.json").read_text(encoding="utf-8"))
    version_name = release.set_release_version(project, body_id, version_code=1)
    source_inventory = assurance.file_inventory(project, excluded_dirs={"build", ".gradle"})
    source_digest = assurance.inventory_digest(source_inventory)
    expected_activity = f"{route['namespace']}.MainActivity"

    with tempfile.TemporaryDirectory(prefix=f"jm-cross-runner-{body_id}-") as temporary:
        temp = Path(temporary)
        unsigned_source = release.build_unsigned(gradle, project)
        unsigned_target = root / "unsigned" / f"{body_id}.apk"
        unsigned_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(unsigned_source, unsigned_target)
        unsigned_hash = release.file_sha256(unsigned_target)
        unsigned_inventory = assurance.apk_inventory(unsigned_target)

        keystore = temp / f"{body_id}.p12"
        release.generate_key(keytool, keystore, body_id)
        signed_target = root / "signed" / f"{body_id}.apk"
        signed_target.parent.mkdir(parents=True, exist_ok=True)
        release.align_and_sign(
            unsigned_target,
            signed_target,
            keystore,
            zipalign=zipalign,
            apksigner=apksigner,
        )
        verified = release.verify_release(
            signed_target,
            route,
            body_id,
            version_name,
            aapt2=aapt2,
            apksigner=apksigner,
        )
        alignment = release.run(
            [str(zipalign), "-c", "-v", "4", str(signed_target)],
            timeout=120,
        )
        permissions_text = release.run(
            [str(aapt2), "dump", "permissions", str(signed_target)],
            timeout=120,
        ).stdout
        permissions = assurance.parse_permissions(permissions_text)
        if permissions:
            raise RuntimeError(f"unexpected permissions for {body_id}: {permissions}")
        xmltree = release.run(
            [
                str(aapt2),
                "dump",
                "xmltree",
                "--file",
                "AndroidManifest.xml",
                str(signed_target),
            ],
            timeout=120,
        ).stdout
        components = assurance.parse_components(xmltree)
        assurance.verify_exported_surface(components, expected_activity)

        signed_inventory = assurance.apk_inventory(signed_target)
        normalized_inventory = normalized_signed_inventory(signed_inventory)
        normalized_digest = assurance.inventory_digest(normalized_inventory)
        paths = [str(item["path"]) for item in signed_inventory]
        native_entries = sorted(
            path for path in paths if path.startswith("lib/") or path.lower().endswith(".so")
        )
        private_entries = sorted(
            path for path in paths if path.lower().endswith(PRIVATE_SUFFIXES)
        )
        if native_entries:
            raise RuntimeError(f"unexpected native payload for {body_id}: {native_entries}")
        if private_entries:
            raise RuntimeError(f"private key payload in signed APK for {body_id}: {private_entries}")

        receipt = {
            "schema": "jm.android.body-cross-runner-release/1.2",
            "status": "ANDROID_CROSS_RUNNER_RELEASE_BUILD_PASS",
            "runner_label": runner_label,
            "runner": runner,
            "toolchain": toolchain,
            "body_id": body_id,
            "body_name": route["body_name"],
            "namespace": route["namespace"],
            "identity_sha256": route["identity_sha256"],
            "version_code": 1,
            "version_name": version_name,
            "source_inventory_count": len(source_inventory),
            "source_inventory_sha256": source_digest,
            "unsigned_apk": unsigned_target.name,
            "unsigned_apk_bytes": unsigned_target.stat().st_size,
            "unsigned_apk_sha256": unsigned_hash,
            "unsigned_inventory_count": len(unsigned_inventory),
            "unsigned_inventory_sha256": assurance.inventory_digest(unsigned_inventory),
            "signed_apk": signed_target.name,
            "signed_apk_bytes": signed_target.stat().st_size,
            "signed_apk_sha256": release.file_sha256(signed_target),
            "certificate_sha256": verified["signing"]["certificate_sha256"][0],
            "compiled_manifest": verified["compiled_manifest"],
            "signing": verified["signing"],
            "zipalign_verified": True,
            "zipalign_output_sha256": text_sha256(alignment.stdout + alignment.stderr),
            "permissions": permissions,
            "permission_count": len(permissions),
            "permissions_dump_sha256": text_sha256(permissions_text),
            "components": components,
            "exported_components": [item for item in components if item["exported"] is True],
            "exported_component_count": sum(item["exported"] is True for item in components),
            "manifest_xmltree_sha256": text_sha256(xmltree),
            "signed_inventory_count": len(signed_inventory),
            "signed_inventory_sha256": assurance.inventory_digest(signed_inventory),
            "normalized_signed_inventory": normalized_inventory,
            "normalized_signed_inventory_count": len(normalized_inventory),
            "normalized_signed_inventory_sha256": normalized_digest,
            "signer_dependent_entries": sorted(
                set(paths) - {str(item["path"]) for item in normalized_inventory}
            ),
            "native_payload_entries": native_entries,
            "native_payload_count": len(native_entries),
            "private_key_entries": private_entries,
            "private_key_entry_count": len(private_entries),
            "private_key_retained": False,
            "production_key_ownership": "OPEN",
            "claim_boundary": (
                "This receipt proves one independent runner constructed the unsigned release body, "
                "signed it with its own ephemeral test certificate, and exposed source, manifest and "
                "APK inventories. Cross-runner equality is earned only by the paired federation."
            ),
        }
        write_json(root / "receipts" / f"{body_id}.json", receipt)

    print(
        f"JM_ANDROID_CROSS_RUNNER_BUILD_PASS:{runner_label}:{body_id}:{unsigned_hash}",
        flush=True,
    )
    return receipt


def build_shard(
    repo: Path,
    out: Path,
    shard_index: int,
    shard_count: int,
    *,
    body_id: str | None,
    runner_label: str,
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
) -> dict[str, Any]:
    if shard_count < 1 or not 0 <= shard_index < shard_count:
        raise ValueError("invalid cross-runner shard coordinates")
    gradle = shutil.which("gradle")
    keytool = shutil.which("keytool")
    if not gradle or not keytool:
        raise SystemExit("Gradle and keytool are required for cross-runner release proof")
    factory.COMPILE_SDK = 35
    factory.TARGET_SDK = 35

    generated = out / "generated"
    if generated.exists():
        shutil.rmtree(generated)
    generated.mkdir(parents=True)
    factory.generate(repo, generated)
    projects = sorted(generated.glob("bodies/*/android-gradle"), key=lambda item: item.parent.name)
    if len(projects) != 100:
        raise SystemExit(f"expected 100 generated cross-runner projects, found {len(projects)}")
    if body_id:
        selected = [project for project in projects if project.parent.name == body_id]
        if len(selected) != 1:
            raise SystemExit(f"expected one cross-runner project for {body_id}, found {len(selected)}")
    else:
        selected = [project for index, project in enumerate(projects) if index % shard_count == shard_index]

    root = out / (
        f"cross-runner-smoke-{runner_label}-{body_id}"
        if body_id
        else f"cross-runner-{runner_label}-shard-{shard_index:02d}-of-{shard_count:02d}"
    )
    if root.exists():
        shutil.rmtree(root)
    for name in ("unsigned", "signed", "receipts", "failures"):
        (root / name).mkdir(parents=True)

    runner = os_receipt(runner_label)
    toolchain = assurance.toolchain_receipt(
        gradle,
        aapt2=aapt2,
        apksigner=apksigner,
        zipalign=zipalign,
    )
    passed: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    for ordinal, project in enumerate(selected, 1):
        current_body = project.parent.name
        print(
            f"[{ordinal}/{len(selected)}] JM_ANDROID_CROSS_RUNNER_START:{runner_label}:{current_body}",
            flush=True,
        )
        try:
            passed.append(
                build_one(
                    gradle,
                    keytool,
                    project,
                    current_body,
                    root,
                    runner_label=runner_label,
                    runner=runner,
                    toolchain=toolchain,
                    aapt2=aapt2,
                    apksigner=apksigner,
                    zipalign=zipalign,
                )
            )
        except Exception as error:
            failure = {
                "schema": "jm.android.body-cross-runner-faulthold/1.2",
                "status": "ANDROID_CROSS_RUNNER_BUILD_FAULTHOLD",
                "runner_label": runner_label,
                "body_id": current_body,
                "error_type": type(error).__name__,
                "error": str(error),
            }
            write_json(root / "failures" / f"{current_body}.json", failure)
            failures.append(failure)
            print(
                f"JM_ANDROID_CROSS_RUNNER_BUILD_FAIL:{runner_label}:{current_body}:{error}",
                file=sys.stderr,
                flush=True,
            )

    private_outputs = sorted(
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and path.name.lower().endswith(PRIVATE_SUFFIXES)
    )
    if private_outputs:
        raise SystemExit(f"cross-runner output retained private material: {private_outputs}")
    certificates = [str(item["certificate_sha256"]) for item in passed]
    if len(certificates) != len(set(certificates)):
        raise SystemExit("cross-runner shard certificate identities are not unique")

    batch = {
        "schema": SCHEMA,
        "status": "ANDROID_CROSS_RUNNER_BUILD_SHARD_PASS"
        if not failures and len(passed) == len(selected)
        else "ANDROID_CROSS_RUNNER_BUILD_SHARD_FAIL",
        "runner_label": runner_label,
        "runner": runner,
        "toolchain": toolchain,
        "shard_index": shard_index,
        "shard_count": shard_count,
        "body_filter": body_id,
        "selected_body_count": len(selected),
        "passed_body_count": len(passed),
        "failed_body_count": len(failures),
        "body_ids": [project.parent.name for project in selected],
        "unsigned_apks": len(list((root / "unsigned").glob("*.apk"))),
        "signed_apks": len(list((root / "signed").glob("*.apk"))),
        "v2_or_newer_signature_proofs": sum(
            bool(item["signing"]["v2_or_newer"]) for item in passed
        ),
        "zero_permission_proofs": sum(item["permission_count"] == 0 for item in passed),
        "single_exported_launcher_proofs": sum(
            item["exported_component_count"] == 1 for item in passed
        ),
        "zero_native_payload_proofs": sum(item["native_payload_count"] == 0 for item in passed),
        "zero_private_key_entry_proofs": sum(
            item["private_key_entry_count"] == 0 for item in passed
        ),
        "unique_test_certificates": len(set(certificates)),
        "private_keys_in_output": len(private_outputs),
        "failures": failures,
    }
    write_json(root / "BATCH_RECEIPT.json", batch)
    print(json.dumps(batch, ensure_ascii=False, indent=2, sort_keys=True))
    return batch


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--runner-label", required=True)
    parser.add_argument("--shard-index", type=int, default=0)
    parser.add_argument("--shard-count", type=int, default=10)
    parser.add_argument("--body-id")
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
        body_id=args.body_id,
        runner_label=args.runner_label,
        aapt2=args.aapt2.resolve(),
        apksigner=args.apksigner.resolve(),
        zipalign=args.zipalign.resolve(),
    )
    return 0 if receipt["status"] == "ANDROID_CROSS_RUNNER_BUILD_SHARD_PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
