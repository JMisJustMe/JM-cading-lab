#!/usr/bin/env python3
"""Build every release body twice and prove exact reproducibility plus inspectable surface."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import android_gradle_factory_v0_4 as factory
import android_release_candidate_batch as release

SCHEMA = "jm.everybody.android-release-assurance-batch/1.1"
PRIVATE_SUFFIXES = (".p12", ".jks", ".keystore", ".pem", ".key", ".pk8")
COMPONENT_KINDS = ("activity", "activity-alias", "service", "receiver", "provider")


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def text_sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def inventory_files(root: Path, *, exclude_dirs: set[str] | None = None) -> list[dict[str, Any]]:
    excluded = exclude_dirs or set()
    entries: list[dict[str, Any]] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        relative = path.relative_to(root)
        if any(part in excluded for part in relative.parts):
            continue
        entries.append(
            {
                "path": relative.as_posix(),
                "bytes": path.stat().st_size,
                "sha256": release.file_sha256(path),
            }
        )
    return entries


def inventory_digest(entries: list[dict[str, Any]]) -> str:
    return text_sha256(json.dumps(entries, ensure_ascii=False, sort_keys=True))


def apk_inventory(apk: Path) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    with zipfile.ZipFile(apk) as archive:
        for info in sorted(archive.infolist(), key=lambda item: item.filename):
            if info.is_dir():
                continue
            payload = archive.read(info.filename)
            entries.append(
                {
                    "path": info.filename,
                    "bytes": len(payload),
                    "compressed_bytes": info.compress_size,
                    "compression": info.compress_type,
                    "crc32": f"{info.CRC:08x}",
                    "sha256": hashlib.sha256(payload).hexdigest(),
                }
            )
    return entries


def parse_permissions(text: str) -> list[str]:
    permissions = set()
    for line in text.splitlines():
        if "uses-permission" not in line:
            continue
        match = re.search(r"name=['\"]([^'\"]+)['\"]", line)
        if match:
            permissions.add(match.group(1))
    return sorted(permissions)


def _attribute_string(block: list[str], attribute: str) -> str | None:
    for line in block:
        if f":{attribute}(" not in line:
            continue
        raw = re.search(r"Raw:\s*['\"]([^'\"]+)['\"]", line)
        if raw:
            return raw.group(1)
        quoted = re.search(r"=['\"]([^'\"]+)['\"]", line)
        if quoted:
            return quoted.group(1)
    return None


def _exported_value(block: list[str]) -> bool | None:
    for line in block:
        if ":exported(" not in line:
            continue
        lowered = line.lower()
        if "=true" in lowered or "0xffffffff" in lowered:
            return True
        if "=false" in lowered or re.search(r"(?:\)|=)0x0(?:\s|$)", lowered):
            return False
    return None


def parse_exported_components(text: str) -> list[dict[str, Any]]:
    lines = text.splitlines()
    components: list[dict[str, Any]] = []
    element_pattern = re.compile(
        r"^(\s*)E:\s*(activity|activity-alias|service|receiver|provider)\b"
    )
    any_element_pattern = re.compile(r"^(\s*)E:\s*")
    for index, line in enumerate(lines):
        match = element_pattern.match(line)
        if not match:
            continue
        indent = len(match.group(1))
        block = [line]
        for later in lines[index + 1 :]:
            element = any_element_pattern.match(later)
            if element and len(element.group(1)) <= indent:
                break
            block.append(later)
        components.append(
            {
                "kind": match.group(2),
                "name": _attribute_string(block, "name"),
                "exported": _exported_value(block),
                "permission": _attribute_string(block, "permission"),
            }
        )
    return components


def verify_exported_surface(
    components: list[dict[str, Any]],
    expected_activity: str,
) -> None:
    exported = [item for item in components if item["exported"] is True]
    if len(exported) != 1:
        raise RuntimeError(f"expected one exported component, recovered {exported}")
    component = exported[0]
    if component["kind"] != "activity" or component["name"] != expected_activity:
        raise RuntimeError(
            f"unexpected exported component: expected activity {expected_activity}, got {component}"
        )


def toolchain_receipt(
    gradle: str,
    *,
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
) -> dict[str, Any]:
    gradle_version = release.run([gradle, "--version"], timeout=120).stdout
    java_version_result = release.run(["java", "-version"], timeout=120)
    java_version = "\n".join(
        part for part in (java_version_result.stdout, java_version_result.stderr) if part
    )
    aapt2_version = release.run([str(aapt2), "version"], timeout=120).stdout
    apksigner_version = release.run([str(apksigner), "version"], timeout=120).stdout
    return {
        "gradle_version_sha256": text_sha256(gradle_version),
        "gradle_version": gradle_version.strip(),
        "java_version_sha256": text_sha256(java_version),
        "java_version": java_version.strip(),
        "aapt2_version": aapt2_version.strip(),
        "aapt2_sha256": release.file_sha256(aapt2),
        "apksigner_version": apksigner_version.strip(),
        "apksigner_sha256": release.file_sha256(apksigner),
        "zipalign_sha256": release.file_sha256(zipalign),
        "compile_sdk": release.COMPILE_SDK,
        "min_sdk": release.MIN_SDK,
        "target_sdk": release.TARGET_SDK,
    }


def build_unsigned_copy(gradle: str, project: Path, target: Path) -> None:
    source = release.build_unsigned(gradle, project)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def prove_one(
    gradle: str,
    keytool: str,
    project: Path,
    body_id: str,
    artifacts: Path,
    receipts: Path,
    *,
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
    toolchain: dict[str, Any],
) -> dict[str, Any]:
    route = json.loads((project / "jmgradle.route.json").read_text(encoding="utf-8"))
    version_name = release.set_release_version(project, body_id, version_code=1)
    source_files = inventory_files(project, exclude_dirs={"build", ".gradle"})
    source_digest = inventory_digest(source_files)
    expected_activity = f"{route['namespace']}.MainActivity"

    with tempfile.TemporaryDirectory(prefix=f"jm-assurance-{body_id}-") as temporary:
        temp = Path(temporary)
        keystore = temp / f"{body_id}.p12"
        release.generate_key(keytool, keystore, body_id)

        unsigned_a = temp / "unsigned-a.apk"
        unsigned_b = temp / "unsigned-b.apk"
        build_unsigned_copy(gradle, project, unsigned_a)
        build_unsigned_copy(gradle, project, unsigned_b)
        unsigned_a_hash = release.file_sha256(unsigned_a)
        unsigned_b_hash = release.file_sha256(unsigned_b)
        if unsigned_a_hash != unsigned_b_hash:
            raise RuntimeError(
                f"unsigned release reproducibility drift for {body_id}: "
                f"{unsigned_a_hash} != {unsigned_b_hash}"
            )

        signed_a = temp / "signed-a.apk"
        signed_b = temp / "signed-b.apk"
        release.align_and_sign(
            unsigned_a,
            signed_a,
            keystore,
            zipalign=zipalign,
            apksigner=apksigner,
        )
        release.align_and_sign(
            unsigned_b,
            signed_b,
            keystore,
            zipalign=zipalign,
            apksigner=apksigner,
        )
        signed_a_hash = release.file_sha256(signed_a)
        signed_b_hash = release.file_sha256(signed_b)
        if signed_a_hash != signed_b_hash:
            raise RuntimeError(
                f"same-key signed release reproducibility drift for {body_id}: "
                f"{signed_a_hash} != {signed_b_hash}"
            )

        verified = release.verify_release(
            signed_a,
            route,
            body_id,
            version_name,
            aapt2=aapt2,
            apksigner=apksigner,
        )
        alignment = release.run(
            [str(zipalign), "-c", "-v", "4", str(signed_a)],
            timeout=120,
        )
        permissions_text = release.run(
            [str(aapt2), "dump", "permissions", str(signed_a)],
            timeout=120,
        ).stdout
        permissions = parse_permissions(permissions_text)
        if permissions:
            raise RuntimeError(f"unexpected Android permissions for {body_id}: {permissions}")
        xmltree = release.run(
            [
                str(aapt2),
                "dump",
                "xmltree",
                "--file",
                "AndroidManifest.xml",
                str(signed_a),
            ],
            timeout=120,
        ).stdout
        components = parse_exported_components(xmltree)
        verify_exported_surface(components, expected_activity)

        entries_a = apk_inventory(signed_a)
        entries_b = apk_inventory(signed_b)
        if entries_a != entries_b:
            raise RuntimeError(f"signed APK entry inventory drift for {body_id}")
        paths = [item["path"] for item in entries_a]
        native_entries = sorted(
            path for path in paths if path.startswith("lib/") or path.lower().endswith(".so")
        )
        private_entries = sorted(
            path for path in paths if path.lower().endswith(PRIVATE_SUFFIXES)
        )
        required_entries = {"AndroidManifest.xml", "classes.dex", "resources.arsc", "assets/body.json"}
        missing_required = sorted(required_entries - set(paths))
        if native_entries:
            raise RuntimeError(f"unexpected native payload for {body_id}: {native_entries}")
        if private_entries:
            raise RuntimeError(f"private key material inside APK for {body_id}: {private_entries}")
        if missing_required:
            raise RuntimeError(f"release APK lacks required inventory for {body_id}: {missing_required}")

        canonical = artifacts / f"{body_id}.apk"
        shutil.copy2(signed_a, canonical)
        certificate = verified["signing"]["certificate_sha256"][0]
        receipt = {
            "schema": "jm.android.body-release-assurance/1.1",
            "status": "ANDROID_EXACT_RELEASE_REPRODUCIBILITY_AND_SURFACE_PASS",
            "body_id": body_id,
            "body_name": route["body_name"],
            "namespace": route["namespace"],
            "identity_sha256": route["identity_sha256"],
            "version_code": 1,
            "version_name": version_name,
            "source_inventory": source_files,
            "source_inventory_count": len(source_files),
            "source_inventory_sha256": source_digest,
            "toolchain": toolchain,
            "unsigned_build_a_sha256": unsigned_a_hash,
            "unsigned_build_b_sha256": unsigned_b_hash,
            "unsigned_byte_reproducible": True,
            "signed_build_a_sha256": signed_a_hash,
            "signed_build_b_sha256": signed_b_hash,
            "same_key_signed_byte_reproducible": True,
            "canonical_apk": canonical.name,
            "canonical_apk_bytes": canonical.stat().st_size,
            "canonical_apk_sha256": signed_a_hash,
            "certificate_sha256": certificate,
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
            "apk_inventory": entries_a,
            "apk_inventory_count": len(entries_a),
            "apk_inventory_sha256": inventory_digest(entries_a),
            "native_payload_entries": native_entries,
            "native_payload_count": len(native_entries),
            "private_key_entries": private_entries,
            "private_key_entry_count": len(private_entries),
            "private_key_retained": False,
            "production_key_ownership": "OPEN",
            "claim_boundary": (
                "Two clean Gradle release builds were byte-identical before signing and remained "
                "byte-identical after same-key alignment/signing on one runner/toolchain. The receipt "
                "also proves the compiled manifest surface, zero permissions, one exported launcher, "
                "APK inventory, zero native payload and zero private-key material. Cross-runner, "
                "cross-OS, production-key and store reproducibility remain separate gates."
            ),
        }
        write_json(receipts / f"{body_id}.json", receipt)

    if any(artifacts.rglob(f"{body_id}*{suffix}")) for suffix in ():
        raise AssertionError("unreachable")
    print(f"JM_ANDROID_RELEASE_ASSURANCE_PASS:{body_id}:{signed_a_hash}", flush=True)
    return receipt


def build_shard(
    repo: Path,
    out: Path,
    shard_index: int,
    shard_count: int,
    *,
    body_id: str | None,
    aapt2: Path,
    apksigner: Path,
    zipalign: Path,
) -> dict[str, Any]:
    if shard_count < 1 or not 0 <= shard_index < shard_count:
        raise ValueError("invalid release-assurance shard coordinates")
    gradle = shutil.which("gradle")
    keytool = shutil.which("keytool")
    if not gradle or not keytool:
        raise SystemExit("Gradle and keytool are required for release assurance")
    for tool in (aapt2, apksigner, zipalign):
        if not tool.is_file():
            raise SystemExit(f"missing Android assurance tool: {tool}")

    factory.COMPILE_SDK = 35
    factory.TARGET_SDK = 35
    generated = out / "generated"
    if generated.exists():
        shutil.rmtree(generated)
    generated.mkdir(parents=True)
    factory.generate(repo, generated)
    projects = sorted(generated.glob("bodies/*/android-gradle"), key=lambda item: item.parent.name)
    if len(projects) != 100:
        raise SystemExit(f"expected 100 generated assurance projects, found {len(projects)}")
    if body_id:
        selected = [project for project in projects if project.parent.name == body_id]
        if len(selected) != 1:
            raise SystemExit(f"expected one assurance project for {body_id}, found {len(selected)}")
    else:
        selected = [project for index, project in enumerate(projects) if index % shard_count == shard_index]

    root = out / f"assurance-shard-{shard_index:02d}-of-{shard_count:02d}"
    if body_id:
        root = out / f"assurance-smoke-{body_id}"
    if root.exists():
        shutil.rmtree(root)
    artifacts = root / "artifacts"
    receipts = root / "receipts"
    failures = root / "failures"
    for path in (artifacts, receipts, failures):
        path.mkdir(parents=True)
    toolchain = toolchain_receipt(
        gradle,
        aapt2=aapt2,
        apksigner=apksigner,
        zipalign=zipalign,
    )

    passed: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    for ordinal, project in enumerate(selected, 1):
        current_body = project.parent.name
        print(f"[{ordinal}/{len(selected)}] JM_ANDROID_RELEASE_ASSURANCE_START:{current_body}", flush=True)
        try:
            passed.append(
                prove_one(
                    gradle,
                    keytool,
                    project,
                    current_body,
                    artifacts,
                    receipts,
                    aapt2=aapt2,
                    apksigner=apksigner,
                    zipalign=zipalign,
                    toolchain=toolchain,
                )
            )
        except Exception as error:
            failure = {
                "schema": "jm.android.body-release-assurance-faulthold/1.1",
                "status": "ANDROID_RELEASE_ASSURANCE_FAULTHOLD",
                "body_id": current_body,
                "error_type": type(error).__name__,
                "error": str(error),
            }
            write_json(failures / f"{current_body}.json", failure)
            failed.append(failure)
            print(f"JM_ANDROID_RELEASE_ASSURANCE_FAIL:{current_body}:{error}", file=sys.stderr, flush=True)

    private_outputs = sorted(
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and path.name.lower().endswith(PRIVATE_SUFFIXES)
    )
    if private_outputs:
        raise SystemExit(f"release assurance output retained private material: {private_outputs}")
    certificates = [item["certificate_sha256"] for item in passed]
    if len(certificates) != len(set(certificates)):
        raise SystemExit("release assurance shard certificate identities are not unique")
    batch = {
        "schema": SCHEMA,
        "status": "ANDROID_RELEASE_ASSURANCE_SHARD_PASS"
        if not failed and len(passed) == len(selected)
        else "ANDROID_RELEASE_ASSURANCE_SHARD_FAIL",
        "shard_index": shard_index,
        "shard_count": shard_count,
        "body_filter": body_id,
        "selected_body_count": len(selected),
        "passed_body_count": len(passed),
        "failed_body_count": len(failed),
        "body_ids": [project.parent.name for project in selected],
        "unsigned_byte_reproducibility_proofs": sum(item["unsigned_byte_reproducible"] for item in passed),
        "signed_byte_reproducibility_proofs": sum(
            item["same_key_signed_byte_reproducible"] for item in passed
        ),
        "zipalign_proofs": sum(item["zipalign_verified"] for item in passed),
        "zero_permission_proofs": sum(item["permission_count"] == 0 for item in passed),
        "single_exported_launcher_proofs": sum(
            item["exported_component_count"] == 1 for item in passed
        ),
        "zero_native_payload_proofs": sum(item["native_payload_count"] == 0 for item in passed),
        "zero_private_key_entry_proofs": sum(
            item["private_key_entry_count"] == 0 for item in passed
        ),
        "software_inventory_receipts": len(passed),
        "unique_test_release_certificates": len(set(certificates)),
        "private_keys_in_output": len(private_outputs),
        "toolchain": toolchain,
        "failures": failed,
        "claim_boundary": (
            "This shard proves exact two-build reproducibility and inspectable release surfaces on one "
            "runner/toolchain. Cross-runner and production-signing reproducibility remain open."
        ),
    }
    write_json(root / "BATCH_RECEIPT.json", batch)
    print(json.dumps(batch, ensure_ascii=False, indent=2, sort_keys=True))
    return batch


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
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
        aapt2=args.aapt2.resolve(),
        apksigner=args.apksigner.resolve(),
        zipalign=args.zipalign.resolve(),
    )
    return 0 if receipt["status"] == "ANDROID_RELEASE_ASSURANCE_SHARD_PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
