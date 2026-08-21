#!/usr/bin/env python3
"""JM Closure & Handoff Body v0.1.

Routes an execution-closed serious JM build through applicable closure stages.
The ledger records external/native evidence references; it never treats its own
state transition as proof that packaging, freeze, lock, anchor, mount or handoff
actually occurred.
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
DEFAULT_POLICY = ROOT / "registry/build-routes/JM_BUILD_CLOSURE_POLICY_v0.1.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def resolve_path(raw: Path) -> Path:
    return raw if raw.is_absolute() else ROOT / raw


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_policy(path: Path = DEFAULT_POLICY) -> dict[str, Any]:
    return read_json(path)


def execution_entry_errors(execution: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if execution.get("schema") != "jm.build-execution/0.1":
        errors.append("execution schema must be jm.build-execution/0.1")
    if execution.get("state") != "CLOSED":
        errors.append("execution state must be CLOSED")
    if execution.get("closure", {}).get("execution_closed") is not True:
        errors.append("execution closure.execution_closed must be true")
    blockers = [
        name
        for name, gate in execution.get("gates", {}).items()
        if gate.get("state") in {"OPEN", "FAIL"}
    ]
    if blockers:
        errors.append(f"execution still has OPEN/FAIL gates: {blockers}")
    return errors


def init_ledger(execution_path: Path, policy: dict[str, Any]) -> dict[str, Any]:
    execution = read_json(execution_path)
    errors = execution_entry_errors(execution)
    if errors:
        raise ValueError("; ".join(errors))

    stages = {
        name: {
            "state": "OPEN",
            "updated_at": None,
            "evidence": [],
            "note": "",
            "pointer": None,
            "handoff_to": None,
        }
        for name in policy["ordered_stages"]
    }
    created = execution.get("created_for", {})
    timestamp = now_iso()
    return {
        "schema": "jm.build-closure/0.1",
        "name": policy["name"],
        "created_for": created,
        "authority": {
            "execution_ledger": str(execution_path.relative_to(ROOT)) if execution_path.is_relative_to(ROOT) else str(execution_path),
            "execution_ledger_sha256": sha256_file(execution_path),
            "execution_state_at_entry": "CLOSED",
            "donor_authorities": policy.get("donor_authorities", []),
        },
        "state": policy["initial_state"],
        "stages": stages,
        "forward": {
            "state": "BLOCKED",
            "frozen_keeper_immutable": False,
            "rule": "FORWARD_READY is earned only after all applicable closure stages resolve. If FREEZE is PASS, future change must proceed as a descendant rather than mutate the keeper.",
        },
        "history": [
            {
                "at": timestamp,
                "stage": None,
                "from": None,
                "to": "CLOSURE_OPEN",
                "evidence": [f"execution-ledger:{sha256_file(execution_path)}"],
                "note": "Closure initialized from execution CLOSED. No package/freeze/lock/anchor/mount/handoff event is implied.",
            }
        ],
        "claim_boundary": "This ledger records closure routing and cited evidence only. It does not manufacture the external/native proof it references.",
    }


def stage_order(policy: dict[str, Any]) -> list[str]:
    return list(policy["ordered_stages"])


def first_unresolved(ledger: dict[str, Any], policy: dict[str, Any]) -> str | None:
    for name in stage_order(policy):
        if ledger["stages"][name]["state"] in {"OPEN", "FAIL"}:
            return name
    return None


def blockers(ledger: dict[str, Any], policy: dict[str, Any]) -> list[str]:
    return [
        name
        for name in stage_order(policy)
        if ledger["stages"][name]["state"] in {"OPEN", "FAIL"}
    ]


def update_stage(
    ledger: dict[str, Any],
    policy: dict[str, Any],
    stage: str,
    state: str,
    evidence: list[str],
    note: str,
    pointer: str,
    handoff_to: str,
) -> dict[str, Any]:
    stage = stage.upper()
    state = state.upper()
    ordered = stage_order(policy)
    if stage not in ordered:
        raise ValueError(f"unknown closure stage {stage!r}; allowed={ordered}")
    if state not in set(policy["stage_states"]):
        raise ValueError(f"unsupported stage state {state!r}")
    if state == "OPEN" and ledger["stages"][stage]["state"] != "FAIL":
        raise ValueError("OPEN is only valid as a repair/reset transition from FAIL")
    if state == "PASS" and not evidence:
        raise ValueError("PASS requires at least one external/native evidence reference")
    if state == "N/A" and not note.strip():
        raise ValueError("N/A requires an explicit reason; do not skip a closure stage silently")
    if state == "FAIL" and not (evidence or note.strip()):
        raise ValueError("FAIL requires evidence or an explanatory note")
    if state == "OPEN" and not evidence:
        raise ValueError("repair/reset to OPEN requires evidence that corrective work occurred")

    expected = first_unresolved(ledger, policy)
    if expected != stage:
        raise ValueError(f"closure stages are ordered; next unresolved stage is {expected!r}, not {stage!r}")

    if stage == "RECOVERY_POINTER" and state == "PASS" and not pointer.strip():
        raise ValueError("RECOVERY_POINTER PASS requires --pointer")
    if stage == "HANDOFF" and state == "PASS" and not handoff_to.strip():
        raise ValueError("HANDOFF PASS requires --handoff-to")

    proposed = json.loads(json.dumps(ledger))
    current_state = proposed["stages"][stage]["state"]
    proposed["stages"][stage].update({
        "state": state,
        "updated_at": now_iso(),
        "evidence": list(evidence),
        "note": note,
        "pointer": pointer or proposed["stages"][stage].get("pointer"),
        "handoff_to": handoff_to or proposed["stages"][stage].get("handoff_to"),
    })
    proposed["history"].append({
        "at": now_iso(),
        "stage": stage,
        "from": current_state,
        "to": state,
        "evidence": list(evidence),
        "note": note,
        "pointer": pointer or None,
        "handoff_to": handoff_to or None,
    })

    if proposed["stages"]["FREEZE"]["state"] == "PASS":
        proposed["forward"]["frozen_keeper_immutable"] = True

    unresolved = blockers(proposed, policy)
    if not unresolved:
        proposed["state"] = policy["complete_state"]
        proposed["forward"]["state"] = policy["forward_state"]
    else:
        proposed["state"] = "CLOSURE_BLOCKED" if any(
            proposed["stages"][name]["state"] == "FAIL" for name in unresolved
        ) else policy["initial_state"]
        proposed["forward"]["state"] = "BLOCKED"
    return proposed


def self_test() -> None:
    policy = load_policy()
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        bad = root / "bad-execution.json"
        good = root / "good-execution.json"
        ledger_path = root / "closure.json"
        execution = {
            "schema": "jm.build-execution/0.1",
            "created_for": {"body": "JM Closure Self-Test", "body_type": "proof fixture"},
            "state": "PROVING",
            "gates": {"runtime": {"state": "PASS"}},
            "closure": {"execution_closed": False},
        }
        write_json(bad, execution)
        try:
            init_ledger(bad, policy)
        except ValueError:
            pass
        else:
            raise AssertionError("non-CLOSED execution must not initialize closure")

        execution["state"] = "CLOSED"
        execution["closure"]["execution_closed"] = True
        write_json(good, execution)
        ledger = init_ledger(good, policy)
        assert ledger["state"] == "CLOSURE_OPEN"

        try:
            update_stage(ledger, policy, "FREEZE", "PASS", ["self:freeze"], "", "", "")
        except ValueError:
            pass
        else:
            raise AssertionError("stage skipping must fail")

        try:
            update_stage(ledger, policy, "PACKAGE", "PASS", [], "", "", "")
        except ValueError:
            pass
        else:
            raise AssertionError("PASS without evidence must fail")

        ledger = update_stage(ledger, policy, "PACKAGE", "N/A", [], "single-file proof fixture has no package artifact", "", "")
        ledger = update_stage(ledger, policy, "FREEZE", "PASS", ["self:external-freeze-receipt"], "", "", "")
        ledger = update_stage(ledger, policy, "LOCK", "PASS", ["self:external-lock-receipt"], "", "", "")
        ledger = update_stage(ledger, policy, "ANCHOR", "FAIL", ["self:anchor-ding"], "synthetic anchor failure", "", "")
        assert ledger["state"] == "CLOSURE_BLOCKED"
        try:
            update_stage(ledger, policy, "MOUNT", "PASS", ["self:mount"], "", "", "")
        except ValueError:
            pass
        else:
            raise AssertionError("later stage must remain blocked by failed anchor")

        ledger = update_stage(ledger, policy, "ANCHOR", "OPEN", ["self:anchor-repair"], "repair applied; retest anchor", "", "")
        ledger = update_stage(ledger, policy, "ANCHOR", "PASS", ["self:anchor-pass"], "", "", "")
        ledger = update_stage(ledger, policy, "MOUNT", "PASS", ["self:mount-pass"], "", "", "")
        ledger = update_stage(
            ledger, policy, "RECOVERY_POINTER", "PASS", ["self:pointer-resolves"], "",
            "registry/self-test-current-keeper.json", ""
        )
        ledger = update_stage(
            ledger, policy, "HANDOFF", "PASS", ["self:handoff-trace"], "",
            "", "forward-descendant-router"
        )
        write_json(ledger_path, ledger)
        assert ledger["state"] == "HANDOFF_COMPLETE"
        assert ledger["forward"]["state"] == "FORWARD_READY"
        assert ledger["forward"]["frozen_keeper_immutable"] is True
        assert ledger["stages"]["RECOVERY_POINTER"]["pointer"] == "registry/self-test-current-keeper.json"
        assert ledger["stages"]["HANDOFF"]["handoff_to"] == "forward-descendant-router"

    print("JM Closure & Handoff Body self-test PASS: CLOSED-only entry, ordered applicable stages, evidence/N-A discipline, fail-closed Ding recovery, recovery pointer, handoff and FORWARD_READY routing enforced.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--execution-ledger", type=Path)
    parser.add_argument("--state-file", type=Path)
    parser.add_argument("--init", action="store_true")
    parser.add_argument("--stage")
    parser.add_argument("--state")
    parser.add_argument("--evidence", action="append", default=[])
    parser.add_argument("--note", default="")
    parser.add_argument("--pointer", default="")
    parser.add_argument("--handoff-to", default="")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    policy = load_policy(resolve_path(args.policy))
    if args.self_test:
        self_test()
        if not any((args.init, args.stage, args.status)):
            return 0

    if args.init:
        if not args.execution_ledger or not args.state_file:
            parser.error("--init requires --execution-ledger and --state-file")
        execution_path = resolve_path(args.execution_ledger)
        state_path = resolve_path(args.state_file)
        ledger = init_ledger(execution_path, policy)
        write_json(state_path, ledger)
        print(f"JM Closure & Handoff Body initialized: {ledger['created_for'].get('body')} -> CLOSURE_OPEN")
        print(f"STATE_FILE: {state_path.relative_to(ROOT) if state_path.is_relative_to(ROOT) else state_path}")
        print("FORWARD_STATE: BLOCKED")
        return 0

    if args.stage:
        if not args.state_file or not args.state:
            parser.error("--stage requires --state-file and --state")
        state_path = resolve_path(args.state_file)
        ledger = read_json(state_path)
        updated = update_stage(
            ledger, policy, args.stage, args.state, args.evidence, args.note,
            args.pointer, args.handoff_to,
        )
        write_json(state_path, updated)
        print(f"JM Closure & Handoff stage PASS: {args.stage.upper()} {ledger['stages'][args.stage.upper()]['state']} -> {args.state.upper()}")
        print(f"CLOSURE_STATE: {updated['state']}")
        print(f"NEXT_UNRESOLVED: {first_unresolved(updated, policy)}")
        print(f"FORWARD_STATE: {updated['forward']['state']}")
        return 0

    if args.status:
        if not args.state_file:
            parser.error("--status requires --state-file")
        ledger = read_json(resolve_path(args.state_file))
        print(json.dumps({
            "body": ledger.get("created_for", {}).get("body"),
            "state": ledger.get("state"),
            "stages": {name: data.get("state") for name, data in ledger.get("stages", {}).items()},
            "forward": ledger.get("forward"),
        }, indent=2))
        return 0

    parser.error("choose --init, --stage, --status or --self-test")


if __name__ == "__main__":
    raise SystemExit(main())
