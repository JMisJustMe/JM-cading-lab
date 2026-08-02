#!/usr/bin/env python3
"""Deterministic identity-bound bytecode, verifier and VM for sovereign JM bodies."""
from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path
from typing import Any

MAGIC = b"JMB1"
BYTECODE_SCHEMA = "jm.body.bytecode/0.1"
VM_SCHEMA = "jm.body.vm-receipt/0.1"
HEADER = struct.Struct(">4sH32sI")
INSTRUCTION = struct.Struct(">HII")


class BytecodeError(ValueError):
    """A held bytecode fault that must not silently mutate source authority."""


def stable_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def opcode_table(profile: dict[str, Any]) -> dict[str, int]:
    commands = sorted(set(profile["commands"]) - {"LAW", "TRACE", "DING"})
    seed = int(profile["identity_sha256"][:8], 16)
    base = 0x1000 + (seed % 0x5000)
    if base + len(commands) >= 0xFFFF:
        base = 0x7000 - len(commands)
    return {command: base + index for index, command in enumerate(commands)}


def reverse_opcode_table(profile: dict[str, Any]) -> dict[int, str]:
    return {value: key for key, value in opcode_table(profile).items()}


def compile_ir(profile: dict[str, Any], ir: dict[str, Any]) -> bytes:
    body_id = profile["body"]["id"]
    if ir.get("namespace") != f"jm.body.{body_id}":
        raise BytecodeError("IR_NAMESPACE_MISMATCH")
    if ir.get("identity_sha256") != profile["identity_sha256"]:
        raise BytecodeError("IR_IDENTITY_MISMATCH")

    table = opcode_table(profile)
    body_bytes = body_id.encode("utf-8")
    identity = bytes.fromhex(profile["identity_sha256"])
    operations = ir.get("operations") or []
    output = bytearray(HEADER.pack(MAGIC, len(body_bytes), identity, len(operations)))
    output.extend(body_bytes)
    for index, operation in enumerate(operations):
        op = str(operation.get("op", ""))
        if op not in table:
            raise BytecodeError(f"UNKNOWN_BODY_OPCODE:{op}")
        payload = stable_json(
            {
                "index": index,
                "op": op,
                "value": operation.get("value"),
                "source_line": int(operation.get("source_line") or 0),
            }
        )
        output.extend(
            INSTRUCTION.pack(
                table[op],
                int(operation.get("source_line") or 0),
                len(payload),
            )
        )
        output.extend(payload)
    return bytes(output)


