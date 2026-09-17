#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, re, shlex, sys
from dataclasses import dataclass, asdict
from typing import Dict, List

VERSION_RE = re.compile(r"^v\d+\.\d+[A-Z]$")
NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")

class SourceError(ValueError):
    pass

@dataclass(frozen=True)
class Record:
    record_type: str
    name: str
    fields: Dict[str, str]

@dataclass(frozen=True)
class PermissionGate:
    version: str
    laws: Dict[str, str]
    gate: Record
    calls: List[Record]
    deny: Record
    source_sha256: str

def parse(path: pathlib.Path) -> PermissionGate:
    raw = path.read_bytes()
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("ROUTEOS_PERMISSIONGATE "):
        raise SourceError("first line must declare ROUTEOS_PERMISSIONGATE")
    version = lines[0].split(maxsplit=1)[1]
    if not VERSION_RE.match(version):
        raise SourceError(f"invalid version: {version}")
    laws: Dict[str, str] = {}
    gate = None
    calls: List[Record] = []
    deny = None
    seen_names: set[str] = set()
    seen_numbers: set[int] = set()
    for line_no, original in enumerate(lines[1:], start=2):
        line = original.strip()
        if not line or line.startswith("#"):
            continue
        parts = shlex.split(line)
        kind = parts[0]
        if kind == "LAW":
            if len(parts) != 3 or not NAME_RE.match(parts[1]) or parts[1] in laws:
                raise SourceError(f"line {line_no}: invalid LAW")
            laws[parts[1]] = parts[2]
            continue
        if kind not in {"GATE", "CALL", "DENY"} or len(parts) < 3:
            raise SourceError(f"line {line_no}: invalid record")
        name = parts[1]
        if not NAME_RE.match(name) or name in seen_names:
            raise SourceError(f"line {line_no}: invalid/duplicate name {name}")
        fields: Dict[str, str] = {}
        for token in parts[2:]:
            if "=" not in token:
                raise SourceError(f"line {line_no}: expected key=value")
            key, value = token.split("=", 1)
            if not key or not value or key in fields:
                raise SourceError(f"line {line_no}: invalid field {token}")
            fields[key] = value
        rec = Record(kind, name, fields)
        seen_names.add(name)
        if kind == "GATE":
            if gate is not None:
                raise SourceError("exactly one GATE is allowed")
            gate = rec
        elif kind == "CALL":
            try:
                number = int(fields["number"], 0)
            except (KeyError, ValueError) as exc:
                raise SourceError(f"line {line_no}: CALL needs numeric number") from exc
            if number in seen_numbers:
                raise SourceError(f"line {line_no}: duplicate call number {number}")
            seen_numbers.add(number)
            calls.append(rec)
        else:
            if deny is not None:
                raise SourceError("exactly one DENY is allowed")
            deny = rec
    required_laws = {"SOURCE_AUTHORITY", "PROOF_PARENT", "MACHINE_PARENT", "CLAIM_BOUNDARY"}
    missing = sorted(required_laws - laws.keys())
    if missing:
        raise SourceError(f"missing laws: {', '.join(missing)}")
    if laws["SOURCE_AUTHORITY"] != "jm_native":
        raise SourceError("SOURCE_AUTHORITY must be jm_native")
    if gate is None or gate.name != "PERMISSIONGATE":
        raise SourceError("PERMISSIONGATE record required")
    if gate.fields.get("vector") != "0x80":
        raise SourceError("PermissionGate vector must remain 0x80 for this carrier")
    call_map = {r.name: r for r in calls}
    if set(call_map) != {"TRACE_READ", "YIELD"}:
        raise SourceError("TRACE_READ and YIELD calls are required")
    for key in ("number", "permission", "action", "return", "continuation", "trace"):
        if key not in call_map["TRACE_READ"].fields:
            raise SourceError(f"TRACE_READ missing {key}")
    for key in ("number", "permission", "action", "continuation"):
        if key not in call_map["YIELD"].fields:
            raise SourceError(f"YIELD missing {key}")
    if deny is None:
        raise SourceError("DENY record required")
    for key in ("return", "continuation", "receipt"):
        if key not in deny.fields:
            raise SourceError(f"DENY missing {key}")
    return PermissionGate(version, laws, gate, sorted(calls, key=lambda r: int(r.fields["number"], 0)), deny, hashlib.sha256(raw).hexdigest())

def c_string(value: str) -> str:
    return json.dumps(value)

