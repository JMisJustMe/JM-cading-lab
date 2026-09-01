#!/usr/bin/env python3
"""Deterministic compiler for the JM FaultHold + RecoveryBody operational office."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import sys
from dataclasses import dataclass, asdict

NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
VERSION_RE = re.compile(r"^v\d+\.\d+[A-Z]$")

class SourceError(ValueError):
    pass

@dataclass(frozen=True)
class Record:
    record_type: str
    name: str
    fields: dict[str, str]

@dataclass(frozen=True)
class Program:
    version: str
    laws: dict[str, str]
    records: list[Record]
    requirements: list[str]
    source_sha256: str


def parse(path: pathlib.Path) -> Program:
    raw = path.read_bytes()
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("ROUTEOS_FAULT_RECOVERY "):
        raise SourceError("first line must declare ROUTEOS_FAULT_RECOVERY")
    version = lines[0].split(maxsplit=1)[1]
    if not VERSION_RE.fullmatch(version):
        raise SourceError(f"invalid version: {version}")
    laws: dict[str, str] = {}
    records: list[Record] = []
    requirements: list[str] = []
    names: set[str] = set()
    for line_no, original in enumerate(lines[1:], start=2):
        line = original.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        kind = parts[0]
        if kind == "LAW":
            if len(parts) != 3 or not NAME_RE.fullmatch(parts[1]) or parts[1] in laws:
                raise SourceError(f"line {line_no}: invalid LAW")
            laws[parts[1]] = parts[2]
            continue
        if kind == "REQUIRE":
            if len(parts) != 2 or parts[1] in requirements:
                raise SourceError(f"line {line_no}: invalid REQUIRE")
            requirements.append(parts[1])
            continue
        if kind not in {"FAULT", "RECOVERY", "FALLBACK"} or len(parts) < 3:
            raise SourceError(f"line {line_no}: invalid record")
        name = parts[1]
        if not NAME_RE.fullmatch(name) or name in names:
            raise SourceError(f"line {line_no}: invalid or duplicate name {name}")
        fields: dict[str, str] = {}
        for token in parts[2:]:
            if "=" not in token:
                raise SourceError(f"line {line_no}: expected key=value")
            key, value = token.split("=", 1)
            if not key or not value or key in fields:
                raise SourceError(f"line {line_no}: invalid field {token}")
            fields[key] = value
        records.append(Record(kind, name, fields))
        names.add(name)
    required_laws = {"SOURCE_AUTHORITY", "PROOF_PARENT", "MACHINE_PARENT", "CLAIM_BOUNDARY"}
    missing = sorted(required_laws - laws.keys())
    if missing:
        raise SourceError("missing laws: " + ", ".join(missing))
    if laws["SOURCE_AUTHORITY"] != "jm_native":
        raise SourceError("SOURCE_AUTHORITY must be jm_native")
    by_name = {record.name: record for record in records}
    for required in ("FAULTHOLD", "RECOVERYBODY", "UNHANDLED_FAULT"):
        if required not in by_name:
            raise SourceError(f"missing record {required}")
    fault = by_name["FAULTHOLD"]
    if fault.record_type != "FAULT" or fault.fields.get("vector") != "6":
        raise SourceError("FAULTHOLD must be FAULT vector=6")
    if fault.fields.get("action") != "block_current" or fault.fields.get("state") != "BODY_BLOCKED":
        raise SourceError("FAULTHOLD must block current body")
    recovery = by_name["RECOVERYBODY"]
    if recovery.record_type != "RECOVERY" or recovery.fields.get("select") != "next_runnable":
        raise SourceError("RECOVERYBODY must select next_runnable")
    fallback = by_name["UNHANDLED_FAULT"]
    if fallback.record_type != "FALLBACK" or fallback.fields.get("action") != "receipt_and_return":
        raise SourceError("UNHANDLED_FAULT must receipt_and_return")
    needed_requirements = {
        "save_fault_frame", "block_faulting_body", "preserve_safe_body",
        "select_next_runnable", "unhandled_vector_receipt",
    }
    if set(requirements) != needed_requirements:
        raise SourceError("fault/recovery requirements are incomplete")
    return Program(version, laws, records, requirements, hashlib.sha256(raw).hexdigest())


def render_json(program: Program) -> str:
    return json.dumps({"schema": "JM_ROUTEOS_FAULT_RECOVERY_1", **asdict(program)}, indent=2, sort_keys=True) + "\n"


def render_c(program: Program) -> str:
    fault = next(r for r in program.records if r.name == "FAULTHOLD")
    vector = fault.fields["vector"]
    return f'''/* GENERATED OPERATIONAL OFFICE. EDIT source/faulthold_recoverybody.jmroute, NOT THIS FILE. */
#define JM_FAULTRECOVERY_VERSION "{program.version}"
#define JM_FAULTRECOVERY_SOURCE_SHA256 "{program.source_sha256}"
#define JM_FAULTRECOVERY_PROOF_PARENT "{program.laws["PROOF_PARENT"]}"
#define JM_FAULTRECOVERY_MACHINE_PARENT "{program.laws["MACHINE_PARENT"]}"
#define JM_FAULTHOLD_VECTOR {vector}

_Static_assert(JM_FAULTHOLD_VECTOR == JM_FAULT_FAULTHOLD_VECTOR, "generated FaultHold vector mismatch");

static struct cpu_frame *jm_generated_recoverybody(void) {{
  static bool jm_recoverybody_announced;
  if (!jm_recoverybody_announced) {{
    serial_write("[JM] RECOVERYBODY GENERATED ");
    serial_write(JM_FAULTRECOVERY_VERSION);
    serial_write(" SOURCE ");
    serial_write(JM_FAULTRECOVERY_SOURCE_SHA256);
    serial_write(" SELECT SAFE NEXT\\n");
    jm_recoverybody_announced = true;
  }}
  receipt("RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES");
  return select_next();
}}

static struct cpu_frame *jm_generated_faulthold(struct cpu_frame *frame) {{
  static bool jm_faulthold_announced;
  save_current(frame);
  if (!jm_faulthold_announced) {{
    serial_write("[JM] FAULTHOLD GENERATED ");
    serial_write(JM_FAULTRECOVERY_VERSION);
    serial_write(" SOURCE ");
    serial_write(JM_FAULTRECOVERY_SOURCE_SHA256);
    serial_write(" ACTIVE\\n");
    jm_faulthold_announced = true;
  }}
  if (current_body >= 0) {{
    serial_write("[JM] FAULTHOLD: USER BODY "); serial_u64(bodies[current_body].id);
    serial_write(" INVALID OPCODE CAUGHT\\n");
    bodies[current_body].state = BODY_BLOCKED;
  }}
  return jm_generated_recoverybody();
}}

static struct cpu_frame *jm_generated_unhandled_fault(struct cpu_frame *frame) {{
  receipt("FAULTHOLD: UNHANDLED VECTOR");
  return frame;
}}
'''


def render_receipt(program: Program) -> str:
    return (
        "# RouteOS JM-Generated FaultHold + RecoveryBody Receipt\n\n"
        f"- Version: `{program.version}`\n"
        f"- JM source SHA-256: `{program.source_sha256}`\n"
        f"- Proof parent: `{program.laws['PROOF_PARENT']}`\n"
        f"- Machine parent: `{program.laws['MACHINE_PARENT']}`\n"
        "- Generated offices: `FAULTHOLD`, `RECOVERYBODY`\n"
        "- Fault route: save frame → announce → block current body → select safe next\n"
        "- Fallback route: receipt unhandled vector → return same frame\n\n"
        "**Authority law:** JM source defines fault classification and recovery behaviour; generated C is the carrier.\n"
    )


def write(path: pathlib.Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("--out-dir", required=True, type=pathlib.Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        program = parse(args.source)
    except (OSError, SourceError) as exc:
        print(f"faultrecoveryc: {exc}", file=sys.stderr)
        return 2
    outputs = {
        args.out_dir / "faulthold_recoverybody_office.inc": render_c(program),
        args.out_dir / "faulthold_recoverybody_office.json": render_json(program),
        args.out_dir.parent / "proof" / "FAULT_RECOVERY_OPERATIONAL_RECEIPT.md": render_receipt(program),
    }
    if args.check:
        stale = False
        for path, expected in outputs.items():
            actual = path.read_text(encoding="utf-8") if path.exists() else None
            if actual != expected:
                print(f"stale or missing generated output: {path}", file=sys.stderr)
                stale = True
        return 1 if stale else 0
    for path, content in outputs.items():
        write(path, content)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
