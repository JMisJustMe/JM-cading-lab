#!/usr/bin/env python3
"""JM Forward Descendant Router v0.1.

Validates a HANDOFF_COMPLETE / FORWARD_READY closure, binds a frozen parent
keeper into explicit lineage, and re-enters the existing JM Build Intake route.
The router never mutates the parent, creates the descendant executable, or
turns FORWARD_READY into build/new-capability authorization by itself.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "registry/build-routes/JM_FORWARD_DESCENDANT_POLICY_v0.1.json"
INTAKE_SCRIPT = ROOT / "scripts/jm_build_intake.py"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def resolve_path(raw: Path) -> Path:
    return raw if raw.is_absolute() else ROOT / raw


def load_policy(path: Path = DEFAULT_POLICY) -> dict[str, Any]:
    return read_json(path)


def closure_entry_errors(closure: dict[str, Any], policy: dict[str, Any]) -> list[str]:
    required = policy["entry"]
    errors: list[str] = []
    if closure.get("schema") != required["closure_schema"]:
        errors.append(f"closure schema must be {required['closure_schema']}")
    if closure.get("state") != required["closure_state"]:
        errors.append(f"closure state must be {required['closure_state']}")
    if closure.get("forward", {}).get("state") != required["forward_state"]:
        errors.append(f"closure forward.state must be {required['forward_state']}")
    if closure.get("forward", {}).get("frozen_keeper_immutable") is not True:
        errors.append("closure forward.frozen_keeper_immutable must be true")

    pointer = closure.get("stages", {}).get("RECOVERY_POINTER", {})
    if pointer.get("state") != required["recovery_pointer_state"]:
        errors.append("RECOVERY_POINTER must be PASS")
    if not str(pointer.get("pointer") or "").strip():
        errors.append("RECOVERY_POINTER must contain a concrete pointer")

    handoff = closure.get("stages", {}).get("HANDOFF", {})
    if handoff.get("state") != required["handoff_state"]:
        errors.append("HANDOFF must be PASS")
    if handoff.get("handoff_to") != required["handoff_to"]:
        errors.append(f"HANDOFF handoff_to must be {required['handoff_to']!r}")
    return errors


def local_keeper_path(reference: str) -> Path | None:
    raw = reference.strip()
    if raw.startswith("repo:"):
        raw = raw[5:]
    if not raw or raw.startswith(("branch:", "git:", "http://", "https://", "content://", "zionfolder:")):
        return None
    candidate = Path(raw)
    if not candidate.is_absolute():
        candidate = ROOT / candidate
    try:
        candidate.resolve().relative_to(ROOT.resolve())
    except ValueError:
        return None
    return candidate if candidate.exists() and candidate.is_file() else None


def lineage_errors(args: argparse.Namespace, closure: dict[str, Any], policy: dict[str, Any]) -> list[str]:
    errors = closure_entry_errors(closure, policy)
    parent_body = str(closure.get("created_for", {}).get("body", "")).strip()
    if not parent_body:
        errors.append("closure created_for.body is required")
    if not args.descendant_name.strip():
        errors.append("descendant name is required")
    elif args.descendant_name.strip() == parent_body:
        errors.append("descendant name must differ from the closed parent body name")

    relation = args.lineage_relation.upper()
    change_class = args.change_class.upper()
    if relation not in set(policy["lineage_relations"]):
        errors.append(f"unsupported lineage relation {relation!r}")
    if change_class not in set(policy["change_classes"]):
        errors.append(f"unsupported change class {change_class!r}")
    if change_class == "RADICAL_RETHINK" and relation != "FORK":
        errors.append("RADICAL_RETHINK requires lineage relation FORK")
    if not args.change_intent.strip():
        errors.append("change intent is required")

    digest = args.parent_keeper_sha256.strip().lower()
    if not SHA256_RE.fullmatch(digest):
        errors.append("parent keeper SHA-256 must be exactly 64 lowercase/uppercase hex characters")
    if not args.parent_keeper_ref.strip():
        errors.append("parent keeper reference is required")

    local_path = local_keeper_path(args.parent_keeper_ref)
    if local_path and SHA256_RE.fullmatch(digest):
        actual = sha256_file(local_path)
        if actual != digest:
            errors.append(f"parent keeper hash mismatch: expected {digest}, actual {actual}")
    elif not local_path and not args.parent_keeper_evidence:
        errors.append("non-local parent keeper reference requires at least one --parent-keeper-evidence reference")

    if args.authorize_new_capability and not args.authorize:
        errors.append("--authorize-new-capability requires --authorize")
    return errors


def run_intake(args: argparse.Namespace, closure: dict[str, Any], output: Path) -> None:
    parent_body = str(closure["created_for"]["body"])
    selected = list(args.selected_donor)
    if parent_body not in selected:
        selected.insert(0, parent_body)

    cmd = [
        sys.executable,
        str(INTAKE_SCRIPT),
        "--body", args.descendant_name,
        "--body-type", args.body_type,
        "--destination", args.destination,
        "--body-path", args.body_path,
        "--work-pr", str(args.work_pr),
        "--repository", args.repository,
        "--output", str(output),
        "--keyword", parent_body,
        "--keyword", args.change_intent,
    ]
    if args.branch:
        cmd += ["--branch", args.branch]
    for value in args.keyword:
        cmd += ["--keyword", value]
    for value in args.surface:
        cmd += ["--surface", value]
    for value in selected:
        cmd += ["--selected-donor", value]
    for value in args.stack:
        cmd += ["--stack", value]
    if args.recovery_decision:
        cmd += ["--recovery-decision", args.recovery_decision]
    if args.true_gap:
        cmd += ["--true-gap", args.true_gap]
    if args.authorize:
        cmd.append("--authorize")
    if args.authorize_new_capability:
        cmd.append("--authorize-new-capability")
    subprocess.run(cmd, cwd=ROOT, check=True)


def inject_lineage(
    manifest: dict[str, Any],
    args: argparse.Namespace,
    closure: dict[str, Any],
    closure_path: Path,
) -> dict[str, Any]:
    parent_body = str(closure["created_for"]["body"])
    parent_type = str(closure.get("created_for", {}).get("body_type", ""))
    pointer = closure["stages"]["RECOVERY_POINTER"]
    handoff = closure["stages"]["HANDOFF"]
    local_path = local_keeper_path(args.parent_keeper_ref)
    parent_verification = {
        "method": "LOCAL_SHA256_VERIFIED" if local_path else "EVIDENCE_REFERENCE_BOUND",
        "local_path": (
            str(local_path.relative_to(ROOT)) if local_path and local_path.is_relative_to(ROOT) else None
        ),
        "evidence": list(args.parent_keeper_evidence),
    }

    lineage = {
        "router": "JM Forward Descendant Router v0.1",
        "parent_body": parent_body,
        "parent_body_type": parent_type,
        "parent_keeper_ref": args.parent_keeper_ref,
        "parent_keeper_sha256": args.parent_keeper_sha256.lower(),
        "parent_keeper_verification": parent_verification,
        "parent_recovery_pointer": pointer.get("pointer"),
        "closure_ledger": (
            str(closure_path.relative_to(ROOT)) if closure_path.is_relative_to(ROOT) else str(closure_path)
        ),
        "closure_ledger_sha256": sha256_file(closure_path),
        "closure_state": closure.get("state"),
        "closure_forward_state": closure.get("forward", {}).get("state"),
        "handoff_to": handoff.get("handoff_to"),
        "lineage_relation": args.lineage_relation.upper(),
        "change_class": args.change_class.upper(),
        "change_intent": args.change_intent,
        "parent_immutable": True,
        "rule": "Correct forward: preserve the closed keeper; route all change through the separately identified descendant and the normal Estate front door."
    }

    manifest.setdefault("foundation", {})["forward_lineage"] = lineage
    manifest.setdefault("authority", {})["forward_parent"] = {
        "body": parent_body,
        "keeper_ref": args.parent_keeper_ref,
        "keeper_sha256": args.parent_keeper_sha256.lower(),
        "recovery_pointer": pointer.get("pointer"),
        "immutable": True,
    }
    manifest.setdefault("proof_lanes", {})["forward_handoff"] = {
        "state": "PASS",
        "meaning": "The supplied closure ledger was validated as HANDOFF_COMPLETE / FORWARD_READY with an immutable parent, recovery pointer and forward-descendant handoff. This proves lineage-entry eligibility only.",
        "closure_ledger_sha256": sha256_file(closure_path),
    }
    manifest.setdefault("state", {})["forward_descendant_route"] = (
        "LINEAGE_ROUTED_AND_BUILD_AUTHORIZED"
        if manifest.get("state", {}).get("build_authorized_by_manifest") is True
        else "LINEAGE_ROUTED_AWAITING_BUILD_AUTHORIZATION"
    )
    manifest.setdefault("next_route", {})["forward_rule"] = (
        "The descendant must continue through the existing Build Entry Gate / JM Default Execution Body. The frozen parent is not an implementation target."
    )
    base_result = str(manifest.setdefault("manifest_proof", {}).get("result", "")).strip()
    manifest["manifest_proof"]["result"] = (
        "FORWARD LINEAGE PASS — closed immutable parent + recovery pointer + handoff validated; "
        + (base_result or "descendant intake remains governed by the standard Build Route Manifest contract.")
    )
    return manifest


def self_test() -> None:
    policy = load_policy()
    with tempfile.TemporaryDirectory(dir=ROOT) as td:
        root = Path(td)
        parent = root / "parent.bin"
        parent.write_bytes(b"frozen-parent")
        parent_digest = sha256_file(parent)
        closure_path = root / "closure.json"
        closure = {
            "schema": "jm.build-closure/0.1",
            "created_for": {"body": "JM Parent v1.0", "body_type": "proof fixture"},
            "state": "HANDOFF_COMPLETE",
            "stages": {
                "RECOVERY_POINTER": {"state": "PASS", "pointer": "registry/parent-current.json"},
                "HANDOFF": {"state": "PASS", "handoff_to": "forward-descendant-router"},
            },
            "forward": {"state": "FORWARD_READY", "frozen_keeper_immutable": True},
        }
        write_json(closure_path, closure)

        def ns(**overrides: Any) -> argparse.Namespace:
            data = dict(
                descendant_name="JM Parent v1.1",
                lineage_relation="INHERIT",
                change_class="REPAIR",
                change_intent="repair synthetic issue",
                parent_keeper_ref=str(parent),
                parent_keeper_sha256=parent_digest,
                parent_keeper_evidence=[],
                authorize=False,
                authorize_new_capability=False,
            )
            data.update(overrides)
            return argparse.Namespace(**data)

        assert lineage_errors(ns(), closure, policy) == []
        assert any("must differ" in e for e in lineage_errors(ns(descendant_name="JM Parent v1.0"), closure, policy))
        assert any("RADICAL_RETHINK requires" in e for e in lineage_errors(ns(change_class="RADICAL_RETHINK"), closure, policy))
        assert any("hash mismatch" in e for e in lineage_errors(ns(parent_keeper_sha256="0" * 64), closure, policy))

        bad_closure = json.loads(json.dumps(closure))
        bad_closure["forward"]["state"] = "BLOCKED"
        assert any("FORWARD_READY" in e for e in lineage_errors(ns(), bad_closure, policy))

        base_manifest = {
            "schema": "jm.build-route-manifest/0.1",
            "manifest": "JM Build Route Manifest v0.1 — AUTOMATIC INTAKE",
            "instantiation_mode": "prospective-live-route",
            "created_for": {"body": "JM Parent v1.1", "body_type": "proof fixture", "intended_destination": "self-test"},
            "authority": {},
            "foundation": {},
            "exact_stack": {"state": "OPEN"},
            "true_gaps": {"state": "OPEN", "new_capability_creation_authorized": False},
            "proof_lanes": {},
            "host_and_surfaces": {"state": "OPEN"},
            "escalation": {"failure_route": "FAIL LOCAL"},
            "state": {"build_authorized_by_manifest": False},
            "next_route": {"step": "resolve intake"},
            "manifest_proof": {"result": "INTAKE PASS"},
        }
        injected = inject_lineage(base_manifest, ns(), closure, closure_path)
        assert injected["state"]["build_authorized_by_manifest"] is False
        assert injected["true_gaps"]["new_capability_creation_authorized"] is False
        assert injected["foundation"]["forward_lineage"]["parent_immutable"] is True
        assert injected["foundation"]["forward_lineage"]["parent_keeper_sha256"] == parent_digest

    print("JM Forward Descendant Router self-test PASS: FORWARD_READY entry, distinct identity, parent hash binding, radical-fork rule, immutable lineage and fail-closed descendant authorization enforced.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--closure-ledger", type=Path)
    parser.add_argument("--parent-keeper-ref", default="")
    parser.add_argument("--parent-keeper-sha256", default="")
    parser.add_argument("--parent-keeper-evidence", action="append", default=[])
    parser.add_argument("--descendant-name", default="")
    parser.add_argument("--body-type", default="")
    parser.add_argument("--destination", default="")
    parser.add_argument("--body-path", default="")
    parser.add_argument("--work-pr", type=int)
    parser.add_argument("--lineage-relation", default="INHERIT")
    parser.add_argument("--change-class", default="EXTENSION")
    parser.add_argument("--change-intent", default="")
    parser.add_argument("--repository", default="JMisJustMe/JM-cading-lab")
    parser.add_argument("--branch", default="")
    parser.add_argument("--keyword", action="append", default=[])
    parser.add_argument("--surface", action="append", default=[])
    parser.add_argument("--selected-donor", action="append", default=[])
    parser.add_argument("--stack", action="append", default=[])
    parser.add_argument("--recovery-decision", default="")
    parser.add_argument("--true-gap", default="")
    parser.add_argument("--authorize", action="store_true")
    parser.add_argument("--authorize-new-capability", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        if not args.closure_ledger:
            return 0

    required = {
        "--closure-ledger": args.closure_ledger,
        "--parent-keeper-ref": args.parent_keeper_ref,
        "--parent-keeper-sha256": args.parent_keeper_sha256,
        "--descendant-name": args.descendant_name,
        "--body-type": args.body_type,
        "--destination": args.destination,
        "--work-pr": args.work_pr,
        "--change-intent": args.change_intent,
    }
    missing = [name for name, value in required.items() if value in (None, "")]
    if missing:
        parser.error("required for forward routing: " + ", ".join(missing))

    policy = load_policy(resolve_path(args.policy))
    closure_path = resolve_path(args.closure_ledger)
    closure = read_json(closure_path)
    errors = lineage_errors(args, closure, policy)
    if errors:
        parser.error("; ".join(errors))

    output = args.output
    if output is None:
        safe = re.sub(r"[^A-Z0-9]+", "_", args.descendant_name.upper()).strip("_")[:90] or "JM_DESCENDANT"
        output = ROOT / "build-forward-output" / f"{safe}_BUILD_ROUTE_MANIFEST_v0.1.json"
    elif not output.is_absolute():
        output = ROOT / output

    run_intake(args, closure, output)
    manifest = read_json(output)
    manifest = inject_lineage(manifest, args, closure, closure_path)
    write_json(output, manifest)

    print(f"JM Forward Descendant Router PASS: {closure['created_for']['body']} -> {args.descendant_name}")
    print(f"RELATION: {args.lineage_relation.upper()}")
    print(f"CHANGE_CLASS: {args.change_class.upper()}")
    print(f"PARENT_IMMUTABLE: {manifest['foundation']['forward_lineage']['parent_immutable']}")
    print(f"OUTPUT: {output.relative_to(ROOT) if output.is_relative_to(ROOT) else output}")
    print(f"BUILD_AUTHORIZED: {manifest['state']['build_authorized_by_manifest']}")
    print(f"NEW_CAPABILITY_AUTHORIZED: {manifest['true_gaps']['new_capability_creation_authorized']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
