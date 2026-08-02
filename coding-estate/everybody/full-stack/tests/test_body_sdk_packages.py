#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
import body_vm_factory as factory  # noqa: E402

COMMAND_SUFFIXES = ("compile", "lsp", "debug", "bytecode", "vm")
REQUIRED_PACKAGE_FILES = (
    "__init__.py",
    "compiler.py",
    "language_server.py",
    "debugger.py",
    "bytecode.py",
    "vm.py",
    "core.py",
    "tooling_core.py",
    "vm_core.py",
    "py.typed",
)


def wheel_metadata(path: Path) -> dict[str, str]:
    with zipfile.ZipFile(path) as archive:
        metadata_names = [name for name in archive.namelist() if name.endswith(".dist-info/METADATA")]
        assert len(metadata_names) == 1, (path, metadata_names)
        text = archive.read(metadata_names[0]).decode("utf-8")
    values: dict[str, str] = {}
    for line in text.splitlines():
        key, separator, value = line.partition(":")
        if separator and key in {"Name", "Version", "Summary", "Requires-Python"}:
            values[key] = value.strip()
    return values


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-body-sdk-vm-packages-") as temp:
        root = Path(temp)
        generated = root / "generated"
        wheels = root / "wheels"
        wheels.mkdir()
        receipt = factory.generate(ROOT, generated)
        assert receipt["status"] == "BODY_NATIVE_BYTECODE_VERIFIER_VM_PASS"
        assert receipt["body_count"] == 100
        assert receipt["service_records"] == 800
        assert receipt["command_records"] == 200

        sdk_roots = sorted(generated.glob("bodies/*/sdk"), key=lambda path: path.parent.name)
        assert len(sdk_roots) == 100
        build_receipts: list[dict[str, object]] = []

        for ordinal, sdk_root in enumerate(sdk_roots, 1):
            body_id = sdk_root.parent.name
            before = set(wheels.glob("*.whl"))
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pip",
                    "wheel",
                    "--disable-pip-version-check",
                    "--no-deps",
                    "--no-build-isolation",
                    "--wheel-dir",
                    str(wheels),
                    str(sdk_root),
                ],
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            if result.returncode != 0:
                raise AssertionError(
                    f"wheel build failed for {body_id}\nSTDOUT:\n{result.stdout[-4000:]}\nSTDERR:\n{result.stderr[-4000:]}"
                )
            created = set(wheels.glob("*.whl")) - before
            assert len(created) == 1, (body_id, sorted(path.name for path in created))
            wheel = created.pop()
            package_dirs = [path.name for path in sdk_root.glob("jm_*") if path.is_dir()]
            assert len(package_dirs) == 1
            package = package_dirs[0]
            with zipfile.ZipFile(wheel) as archive:
                names = set(archive.namelist())
                for filename in REQUIRED_PACKAGE_FILES:
                    required = f"{package}/{filename}"
                    assert required in names, (body_id, required)
                entry_names = [name for name in names if name.endswith(".dist-info/entry_points.txt")]
                assert len(entry_names) == 1
                entry_points = archive.read(entry_names[0]).decode("utf-8")
                for suffix in COMMAND_SUFFIXES:
                    assert f"jm-{body_id}-{suffix}" in entry_points, (body_id, suffix)
            metadata = wheel_metadata(wheel)
            expected_distribution = f"jm-body-{body_id}"
            assert metadata["Name"] == expected_distribution
            assert metadata["Version"] == "0.1"
            assert metadata["Requires-Python"] == ">=3.11"
            build_receipts.append(
                {
                    "body_id": body_id,
                    "distribution": metadata["Name"],
                    "wheel": wheel.name,
                    "wheel_bytes": wheel.stat().st_size,
                    "package": package,
                    "command_count": len(COMMAND_SUFFIXES),
                }
            )
            print(f"[{ordinal}/100] JM_BODY_VM_WHEEL_PASS:{body_id}:{wheel.name}", flush=True)

        assert len(build_receipts) == 100
        assert len({item["distribution"] for item in build_receipts}) == 100
        assert len({item["wheel"] for item in build_receipts}) == 100
        assert sum(int(item["command_count"]) for item in build_receipts) == 500
        manifest = {
            "schema": "jm.everybody.sdk-vm-wheel-receipt/0.2",
            "status": "100_BODY_INSTALLABLE_SDK_VM_WHEELS_PASS",
            "body_count": 100,
            "unique_distributions": 100,
            "unique_wheels": 100,
            "commands_per_body": 5,
            "command_count": 500,
            "entries": build_receipts,
            "claim_boundary": "Wheel construction proves installable hosted compiler/LSP/debugger/bytecode/VM packaging, not public index publication or native self-hosting.",
        }
        (root / "BODY_SDK_VM_WHEEL_RECEIPT.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        with (root / "BODY_SDK_VM_WHEELS.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=["body_id", "distribution", "wheel", "wheel_bytes", "package", "command_count"],
            )
            writer.writeheader()
            writer.writerows(build_receipts)
        print("JM BODY SDK + VM PACKAGING: 100 WHEELS + 500 COMMAND ROUTES PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
