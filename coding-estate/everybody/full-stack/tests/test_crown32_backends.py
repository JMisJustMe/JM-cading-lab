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

EXPECTED_TARGETS = ("ir", "js", "ts", "c", "cpp", "cplus", "cminus", "rust", "wat")


def load_compiler(path: Path, index: int):
    package_dir = path.parent
    sys.path.insert(0, str(package_dir))
    try:
        spec = importlib.util.spec_from_file_location(f"jm_crown32_compiler_{index}", path)
        if spec is None or spec.loader is None:
            raise AssertionError(f"cannot load compiler {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.pop(0)


def syntax_check(command: list[str], source: str, suffix: str, directory: Path) -> None:
    path = directory / f"emitted{suffix}"
    path.write_text(source, encoding="utf-8")
    subprocess.run([*command, str(path)], check=True, capture_output=True, text=True)


def main() -> int:
    cc = shutil.which("cc")
    cxx = shutil.which("c++") or shutil.which("g++")
    rustc = shutil.which("rustc")

    with tempfile.TemporaryDirectory(prefix="jm-crown32-backends-") as temp:
        root = Path(temp)
        generated = root / "generated"
        federation = factory.generate(ROOT, generated)
        assert federation["body_count"] == 100

        compilers = sorted(generated.glob("bodies/*/sdk/jm_*/compiler.py"))
        assert len(compilers) == 100

        backend_receipts: list[dict[str, object]] = []
        for index, compiler_path in enumerate(compilers):
            body_root = compiler_path.parents[2]
            body_id = body_root.name
            compiler = load_compiler(compiler_path, index)
            source = (body_root / "fixtures" / "proof.jmbody").read_text(encoding="utf-8")

            assert tuple(compiler.SUPPORTED_TARGETS) == EXPECTED_TARGETS
            body_output = root / "syntax" / body_id
            body_output.mkdir(parents=True, exist_ok=True)

            for target in EXPECTED_TARGETS:
                result = compiler.compile_source(source, target)
                assert result["ok"], (body_id, target, result.get("diagnostics"))
                assert result["output"].strip(), (body_id, target)
                assert result["receipt"]["target"] == target
                assert result["receipt"]["backend_contract"]
                backend_receipts.append(result["receipt"])

                if target in {"c", "cplus", "cminus"} and cc:
                    syntax_check([cc, "-std=c11", "-fsyntax-only"], result["output"], ".c", body_output)
                elif target == "cpp" and cxx:
                    syntax_check([cxx, "-std=c++17", "-fsyntax-only"], result["output"], ".cpp", body_output)
                elif target == "rust" and rustc:
                    syntax_check([rustc, "--crate-type", "lib", "--emit", "metadata"], result["output"], ".rs", body_output)

            ts = compiler.compile_source(source, "ts")["output"]
            assert "export type JMBodyIR" in ts
            cplus = compiler.compile_source(source, "cplus")["output"]
            assert "permission_gate" in cplus and "JM_CPLUS_BODY_ID" in cplus
            cminus = compiler.compile_source(source, "cminus")["output"]
            assert "cminus_identity" in cminus and body_id in cminus

        assert len(backend_receipts) == 100 * len(EXPECTED_TARGETS)
        assert len({(item["body_id"], item["target"]) for item in backend_receipts}) == len(backend_receipts)
        summary = {
            "schema": "jm.everybody.crown32-backend-receipt/0.1",
            "status": "CROWN32_BACKEND_EXPANSION_PASS",
            "body_count": 100,
            "targets": list(EXPECTED_TARGETS),
            "body_target_receipts": len(backend_receipts),
            "native_syntax": {"c": bool(cc), "cpp": bool(cxx), "rust": bool(rustc)},
        }
        print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
