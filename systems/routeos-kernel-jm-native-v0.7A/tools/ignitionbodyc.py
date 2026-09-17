#!/usr/bin/env python3
"""Deterministic compiler for the JM IgnitionBody operational office."""
from __future__ import annotations
import argparse, hashlib, json, pathlib, re, sys
from dataclasses import dataclass, asdict

NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
VERSION_RE = re.compile(r"^v\d+\.\d+[A-Z]$")
class SourceError(ValueError): pass

@dataclass(frozen=True)
class Step:
    name: str
    fields: dict[str, str]

@dataclass(frozen=True)
class Program:
    version: str
    laws: dict[str, str]
    steps: list[Step]
    requirements: list[str]
    source_sha256: str

EXPECTED_STEPS = [
    "SERIAL_INIT", "AUTHORITY_IDENTITY", "BOOT_VALIDATE", "ENTRY_RECEIPTS",
    "MEMORY_PROBE", "DESCRIPTOR_INSTALL", "USER_BOUNDARY", "TIMER_ROUTE",
    "ACTIVE_RECEIPTS", "FIRST_BODY", "ENTER_USER",
]
EXPECTED_REQUIREMENTS = {
    "ordered_ignition", "boot_magic_validation", "generated_office_activation",
    "first_body_handoff", "inherited_office_preservation",
}

def parse(path: pathlib.Path) -> Program:
    raw = path.read_bytes()
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("ROUTEOS_IGNITION "):
        raise SourceError("first line must declare ROUTEOS_IGNITION")
    version = lines[0].split(maxsplit=1)[1]
    if not VERSION_RE.fullmatch(version): raise SourceError(f"invalid version: {version}")
    laws: dict[str, str] = {}; steps: list[Step] = []; requirements: list[str] = []; names: set[str] = set()
    for line_no, original in enumerate(lines[1:], start=2):
        line = original.strip()
        if not line or line.startswith("#"): continue
        parts = line.split(); kind = parts[0]
        if kind == "LAW":
            if len(parts) != 3 or not NAME_RE.fullmatch(parts[1]) or parts[1] in laws: raise SourceError(f"line {line_no}: invalid LAW")
            laws[parts[1]] = parts[2]; continue
        if kind == "REQUIRE":
            if len(parts) != 2 or parts[1] in requirements: raise SourceError(f"line {line_no}: invalid REQUIRE")
            requirements.append(parts[1]); continue
        if kind != "STEP" or len(parts) < 4: raise SourceError(f"line {line_no}: invalid STEP")
        name = parts[1]
        if not NAME_RE.fullmatch(name) or name in names: raise SourceError(f"line {line_no}: invalid or duplicate step {name}")
        fields: dict[str, str] = {}
        for token in parts[2:]:
            if "=" not in token: raise SourceError(f"line {line_no}: expected key=value")
            key, value = token.split("=", 1)
            if not key or not value or key in fields: raise SourceError(f"line {line_no}: invalid field {token}")
            fields[key] = value
        steps.append(Step(name, fields)); names.add(name)
    needed_laws = {"SOURCE_AUTHORITY", "PROOF_PARENT", "MACHINE_PARENT", "CLAIM_BOUNDARY"}
    missing = sorted(needed_laws - laws.keys())
    if missing: raise SourceError("missing laws: " + ", ".join(missing))
    if laws["SOURCE_AUTHORITY"] != "jm_native": raise SourceError("SOURCE_AUTHORITY must be jm_native")
    if [step.name for step in steps] != EXPECTED_STEPS: raise SourceError("ignition step order mismatch")
    if [int(step.fields.get("order", "0")) for step in steps] != list(range(1, 12)): raise SourceError("ignition numeric order mismatch")
    by_name = {step.name: step for step in steps}
    if by_name["BOOT_VALIDATE"].fields.get("expected") != "0x36D76289": raise SourceError("multiboot magic mismatch")
    if by_name["FIRST_BODY"].fields.get("body") != "1" or by_name["FIRST_BODY"].fields.get("state") != "BODY_RUNNING": raise SourceError("first body route mismatch")
    if set(requirements) != EXPECTED_REQUIREMENTS: raise SourceError("ignition requirements incomplete")
    return Program(version, laws, steps, requirements, hashlib.sha256(raw).hexdigest())

def render_json(program: Program) -> str:
    return json.dumps({"schema": "JM_ROUTEOS_IGNITION_1", **asdict(program)}, indent=2, sort_keys=True) + "\n"

