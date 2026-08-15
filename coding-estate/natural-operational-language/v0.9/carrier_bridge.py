#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
CORE_PATH = ROOT / "coding-estate" / "everybody" / "full-stack" / "tools" / "full_stack_core.py"

spec = importlib.util.spec_from_file_location("jm_everybody_full_stack_core", CORE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load existing EveryBody emitter core from {CORE_PATH}")
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

SURFACE_ID = "natural-operational-language-surface"
SURFACE_PROFILE = {
    "body": {"id": SURFACE_ID, "name": "JM Natural Operational Language Surface"},
    "family": "human-natural-operational-language",
    "identity_sha256": hashlib.sha256(b"JM Natural Operational Language Surface v0.9").hexdigest(),
    "claim_boundary": (
        "Surface emission bridge only. This does not add a 101st canonical body, does not prove native semantics in every target, "
        "and does not replace sovereign-body compilers. JS/C/Rust embed the portable IR; WAT carries the operation-count proof route."
    ),
}


def normalise_ir(ir: dict[str, Any]) -> dict[str, Any]:
    if ir.get("schema") != "JM.NaturalOperationalPortableIR.v0.9":
        raise ValueError("expected JM.NaturalOperationalPortableIR.v0.9")
    operations = ir.get("operations")
    if not isinstance(operations, list) or not operations:
        raise ValueError("portable IR requires at least one operation")
    return {
        "schema": "jm.everybody.body-ir/0.1",
        "namespace": "jm.surface.natural-operational-language",
        "body": SURFACE_PROFILE["body"],
        "family": SURFACE_PROFILE["family"],
        "identity_sha256": SURFACE_PROFILE["identity_sha256"],
        "operations": [
            {
                "index": index,
                "op": str(item.get("op", "unknown")),
                "value": {
                    "path": item.get("path"),
                    "source": item.get("source"),
                    "law": item.get("law"),
                },
                "source_line": None,
            }
            for index, item in enumerate(operations)
        ],
    }


def emit_target(ir: dict[str, Any], target: str) -> dict[str, Any]:
    target = target.lower()
    if target not in {"ir", "js", "c", "rust", "wat"}:
        raise ValueError(f"unsupported target {target}")
    body_ir = normalise_ir(ir)
    output = core.emit(SURFACE_PROFILE, body_ir, target)
    receipt = {
        "schema": "JM.NaturalOperationalPolyglotEmissionReceipt.v0.9",
        "surface_id": SURFACE_ID,
        "target": target,
        "portable_ir_digest": ir.get("digest"),
        "operation_count": len(body_ir["operations"]),
        "body_ir_sha256": hashlib.sha256(json.dumps(body_ir, sort_keys=True, separators=(",", ":")).encode()).hexdigest(),
        "output_sha256": hashlib.sha256(output.encode()).hexdigest(),
        "claim_boundary": SURFACE_PROFILE["claim_boundary"],
    }
    return {"target": target, "body_ir": body_ir, "output": output, "receipt": receipt}


def emit_all(ir: dict[str, Any]) -> dict[str, Any]:
    return {target: emit_target(ir, target) for target in ("ir", "js", "c", "rust", "wat")}