def decode(profile: dict[str, Any], bytecode: bytes) -> dict[str, Any]:
    if len(bytecode) < HEADER.size:
        raise BytecodeError("TRUNCATED_HEADER")
    magic, body_length, identity, instruction_count = HEADER.unpack_from(bytecode, 0)
    if magic != MAGIC:
        raise BytecodeError("MAGIC_MISMATCH")
    cursor = HEADER.size
    body_end = cursor + body_length
    if body_end > len(bytecode):
        raise BytecodeError("TRUNCATED_BODY_ID")
    try:
        body_id = bytecode[cursor:body_end].decode("utf-8")
    except UnicodeDecodeError as exc:
        raise BytecodeError("BODY_ID_UTF8_FAULT") from exc
    cursor = body_end

    expected_body = profile["body"]["id"]
    if body_id != expected_body:
        raise BytecodeError(f"BODY_ID_MISMATCH:{body_id}:{expected_body}")
    identity_hex = identity.hex()
    if identity_hex != profile["identity_sha256"]:
        raise BytecodeError("BODY_IDENTITY_MISMATCH")

    reverse = reverse_opcode_table(profile)
    instructions: list[dict[str, Any]] = []
    for index in range(instruction_count):
        if cursor + INSTRUCTION.size > len(bytecode):
            raise BytecodeError(f"TRUNCATED_INSTRUCTION_HEADER:{index}")
        opcode, source_line, payload_length = INSTRUCTION.unpack_from(bytecode, cursor)
        cursor += INSTRUCTION.size
        payload_end = cursor + payload_length
        if payload_end > len(bytecode):
            raise BytecodeError(f"TRUNCATED_INSTRUCTION_PAYLOAD:{index}")
        if opcode not in reverse:
            raise BytecodeError(f"OPCODE_NOT_AUTHORISED:{opcode}")
        try:
            payload = json.loads(bytecode[cursor:payload_end].decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise BytecodeError(f"PAYLOAD_DECODE_FAULT:{index}") from exc
        cursor = payload_end
        op = reverse[opcode]
        if payload.get("index") != index:
            raise BytecodeError(f"INSTRUCTION_INDEX_MISMATCH:{index}")
        if payload.get("op") != op:
            raise BytecodeError(f"OPCODE_PAYLOAD_MISMATCH:{index}")
        if int(payload.get("source_line") or 0) != source_line:
            raise BytecodeError(f"SOURCE_LINE_MISMATCH:{index}")
        instructions.append(
            {
                "index": index,
                "opcode": opcode,
                "op": op,
                "value": payload.get("value"),
                "source_line": source_line,
            }
        )
    if cursor != len(bytecode):
        raise BytecodeError(f"TRAILING_BYTES:{len(bytecode) - cursor}")
    return {
        "schema": BYTECODE_SCHEMA,
        "body_id": body_id,
        "identity_sha256": identity_hex,
        "instruction_count": instruction_count,
        "instructions": instructions,
        "bytecode_sha256": hashlib.sha256(bytecode).hexdigest(),
    }


def verify(profile: dict[str, Any], bytecode: bytes) -> dict[str, Any]:
    try:
        decoded = decode(profile, bytecode)
    except BytecodeError as exc:
        return {
            "schema": "jm.body.bytecode-verification/0.1",
            "status": "FAULT_HOLD",
            "body_id": profile["body"]["id"],
            "identity_sha256": profile["identity_sha256"],
            "fault": str(exc),
            "bytecode_sha256": hashlib.sha256(bytecode).hexdigest(),
            "recovery": "Restore source/IR authority, recompile through the matching body compiler, then verify again.",
        }
    return {
        "schema": "jm.body.bytecode-verification/0.1",
        "status": "BYTECODE_VERIFIED",
        "body_id": decoded["body_id"],
        "identity_sha256": decoded["identity_sha256"],
        "instruction_count": decoded["instruction_count"],
        "bytecode_sha256": decoded["bytecode_sha256"],
        "opcode_table_sha256": hashlib.sha256(stable_json(opcode_table(profile))).hexdigest(),
    }


def execute(profile: dict[str, Any], bytecode: bytes) -> dict[str, Any]:
    verification = verify(profile, bytecode)
    if verification["status"] != "BYTECODE_VERIFIED":
        return {
            "schema": VM_SCHEMA,
            "status": "FAULT_HOLD",
            "body_id": profile["body"]["id"],
            "identity_sha256": profile["identity_sha256"],
            "fault": verification["fault"],
            "bytecode_sha256": verification["bytecode_sha256"],
            "trace": [],
            "final_state": {},
            "recovery": verification["recovery"],
        }

    decoded = decode(profile, bytecode)
    state: dict[str, Any] = {}
    trace: list[dict[str, Any]] = []
    for instruction in decoded["instructions"]:
        before = dict(state)
        state[instruction["op"]] = instruction["value"]
        trace.append(
            {
                "index": instruction["index"],
                "opcode": instruction["opcode"],
                "op": instruction["op"],
                "source_line": instruction["source_line"],
                "state_before_sha256": hashlib.sha256(stable_json(before)).hexdigest(),
                "state_after_sha256": hashlib.sha256(stable_json(state)).hexdigest(),
            }
        )
    final_state_sha = hashlib.sha256(stable_json(state)).hexdigest()
    return {
        "schema": VM_SCHEMA,
        "status": "VM_EXECUTION_PASS",
        "body_id": decoded["body_id"],
        "identity_sha256": decoded["identity_sha256"],
        "bytecode_sha256": decoded["bytecode_sha256"],
        "instruction_count": decoded["instruction_count"],
        "trace": trace,
        "final_state": state,
        "final_state_sha256": final_state_sha,
        "receipt_sha256": hashlib.sha256(
            stable_json(
                {
                    "body_id": decoded["body_id"],
                    "bytecode_sha256": decoded["bytecode_sha256"],
                    "final_state_sha256": final_state_sha,
                    "instruction_count": decoded["instruction_count"],
                }
            )
        ).hexdigest(),
    }


def compile_source(profile: dict[str, Any], compiler: Any, source: str) -> dict[str, Any]:
    compiled = compiler.compile_source(source, "ir")
    if not compiled["ok"]:
        return {
            "status": "SOURCE_FAULT_HOLD",
            "body_id": profile["body"]["id"],
            "diagnostics": compiled["diagnostics"],
        }
    bytecode = compile_ir(profile, compiled["ir"])
    return {
        "status": "BYTECODE_COMPILE_PASS",
        "body_id": profile["body"]["id"],
        "bytecode": bytecode,
        "verification": verify(profile, bytecode),
        "compile_receipt": compiled["receipt"],
    }


def bytecode_cli(profile: dict[str, Any], compiler: Any) -> int:
    parser = argparse.ArgumentParser(description=f'{profile["body"]["name"]} bytecode compiler')
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    result = compile_source(profile, compiler, args.source.read_text(encoding="utf-8"))
    if result["status"] != "BYTECODE_COMPILE_PASS":
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(result["bytecode"])
    receipt = {
        "schema": "jm.body.bytecode-compile-receipt/0.1",
        "status": result["status"],
        "body_id": result["body_id"],
        "bytecode_sha256": hashlib.sha256(result["bytecode"]).hexdigest(),
        "verification": result["verification"],
        "compile_receipt": result["compile_receipt"],
    }
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    else:
        print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


def vm_cli(profile: dict[str, Any]) -> int:
    parser = argparse.ArgumentParser(description=f'{profile["body"]["name"]} bytecode VM')
    parser.add_argument("bytecode", type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    receipt = execute(profile, args.bytecode.read_bytes())
    rendered = json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0 if receipt["status"] == "VM_EXECUTION_PASS" else 1
