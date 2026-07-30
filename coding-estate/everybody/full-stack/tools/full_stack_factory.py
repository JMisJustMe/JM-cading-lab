#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

FACTORY_VERSION = "0.1"
NATIVE_VERSION = "3.0"
EXPECTED_BODY_COUNT = 100
REGISTRIES = (
    "coding-estate/everybody/body-registry.json",
    "coding-estate/everybody/body-registry-extension-01.json",
    "coding-estate/everybody/body-registry-extension-02.json",
)
FAMILIES = {
    "route": (["SOURCE", "ROUTE", "STATE", "RECOVER"], ["ROUTE", "STATE"]),
    "logic": (["FACT", "WHEN", "THEN", "OTHERWISE", "DECIDE"], ["WHEN", "DECIDE"]),
    "formula": (["FORM", "BIND", "APPLY", "YIELD"], ["FORM", "APPLY"]),
    "embodied": (["POSE", "CONTACT", "HOLD", "RELEASE", "SHIFT"], ["CONTACT", "POSE"]),
    "compiler": (["SOURCE", "TOKEN", "PARSE", "LOWER", "EMIT"], ["PARSE", "LOWER"]),
    "runtime": (["STATE", "LOAD", "EXEC", "ROUTE", "RECOVER"], ["LOAD", "EXEC"]),
    "game": (["ENTITY", "INPUT", "RULE", "STEP", "COLLIDE", "SCORE"], ["RULE", "STEP"]),
    "governance": (["CLAIM", "EVIDENCE", "GATE", "HOLD", "PASS"], ["GATE", "PASS"]),
    "delivery": (["SOURCE", "MANIFEST", "HASH", "PACKAGE", "OPEN_FIRST"], ["PACKAGE", "OPEN_FIRST"]),
    "visual": (["FIELD", "INPUT", "RENDER", "FEEDBACK", "SYNC"], ["RENDER", "FEEDBACK"]),
    "authoring": (["PROJECT", "BODYREF", "EDIT", "BUILD", "TEST", "EXPORT"], ["BUILD", "TEST"]),
    "composition": (["SOURCE", "TARGET", "CHECK", "BIND", "ROLLBACK"], ["CHECK", "BIND"]),
    "service": (["REGISTER", "LOOKUP", "RESOLVE", "RETURN", "VERSION"], ["REGISTER", "LOOKUP"]),
}
CORE_COMMANDS = ["LAW", "TRACE", "DING"]


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def safe_name(value: str) -> str:
    result = re.sub(r"[^A-Za-z0-9_]+", "_", value).strip("_").lower()
    if not result:
        raise ValueError(f"invalid body id {value!r}")
    return f"body_{result}" if result[0].isdigit() else result


def cap_command(value: str) -> str:
    token = re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").upper()
    return f"CAP_{token or 'UNNAMED'}"


def classify(body: dict[str, Any]) -> str:
    text = re.sub(
        r"[^a-z0-9]+",
        " ",
        " ".join([body["id"], body["name"], body["kind"], *body.get("caps", [])]).lower(),
    )
    checks = (
        (r"gesture|mudra|contact|speech|embodied|body input|paired contact|mood|signal language|pattern tapping|seedform", "embodied"),
        (r"game|playable|glyphplay|gameforge|glyphforge|playform", "game"),
        (r"compiler|parser|frontend|emitter|lexer|syntax body|compiler ir|tokenbody|punctbody|theoc|primebody", "compiler"),
        (r"virtual machine|\bvm\b|opcode|runtime|routevm|jmvm|cadenvm|routecore|routeos|routebox", "runtime"),
        (r"governance|proof|validation|guardrail|register|ledger|gate|dings|reality contact|choice box", "governance"),
        (r"delivery|container|build mode|zionfolder|onebody delivery", "delivery"),
        (r"visual|render|interaction runtime", "visual"),
        (r"ide|lab|builder|authoring|codestudio|language service|pattern library|namebank|lexicon|speakgate", "authoring"),
        (r"composition|graft|smooth|bridge|adapter|combibind|polyglot", "composition"),
        (r"formula|formeula|formulaborn|formula born", "formula"),
        (r"logic|decision", "logic"),
        (r"registry|service|lookup", "service"),
    )
    for pattern, family in checks:
        if re.search(pattern, text):
            return family
    return "route"