def render_inc(pg: PermissionGate) -> str:
    calls = {r.name: r for r in pg.calls}
    trace = calls["TRACE_READ"]
    yld = calls["YIELD"]
    deny = pg.deny
    lines = [
        "/* GENERATED OPERATIONAL OFFICE. EDIT source/permissiongate.jmroute, NOT THIS FILE. */",
        f'#define JM_PERMISSIONGATE_VERSION "{pg.version}"',
        f'#define JM_PERMISSIONGATE_SOURCE_SHA256 "{pg.source_sha256}"',
        f'#define JM_PERMISSIONGATE_PROOF_PARENT "{pg.laws["PROOF_PARENT"]}"',
        f'#define JM_PERMISSIONGATE_MACHINE_PARENT "{pg.laws["MACHINE_PARENT"]}"',
        f'#define JM_PERMISSIONGATE_VECTOR {pg.gate.fields["vector"]}',
        f'#define JM_PERMISSIONGATE_CALL_TRACE_READ {int(trace.fields["number"], 0)}',
        f'#define JM_PERMISSIONGATE_CALL_YIELD {int(yld.fields["number"], 0)}',
        "",
        '_Static_assert(JM_PERMISSIONGATE_VECTOR == JM_GATE_PERMISSIONGATE_VECTOR, "generated PermissionGate vector mismatch");',
        "",
        "static struct cpu_frame *jm_generated_permissiongate(struct cpu_frame *frame) {",
        "  static bool jm_permissiongate_announced;",
        "  save_current(frame);",
        "  struct body *active = current_body >= 0 ? &bodies[current_body] : NULL;",
        "  if (!active) return select_next();",
        "  if (!jm_permissiongate_announced) {",
        '    serial_write("[JM] PERMISSIONGATE GENERATED ");',
        "    serial_write(JM_PERMISSIONGATE_VERSION);",
        '    serial_write(" SOURCE ");',
        "    serial_write(JM_PERMISSIONGATE_SOURCE_SHA256);",
        '    serial_write(" ACTIVE\\n");',
        "    jm_permissiongate_announced = true;",
        "  }",
        "  if (active->frame.rax == JM_PERMISSIONGATE_CALL_TRACE_READ) {",
        '    serial_write("[JM] USER BODY "); serial_u64(active->id);',
        f'    serial_write(" -> {trace.fields["trace"]}\\n");',
        f'    active->frame.rax = {trace.fields["return"]};',
        "    active->state = BODY_READY;",
        "    return &active->frame;",
        "  }",
        "  if (active->frame.rax == JM_PERMISSIONGATE_CALL_YIELD) {",
        "    active->state = BODY_READY;",
        "    return select_next();",
        "  }",
        f"  receipt({c_string(deny.fields['receipt'])});",
        f"  active->frame.rax = (uint64_t){deny.fields['return']};",
        "  active->state = BODY_READY;",
        "  return &active->frame;",
        "}",
        "",
    ]
    return "\n".join(lines)

def render_json(pg: PermissionGate) -> str:
    return json.dumps({"schema": "JM_PERMISSIONGATE_OPERATIONAL_1", **asdict(pg)}, indent=2, sort_keys=True) + "\n"

def render_receipt(pg: PermissionGate) -> str:
    return (
        "# RouteOS JM-Native PermissionGate Operational Receipt\n\n"
        f"- Version: `{pg.version}`\n"
        f"- JM source SHA-256: `{pg.source_sha256}`\n"
        f"- Frozen proof parent: `{pg.laws['PROOF_PARENT']}`\n"
        f"- Prior machine parent: `{pg.laws['MACHINE_PARENT']}`\n"
        "- Generated office: `generated/permissiongate_office.inc`\n"
        "- Replaced behaviour: TRACE_READ, YIELD and unknown-call denial\n"
        f"- Claim boundary: `{pg.laws['CLAIM_BOUNDARY']}`\n\n"
        "**Operational law:** the PermissionGate dispatch behaviour is generated from JM source; carrier C only supplies the surrounding machine floor.\n"
    )

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("--out-dir", type=pathlib.Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        pg = parse(args.source)
    except (OSError, SourceError) as exc:
        print(f"permissiongatec: {exc}", file=sys.stderr)
        return 2
    outputs = {
        args.out_dir / "permissiongate_office.inc": render_inc(pg),
        args.out_dir / "permissiongate_office.json": render_json(pg),
        args.out_dir.parent / "proof" / "PERMISSIONGATE_OPERATIONAL_RECEIPT.md": render_receipt(pg),
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
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
