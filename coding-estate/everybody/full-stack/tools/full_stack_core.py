#!/usr/bin/env python3
"""Shared proven organs copied into every generated sovereign body package."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

CORE_COMMANDS = {"LAW", "TRACE", "DING"}

TARGET_CONTRACTS = {
    "ir": "JM body-specific intermediate representation",
    "js": "ECMAScript module preserving JM body IR",
    "ts": "TypeScript module preserving JM body IR and inferred type",
    "c": "Portable C11 body-IR carrier",
    "cpp": "Portable C++17 body-IR carrier",
    "cplus": "JM C+ additive capability carrier with identity and permission hooks",
    "cminus": "JM C- minimal auditable carrier preserving identity and consequence",
    "rust": "Rust body-IR carrier",
    "wat": "WebAssembly text body-operation carrier",
}
SUPPORTED_TARGETS = tuple(TARGET_CONTRACTS)


def parse_value(text: str) -> Any:
    text = text.strip()
    if not text:
        return ""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def parse(profile: dict[str, Any], source: str) -> dict[str, Any]:
    body = profile["body"]
    allowed = set(profile["commands"])
    diagnostics: list[dict[str, Any]] = []
    statements: list[dict[str, Any]] = []
    tokens: list[dict[str, Any]] = []
    header: dict[str, Any] | None = None
    ended = False

    normalised = source.replace("\r\n", "\n").replace("\r", "\n")
    for line_number, raw in enumerate(normalised.split("\n"), 1):
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("//"):
            continue
        head, _, rest = stripped.partition(" ")
        op = head.upper()
        tokens.append({"op": op, "raw": raw, "line": line_number, "column": raw.find(head) + 1})

        if header is None:
            parts = stripped.split()
            if len(parts) != 3 or parts[0].upper() != "NATIVE":
                diagnostics.append({"code": "NATIVE_HEADER_REQUIRED", "line": line_number})
            else:
                header = {"body_id": parts[1], "version": parts[2], "line": line_number}
                if parts[1] != body["id"]:
                    diagnostics.append({"code": "BODY_ID_MISMATCH", "line": line_number, "expected": body["id"], "actual": parts[1]})
                if parts[2] != profile["native_version"]:
                    diagnostics.append({"code": "VERSION_MISMATCH", "line": line_number, "expected": profile["native_version"], "actual": parts[2]})
            continue

        if ended:
            diagnostics.append({"code": "AFTER_END", "line": line_number})
            continue
        if op == "END":
            ended = True
            continue
        if op not in allowed:
            diagnostics.append({"code": "COMMAND_NOT_ALLOWED", "line": line_number, "op": op})
            continue
        statements.append({"op": op, "value": parse_value(rest), "line": line_number, "column": raw.find(head) + 1})

    if header is None:
        diagnostics.append({"code": "NATIVE_HEADER_REQUIRED"})
    if not ended:
        diagnostics.append({"code": "END_REQUIRED"})

    laws = [item for item in statements if item["op"] == "LAW"]
    traces = [item for item in statements if item["op"] == "TRACE"]
    dings = [item for item in statements if item["op"] == "DING"]
    if len(laws) != 1:
        diagnostics.append({"code": "ONE_LAW_REQUIRED", "count": len(laws)})
    elif laws[0]["value"] != body["law"]:
        diagnostics.append({"code": "LAW_MISMATCH"})
    if not traces:
        diagnostics.append({"code": "TRACE_REQUIRED"})
    if len(dings) != 1:
        diagnostics.append({"code": "ONE_DING_REQUIRED", "count": len(dings)})
    if not any(item["op"] in profile["required_any"] for item in statements):
        diagnostics.append({"code": "FAMILY_MEANING_NOT_PROVEN", "required_any": profile["required_any"]})
    if profile["capability_commands"] and not any(item["op"] in profile["capability_commands"] for item in statements):
        diagnostics.append({"code": "BODY_CAPABILITY_REQUIRED"})

    ast = {
        "schema": "jm.everybody.full-stack-ast/0.2",
        "body": body,
        "family": profile["family"],
        "statements": statements,
        "source_map": [
            {"index": index, "line": item["line"], "column": item["column"], "op": item["op"]}
            for index, item in enumerate(statements)
        ],
        "source_sha256": hashlib.sha256(source.encode("utf-8")).hexdigest(),
    }
    return {"ok": not diagnostics, "diagnostics": diagnostics, "tokens": tokens, "ast": ast}


def lower_ir(profile: dict[str, Any], ast: dict[str, Any]) -> dict[str, Any]:
    body = profile["body"]
    operations = [item for item in ast["statements"] if item["op"] not in CORE_COMMANDS]
    return {
        "schema": "jm.everybody.body-ir/0.2",
        "namespace": f'jm.body.{body["id"]}',
        "body": body,
        "family": profile["family"],
        "identity_sha256": profile["identity_sha256"],
        "operations": [
            {"index": index, "op": item["op"], "value": item["value"], "source_line": item["line"]}
            for index, item in enumerate(operations)
        ],
    }


def emit(profile: dict[str, Any], ir: dict[str, Any], target: str) -> str:
    if target not in TARGET_CONTRACTS:
        raise ValueError(f"unsupported target {target}")

    body = profile["body"]
    payload = json.dumps(ir, ensure_ascii=False, sort_keys=True)
    # Keep JM arrows, marks and non-ASCII names as native UTF-8. JSON-style
    # \uXXXX escapes are accepted by JavaScript/C JSON strings but are not valid
    # Rust string escapes; one UTF-8 carrier avoids target-specific identity drift.
    escaped_payload = json.dumps(payload, ensure_ascii=False)
    count = len(ir["operations"])
    symbol = body["id"].replace("-", "_").replace("'", "_")
    escaped_body_id = json.dumps(body["id"], ensure_ascii=False)

    if target == "ir":
        return json.dumps(ir, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if target == "js":
        return (
            f"export const JM_BODY_IR = {payload};\n"
            "export function run() { return JM_BODY_IR.operations.length; }\n"
        )
    if target == "ts":
        return (
            f"export const JM_BODY_IR = {payload} as const;\n"
            "export type JMBodyIR = typeof JM_BODY_IR;\n"
            "export function run(): number { return JM_BODY_IR.operations.length; }\n"
        )
    if target == "c":
        return (
            "#include <stddef.h>\n"
            f"const char jm_{symbol}_ir_json[] = {escaped_payload};\n"
            f"size_t jm_{symbol}_run(void) {{ return {count}u; }}\n"
        )
    if target == "cpp":
        return (
            "#include <cstddef>\n"
            f"namespace jm::body::{symbol} {{\n"
            f"inline constexpr const char ir_json[] = {escaped_payload};\n"
            f"constexpr std::size_t run() noexcept {{ return {count}u; }}\n"
            "}\n"
        )
    if target == "cplus":
        return (
            "#include <stddef.h>\n"
            f"#define JM_CPLUS_BODY_ID {escaped_body_id}\n"
            f"#define JM_CPLUS_OPERATION_COUNT {count}u\n"
            f"const char jm_{symbol}_cplus_ir_json[] = {escaped_payload};\n"
            f"struct jm_{symbol}_cplus_receipt {{ const char *body_id; size_t operations; int permission_gate; }};\n"
            f"struct jm_{symbol}_cplus_receipt jm_{symbol}_cplus_run(int permission_gate) {{\n"
            f"  struct jm_{symbol}_cplus_receipt receipt = {{ JM_CPLUS_BODY_ID, JM_CPLUS_OPERATION_COUNT, permission_gate ? 1 : 0 }};\n"
            "  return receipt;\n"
            "}\n"
        )
    if target == "cminus":
        return (
            "#include <stddef.h>\n"
            f"static const char jm_{symbol}_cminus_body_id[] = {escaped_body_id};\n"
            f"enum {{ JM_{symbol.upper()}_CMINUS_OPERATION_COUNT = {count} }};\n"
            f"size_t jm_{symbol}_cminus_run(void) {{ return (size_t)JM_{symbol.upper()}_CMINUS_OPERATION_COUNT; }}\n"
            f"const char *jm_{symbol}_cminus_identity(void) {{ return jm_{symbol}_cminus_body_id; }}\n"
        )
    if target == "rust":
        return (
            f"pub const JM_BODY_IR_JSON: &str = {escaped_payload};\n"
            f"pub fn jm_{symbol}_run() -> usize {{ {count} }}\n"
        )
    if target == "wat":
        return f'(module (func (export "run") (result i32) i32.const {count}))\n'
    raise AssertionError(target)


def compile_source(profile: dict[str, Any], source: str, target: str = "ir") -> dict[str, Any]:
    parsed = parse(profile, source)
    body_id = profile["body"]["id"]
    if not parsed["ok"]:
        return {"ok": False, "body_id": body_id, "diagnostics": parsed["diagnostics"], "parsed": parsed}
    ir = lower_ir(profile, parsed["ast"])
    output = emit(profile, ir, target)
    receipt = {
        "schema": "jm.everybody.full-stack-compile-receipt/0.2",
        "ok": True,
        "body_id": body_id,
        "family": profile["family"],
        "target": target,
        "backend_contract": TARGET_CONTRACTS[target],
        "identity_sha256": profile["identity_sha256"],
        "source_sha256": parsed["ast"]["source_sha256"],
        "ir_sha256": hashlib.sha256(
            json.dumps(ir, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest(),
        "output_sha256": hashlib.sha256(output.encode("utf-8")).hexdigest(),
        "operation_count": len(ir["operations"]),
        "claim_boundary": profile["claim_boundary"],
    }
    return {"ok": True, "body_id": body_id, "parsed": parsed, "ir": ir, "output": output, "receipt": receipt}


def cli(profile: dict[str, Any]) -> int:
    body = profile["body"]
    parser = argparse.ArgumentParser(description=f'{body["name"]} independent generated compiler')
    parser.add_argument("source", type=Path)
    parser.add_argument("--target", choices=list(SUPPORTED_TARGETS), default="ir")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    result = compile_source(profile, args.source.read_text(encoding="utf-8"), args.target)
    if not result["ok"]:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result["output"], encoding="utf-8")
    else:
        print(result["output"], end="")
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(result["receipt"], ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0
