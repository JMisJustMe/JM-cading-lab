#!/usr/bin/env python3
"""JM Default Execution Body v0.1.

Routes an already-authorized serious JM build through explicit execution states.
It records evidence references and native-gate states; it does not manufacture
runtime/contact/closure proof and never treats the ledger itself as a crown.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "registry/build-routes/JM_BUILD_EXECUTION_POLICY_v0.1.json"
VALID_GATE_STATES = {"OPEN", "PASS", "FAIL", "N/A"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def load_policy(path: Path = DEFAULT_POLICY) -> dict[str, Any]:
    return read_json(path)


def resolve_path(raw: Path) -> Path:
    return raw if raw.is_absolute() else ROOT / raw


def parse_gate(raw: str) -> tuple[str, str]:
    if "=" not in raw:
        raise ValueError(f"gate must be NAME=STATE, got {raw!r}")
    name, state = raw.split("=", 1)
    name, state = name.strip(), state.strip().upper()
    if not name:
        raise ValueError("gate name cannot be empty")
    if state not in VALID_GATE_STATES:
        raise ValueError(f"unsupported gate state {state!r}; allowed={sorted(VALID_GATE_STATES)}")
    return name, state


def manifest_authorization_errors(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if manifest.get("schema") != "jm.build-route-manifest/0.1":
        errors.append("manifest schema must be jm.build-route-manifest/0.1")
    if manifest.get("instantiation_mode") != "prospective-live-route":
        errors.append("execution requires a prospective-live-route manifest")
    if manifest.get("state", {}).get("build_authorized_by_manifest") is not True:
        errors.append("state.build_authorized_by_manifest must be true")
    created = manifest.get("created_for", {})
    for key in ("body", "body_type", "intended_destination"):
        if not str(created.get(key, "")).strip():
            errors.append(f"created_for.{key} is required")
    return errors


def init_ledger(manifest_path: Path, policy: dict[str, Any]) -> dict[str, Any]:
    manifest = read_json(manifest_path)
    errors = manifest_authorization_errors(manifest)
    if errors:
        raise ValueError("; ".join(errors))

    created = manifest["created_for"]
    authority = manifest.get("authority", {})
    true_gaps = manifest.get("true_gaps", {})
    timestamp = now_iso()
    return {
        "schema": "jm.build-execution/0.1",
        "name": "JM Default Execution Body v0.1",
        "created_for": {
            "body": created["body"],
            "body_type": created["body_type"],
            "intended_destination": created["intended_destination"],
            "body_path": created.get("body_path", ""),
        },
        "authority": {
            "route_manifest": str(manifest_path.relative_to(ROOT)) if manifest_path.is_relative_to(ROOT) else str(manifest_path),
            "route_manifest_sha256": sha256_file(manifest_path),
            "work_pr": authority.get("work_pr"),
            "head_branch": authority.get("head_branch"),
            "build_authorized_by_manifest": True,
            "new_capability_creation_authorized": true_gaps.get("new_capability_creation_authorized", False) is True,
        },
        "state": policy["initial_state"],
        "resume_state": None,
        "gates": {},
        "no_native_gates_justification": None,
        "history": [
            {
                "at": timestamp,
                "from": None,
                "to": policy["initial_state"],
                "evidence": [f"route-manifest:{sha256_file(manifest_path)}"],
                "note": "Execution initialized from an explicitly authorized prospective Build Route Manifest. No runtime/contact/closure proof is implied.",
            }
        ],
        "last_ding": None,
        "closure": {
            "execution_closed": False,
            "freeze_lock_anchor_mount_claimed": False,
            "rule": "CLOSED is execution-route closure only; freeze/lock/anchor/mount require separate applicable evidence/built-ins."
        },
    }


def gate_blockers(ledger: dict[str, Any]) -> list[str]:
    return [name for name, gate in ledger.get("gates", {}).items() if gate.get("state") in {"OPEN", "FAIL"}]


def apply_gate_updates(ledger: dict[str, Any], raw_gates: list[str], evidence: list[str]) -> None:
    for raw in raw_gates:
        name, state = parse_gate(raw)
        ledger.setdefault("gates", {})[name] = {
            "state": state,
            "updated_at": now_iso(),
            "evidence": list(evidence),
        }


def transition(
    ledger: dict[str, Any],
    policy: dict[str, Any],
    target: str,
    evidence: list[str],
    gates: list[str],
    note: str,
    no_native_gates_justification: str,
) -> dict[str, Any]:
    current = ledger["state"]
    if not evidence:
        raise ValueError("every post-initialization transition requires at least one --evidence reference")

    if no_native_gates_justification:
        ledger["no_native_gates_justification"] = no_native_gates_justification.strip()

    # Work on a copy-like structure only after all transition-specific checks pass.
    proposed = json.loads(json.dumps(ledger))
    if no_native_gates_justification:
        proposed["no_native_gates_justification"] = no_native_gates_justification.strip()
    apply_gate_updates(proposed, gates, evidence)

    if any(gate.get("state") == "FAIL" for gate in proposed.get("gates", {}).values()) and target != policy["escalation_state"]:
        raise ValueError("a registered FAIL gate requires transition to ESCALATED; do not continue through a red Ding")

    if target == policy["escalation_state"]:
        if current not in set(policy["escalatable_states"]):
            raise ValueError(f"state {current} cannot escalate")
        if not gates and not note:
            raise ValueError("ESCALATED requires a failing gate update or explanatory --note")
        proposed["resume_state"] = current
        proposed["last_ding"] = {
            "at": now_iso(),
            "from_state": current,
            "evidence": evidence,
            "note": note or "Execution escalated on a recorded Ding/failure.",
        }
    elif current == policy["escalation_state"]:
        expected = proposed.get("resume_state")
        if target != expected:
            raise ValueError(f"ESCALATED must recover to recorded resume_state {expected!r}, not {target!r}")
        if any(gate.get("state") == "FAIL" for gate in proposed.get("gates", {}).values()):
            raise ValueError("cannot recover from ESCALATED while any gate remains FAIL")
        proposed["resume_state"] = None
    else:
        allowed = set(policy["normal_transitions"].get(current, []))
        if target not in allowed:
            raise ValueError(f"illegal execution transition {current} -> {target}; allowed={sorted(allowed)}")

    if target == "PROVING":
        if not proposed.get("gates") and not proposed.get("no_native_gates_justification"):
            raise ValueError("PROVING requires at least one registered gate or --no-native-gates-justification")

    if target in {"PASS", "CLOSING", "CLOSED"}:
        blockers = gate_blockers(proposed)
        if blockers:
            raise ValueError(f"{target} blocked by OPEN/FAIL gates: {blockers}")
        if not proposed.get("gates") and not proposed.get("no_native_gates_justification"):
            raise ValueError(f"{target} requires registered gates or an explicit no-native-gates justification")

    proposed["state"] = target
    proposed.setdefault("history", []).append({
        "at": now_iso(),
        "from": current,
        "to": target,
        "evidence": evidence,
        "gate_updates": gates,
        "note": note,
    })
    if target == "CLOSED":
        proposed["closure"]["execution_closed"] = True
    return proposed


def self_test() -> None:
    policy = load_policy()
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        unauthorized = root / "unauthorized.json"
        authorized = root / "authorized.json"
        base_manifest = {
            "schema": "jm.build-route-manifest/0.1",
            "instantiation_mode": "prospective-live-route",
            "created_for": {
                "body": "JM Execution Self-Test",
                "body_type": "proof fixture",
                "intended_destination": "self-test only",
            },
            "authority": {"work_pr": 0, "head_branch": "self-test"},
            "true_gaps": {"new_capability_creation_authorized": False},
            "state": {"build_authorized_by_manifest": False},
        }
        write_json(unauthorized, base_manifest)
        try:
            init_ledger(unauthorized, policy)
        except ValueError:
            pass
        else:
            raise AssertionError("unauthorized manifest must not initialize execution")

        base_manifest["state"]["build_authorized_by_manifest"] = True
        write_json(authorized, base_manifest)
        ledger = init_ledger(authorized, policy)
        assert ledger["state"] == "AUTHORIZED"
        assert ledger["authority"]["new_capability_creation_authorized"] is False

        try:
            transition(ledger, policy, "PASS", ["self:test"], [], "", "")
        except ValueError:
            pass
        else:
            raise AssertionError("state skipping must fail")

        ledger = transition(ledger, policy, "COMPOSING", ["self:compose"], [], "", "")
        ledger = transition(ledger, policy, "CONTACTABLE", ["self:contactable"], [], "", "")
        ledger = transition(ledger, policy, "PROVING", ["self:proof-start"], ["runtime=OPEN"], "", "")
        try:
            transition(ledger, policy, "PASS", ["self:premature-pass"], [], "", "")
        except ValueError:
            pass
        else:
            raise AssertionError("OPEN gate must block PASS")

        ledger = transition(ledger, policy, "ESCALATED", ["self:ding"], ["runtime=FAIL"], "synthetic Ding", "")
        assert ledger["resume_state"] == "PROVING"
        ledger = transition(ledger, policy, "PROVING", ["self:repair"], ["runtime=OPEN"], "repair applied; retest", "")
        ledger = transition(ledger, policy, "PASS", ["self:runtime-pass"], ["runtime=PASS"], "", "")
        ledger = transition(ledger, policy, "CLOSING", ["self:close-start"], [], "", "")
        ledger = transition(ledger, policy, "CLOSED", ["self:close-pass"], [], "", "")
        assert ledger["closure"]["execution_closed"] is True
        assert any(item["to"] == "ESCALATED" for item in ledger["history"])

    print("JM Default Execution Body self-test PASS: authorization, ordered states, gate blocking, Ding escalation/recovery and truthful closure routing enforced.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--state-file", type=Path)
    parser.add_argument("--init", action="store_true")
    parser.add_argument("--to")
    parser.add_argument("--evidence", action="append", default=[])
    parser.add_argument("--gate", action="append", default=[])
    parser.add_argument("--note", default="")
    parser.add_argument("--no-native-gates-justification", default="")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        if not any((args.init, args.to, args.status)):
            return 0

    policy = load_policy(resolve_path(args.policy))
    if args.init:
        if not args.manifest or not args.state_file:
            parser.error("--init requires --manifest and --state-file")
        manifest_path = resolve_path(args.manifest)
        state_path = resolve_path(args.state_file)
        ledger = init_ledger(manifest_path, policy)
        write_json(state_path, ledger)
        print(f"JM Default Execution Body initialized: {ledger['created_for']['body']} -> AUTHORIZED")
        print(f"STATE_FILE: {state_path.relative_to(ROOT) if state_path.is_relative_to(ROOT) else state_path}")
        print(f"NEW_CAPABILITY_AUTHORIZED: {ledger['authority']['new_capability_creation_authorized']}")
        return 0

    if args.to:
        if not args.state_file:
            parser.error("--to requires --state-file")
        state_path = resolve_path(args.state_file)
        ledger = read_json(state_path)
        updated = transition(
            ledger,
            policy,
            args.to.upper(),
            args.evidence,
            args.gate,
            args.note,
            args.no_native_gates_justification,
        )
        write_json(state_path, updated)
        print(f"JM Default Execution Body transition PASS: {ledger['state']} -> {updated['state']}")
        if updated["state"] == "ESCALATED":
            print(f"RESUME_STATE: {updated['resume_state']}")
        blockers = gate_blockers(updated)
        print(f"GATE_BLOCKERS: {blockers}")
        return 0

    if args.status:
        if not args.state_file:
            parser.error("--status requires --state-file")
        ledger = read_json(resolve_path(args.state_file))
        print(json.dumps({
            "body": ledger.get("created_for", {}).get("body"),
            "state": ledger.get("state"),
            "resume_state": ledger.get("resume_state"),
            "gates": ledger.get("gates"),
            "execution_closed": ledger.get("closure", {}).get("execution_closed"),
            "new_capability_creation_authorized": ledger.get("authority", {}).get("new_capability_creation_authorized"),
        }, indent=2))
        return 0

    parser.error("choose --init, --to, --status or --self-test")


if __name__ == "__main__":
    raise SystemExit(main())