def load_bodies(repo: Path) -> list[dict[str, Any]]:
    bodies: list[dict[str, Any]] = []
    seen: dict[str, str] = {}
    for relative in REGISTRIES:
        data = json.loads((repo / relative).read_text(encoding="utf-8"))
        for source in data.get("bodies", []):
            body = dict(source)
            body_id = str(body.get("id", "")).strip()
            if not body_id or body_id in seen:
                raise SystemExit(f"missing or duplicate body id {body_id!r}")
            for field in ("name", "kind", "law"):
                if not str(body.get(field, "")).strip():
                    raise SystemExit(f"body {body_id!r} missing {field}")
            body.setdefault("caps", [])
            body.setdefault("targets", [])
            body.setdefault("needs", [])
            body["registry_source"] = relative
            bodies.append(body)
            seen[body_id] = relative
    if len(bodies) != EXPECTED_BODY_COUNT:
        raise SystemExit(f"expected {EXPECTED_BODY_COUNT} bodies, recovered {len(bodies)}")
    return sorted(bodies, key=lambda item: item["id"])


def profile(body: dict[str, Any]) -> dict[str, Any]:
    family = classify(body)
    family_commands, required = FAMILIES[family]
    cap_commands = [cap_command(str(item)) for item in body["caps"]]
    commands = list(dict.fromkeys([*family_commands, *cap_commands, *CORE_COMMANDS]))
    identity = {key: body[key] for key in ("id", "name", "kind", "law", "registry_source")}
    return {
        "schema": "jm.everybody.full-stack-body/0.1",
        "factory_version": FACTORY_VERSION,
        "native_version": NATIVE_VERSION,
        "body": identity,
        "family": family,
        "family_commands": family_commands,
        "required_any": required,
        "capabilities": body["caps"],
        "capability_commands": cap_commands,
        "commands": commands,
        "declared_targets": body["targets"],
        "known_needs": body["needs"],
        "identity_sha256": sha(stable_json(identity)),
        "law_sha256": sha(body["law"]),
        "parity_state": {
            "P0_REGISTERED": "PASS",
            "P1_CANONICAL_NATIVE": "PASS_BY_EXISTING_V2",
            "P2_FRONTEND": "GENERATED_V0_1",
            "P3_SEMANTICS_IR": "GENERATED_V0_1",
            "P4_COMPILER_RUNTIME": "GENERATED_V0_1",
            "P5_SDK_TOOLING": "GENERATED_V0_1",
            "P6_BODY_KERNEL_SOURCE": "GENERATED_V0_1_NOT_MACHINE_DING",
            "P7_INDEPENDENT_MACHINE": "OPEN",
            "P8_FEDERATION": "CONTRACT_GENERATED_MACHINE_PROOF_OPEN",
            "P9_FREEZE": "OPEN",
        },
        "claim_boundary": "Generated current-canon descendants do not fabricate unrecovered historical syntax or claim an individual QEMU kernel Ding.",
    }


def grammar(current: dict[str, Any]) -> str:
    commands = " | ".join(f'"{item}"' for item in current["commands"])
    return f'''# Body: {current["body"]["id"]}
# Current-canon descendant; not a fabricated historical grammar.
program = header, law, {{ statement }}, trace, ding, end ;
header = "NATIVE", whitespace, "{current["body"]["id"]}", whitespace, "{NATIVE_VERSION}", newline ;
law = "LAW", whitespace, value, newline ;
statement = command, [ whitespace, value ], newline ;
trace = "TRACE", whitespace, value, newline ;
ding = "DING", whitespace, value, newline ;
end = "END", [ newline ] ;
command = {commands} ;
value = json_value | raw_text ;
'''


def fixture(current: dict[str, Any]) -> str:
    body = current["body"]
    selected = list(
        dict.fromkeys(
            [
                current["required_any"][0],
                *current["family_commands"][:2],
                *current["capability_commands"][:1],
            ]
        )
    )
    lines = [
        f'NATIVE {body["id"]} {NATIVE_VERSION}',
        f'LAW {json.dumps(body["law"], ensure_ascii=False)}',
    ]
    lines += [
        f'{op} {json.dumps({"body": body["id"], "command": op, "ordinal": index}, ensure_ascii=False)}'
        for index, op in enumerate(selected, 1)
    ]
    lines += [
        f'TRACE {json.dumps({"body": body["id"], "proof": "full-stack-factory-v0.1"})}',
        f'DING {json.dumps({"body": body["id"], "status": "GENERATED_STACK_EXECUTED_NOT_HARD_KERNEL_DING"})}',
        "END",
    ]
    return "\n".join(lines) + "\n"