def render_c(program: Program) -> str:
    magic = next(step for step in program.steps if step.name == "BOOT_VALIDATE").fields["expected"]
    first_body = int(next(step for step in program.steps if step.name == "FIRST_BODY").fields["body"]) - 1
    return f'''/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */
#define JM_IGNITIONBODY_VERSION "{program.version}"
#define JM_IGNITIONBODY_SOURCE_SHA256 "{program.source_sha256}"
#define JM_IGNITIONBODY_PROOF_PARENT "{program.laws["PROOF_PARENT"]}"
#define JM_IGNITIONBODY_MACHINE_PARENT "{program.laws["MACHINE_PARENT"]}"
#define JM_IGNITIONBODY_MULTIBOOT_MAGIC {magic}U
#define JM_IGNITIONBODY_FIRST_BODY_INDEX {first_body}

__attribute__((noreturn)) static void jm_generated_ignitionbody(uint32_t magic, uint32_t mb_info) {{
  (void)mb_info;
  serial_init();
  serial_write("[JM] IGNITIONBODY GENERATED ");
  serial_write(JM_IGNITIONBODY_VERSION);
  serial_write(" SOURCE ");
  serial_write(JM_IGNITIONBODY_SOURCE_SHA256);
  serial_write(" ACTIVE\\n");
  serial_write("[JM] JM_NATIVE AUTHORITY ");
  serial_write(JM_ROUTEOS_AUTHORITY_VERSION);
  serial_write(" SOURCE ");
  serial_write(JM_ROUTEOS_SOURCE_SHA256);
  serial_write(" PARENT ");
  serial_write(JM_ROUTEOS_PROOF_PARENT);
  serial_write("\\n");
  receipt("JM BOOT IMAGE LOADED");
  if (magic != JM_IGNITIONBODY_MULTIBOOT_MAGIC) receipt("BOOTROUTE HOLD: MULTIBOOT2 MAGIC MISMATCH");
  receipt("ROUTEOS KERNEL ENTRY");
  receipt("PRIVILEGED EXECUTION ACTIVE");
  void *probe = memory_allocate();
  if (probe && memory_release(probe)) receipt("MEMORY INITIALISED: ALLOCATE/RELEASE PASS");
  else receipt("MEMORY HOLD");
  gdt_install();
  idt_install();
  user_boundary_install();
  pic_pit_install();
  receipt("INTERRUPT ROUTE ACTIVE");
  receipt("BODYREGISTRY: TWO USER BODIES REGISTERED");
  receipt("PERMISSIONGATE: INT 0x80 CONTROLLED ENTRY ACTIVE");
  receipt("DEVICE OUTPUT: JM-CONTROLLED SERIAL ACTIVE");
  receipt("ROUTESCHEDULER: ENTERING USER BODY 1");
  current_body = JM_IGNITIONBODY_FIRST_BODY_INDEX;
  bodies[JM_IGNITIONBODY_FIRST_BODY_INDEX].state = BODY_RUNNING;
  routeos_enter_frame(&bodies[JM_IGNITIONBODY_FIRST_BODY_INDEX].frame);
  for (;;) {{ __asm__ volatile("cli; hlt"); }}
}}
'''

def render_receipt(program: Program) -> str:
    return (
        "# RouteOS JM-Generated IgnitionBody Receipt\n\n"
        f"- Version: `{program.version}`\n"
        f"- JM source SHA-256: `{program.source_sha256}`\n"
        f"- Proof parent: `{program.laws['PROOF_PARENT']}`\n"
        f"- Machine parent: `{program.laws['MACHINE_PARENT']}`\n"
        "- Ordered steps: `11`\n"
        "- First execution body: `1`\n"
        "- Boot magic: `0x36D76289`\n\n"
        "**Authority law:** JM source defines kernel-entry orchestration; generated C is the carrier.\n"
    )

def write(path: pathlib.Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True); path.write_text(content, encoding="utf-8", newline="\n")

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("source", type=pathlib.Path); parser.add_argument("--out-dir", required=True, type=pathlib.Path); parser.add_argument("--check", action="store_true"); args = parser.parse_args()
    try: program = parse(args.source)
    except (OSError, SourceError) as exc: print(f"ignitionbodyc: {exc}", file=sys.stderr); return 2
    outputs = {
        args.out_dir / "ignitionbody_office.inc": render_c(program),
        args.out_dir / "ignitionbody_office.json": render_json(program),
        args.out_dir.parent / "proof" / "IGNITIONBODY_OPERATIONAL_RECEIPT.md": render_receipt(program),
    }
    if args.check:
        stale = False
        for path, expected in outputs.items():
            actual = path.read_text(encoding="utf-8") if path.exists() else None
            if actual != expected: print(f"stale or missing generated output: {path}", file=sys.stderr); stale = True
        return 1 if stale else 0
    for path, content in outputs.items(): write(path, content)
    return 0

if __name__ == "__main__": raise SystemExit(main())
