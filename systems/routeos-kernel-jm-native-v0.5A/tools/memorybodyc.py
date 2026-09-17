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
class MemoryBody:
    version: str
    laws: Dict[str, str]
    memory: Record
    allocate: Record
    release: Record
    source_sha256: str

def parse(path: pathlib.Path) -> MemoryBody:
    raw = path.read_bytes()
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("ROUTEOS_MEMORYBODY "):
        raise SourceError("first line must declare ROUTEOS_MEMORYBODY")
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
        if kind not in {"MEMORY", "ALLOC", "RELEASE"} or len(parts) < 3:
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
    if set(records) != {"MEMORY", "ALLOC", "RELEASE"}:
        raise SourceError("MEMORY, ALLOC and RELEASE records are required")
    memory, allocate, release = records["MEMORY"], records["ALLOC"], records["RELEASE"]
    expected_memory = {
        "blocks": "16", "block_size": "256", "alignment": "16",
        "ownership": "kernel", "initial_state": "free",
    }
    for key, value in expected_memory.items():
        if memory.fields.get(key) != value:
            raise SourceError(f"memory {key} must be {value}")
    expected_alloc = {"scan": "first_free", "mark": "used", "return": "block", "exhaustion": "null"}
    for key, value in expected_alloc.items():
        if allocate.fields.get(key) != value:
            raise SourceError(f"allocate {key} must be {value}")
    expected_release = {
        "validate": "exact_block", "require": "used", "mark": "free",
        "success": "true", "failure": "false",
    }
    for key, value in expected_release.items():
        if release.fields.get(key) != value:
            raise SourceError(f"release {key} must be {value}")
    return MemoryBody(version, laws, memory, allocate, release, hashlib.sha256(raw).hexdigest())

def render_inc(mb: MemoryBody) -> str:
    m = mb.memory.fields
    return "\n".join([
        "/* GENERATED OPERATIONAL OFFICE. EDIT source/memorybody.jmroute, NOT THIS FILE. */",
        f'#define JM_MEMORYBODY_VERSION "{mb.version}"',
        f'#define JM_MEMORYBODY_SOURCE_SHA256 "{mb.source_sha256}"',
        f'#define JM_MEMORYBODY_PROOF_PARENT "{mb.laws["PROOF_PARENT"]}"',
        f'#define JM_MEMORYBODY_MACHINE_PARENT "{mb.laws["MACHINE_PARENT"]}"',
        f'#define JM_MEMORYBODY_BLOCKS {m["blocks"]}',
        f'#define JM_MEMORYBODY_BLOCK_SIZE {m["block_size"]}',
        f'#define JM_MEMORYBODY_ALIGNMENT {m["alignment"]}',
        "",
        '_Static_assert(JM_MEMORYBODY_BLOCK_SIZE <= JM_BODY_MEMORYBODY_PAGE_SIZE, "generated memory block exceeds authority page size");',
        "",
        "static uint8_t heap[JM_MEMORYBODY_BLOCKS][JM_MEMORYBODY_BLOCK_SIZE] __attribute__((aligned(JM_MEMORYBODY_ALIGNMENT)));",
        "static bool heap_used[JM_MEMORYBODY_BLOCKS];",
        "",
        "static void jm_memorybody_announce(void) {",
        "  static bool announced;",
        "  if (!announced) {",
        '    serial_write("[JM] MEMORYBODY GENERATED ");',
        "    serial_write(JM_MEMORYBODY_VERSION);",
        '    serial_write(" SOURCE ");',
        "    serial_write(JM_MEMORYBODY_SOURCE_SHA256);",
        '    serial_write(" ACTIVE\\n");',
        "    announced = true;",
        "  }",
        "}",
        "",
        "static void *memory_allocate(void) {",
        "  jm_memorybody_announce();",
        "  for (size_t i = 0; i < JM_MEMORYBODY_BLOCKS; ++i) {",
        "    if (!heap_used[i]) {",
        "      heap_used[i] = true;",
        "      return heap[i];",
        "    }",
        "  }",
        "  return NULL;",
        "}",
        "",
        "static bool memory_release(void *p) {",
        "  jm_memorybody_announce();",
        "  for (size_t i = 0; i < JM_MEMORYBODY_BLOCKS; ++i) {",
        "    if (p == heap[i] && heap_used[i]) {",
        "      heap_used[i] = false;",
        "      return true;",
        "    }",
        "  }",
        "  return false;",
        "}",
        "",
    ])

def render_json(mb: MemoryBody) -> str:
    return json.dumps({"schema": "JM_MEMORYBODY_OPERATIONAL_1", **asdict(mb)}, indent=2, sort_keys=True) + "\n"

def render_receipt(mb: MemoryBody) -> str:
    return (
        "# RouteOS JM-Native MemoryBody Operational Receipt\n\n"
        f"- Version: `{mb.version}`\n"
        f"- JM source SHA-256: `{mb.source_sha256}`\n"
        f"- Frozen proof parent: `{mb.laws['PROOF_PARENT']}`\n"
        f"- Prior machine parent: `{mb.laws['MACHINE_PARENT']}`\n"
        "- Generated office: `generated/memorybody_office.inc`\n"
        "- Generated behaviour: heap shape, ownership map, first-free allocation, exact-block release and failure returns\n"
        f"- Claim boundary: `{mb.laws['CLAIM_BOUNDARY']}`\n\n"
        "**Operational law:** MemoryBody allocation, ownership and release behaviour is generated from JM source.\n"
    )

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("--out-dir", type=pathlib.Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        mb = parse(args.source)
    except (OSError, SourceError) as exc:
        print(f"memorybodyc: {exc}", file=sys.stderr)
        return 2
    outputs = {
        args.out_dir / "memorybody_office.inc": render_inc(mb),
        args.out_dir / "memorybody_office.json": render_json(mb),
        args.out_dir.parent / "proof" / "MEMORYBODY_OPERATIONAL_RECEIPT.md": render_receipt(mb),
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
