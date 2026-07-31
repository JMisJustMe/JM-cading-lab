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
import full_stack_factory  # noqa: E402
import sovereign_kernel_factory  # noqa: E402


def load_compiler(path: Path, module_name: str):
    sys.path.insert(0, str(path.parent))
    try:
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise AssertionError(f"cannot load compiler {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.pop(0)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-sovereign-kernels-a-") as first_temp, tempfile.TemporaryDirectory(prefix="jm-sovereign-kernels-b-") as second_temp:
        first_root = Path(first_temp)
        second_root = Path(second_temp)
        first_stack = first_root / "full-stack"
        second_stack = second_root / "full-stack"
        first_kernels = first_root / "sovereign-kernels"
        second_kernels = second_root / "sovereign-kernels"

        full_stack_factory.generate(ROOT, first_stack)
        full_stack_factory.generate(ROOT, second_stack)
        first_container = sovereign_kernel_factory.generate(first_stack, first_kernels)
        second_container = sovereign_kernel_factory.generate(second_stack, second_kernels)

        assert first_container["kernel_count"] == 100
        assert second_container["kernel_count"] == 100
        assert len(first_container["kernel_ids"]) == 100
        assert len(set(first_container["kernel_ids"])) == 100
        assert first_container == second_container
        assert sovereign_kernel_factory.tree_digest(first_kernels) == sovereign_kernel_factory.tree_digest(second_kernels)

        required_ids = {
            "cading",
            "quadze",
            "recorp",
            "routeos",
            "jmlogic",
            "flowtalk",
            "kading",
            "kocodifying",
            "formeula",
            "cadenvm",
            "wakeforge",
        }
        assert not required_ids.difference(first_container["kernel_ids"])

        entries = first_container["entries"]
        assert len({entry["compiler_namespace"] for entry in entries}) == 100
        assert len({entry["compiler_sha256"] for entry in entries}) == 100
        assert len({entry["source_sha256"] for entry in entries}) == 100
        assert len({entry["personality_c_sha256"] for entry in entries}) == 100
        assert all(entry["machine_state"] == "SEPARATE_BOOT_IMAGE_OPEN" for entry in entries)
        assert all(entry["qemu_state"] == "OPEN" for entry in entries)

        cc = shutil.which("cc")
        for entry in entries:
            body_id = entry["body_id"]
            kernel_root = first_kernels / "kernels" / body_id
            source_path = kernel_root / "source" / f"{body_id}.kernel.jmbody"
            generated_c = kernel_root / "generated" / f"{body_id}.kernel.body.c"
            personality_c = kernel_root / "generated" / f"{body_id}.kernel.personality.c"
            receipt_path = kernel_root / "KERNEL_PERSONALITY_RECEIPT.json"
            for path in (source_path, generated_c, personality_c, receipt_path):
                assert path.is_file(), path
            receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
            assert receipt["body_id"] == body_id
            assert receipt["body_ir_namespace"] == f"jm.body.{body_id}"
            assert receipt["status"] == "BODY_AUTHORED_KERNEL_PERSONALITY_PASS_NOT_QEMU_DING"
            if cc:
                subprocess.run([cc, "-std=c11", "-fsyntax-only", str(generated_c)], check=True)
                subprocess.run([cc, "-std=c11", "-fsyntax-only", str(personality_c)], check=True)

        # Anti-fake test: Quadze kernel source must fail through the Cading compiler.
        quadze_source = (first_kernels / "kernels" / "quadze" / "source" / "quadze.kernel.jmbody").read_text(encoding="utf-8")
        cading_compiler_path = next(first_stack.glob("bodies/cading/sdk/jm_*/compiler.py"))
        cading_compiler = load_compiler(cading_compiler_path, "jm_wrong_compiler_cading_for_quadze")
        mismatch = cading_compiler.compile_source(quadze_source, "c")
        assert not mismatch["ok"]
        mismatch_codes = {item["code"] for item in mismatch["diagnostics"]}
        assert "BODY_ID_MISMATCH" in mismatch_codes or "LAW_MISMATCH" in mismatch_codes

        build_receipt = json.loads((first_kernels / "BUILD_RECEIPT.json").read_text(encoding="utf-8"))
        assert build_receipt["status"] == "100_BODY_AUTHORED_KERNEL_PERSONALITIES_PASS"
        assert build_receipt["kernel_count"] == 100
        assert build_receipt["qemu_state"] == "OPEN_PER_KERNEL"

        print("JM SOVEREIGN 100 KERNEL PERSONALITIES + ONE CONTAINER: PASS")
        print(f"TREE_SHA256={sovereign_kernel_factory.tree_digest(first_kernels)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
