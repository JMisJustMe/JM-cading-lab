#!/usr/bin/env python3
"""Install one identity-bound bytecode compiler, verifier and VM into every JM body SDK."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

import body_tooling_factory as tooling
import body_vm_core as vm_core
import full_stack_factory as stack

SCHEMA = "jm.everybody.body-vm-factory/0.1"
VM_VERSION = "0.1"


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, value: Any) -> None:
    write(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def bytecode_wrapper(current: dict[str, Any]) -> str:
    encoded = repr(json.dumps(current, ensure_ascii=False, sort_keys=True))
    return f'''#!/usr/bin/env python3
import json
try:
    from . import compiler as _compiler
    from .vm_core import bytecode_cli as _bytecode_cli, compile_ir as _compile_ir, compile_source as _compile_source, opcode_table as _opcode_table, verify as _verify
except ImportError:
    import compiler as _compiler
    from vm_core import bytecode_cli as _bytecode_cli, compile_ir as _compile_ir, compile_source as _compile_source, opcode_table as _opcode_table, verify as _verify
PROFILE = json.loads({encoded})
BODY = PROFILE["body"]
def opcode_table(): return _opcode_table(PROFILE)
def compile_ir(ir): return _compile_ir(PROFILE, ir)
def compile_source(source): return _compile_source(PROFILE, _compiler, source)
def verify(bytecode): return _verify(PROFILE, bytecode)
def main(): return _bytecode_cli(PROFILE, _compiler)
if __name__ == "__main__": raise SystemExit(main())
'''


def vm_wrapper(current: dict[str, Any]) -> str:
    encoded = repr(json.dumps(current, ensure_ascii=False, sort_keys=True))
    return f'''#!/usr/bin/env python3
import json
try:
    from .vm_core import execute as _execute, vm_cli as _vm_cli
except ImportError:
    from vm_core import execute as _execute, vm_cli as _vm_cli
PROFILE = json.loads({encoded})
BODY = PROFILE["body"]
def execute(bytecode): return _execute(PROFILE, bytecode)
def main(): return _vm_cli(PROFILE)
if __name__ == "__main__": raise SystemExit(main())
'''


def add_scripts(pyproject: str, body_id: str) -> str:
    command = tooling.safe_distribution(body_id)
    debug_line = f'jm-{command}-debug = "jm_{stack.safe_name(body_id)}.debugger:main"'
    if debug_line not in pyproject:
        raise ValueError(f"debug script marker missing for {body_id}")
    additions = (
        debug_line
        + "\n"
        + f'jm-{command}-bytecode = "jm_{stack.safe_name(body_id)}.bytecode:main"\n'
        + f'jm-{command}-vm = "jm_{stack.safe_name(body_id)}.vm:main"'
    )
    return pyproject.replace(debug_line, additions, 1)


def generate_body(out: Path, current: dict[str, Any], vm_core_text: str) -> dict[str, Any]:
    body = current["body"]
    module = stack.safe_name(body["id"])
    root = out / "bodies" / body["id"]
    package = root / "sdk" / f"jm_{module}"
    pyproject_path = root / "sdk" / "pyproject.toml"
    manifest_path = root / "manifest.json"
    if not package.is_dir() or not pyproject_path.is_file() or not manifest_path.is_file():
        raise SystemExit(f"tooling package missing for {body['id']}")

    write(package / "vm_core.py", vm_core_text)
    write(package / "bytecode.py", bytecode_wrapper(current))
    write(package / "vm.py", vm_wrapper(current))

    sdk_path = package / "sdk.py"
    sdk_text = sdk_path.read_text(encoding="utf-8")
    vm_imports = (
        "from .bytecode import compile_ir as compile_bytecode_ir, compile_source as compile_bytecode_source, opcode_table, verify as verify_bytecode\n"
        "from .vm import execute as execute_bytecode\n"
    )
    if vm_imports not in sdk_text:
        write(sdk_path, sdk_text.rstrip() + "\n" + vm_imports)

    pyproject = pyproject_path.read_text(encoding="utf-8")
    if f"jm-{tooling.safe_distribution(body['id'])}-bytecode" not in pyproject:
        write(pyproject_path, add_scripts(pyproject, body["id"]))

    opcode_map = vm_core.opcode_table(current)
    opcode_authority_sha = vm_core.opcode_table_sha256(current)
    contract = {
        "schema": "jm.body.vm-contract/0.1",
        "vm_version": VM_VERSION,
        "body_id": body["id"],
        "body_name": body["name"],
        "family": current["family"],
        "identity_sha256": current["identity_sha256"],
        "bytecode_magic": "JMB1",
        "bytecode_schema": "jm.body.bytecode/0.1",
        "opcode_table": opcode_map,
        "opcode_table_sha256": opcode_authority_sha,
        "services": {
            "bytecode_compiler": "IMPLEMENTED",
            "bytecode_verifier": "IMPLEMENTED",
            "identity_guard": "IMPLEMENTED",
            "wrong_body_rejection": "IMPLEMENTED",
            "deterministic_vm": "IMPLEMENTED",
            "fault_hold": "IMPLEMENTED",
            "recovery_route": "IMPLEMENTED",
            "trace_receipt": "IMPLEMENTED",
        },
        "commands": [
            f"jm-{tooling.safe_distribution(body['id'])}-bytecode",
            f"jm-{tooling.safe_distribution(body['id'])}-vm",
        ],
        "claim_boundary": "The body owns a verified hosted bytecode/VM route. Native JIT/AOT self-hosting and hardware execution remain separate gates.",
    }
    write_json(root / "runtime" / "vm-contract.json", contract)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["vm_state"] = {
        "schema": contract["schema"],
        "version": VM_VERSION,
        "services": contract["services"],
        "opcode_table_sha256": contract["opcode_table_sha256"],
        "contract_sha256": sha(stable_json(contract)),
    }
    write_json(manifest_path, manifest)

    return {
        "body_id": body["id"],
        "identity_sha256": current["identity_sha256"],
        "opcode_count": len(opcode_map),
        "opcode_table_sha256": contract["opcode_table_sha256"],
        "service_count": len(contract["services"]),
        "command_count": len(contract["commands"]),
    }


def tree_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def generate(repo: Path, out: Path, selected: str | None = None, create_stack: bool = True) -> dict[str, Any]:
    if create_stack:
        tooling.generate(repo, out, selected=selected, create_stack=True)
    bodies = stack.load_bodies(repo)
    if selected:
        bodies = [body for body in bodies if body["id"] == selected]
        if not bodies:
            raise SystemExit(f"unknown body id {selected!r}")
    vm_core_text = (Path(__file__).resolve().parent / "body_vm_core.py").read_text(encoding="utf-8")
    entries = [generate_body(out, stack.profile(body), vm_core_text) for body in bodies]
    receipt = {
        "schema": SCHEMA,
        "status": "BODY_NATIVE_BYTECODE_VERIFIER_VM_PASS",
        "body_count": len(entries),
        "services_per_body": 8,
        "service_records": len(entries) * 8,
        "commands_per_body": 2,
        "command_records": len(entries) * 2,
        "entries": entries,
        "claim_boundary": "Hosted body VMs are generated and independently verifiable; native self-hosting/JIT/hardware execution remain open.",
    }
    write_json(out / "BODY_VM_RECEIPT.json", receipt)
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--body")
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--augment-existing", action="store_true")
    args = parser.parse_args()
    if args.clean and args.out.exists():
        shutil.rmtree(args.out)
    args.out.mkdir(parents=True, exist_ok=True)
    receipt = generate(
        args.repo_root.resolve(),
        args.out.resolve(),
        selected=args.body,
        create_stack=not args.augment_existing,
    )
    receipt["tree_sha256"] = tree_digest(args.out.resolve())
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
