#!/usr/bin/env python3
"""Build, verify and retain one installable SDK wheel for every JM body."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any

SCHEMA = "jm.everybody.sdk-wheel-factory/0.1"
EXPECTED_BODY_COUNT = 100


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def normalise_distribution(value: str) -> str:
    return re.sub(r"[-_.]+", "-", value).lower()


def metadata_from_wheel(path: Path) -> tuple[dict[str, str], str, str]:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        metadata_names = [name for name in names if name.endswith(".dist-info/METADATA")]
        entry_names = [name for name in names if name.endswith(".dist-info/entry_points.txt")]
        if len(metadata_names) != 1 or len(entry_names) != 1:
            raise ValueError(f"wheel {path.name} lacks one metadata/entry-point body")
        metadata_text = archive.read(metadata_names[0]).decode("utf-8")
        entry_text = archive.read(entry_names[0]).decode("utf-8")
    fields: dict[str, str] = {}
    for line in metadata_text.splitlines():
        key, separator, value = line.partition(":")
        if separator and key in {"Name", "Version", "Summary", "Requires-Python"}:
            fields[key] = value.strip()
    package_candidates = sorted({name.split("/", 1)[0] for name in names if name.startswith("jm_") and "/" in name})
    if len(package_candidates) != 1:
        raise ValueError(f"wheel {path.name} has ambiguous package roots {package_candidates}")
    return fields, entry_text, package_candidates[0]


def build_one(sdk_root: Path, wheel_dir: Path, log_dir: Path) -> dict[str, Any]:
    body_id = sdk_root.parent.name
    before = set(wheel_dir.glob("*.whl"))
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
            str(wheel_dir),
            str(sdk_root),
        ],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    (log_dir / f"{body_id}.stdout.log").write_text(result.stdout, encoding="utf-8")
    (log_dir / f"{body_id}.stderr.log").write_text(result.stderr, encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError(
            f"wheel build failed for {body_id}\nSTDOUT:\n{result.stdout[-4000:]}\nSTDERR:\n{result.stderr[-4000:]}"
        )
    created = set(wheel_dir.glob("*.whl")) - before
    if len(created) != 1:
        raise RuntimeError(f"expected one new wheel for {body_id}, found {[path.name for path in created]}")
    wheel = created.pop()
    metadata, entry_points, package = metadata_from_wheel(wheel)
    expected_distribution = normalise_distribution(f"jm-body-{body_id}")
    if normalise_distribution(metadata.get("Name", "")) != expected_distribution:
        raise RuntimeError(f"distribution mismatch for {body_id}: {metadata.get('Name')}")
    if metadata.get("Version") != "0.1" or metadata.get("Requires-Python") != ">=3.11":
        raise RuntimeError(f"metadata mismatch for {body_id}: {metadata}")
    for suffix in ("compile", "lsp", "debug"):
        expected = f"jm-{body_id}-{suffix}"
        if expected not in entry_points:
            raise RuntimeError(f"entry point {expected} missing from {wheel.name}")
    with zipfile.ZipFile(wheel) as archive:
        names = set(archive.namelist())
        for required in (
            f"{package}/__init__.py",
            f"{package}/compiler.py",
            f"{package}/language_server.py",
            f"{package}/debugger.py",
            f"{package}/core.py",
            f"{package}/tooling_core.py",
            f"{package}/py.typed",
        ):
            if required not in names:
                raise RuntimeError(f"{required} missing from {wheel.name}")
    return {
        "body_id": body_id,
        "distribution": metadata["Name"],
        "version": metadata["Version"],
        "package": package,
        "wheel": wheel.name,
        "wheel_bytes": wheel.stat().st_size,
        "wheel_sha256": file_sha256(wheel),
        "commands": [f"jm-{body_id}-compile", f"jm-{body_id}-lsp", f"jm-{body_id}-debug"],
    }


def build(source: Path, out: Path) -> dict[str, Any]:
    sdk_roots = sorted(source.glob("bodies/*/sdk"), key=lambda path: path.parent.name)
    if len(sdk_roots) != EXPECTED_BODY_COUNT:
        raise SystemExit(f"expected {EXPECTED_BODY_COUNT} SDK roots, found {len(sdk_roots)}")

    if out.exists():
        shutil.rmtree(out)
    wheel_dir = out / "WHEELS"
    receipt_dir = out / "RECEIPTS"
    log_dir = out / "LOGS"
    wheel_dir.mkdir(parents=True)
    receipt_dir.mkdir(parents=True)
    log_dir.mkdir(parents=True)

    entries: list[dict[str, Any]] = []
    for ordinal, sdk_root in enumerate(sdk_roots, 1):
        entry = build_one(sdk_root, wheel_dir, log_dir)
        write_json(receipt_dir / f"{entry['body_id']}.json", {"schema": "jm.body.sdk-wheel/0.1", **entry})
        entries.append(entry)
        print(f"[{ordinal}/{EXPECTED_BODY_COUNT}] JM_SDK_WHEEL_PASS:{entry['body_id']}:{entry['wheel_sha256']}", flush=True)

    if len({entry["body_id"] for entry in entries}) != EXPECTED_BODY_COUNT:
        raise SystemExit("body IDs are not unique")
    if len({normalise_distribution(entry["distribution"]) for entry in entries}) != EXPECTED_BODY_COUNT:
        raise SystemExit("wheel distribution names are not unique")
    if len({entry["wheel_sha256"] for entry in entries}) != EXPECTED_BODY_COUNT:
        raise SystemExit("wheel hashes are not unique")

    manifest = {
        "schema": SCHEMA,
        "status": "100_BODY_INSTALLABLE_SDK_WHEELS_PASS",
        "body_count": EXPECTED_BODY_COUNT,
        "unique_distributions": EXPECTED_BODY_COUNT,
        "unique_wheel_hashes": EXPECTED_BODY_COUNT,
        "command_count": EXPECTED_BODY_COUNT * 3,
        "entries": entries,
        "claim_boundary": "Wheel construction proves installable SDK packaging. Public registry publication and self-hosting remain separate gates.",
    }
    write_json(out / "00_OPEN_FIRST_BODY_SDK_WHEEL_RECEIPT.json", manifest)
    (out / "README.md").write_text(
        "# JM EveryBody Sovereign SDK Wheels v0.1\n\n"
        "Contains one identity-bound installable wheel for each of the first 100 sovereign coding bodies. "
        "Each wheel contains its compiler, SDK API, language server and debugger.\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True))
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    build(args.source.resolve(), args.out.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