def wrapper(current: dict[str, Any]) -> str:
    encoded = repr(json.dumps(current, ensure_ascii=False, sort_keys=True))
    return f'''#!/usr/bin/env python3
import json
try:
    from .core import cli, compile_source as _compile_source, emit as _emit, lower_ir as _lower_ir, parse as _parse
except ImportError:
    from core import cli, compile_source as _compile_source, emit as _emit, lower_ir as _lower_ir, parse as _parse
PROFILE = json.loads({encoded})
BODY = PROFILE["body"]
def parse(source): return _parse(PROFILE, source)
def lower_ir(ast): return _lower_ir(PROFILE, ast)
def emit(ir, target): return _emit(PROFILE, ir, target)
def compile_source(source, target="ir"): return _compile_source(PROFILE, source, target)
def main(): return cli(PROFILE)
if __name__ == "__main__": raise SystemExit(main())
'''


def kernel_blueprint(current: dict[str, Any]) -> str:
    body = current["body"]
    token = int(current["identity_sha256"][:8], 16) & 0x7FFFFFFF
    lines = [
        f"VERSION full-stack-v{FACTORY_VERSION}",
        f"BODY_ID {body['id']}",
        f"BODY_NAME_JSON {json.dumps(body['name'], ensure_ascii=False)}",
        f"BODY_KIND_JSON {json.dumps(body['kind'], ensure_ascii=False)}",
        f"BODY_FAMILY {current['family']}",
        f"BODY_IDENTITY_SHA256 {current['identity_sha256']}",
        f"BODY_LAW_SHA256 {current['law_sha256']}",
        f"KERNEL_OFFICE {safe_name(body['id']).upper()}_BODY_OFFICE",
        f"ROUTEOS_TOKEN {token}",
        "PERMISSIONGATE REQUIRED",
        "ROUTESCHEDULER REQUIRED",
        "FAULTHOLD REQUIRED",
        "RECOVERYBODY REQUIRED",
    ]
    lines += [f"CAPABILITY {json.dumps(str(item), ensure_ascii=False)}" for item in current["capabilities"]]
    lines.append("MACHINE_DING OPEN")
    return "\n".join(lines) + "\n"


