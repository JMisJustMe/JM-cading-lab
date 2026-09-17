#!/usr/bin/env python3
"""Deterministic JM RouteOS authority compiler.

Reads the compact .jmroute source authority and emits:
- a canonical JSON authority record;
- a C header for the x86-64 carrier;
- a human-readable receipt.

The JM source is authoritative. Generated C/JSON are carriers and receipts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys
from dataclasses import dataclass, asdict
from typing import Dict, List

NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
VERSION_RE = re.compile(r"^v\d+\.\d+[A-Z]$")


class SourceError(ValueError):
    pass


@dataclass(frozen=True)
class Record:
    record_type: str
    name: str
    fields: Dict[str, str]


@dataclass(frozen=True)
class Authority:
    version: str
    laws: Dict[str, str]
    records: List[Record]
    requirements: List[str]
    source_sha256: str


def parse(path: pathlib.Path) -> Authority:
    raw = path.read_bytes()
    source_sha = hashlib.sha256(raw).hexdigest()
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("ROUTEOS_AUTHORITY "):
        raise SourceError("first line must declare ROUTEOS_AUTHORITY")
    version = lines[0].split(maxsplit=1)[1]
    if not VERSION_RE.match(version):
        raise SourceError(f"invalid authority version: {version}")

    laws: Dict[str, str] = {}
    records: List[Record] = []
    requirements: List[str] = []
    seen_names: set[str] = set()

    for line_no, original in enumerate(lines[1:], start=2):
        line = original.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        kind = parts[0]
        if kind == "LAW":
            if len(parts) != 3 or not NAME_RE.match(parts[1]):
                raise SourceError(f"line {line_no}: LAW must be LAW NAME value")
            if parts[1] in laws:
                raise SourceError(f"line {line_no}: duplicate law {parts[1]}")
            laws[parts[1]] = parts[2]
            continue
        if kind == "REQUIRE":
            if len(parts) != 2:
                raise SourceError(f"line {line_no}: REQUIRE must have one route")
            if parts[1] in requirements:
                raise SourceError(f"line {line_no}: duplicate requirement {parts[1]}")
            requirements.append(parts[1])
            continue
        if kind not in {"BODY", "GATE", "DEVICE", "FAULT"}:
            raise SourceError(f"line {line_no}: unknown record type {kind}")
        if len(parts) < 3:
            raise SourceError(f"line {line_no}: {kind} needs a name and fields")
        name = parts[1]
        if not NAME_RE.match(name):
            raise SourceError(f"line {line_no}: invalid JM office name {name}")
        if name in seen_names:
            raise SourceError(f"line {line_no}: duplicate office {name}")
        fields: Dict[str, str] = {}
        for token in parts[2:]:
            if "=" not in token:
                raise SourceError(f"line {line_no}: field must be key=value: {token}")
            key, value = token.split("=", 1)
            if not key or not value or key in fields:
                raise SourceError(f"line {line_no}: invalid/duplicate field {token}")
            fields[key] = value
        records.append(Record(kind, name, fields))
        seen_names.add(name)

    required_laws = {"SOURCE_AUTHORITY", "CARRIER", "PROOF_PARENT", "CLAIM_BOUNDARY"}
    missing = sorted(required_laws - laws.keys())
    if missing:
        raise SourceError(f"missing laws: {', '.join(missing)}")
    if laws["SOURCE_AUTHORITY"] != "jm_native":
        raise SourceError("SOURCE_AUTHORITY must be jm_native")

    return Authority(version, laws, records, requirements, source_sha)


def macro(text: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "_", text.upper()).strip("_")


def render_json(authority: Authority) -> str:
    payload = {
        "schema": "JM_ROUTEOS_AUTHORITY_1",
        **asdict(authority),
    }
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def render_header(authority: Authority) -> str:
    out = [
        "/* GENERATED. EDIT source/routeos_kernel.jmroute, NOT THIS FILE. */",
        "#ifndef JM_ROUTEOS_AUTHORITY_H",
        "#define JM_ROUTEOS_AUTHORITY_H",
        "",
        f'#define JM_ROUTEOS_AUTHORITY_VERSION "{authority.version}"',
        f'#define JM_ROUTEOS_SOURCE_SHA256 "{authority.source_sha256}"',
        f'#define JM_ROUTEOS_PROOF_PARENT "{authority.laws["PROOF_PARENT"]}"',
        '#define JM_ROUTEOS_SOURCE_AUTHORITY "JM_NATIVE"',
        f'#define JM_ROUTEOS_CARRIER "{authority.laws["CARRIER"]}"',
        f"#define JM_ROUTEOS_REQUIREMENT_COUNT {len(authority.requirements)}",
        f"#define JM_ROUTEOS_RECORD_COUNT {len(authority.records)}",
        "",
    ]
    for req in authority.requirements:
        out.append(f"#define JM_REQUIRE_{macro(req)} 1")
    out.append("")
    for record in authority.records:
        prefix = f"JM_{record.record_type}_{record.name}"
        out.append(f"#define {prefix} 1")
        for key, value in sorted(record.fields.items()):
            if value.lower().startswith("0x") or value.isdigit():
                out.append(f"#define {prefix}_{macro(key)} {value}")
            else:
                out.append(f'#define {prefix}_{macro(key)} "{value}"')
        out.append("")
    out += ["#endif /* JM_ROUTEOS_AUTHORITY_H */", ""]
    return "\n".join(out)


def render_receipt(authority: Authority) -> str:
    offices = ", ".join(r.name for r in authority.records)
    return (
        "# RouteOS JM-Native Source Authority Receipt\n\n"
        f"- Authority version: `{authority.version}`\n"
        f"- JM source SHA-256: `{authority.source_sha256}`\n"
        f"- Proven parent: `{authority.laws['PROOF_PARENT']}`\n"
        f"- Carrier: `{authority.laws['CARRIER']}`\n"
        f"- Records: `{len(authority.records)}`\n"
        f"- Requirements: `{len(authority.requirements)}`\n"
        f"- Offices: {offices}\n"
        f"- Claim boundary: `{authority.laws['CLAIM_BOUNDARY']}`\n\n"
        "**Authority law:** JM source is authoritative; generated C and JSON are carriers/receipts.\n"
    )


def write_if_changed(path: pathlib.Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("--out-dir", type=pathlib.Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    try:
        authority = parse(args.source)
    except (OSError, SourceError) as exc:
        print(f"jmroutec: {exc}", file=sys.stderr)
        return 2

    outputs = {
        args.out_dir / "routeos_authority.json": render_json(authority),
        args.out_dir / "routeos_authority.h": render_header(authority),
        args.out_dir.parent / "proof" / "JM_SOURCE_AUTHORITY_RECEIPT.md": render_receipt(authority),
    }
    if args.check:
        failed = False
        for path, expected in outputs.items():
            actual = path.read_text(encoding="utf-8") if path.exists() else None
            if actual != expected:
                print(f"stale or missing generated output: {path}", file=sys.stderr)
                failed = True
        return 1 if failed else 0

    for path, content in outputs.items():
        write_if_changed(path, content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
