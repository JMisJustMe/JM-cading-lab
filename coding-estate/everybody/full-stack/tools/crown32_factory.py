#!/usr/bin/env python3
"""Generate a 32-gate, identity-bound crown contract for every sovereign body package."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import full_stack_factory as base

FACTORY_VERSION = "0.1"

GATES: tuple[tuple[int, str, str, str], ...] = (
    (1, "identity_source_authority", "Identity & Source Authority", "CURRENT_CANON_PASS_HISTORICAL_RECONCILIATION_OPEN"),
    (2, "native_notation_input", "Native Notation / Input", "CURRENT_CANON_DESCENDANT_PASS_EXACT_NATIVE_OPEN"),
    (3, "lexer_input_reader", "Lexer / Input Reader", "GENERATED_PASS"),
    (4, "parser", "Parser", "GENERATED_PASS"),
    (5, "ast_structural_body", "AST / Structural Body", "GENERATED_PASS"),
    (6, "semantic_law", "Semantic Law", "CURRENT_CONSTRUCTIBLE_MACHINE_PASS"),
    (7, "specialist_ir", "Specialist IR", "CURRENT_CONSTRUCTIBLE_MACHINE_PASS"),
    (8, "lowering", "Verified Lowering", "GENERATED_PASS"),
    (9, "compiler_interpreter", "Compiler / Interpreter", "GENERATED_PASS"),
    (10, "runtime", "Runtime", "CURRENT_CONSTRUCTIBLE_MACHINE_PASS"),
    (11, "vm_native_engine", "VM / Native Engine", "ROLE_APPROPRIATE_NATIVE_INDIVIDUALITY_OPEN"),
    (12, "sdk", "SDK", "GENERATED_PASS"),
    (13, "package_module_system", "Package / Module System", "PARTIAL_OPEN"),
    (14, "language_services", "Language Services", "OPEN"),
    (15, "debugger_trace_inspector", "Debugger / Trace Inspector", "TRACE_PASS_DEBUGGER_OPEN"),
    (16, "test_conformance", "Test & Conformance Suite", "CURRENT_CANON_PASS_EXACT_NATIVE_OPEN"),
    (17, "fault_recovery", "FaultHold & RecoveryBody", "MACHINE_PASS"),
    (18, "security_permissiongate", "Security / PermissionGate", "MACHINE_PASS"),
    (19, "c_backend", "C Backend", "GENERATED_AND_SYNTAX_TESTED"),
    (20, "cpp_backend", "C++ Backend", "GENERATED_AND_SYNTAX_TESTED"),
    (21, "cplus_backend", "JM C+ Additive Backend", "GENERATED_AND_SYNTAX_TESTED"),
    (22, "cminus_backend", "JM C- Minimal Backend", "GENERATED_AND_SYNTAX_TESTED"),
    (23, "rust_backend", "Rust Backend", "GENERATED_AND_SYNTAX_TESTED"),
    (24, "js_ts_backend", "JavaScript / TypeScript Backend", "GENERATED_PASS"),
    (25, "wasm_backend", "WebAssembly Backend", "WAT_GENERATED_BINARY_RUNTIME_OPEN"),
    (26, "android_gradle", "Android SDK / Gradle Route", "OPEN_PER_BODY"),
    (27, "desktop_server_build", "Desktop / Server Build Route", "OPEN_PER_BODY"),
    (28, "kernel_deep_runtime", "Kernel / Deep Runtime", "CURRENT_CONSTRUCTIBLE_MACHINE_PASS"),
    (29, "self_hosting", "Self-Hosting / Role Equivalent", "OPEN_PER_BODY"),
    (30, "substantial_product", "Substantial Native Product", "OPEN_PER_BODY"),
    (31, "federation", "Federation Without Collapse", "CURRENT_CONSTRUCTIBLE_MACHINE_PASS"),
    (32, "deterministic_crown", "Deterministic Crown", "FINAL_NATIVE_CROWN_OPEN"),
)

assert len(GATES) == 32
assert [item[0] for item in GATES] == list(range(1, 33))


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_json(value: Any) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest()


def gate_record(body: dict[str, Any], gate: tuple[int, str, str, str]) -> dict[str, Any]:
    number, gate_id, name, status = gate
    evidence: list[str] = []
    if status in {"MACHINE_PASS", "CURRENT_CONSTRUCTIBLE_MACHINE_PASS"}:
        evidence.append("PR62_CURRENT_CONSTRUCTIBLE_MACHINE_SCOPE")
    if "GENERATED" in status:
        evidence.append("EVERYBODY_FULL_STACK_FACTORY")
    if number in {19, 20, 21, 22, 23, 24, 25}:
        evidence.append("CROWN32_MULTI_BACKEND_EXPANSION_V0_1")
    return {
        "number": number,
        "id": gate_id,
        "name": name,
        "status": status,
        "body_id": body["id"],
        "evidence": evidence,
        "claim_boundary": "A generated or current-constructible pass is not an exact historical-native or final product crown.",
    }


def contract(manifest: dict[str, Any]) -> dict[str, Any]:
    body = manifest["body"]
    gates = [gate_record(body, gate) for gate in GATES]
    counts: dict[str, int] = {}
    for gate in gates:
        counts[gate["status"]] = counts.get(gate["status"], 0) + 1
    value = {
        "schema": "jm.everybody.crown32-body-contract/0.1",
        "factory_version": FACTORY_VERSION,
        "census_scope": "FIRST_ENGINEERING_BATCH_OPEN_APPEND_ONLY",
        "body": body,
        "body_identity_sha256": manifest["identity_sha256"],
        "gates": gates,
        "status_counts": counts,
        "final_crown": "OPEN",
        "next_required_route": [
            "recover_or_authorise_exact_native_source",
            "materially_body_authored_toolchain",
            "self_hosting_or_role_equivalent",
            "real_device_or_physical_proof_where_applicable",
            "substantial_body_native_product",
            "deterministic_final_crown",
        ],
    }
    value["contract_sha256"] = sha256_json(value)
    return value


def generate(repo: Path, out: Path) -> dict[str, Any]:
    bodies = base.load_bodies(repo)
    body_records: list[dict[str, Any]] = []
    for source_body in bodies:
        current = base.profile(source_body)
        body_id = current["body"]["id"]
        manifest_path = out / "bodies" / body_id / "manifest.json"
        if not manifest_path.is_file():
            raise SystemExit(f"base body manifest missing: {manifest_path}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        current_contract = contract(manifest)
        contract_path = out / "bodies" / body_id / "crown32" / "contract.json"
        contract_path.parent.mkdir(parents=True, exist_ok=True)
        contract_path.write_text(
            json.dumps(current_contract, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        body_records.append(
            {
                "body_id": body_id,
                "identity_sha256": manifest["identity_sha256"],
                "contract_sha256": current_contract["contract_sha256"],
                "gate_count": len(current_contract["gates"]),
                "final_crown": current_contract["final_crown"],
            }
        )

    register = {
        "schema": "jm.everybody.crown32-register/0.1",
        "status": "CROWN32_CONTRACTS_GENERATED_NOT_FINAL_CROWNS",
        "census_rule": "OPEN_APPEND_ONLY",
        "first_engineering_batch": len(body_records),
        "gate_count_per_body": 32,
        "total_gate_records": len(body_records) * 32,
        "bodies": body_records,
    }
    register["register_sha256"] = sha256_json(register)
    (out / "CROWN32_REGISTER.json").write_text(
        json.dumps(register, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    receipt = {
        "schema": "jm.everybody.crown32-generation-receipt/0.1",
        "status": "CROWN32_100_BODY_CONTRACT_GENERATION_PASS",
        "body_count": len(body_records),
        "gate_count_per_body": 32,
        "total_gate_records": len(body_records) * 32,
        "register_sha256": register["register_sha256"],
        "final_native_crowns": 0,
        "claim_boundary": "This receipt proves complete per-body Crown32 contracts, not completion of every open gate.",
    }
    (out / "CROWN32_RECEIPT.json").write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate 32-gate contracts for every body package")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    receipt = generate(args.repo_root.resolve(), args.out.resolve())
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
