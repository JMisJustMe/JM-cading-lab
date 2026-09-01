#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

BASE_PATH = Path(__file__).with_name("functioning_body_factory.py")
SPEC = importlib.util.spec_from_file_location("jm_functioning_body_factory_v0_1", BASE_PATH)
assert SPEC and SPEC.loader
base = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(base)

_original_primitive_consequence = base.primitive_consequence


def primitive_consequence(state: dict[str, Any], family: str, op: str, payload: Any) -> None:
    """v0.1.1 correction: raw operation memory may not overwrite semantic evidence state."""
    if family != "governance":
        _original_primitive_consequence(state, family, op, payload)
        return

    values = state["values"]
    values[f"last_{op}"] = payload

    if op == "claim":
        values["claim"] = payload
    elif op == "evidence":
        values.setdefault("evidence_items", []).append(payload)
    elif op == "gate":
        values["gate_passed"] = bool(values.get("evidence_items"))
        state["status"] = "passed" if values["gate_passed"] else "held"
    elif op == "pass" and values.get("gate_passed"):
        state["output"] = payload
        state["status"] = "passed"


base.primitive_consequence = primitive_consequence

VERSION = "0.1.1"
EXPECTED_BODY_COUNT = base.EXPECTED_BODY_COUNT
REGISTRIES = base.REGISTRIES
FAMILY_PRIMITIVES = base.FAMILY_PRIMITIVES
stable = base.stable
sha = base.sha
token = base.token
classify = base.classify
load_bodies = base.load_bodies
cap_verbs = base.cap_verbs
dialect = base.dialect
payload = base.payload
proof_source = base.proof_source
parse = base.parse
lower = base.lower
execute = base.execute
receipt = base.receipt
write_json = base.write_json
write_text = base.write_text
build_body = base.build_body
build = base.build
deterministic = base.deterministic


def main() -> int:
    return base.main()


if __name__ == "__main__":
    raise SystemExit(main())
