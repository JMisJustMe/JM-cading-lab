#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, re, shlex, sys
from dataclasses import dataclass, asdict
from typing import Dict

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
class RouteScheduler:
    version: str
    laws: Dict[str, str]
    scheduler: Record
    save: Record
    hold: Record
    source_sha256: str

def parse(path: pathlib.Path) -> RouteScheduler:
    raw = path.read_bytes()
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("ROUTEOS_SCHEDULER "):
        raise SourceError("first line must declare ROUTEOS_SCHEDULER")
    version = lines[0].split(maxsplit=1)[1]
    if not VERSION_RE.match(version):
        raise SourceError(f"invalid version: {version}")
    laws: Dict[str, str] = {}
    records: Dict[str, Record] = {}
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
        if kind not in {"SCHEDULER", "SAVE", "HOLD"} or len(parts) < 3:
            raise SourceError(f"line {line_no}: invalid record")
        name = parts[1]
        if not NAME_RE.match(name) or kind in records:
            raise SourceError(f"line {line_no}: invalid/duplicate {kind}")
        fields: Dict[str, str] = {}
        for token in parts[2:]:
            if "=" not in token:
                raise SourceError(f"line {line_no}: expected key=value")
            key, value = token.split("=", 1)
            if not key or not value or key in fields:
                raise SourceError(f"line {line_no}: invalid field {token}")
            fields[key] = value
        records[kind] = Record(kind, name, fields)
    required_laws = {"SOURCE_AUTHORITY", "PROOF_PARENT", "MACHINE_PARENT", "CLAIM_BOUNDARY"}
    missing = sorted(required_laws - laws.keys())
    if missing:
        raise SourceError(f"missing laws: {', '.join(missing)}")
    if laws["SOURCE_AUTHORITY"] != "jm_native":
        raise SourceError("SOURCE_AUTHORITY must be jm_native")
    if set(records) != {"SCHEDULER", "SAVE", "HOLD"}:
        raise SourceError("SCHEDULER, SAVE and HOLD records are required")
    scheduler, save, hold = records["SCHEDULER"], records["SAVE"], records["HOLD"]
    expected = {
        "bodies": "2", "policy": "round_robin", "current_initial": "-1",
        "skip_state": "BODY_BLOCKED", "selected_state": "BODY_RUNNING",
        "run_accounting": "increment",
    }
    for key, value in expected.items():
        if scheduler.fields.get(key) != value:
            raise SourceError(f"scheduler {key} must be {value}")
    for key in ("minimum_current", "blocked_state", "copy", "ready_state"):
        if key not in save.fields:
            raise SourceError(f"SAVE missing {key}")
    if hold.fields.get("action") != "halt" or "receipt" not in hold.fields:
        raise SourceError("HOLD must define halt and receipt")
    return RouteScheduler(version, laws, scheduler, save, hold, hashlib.sha256(raw).hexdigest())

def render_inc(rs: RouteScheduler) -> str:
    f = rs.scheduler.fields
    s = rs.save.fields
    h = rs.hold.fields
    return "\n".join([
        "/* GENERATED OPERATIONAL OFFICE. EDIT source/routescheduler.jmroute, NOT THIS FILE. */",
        f'#define JM_ROUTESCHEDULER_VERSION "{rs.version}"',
        f'#define JM_ROUTESCHEDULER_SOURCE_SHA256 "{rs.source_sha256}"',
        f'#define JM_ROUTESCHEDULER_PROOF_PARENT "{rs.laws["PROOF_PARENT"]}"',
        f'#define JM_ROUTESCHEDULER_MACHINE_PARENT "{rs.laws["MACHINE_PARENT"]}"',
        f'#define JM_ROUTESCHEDULER_BODY_COUNT {f["bodies"]}',
        "",
        '_Static_assert(JM_ROUTESCHEDULER_BODY_COUNT == JM_BODY_ROUTESCHEDULER_EXECUTION_BODIES, "generated scheduler body count mismatch");',
        "",
        "static struct cpu_frame *select_next(void) {",
        "  static bool jm_routescheduler_announced;",
        "  if (!jm_routescheduler_announced) {",
        '    serial_write("[JM] ROUTESCHEDULER GENERATED ");',
        "    serial_write(JM_ROUTESCHEDULER_VERSION);",
        '    serial_write(" SOURCE ");',
        "    serial_write(JM_ROUTESCHEDULER_SOURCE_SHA256);",
        '    serial_write(" ACTIVE\\n");',
        "    jm_routescheduler_announced = true;",
        "  }",
        "  for (size_t attempt = 0; attempt < JM_ROUTESCHEDULER_BODY_COUNT; ++attempt) {",
        "    int candidate = (current_body + 1 + (int)attempt) % JM_ROUTESCHEDULER_BODY_COUNT;",
        f"    if (bodies[candidate].state != {f['skip_state']}) {{",
        "      current_body = candidate;",
        f"      bodies[candidate].state = {f['selected_state']};",
        "      bodies[candidate].runs++;",
        "      return &bodies[candidate].frame;",
        "    }",
        "  }",
        f"  receipt({json.dumps(h['receipt'])});",
        '  for (;;) { __asm__ volatile("cli; hlt"); }',
        "}",
        "",
        "static void save_current(struct cpu_frame *frame) {",
        f"  if (current_body >= {s['minimum_current']} && bodies[current_body].state != {s['blocked_state']}) {{",
        "    jm_memcpy(&bodies[current_body].frame, frame, sizeof(*frame));",
        f"    bodies[current_body].state = {s['ready_state']};",
        "  }",
        "}",
        "",
    ])

def render_json(rs: RouteScheduler) -> str:
    return json.dumps({"schema": "JM_ROUTESCHEDULER_OPERATIONAL_1", **asdict(rs)}, indent=2, sort_keys=True) + "\n"

def render_receipt(rs: RouteScheduler) -> str:
    return (
        "# RouteOS JM-Native RouteScheduler Operational Receipt\n\n"
        f"- Version: `{rs.version}`\n"
        f"- JM source SHA-256: `{rs.source_sha256}`\n"
        f"- Frozen proof parent: `{rs.laws['PROOF_PARENT']}`\n"
        f"- Prior machine parent: `{rs.laws['MACHINE_PARENT']}`\n"
        "- Generated office: `generated/routescheduler_office.inc`\n"
        "- Generated behaviour: round-robin selection, blocked-body skip, state handoff, run accounting, frame save and no-runnable halt\n"
        f"- Claim boundary: `{rs.laws['CLAIM_BOUNDARY']}`\n\n"
        "**Operational law:** RouteScheduler selection and handoff behaviour is generated from JM source.\n"
    )

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("--out-dir", type=pathlib.Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        rs = parse(args.source)
    except (OSError, SourceError) as exc:
        print(f"routeschedulerc: {exc}", file=sys.stderr)
        return 2
    outputs = {
        args.out_dir / "routescheduler_office.inc": render_inc(rs),
        args.out_dir / "routescheduler_office.json": render_json(rs),
        args.out_dir.parent / "proof" / "ROUTESCHEDULER_OPERATIONAL_RECEIPT.md": render_receipt(rs),
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