def kernel_c(current: dict[str, Any]) -> str:
    body = current["body"]
    symbol = safe_name(body["id"])
    return f'''/* GENERATED BODY KERNEL OFFICE. NOT AN INDIVIDUAL QEMU DING. */
#include <stddef.h>
#define JM_BODY_ID "{body["id"]}"
#define JM_BODY_NAME {json.dumps(body["name"], ensure_ascii=False)}
#define JM_BODY_FAMILY "{current["family"]}"
#define JM_BODY_IDENTITY_SHA256 "{current["identity_sha256"]}"
#define JM_BODY_LAW_SHA256 "{current["law_sha256"]}"
struct jm_{symbol}_kernel_identity {{ const char *body_id; const char *body_name; const char *family; const char *identity_sha256; const char *law_sha256; }};
static const struct jm_{symbol}_kernel_identity jm_{symbol}_kernel_office = {{ JM_BODY_ID, JM_BODY_NAME, JM_BODY_FAMILY, JM_BODY_IDENTITY_SHA256, JM_BODY_LAW_SHA256 }};
size_t jm_{symbol}_kernel_capability_count(void) {{ return {len(current["capabilities"])}u; }}
const void *jm_{symbol}_kernel_identity(void) {{ return &jm_{symbol}_kernel_office; }}
'''


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, value: Any) -> None:
    write(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def generate_body(out: Path, current: dict[str, Any], core_text: str) -> dict[str, Any]:
    body = current["body"]
    module = safe_name(body["id"])
    root = out / "bodies" / body["id"]
    package = root / "sdk" / f"jm_{module}"
    write_json(root / "manifest.json", current)
    write(root / "grammar" / "body.ebnf", grammar(current))
    write(root / "fixtures" / "proof.jmbody", fixture(current))
    write(package / "core.py", core_text)
    write(package / "compiler.py", wrapper(current))
    write(package / "sdk.py", "from .compiler import BODY, PROFILE, compile_source, emit, lower_ir, parse\n")
    write(package / "__init__.py", "from .sdk import *  # noqa: F401,F403\n")
    write(root / "kernel" / "body_kernel.jmroute", kernel_blueprint(current))
    write(root / "kernel" / "body_kernel_office.c", kernel_c(current))
    write_json(
        root / "kernel" / "routeos-body-profile.json",
        {
            "schema": "jm.routeos.body-profile/0.1",
            "body_id": body["id"],
            "identity_sha256": current["identity_sha256"],
            "required_kernel_offices": [
                "PermissionGate",
                "RouteScheduler",
                "FaultHold",
                "RecoveryBody",
                "BodyRegistry",
                "UserBoundary",
            ],
            "fault_identity_preserved": True,
            "independent_machine_state": "OPEN",
        },
    )
    write_json(
        root / "interop" / "contract.json",
        {
            "schema": "jm.everybody.interop-contract/0.1",
            "body_id": body["id"],
            "source_namespace": f'jm.body.{body["id"]}',
            "exchange_boundary": "jm.onebody.exchange/0.1",
            "identity_sha256": current["identity_sha256"],
            "must_preserve": ["body_id", "law", "source_map", "permissions", "trace", "fault_identity"],
            "forbidden": ["silent_alias_collapse", "law_replacement", "source_authority_transfer", "anonymous_fault"],
        },
    )
    return {
        "body_id": body["id"],
        "body_name": body["name"],
        "family": current["family"],
        "identity_sha256": current["identity_sha256"],
        "parity_state": current["parity_state"],
    }


def generate(repo: Path, out: Path, selected: str | None = None) -> dict[str, Any]:
    bodies = load_bodies(repo)
    if selected:
        bodies = [item for item in bodies if item["id"] == selected]
        if not bodies:
            raise SystemExit(f"unknown body id {selected!r}")
    core_text = (Path(__file__).resolve().parent / "full_stack_core.py").read_text(encoding="utf-8")
    entries = [generate_body(out, profile(body), core_text) for body in bodies]
    federation = {
        "schema": "jm.everybody.full-stack-federation/0.1",
        "factory_version": FACTORY_VERSION,
        "body_count": len(entries),
        "body_ids": [item["body_id"] for item in entries],
        "entries": entries,
        "exchange_boundary": "jm.onebody.exchange/0.1",
        "laws": [
            "shared_organs_do_not_erase_identity",
            "individual_complete_lane",
            "collective_adapter_is_explicit",
            "no_hard_kernel_ding_without_machine_proof",
        ],
    }
    write_json(out / "federation.json", federation)
    write_json(
        out / "BUILD_RECEIPT.json",
        {
            "schema": "jm.everybody.full-stack-build-receipt/0.1",
            "factory_version": FACTORY_VERSION,
            "body_count": len(entries),
            "expected_registry_count": EXPECTED_BODY_COUNT,
            "selected_body": selected,
            "federation_sha256": sha(stable_json(federation)),
            "status": "FULL_STACK_FACTORY_GENERATION_PASS",
            "hard_kernel_status": "OPEN_PER_BODY",
            "claim_boundary": "Generation pass only; individual and collective machine Ding remain open.",
        },
    )
    return federation


def tree_digest(path: Path) -> str:
    digest = hashlib.sha256()
    for item in sorted(path_item for path_item in path.rglob("*") if path_item.is_file()):
        digest.update(item.relative_to(path).as_posix().encode())
        digest.update(b"\0")
        digest.update(item.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def discover_repo() -> Path:
    here = Path(__file__).resolve()
    for candidate in [here.parent, *here.parents]:
        if (candidate / REGISTRIES[0]).exists():
            return candidate
    return Path.cwd()


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate sovereign full-stack packages for all JM coding bodies.")
    parser.add_argument("--repo-root", type=Path, default=discover_repo())
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "generated")
    parser.add_argument("--body")
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    repo = args.repo_root.resolve()
    out = args.out.resolve()
    if args.check:
        with tempfile.TemporaryDirectory(prefix="jm-full-stack-") as temp:
            expected = Path(temp) / "generated"
            generate(repo, expected, args.body)
            if not out.exists() or tree_digest(out) != tree_digest(expected):
                raise SystemExit("generated full-stack output is missing or stale")
        return 0
    if args.clean and out.exists():
        shutil.rmtree(out)
    federation = generate(repo, out, args.body)
    print(
        json.dumps(
            {
                "status": "FULL_STACK_FACTORY_GENERATION_PASS",
                "body_count": federation["body_count"],
                "out": str(out),
                "tree_sha256": tree_digest(out),
                "hard_kernel_status": "OPEN_PER_BODY",
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
