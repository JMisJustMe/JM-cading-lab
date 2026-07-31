#!/usr/bin/env python3
"""Generate 100 body-authored kernel personalities and one identity-safe container.

This stage is deliberately bounded. It proves that every kernel personality is
produced from body-native source through that body's compiler namespace. It does
not claim a QEMU boot Ding; separate boot images remain the next machine gate.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

EXPECTED_BODY_COUNT = 100
FACTORY_VERSION = "0.1"


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def tree_digest(path: Path) -> str:
    digest = hashlib.sha256()
    for item in sorted(candidate for candidate in path.rglob("*") if candidate.is_file()):
        digest.update(item.relative_to(path).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(item.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, value: Any) -> None:
    write(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def load_compiler(path: Path, module_name: str):
    package_dir = path.parent
    sys.path.insert(0, str(package_dir))
    try:
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"cannot load compiler {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.pop(0)


def body_kernel_source(manifest: dict[str, Any]) -> str:
    body = manifest["body"]
    selected: list[str] = []
    for command in [
        *manifest.get("required_any", []),
        *manifest.get("family_commands", []),
        *manifest.get("capability_commands", []),
    ]:
        if command not in selected and command not in {"LAW", "TRACE", "DING"}:
            selected.append(command)
        if len(selected) == 3:
            break
    if not selected:
        raise RuntimeError(f"body {body['id']} has no body-specific kernel commands")

    lines = [
        f'NATIVE {body["id"]} {manifest["native_version"]}',
        f'LAW {json.dumps(body["law"], ensure_ascii=False)}',
    ]
    for ordinal, command in enumerate(selected, 1):
        lines.append(
            f'{command} '
            + json.dumps(
                {
                    "kernel_body": body["id"],
                    "kernel_name": body["name"],
                    "operation": command,
                    "ordinal": ordinal,
                    "route": "sovereign-kernel-personality",
                },
                ensure_ascii=False,
            )
        )
    lines.extend(
        [
            "TRACE "
            + json.dumps(
                {
                    "body": body["id"],
                    "law_sha256": manifest["law_sha256"],
                    "stage": "BODY_AUTHORED_KERNEL_PERSONALITY",
                },
                ensure_ascii=False,
            ),
            "DING "
            + json.dumps(
                {
                    "body": body["id"],
                    "status": "BODY_AUTHORED_KERNEL_PERSONALITY_PASS_NOT_QEMU_DING",
                },
                ensure_ascii=False,
            ),
            "END",
        ]
    )
    return "\n".join(lines) + "\n"


def personality_wrapper(manifest: dict[str, Any], compile_receipt: dict[str, Any]) -> str:
    body = manifest["body"]
    symbol = "".join(character if character.isalnum() else "_" for character in body["id"]).strip("_")
    if symbol and symbol[0].isdigit():
        symbol = f"body_{symbol}"
    return f'''/* JM sovereign kernel personality. Separate boot image not yet claimed. */
#include <stddef.h>
#define JM_KERNEL_BODY_ID {json.dumps(body["id"])}
#define JM_KERNEL_BODY_NAME {json.dumps(body["name"], ensure_ascii=False)}
#define JM_KERNEL_BODY_LAW_SHA256 {json.dumps(manifest["law_sha256"])}
#define JM_KERNEL_BODY_IR_SHA256 {json.dumps(compile_receipt["ir_sha256"])}
#define JM_KERNEL_BODY_SOURCE_SHA256 {json.dumps(compile_receipt["source_sha256"])}
struct jm_{symbol}_kernel_personality {{
    const char *body_id;
    const char *body_name;
    const char *law_sha256;
    const char *ir_sha256;
    const char *source_sha256;
    size_t operation_count;
}};
static const struct jm_{symbol}_kernel_personality jm_{symbol}_personality = {{
    JM_KERNEL_BODY_ID,
    JM_KERNEL_BODY_NAME,
    JM_KERNEL_BODY_LAW_SHA256,
    JM_KERNEL_BODY_IR_SHA256,
    JM_KERNEL_BODY_SOURCE_SHA256,
    {compile_receipt["operation_count"]}u
}};
const void *jm_{symbol}_kernel_personality(void) {{ return &jm_{symbol}_personality; }}
size_t jm_{symbol}_kernel_operation_count(void) {{ return jm_{symbol}_personality.operation_count; }}
'''


def generate(full_stack_root: Path, out: Path) -> dict[str, Any]:
    body_roots = sorted(path for path in (full_stack_root / "bodies").iterdir() if path.is_dir())
    if len(body_roots) != EXPECTED_BODY_COUNT:
        raise SystemExit(f"expected {EXPECTED_BODY_COUNT} generated bodies, found {len(body_roots)}")

    entries: list[dict[str, Any]] = []
    for index, body_root in enumerate(body_roots):
        manifest_path = body_root / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        body = manifest["body"]
        body_id = body["id"]
        if body_root.name != body_id:
            raise SystemExit(f"body directory mismatch: {body_root.name} != {body_id}")

        compiler_paths = list(body_root.glob("sdk/jm_*/compiler.py"))
        if len(compiler_paths) != 1:
            raise SystemExit(f"body {body_id} must have exactly one compiler package")
        compiler_path = compiler_paths[0]
        compiler_text = compiler_path.read_text(encoding="utf-8")
        compiler_sha256 = sha_text(compiler_text)
        compiler_namespace = compiler_path.parent.name
        compiler = load_compiler(compiler_path, f"jm_sovereign_kernel_compiler_{index}")

        source = body_kernel_source(manifest)
        result = compiler.compile_source(source, "c")
        if not result["ok"]:
            raise SystemExit(f"body-authored kernel source failed for {body_id}: {result['diagnostics']}")
        if result["receipt"]["body_id"] != body_id:
            raise SystemExit(f"compiler/body mismatch for {body_id}")
        if result["ir"]["namespace"] != f"jm.body.{body_id}":
            raise SystemExit(f"IR namespace mismatch for {body_id}")

        kernel_root = out / "kernels" / body_id
        source_path = kernel_root / "source" / f"{body_id}.kernel.jmbody"
        generated_c_path = kernel_root / "generated" / f"{body_id}.kernel.body.c"
        personality_path = kernel_root / "generated" / f"{body_id}.kernel.personality.c"
        write(source_path, source)
        write(generated_c_path, result["output"])
        personality = personality_wrapper(manifest, result["receipt"])
        write(personality_path, personality)

        receipt = {
            "schema": "jm.everybody.sovereign-kernel-personality-receipt/0.1",
            "status": "BODY_AUTHORED_KERNEL_PERSONALITY_PASS_NOT_QEMU_DING",
            "body_id": body_id,
            "body_name": body["name"],
            "body_kind": body["kind"],
            "body_family": manifest["family"],
            "compiler_namespace": compiler_namespace,
            "compiler_sha256": compiler_sha256,
            "body_ir_namespace": result["ir"]["namespace"],
            "identity_sha256": manifest["identity_sha256"],
            "law_sha256": manifest["law_sha256"],
            "source_sha256": result["receipt"]["source_sha256"],
            "ir_sha256": result["receipt"]["ir_sha256"],
            "generated_body_c_sha256": result["receipt"]["output_sha256"],
            "personality_c_sha256": sha_text(personality),
            "operation_count": result["receipt"]["operation_count"],
            "machine_state": "SEPARATE_BOOT_IMAGE_OPEN",
            "qemu_state": "OPEN",
            "claim_boundary": "Body-native source compiled through the matching body compiler; no separate QEMU boot Ding claimed.",
        }
        write_json(kernel_root / "KERNEL_PERSONALITY_RECEIPT.json", receipt)
        entries.append(receipt)

    body_ids = [entry["body_id"] for entry in entries]
    compiler_namespaces = [entry["compiler_namespace"] for entry in entries]
    compiler_hashes = [entry["compiler_sha256"] for entry in entries]
    source_hashes = [entry["source_sha256"] for entry in entries]
    personality_hashes = [entry["personality_c_sha256"] for entry in entries]
    for label, values in (
        ("body IDs", body_ids),
        ("compiler namespaces", compiler_namespaces),
        ("compiler hashes", compiler_hashes),
        ("source hashes", source_hashes),
        ("personality hashes", personality_hashes),
    ):
        if len(set(values)) != EXPECTED_BODY_COUNT:
            raise SystemExit(f"expected {EXPECTED_BODY_COUNT} unique {label}, got {len(set(values))}")

    container = {
        "schema": "jm.everykernel.one-container/0.1",
        "name": "JM EveryKernel OneContainer",
        "factory_version": FACTORY_VERSION,
        "kernel_count": len(entries),
        "kernel_ids": body_ids,
        "entries": entries,
        "laws": [
            "one_hundred_separate_kernel_targets",
            "one_body_native_source_route_per_kernel",
            "matching_body_compiler_required",
            "one_container_above_not_instead_of_kernels",
            "shared_machine_glue_does_not_transfer_source_authority",
            "no_qemu_ding_from_generated_source_alone",
        ],
        "next_machine_gate": "GENERATE_100_SEPARATE_BOOT_IMAGES_AND_RUN_QEMU_MATRIX",
    }
    write_json(out / "JM_EVERYKERNEL_ONE_CONTAINER.json", container)
    write_json(
        out / "BUILD_RECEIPT.json",
        {
            "schema": "jm.everykernel.one-container-build-receipt/0.1",
            "status": "100_BODY_AUTHORED_KERNEL_PERSONALITIES_PASS",
            "kernel_count": len(entries),
            "container_sha256": sha_text(stable_json(container)),
            "tree_sha256": "CALCULATED_AFTER_WRITE",
            "qemu_state": "OPEN_PER_KERNEL",
            "claim_boundary": "One hundred separate body-authored kernel personalities generated; separate boot-image and QEMU proof remains open.",
        },
    )
    receipt_path = out / "BUILD_RECEIPT.json"
    build_receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    build_receipt["tree_sha256"] = tree_digest(out)
    write_json(receipt_path, build_receipt)
    return container


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate 100 sovereign kernel personalities and one JM container.")
    parser.add_argument("--full-stack-root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()
    full_stack_root = args.full_stack_root.resolve()
    out = args.out.resolve()
    if args.clean and out.exists():
        shutil.rmtree(out)
    container = generate(full_stack_root, out)
    print(
        json.dumps(
            {
                "status": "100_BODY_AUTHORED_KERNEL_PERSONALITIES_PASS",
                "kernel_count": container["kernel_count"],
                "out": str(out),
                "tree_sha256": tree_digest(out),
                "qemu_state": "OPEN_PER_KERNEL",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
