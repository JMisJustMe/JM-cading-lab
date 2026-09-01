#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
import full_stack_factory as factory  # noqa: E402


def load_compiler(path: Path, index: int):
    package_dir = path.parent
    sys.path.insert(0, str(package_dir))
    try:
        spec = importlib.util.spec_from_file_location(f"jm_generated_compiler_{index}", path)
        if spec is None or spec.loader is None:
            raise AssertionError(f"cannot load compiler {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.pop(0)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-everybody-full-stack-a-") as first_temp, tempfile.TemporaryDirectory(prefix="jm-everybody-full-stack-b-") as second_temp:
        first = Path(first_temp) / "generated"
        second = Path(second_temp) / "generated"

        federation = factory.generate(ROOT, first)
        factory.generate(ROOT, second)

        assert federation["body_count"] == 100
        assert len(federation["body_ids"]) == 100
        assert len(set(federation["body_ids"])) == 100
        assert factory.tree_digest(first) == factory.tree_digest(second)

        required_ids = {"cading", "quadze", "recorp", "routeos", "jmlogic", "flowtalk", "kading", "kocodifying", "formeula", "cadenvm", "wakeforge"}
        missing = required_ids.difference(federation["body_ids"])
        assert not missing, f"required named bodies missing: {sorted(missing)}"

        cc = shutil.which("cc")
        compilers = sorted(first.glob("bodies/*/sdk/jm_*/compiler.py"))
        assert len(compilers) == 100

        receipts = []
        for index, compiler_path in enumerate(compilers):
            body_root = compiler_path.parents[2]
            body_id = body_root.name
            fixture_path = body_root / "fixtures" / "proof.jmbody"
            manifest_path = body_root / "manifest.json"
            kernel_source = body_root / "kernel" / "body_kernel_office.c"
            kernel_blueprint = body_root / "kernel" / "body_kernel.jmroute"
            routeos_profile = body_root / "kernel" / "routeos-body-profile.json"
            interop = body_root / "interop" / "contract.json"

            for required_path in (fixture_path, manifest_path, kernel_source, kernel_blueprint, routeos_profile, interop):
                assert required_path.is_file(), f"missing generated organ: {required_path}"

            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            assert manifest["body"]["id"] == body_id
            assert manifest["parity_state"]["P7_INDEPENDENT_MACHINE"] == "OPEN"
            assert manifest["parity_state"]["P9_FREEZE"] == "OPEN"

            compiler = load_compiler(compiler_path, index)
            source = fixture_path.read_text(encoding="utf-8")
            result = compiler.compile_source(source, "ir")
            assert result["ok"], (body_id, result.get("diagnostics"))
            assert result["receipt"]["body_id"] == body_id
            assert result["ir"]["namespace"] == f"jm.body.{body_id}"
            receipts.append(result["receipt"])

            for target in ("js", "c", "rust", "wat"):
                target_result = compiler.compile_source(source, target)
                assert target_result["ok"]
                assert target_result["output"].strip()

            if cc:
                subprocess.run([cc, "-std=c11", "-fsyntax-only", str(kernel_source)], check=True)

        assert len(receipts) == 100
        assert len({item["identity_sha256"] for item in receipts}) == 100

        quadze_compiler_path = next(first.glob("bodies/quadze/sdk/jm_*/compiler.py"))
        quadze = load_compiler(quadze_compiler_path, 1001)
        quadze_source = (first / "bodies" / "quadze" / "fixtures" / "proof.jmbody").read_text(encoding="utf-8")
        broken = quadze_source.replace(quadze.BODY["law"], "wrong law", 1)
        negative = quadze.compile_source(broken)
        assert not negative["ok"]
        assert any(item["code"] == "LAW_MISMATCH" for item in negative["diagnostics"])

        recorp_manifest = json.loads((first / "bodies" / "recorp" / "manifest.json").read_text(encoding="utf-8"))
        assert recorp_manifest["body"]["name"] == "RECORP"
        assert recorp_manifest["body"]["id"] == "recorp"

        build_receipt = json.loads((first / "BUILD_RECEIPT.json").read_text(encoding="utf-8"))
        assert build_receipt["status"] == "FULL_STACK_FACTORY_GENERATION_PASS"
        assert build_receipt["hard_kernel_status"] == "OPEN_PER_BODY"

        print("JM EVERYBODY FULL-STACK FACTORY v0.1: 100/100 GENERATED COMPILER + SDK + KERNEL-SOURCE + FEDERATION TESTS PASS")
        print(f"TREE_SHA256={factory.tree_digest(first)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
