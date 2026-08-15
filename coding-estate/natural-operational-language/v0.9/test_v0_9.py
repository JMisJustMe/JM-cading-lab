#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

spec = importlib.util.spec_from_file_location("carrier_bridge", HERE / "carrier_bridge.py")
assert spec and spec.loader
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)

sample = subprocess.run(
    ["node", str(HERE / "sample-portable-ir.mjs")],
    cwd=ROOT,
    check=True,
    text=True,
    capture_output=True,
)
ir = json.loads(sample.stdout)
assert ir["schema"] == "JM.NaturalOperationalPortableIR.v0.9"
assert ir["namespace"] == "jm.surface.natural-operational-language"
assert any(item["op"] == "relation.then" for item in ir["operations"])
assert len(ir["operations"]) == 3

emitted = bridge.emit_all(ir)
assert set(emitted) == {"ir", "js", "c", "rust", "wat"}
for target, result in emitted.items():
    assert result["receipt"]["operation_count"] == 3
    assert result["receipt"]["target"] == target
    assert result["receipt"]["output_sha256"]
    assert "101st canonical body" in result["receipt"]["claim_boundary"]

with tempfile.TemporaryDirectory(prefix="jm-nol-v09-") as tmp_raw:
    tmp = Path(tmp_raw)

    js_path = tmp / "carrier.mjs"
    js_path.write_text(emitted["js"]["output"], encoding="utf-8")
    js_check = subprocess.run(
        ["node", "--input-type=module", "-e", f"import({json.dumps(js_path.as_uri())}).then(m=>{{if(m.run()!==3)process.exit(9);}})"],
        check=False,
        text=True,
        capture_output=True,
    )
    assert js_check.returncode == 0, js_check.stderr

    c_path = tmp / "carrier.c"
    c_obj = tmp / "carrier.o"
    c_path.write_text(emitted["c"]["output"], encoding="utf-8")
    gcc = shutil.which("gcc") or shutil.which("cc")
    assert gcc, "C compiler required for v0.9 carrier proof"
    c_check = subprocess.run([gcc, "-std=c11", "-Wall", "-Wextra", "-Werror", "-c", str(c_path), "-o", str(c_obj)], check=False, text=True, capture_output=True)
    assert c_check.returncode == 0, c_check.stderr
    assert c_obj.exists() and c_obj.stat().st_size > 0

    rust_path = tmp / "carrier.rs"
    rust_lib = tmp / "libcarrier.rlib"
    rust_path.write_text(emitted["rust"]["output"], encoding="utf-8")
    rustc = shutil.which("rustc")
    assert rustc, "rustc required for v0.9 carrier proof"
    rust_check = subprocess.run([rustc, "--crate-type", "lib", str(rust_path), "-o", str(rust_lib)], check=False, text=True, capture_output=True)
    assert rust_check.returncode == 0, rust_check.stderr
    assert rust_lib.exists() and rust_lib.stat().st_size > 0

    wat = emitted["wat"]["output"]
    assert '(export "run")' in wat
    assert "i32.const 3" in wat
    wat2wasm = shutil.which("wat2wasm")
    if wat2wasm:
        wat_path = tmp / "carrier.wat"
        wasm_path = tmp / "carrier.wasm"
        wat_path.write_text(wat, encoding="utf-8")
        wat_check = subprocess.run([wat2wasm, str(wat_path), "-o", str(wasm_path)], check=False, text=True, capture_output=True)
        assert wat_check.returncode == 0, wat_check.stderr
        assert wasm_path.exists() and wasm_path.stat().st_size > 0

print(json.dumps({
    "status": "PASS",
    "suite": "JM Natural Operational Language Bounce v0.9",
    "operation_count": len(ir["operations"]),
    "targets": list(emitted),
    "c_compiled": True,
    "rust_compiled": True,
}))
