#!/usr/bin/env python3
from __future__ import annotations

import importlib
import json
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
import body_vm_factory as factory  # noqa: E402


def load_modules(package: Path):
    sdk_root = package.parent
    sys.path.insert(0, str(sdk_root))
    try:
        compiler = importlib.import_module(f"{package.name}.compiler")
        bytecode = importlib.import_module(f"{package.name}.bytecode")
        vm = importlib.import_module(f"{package.name}.vm")
        return compiler, bytecode, vm
    finally:
        sys.path.pop(0)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-body-vm-a-") as first_temp, tempfile.TemporaryDirectory(prefix="jm-body-vm-b-") as second_temp:
        first = Path(first_temp) / "generated"
        second = Path(second_temp) / "generated"
        receipt = factory.generate(ROOT, first)
        factory.generate(ROOT, second)

        assert receipt["status"] == "BODY_NATIVE_BYTECODE_VERIFIER_VM_PASS"
        assert receipt["body_count"] == 100
        assert receipt["services_per_body"] == 8
        assert receipt["service_records"] == 800
        assert receipt["commands_per_body"] == 2
        assert receipt["command_records"] == 200
        assert factory.tree_digest(first) == factory.tree_digest(second)

        package_roots = sorted(first.glob("bodies/*/sdk/jm_*"))
        assert len(package_roots) == 100
        bytecode_hashes: set[str] = set()
        opcode_hashes: set[str] = set()
        module_by_body: dict[str, tuple[object, object, object, bytes]] = {}
        cli_targets = {"cading", "quadze", "finger-two"}
        cli_proven: set[str] = set()

        for package in package_roots:
            body_root = package.parents[1]
            body_id = body_root.name
            fixture_path = body_root / "fixtures" / "proof.jmbody"
            fixture = fixture_path.read_text(encoding="utf-8")
            compiler, bytecode, vm = load_modules(package)

            compiled = bytecode.compile_source(fixture)
            assert compiled["status"] == "BYTECODE_COMPILE_PASS", (body_id, compiled)
            binary = compiled["bytecode"]
            assert binary.startswith(b"JMB1")
            verification = bytecode.verify(binary)
            assert verification["status"] == "BYTECODE_VERIFIED"
            assert verification["body_id"] == body_id
            execution = vm.execute(binary)
            assert execution["status"] == "VM_EXECUTION_PASS"
            assert execution["body_id"] == body_id
            assert execution["identity_sha256"] == compiler.PROFILE["identity_sha256"]
            assert execution["instruction_count"] == len(compiled["compile_receipt"]) * 0 + len(compiler.compile_source(fixture, "ir")["ir"]["operations"])
            assert len(execution["trace"]) == execution["instruction_count"]
            assert execution["receipt_sha256"]
            bytecode_hashes.add(verification["bytecode_sha256"])
            opcode_hashes.add(verification["opcode_table_sha256"])

            repeated = bytecode.compile_source(fixture)
            assert repeated["bytecode"] == binary
            assert vm.execute(repeated["bytecode"])["receipt_sha256"] == execution["receipt_sha256"]

            corrupted = bytearray(binary)
            corrupted[-1] ^= 0x01
            held = vm.execute(bytes(corrupted))
            assert held["status"] == "FAULT_HOLD"
            assert held["body_id"] == body_id
            assert held["fault"]
            assert held["recovery"]

            contract = json.loads((body_root / "runtime" / "vm-contract.json").read_text(encoding="utf-8"))
            manifest = json.loads((body_root / "manifest.json").read_text(encoding="utf-8"))
            project = tomllib.loads((body_root / "sdk" / "pyproject.toml").read_text(encoding="utf-8"))
            assert contract["body_id"] == body_id
            assert contract["identity_sha256"] == compiler.PROFILE["identity_sha256"]
            assert len(contract["services"]) == 8
            assert manifest["vm_state"]["opcode_table_sha256"] == contract["opcode_table_sha256"]
            assert len(project["project"]["scripts"]) == 5
            assert f"jm-{body_id}-bytecode" in project["project"]["scripts"]
            assert f"jm-{body_id}-vm" in project["project"]["scripts"]
            assert (package / "vm_core.py").is_file()
            assert (package / "bytecode.py").is_file()
            assert (package / "vm.py").is_file()
            module_by_body[body_id] = (compiler, bytecode, vm, binary)

            if body_id in cli_targets:
                binary_path = Path(first_temp) / f"{body_id}.jmbc"
                compile_receipt = Path(first_temp) / f"{body_id}.bytecode.json"
                vm_receipt = Path(first_temp) / f"{body_id}.vm.json"
                compile_process = subprocess.run(
                    [
                        sys.executable,
                        str(package / "bytecode.py"),
                        str(fixture_path),
                        "--output",
                        str(binary_path),
                        "--receipt",
                        str(compile_receipt),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=False,
                )
                assert compile_process.returncode == 0, compile_process.stderr
                assert binary_path.read_bytes() == binary
                assert json.loads(compile_receipt.read_text(encoding="utf-8"))["status"] == "BYTECODE_COMPILE_PASS"
                vm_process = subprocess.run(
                    [sys.executable, str(package / "vm.py"), str(binary_path), "--receipt", str(vm_receipt)],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=False,
                )
                assert vm_process.returncode == 0, vm_process.stderr
                assert json.loads(vm_receipt.read_text(encoding="utf-8"))["status"] == "VM_EXECUTION_PASS"
                cli_proven.add(body_id)

        assert len(bytecode_hashes) == 100
        assert len(opcode_hashes) == 100
        assert cli_proven == cli_targets

        cading_binary = module_by_body["cading"][3]
        quadze_bytecode = module_by_body["quadze"][1]
        quadze_vm = module_by_body["quadze"][2]
        wrong_verification = quadze_bytecode.verify(cading_binary)
        assert wrong_verification["status"] == "FAULT_HOLD"
        assert "BODY_ID_MISMATCH" in wrong_verification["fault"]
        wrong_execution = quadze_vm.execute(cading_binary)
        assert wrong_execution["status"] == "FAULT_HOLD"
        assert wrong_execution["body_id"] == "quadze"

        print("JM BODY VM: 100 BYTECODE COMPILERS + 100 VERIFIERS + 100 VMS + WRONG-BODY REJECTION PASS")
        print(f"TREE_SHA256={factory.tree_digest(first)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
