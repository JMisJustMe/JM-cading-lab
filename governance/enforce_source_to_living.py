from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

CHAIN = [
    "Source Ledger",
    "Latest Body Finder",
    "Source-Body Auditor",
    "Current Best Register",
    "Crown Register",
    "Living Register",
]
CHAIN_IDS = [
    "source-ledger",
    "latest-body-finder",
    "source-body-auditor",
    "current-best-register",
    "crown-register",
    "living-register",
]
STAGE_KEYS = [item.lower().replace("-", "_").replace(" ", "_") for item in CHAIN]
SENSITIVE_KEYS = {
    "private_custody",
    "private_path",
    "owner_notes",
    "owner_note",
    "local_path",
    "local_file",
    "source_path",
    "email",
    "phone",
    "address",
    "birthdate",
}


class GateError(RuntimeError):
    pass


def load_json(path: Path) -> dict:
    if not path.is_file():
        raise GateError(f"missing required source: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise GateError(f"unreadable JSON at {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise GateError(f"expected object at {path}")
    return value


def required_text(record: dict, key: str, label: str) -> str:
    value = record.get(key)
    if not isinstance(value, str) or not value.strip():
        raise GateError(f"{label} requires non-empty {key}")
    return value.strip()


def optional_text(record: dict, key: str, label: str) -> str:
    value = record.get(key, "")
    if value is None:
        return ""
    if not isinstance(value, str):
        raise GateError(f"{label} {key} must be text")
    return value.strip()


def text_list(record: dict, key: str, label: str) -> list[str]:
    value = record.get(key)
    if not isinstance(value, list) or not value:
        raise GateError(f"{label} requires non-empty {key} list")
    cleaned: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise GateError(f"{label} {key} contains a blank/non-text item")
        cleaned.append(item.strip())
    return cleaned


def digest(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def sensitive_paths(value: object, prefix: str = "") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            if str(key).lower() in SENSITIVE_KEYS:
                found.append(path)
            found.extend(sensitive_paths(child, path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(sensitive_paths(child, f"{prefix}[{index}]"))
    return found


def validate_public_route(route: str, label: str, allowed_hosts: set[str]) -> None:
    if not route:
        return
    parsed = urlparse(route)
    if parsed.scheme != "https" or not parsed.netloc:
        raise GateError(f"{label} public route must be an absolute HTTPS URL")
    if parsed.hostname not in allowed_hosts:
        raise GateError(f"{label} public route host is not governed: {parsed.hostname}")
    if parsed.username or parsed.password or parsed.fragment:
        raise GateError(f"{label} public route contains forbidden credentials or fragment")


def crown_class(status: str, flags: list[str]) -> str:
    value = status.lower()
    flag_text = " ".join(flags).lower()
    if "working-crown" in value or "working-crown" in flag_text:
        return "WORKING_CROWN"
    if "frozen" in value or "frozen" in flag_text:
        return "FROZEN_CROWN"
    if "proven" in value:
        return "PROVEN_AUTHORITY"
    if "packaged" in value:
        return "PACKAGED_AUTHORITY"
    if "complete" in value or "complete" in flag_text:
        return "COMPLETE_SCOPED_BODY"
    if "active" in value:
        return "ACTIVE_WORKING_BODY"
    return "REGISTERED_WITHOUT_FINAL_CROWN"


def make_stages(
    *,
    record_id: str,
    name: str,
    version: str,
    status: str,
    proof: str,
    route: str,
    next_action: str,
    connections: list[str],
    flags: list[str],
    record_kind: str,
    audit_basis: list[str],
) -> dict[str, dict]:
    promoted = bool(route)
    return {
        "source_ledger": {
            "state": "RECORDED",
            "record_id": record_id,
            "record_kind": record_kind,
            "source_label": name,
            "evidence": proof,
        },
        "latest_body_finder": {
            "state": "IDENTIFIED",
            "current_label": f"{name} — {version}",
            "version_label": version,
            "law": "A higher version number does not supersede missing behaviour or proof.",
        },
        "source_body_auditor": {
            "state": "PASS_PUBLIC_PROMOTION" if promoted else "PASS_OWNER_REGISTRATION",
            "proof": proof,
            "audit_basis": audit_basis,
            "private_owner_fields_present": False,
        },
        "current_best_register": {
            "state": "RECORDED",
            "decision": status,
            "scope": "current public-contract entry; not an automatic universal source crown",
            "basis": proof,
            "version_number_coronation": False,
        },
        "crown_register": {
            "state": crown_class(status, flags),
            "claim_scope": "evidence-bounded public/owner authority lane",
            "flags": flags,
        },
        "living_register": {
            "state": "PUBLIC_LIVE_OR_ROUTED" if promoted else "OWNER_SIDE_REGISTERED",
            "public_route": route,
            "next_action": next_action,
            "connections": connections,
        },
    }


def build_register(root: Path) -> tuple[dict, dict]:
    policy_path = root / "registry/source-to-living-governance-policy-v1.0.json"
    head_path = root / "registry/estate-head-public-v0.2.1.json"
    authority_path = root / "registry/estate-classification-authority-v1.0.json"
    stringline_path = root / "navigator/stringline.json"

    policy = load_json(policy_path)
    head = load_json(head_path)
    authority = load_json(authority_path)
    stringline = load_json(stringline_path)

    if policy.get("stage_order") != CHAIN:
        raise GateError("policy stage order has drifted")
    allowed_hosts = set(policy.get("allowed_public_hosts", []))
    if not allowed_hosts:
        raise GateError("policy must define allowed public hosts")

    meta = head.get("meta")
    houses = head.get("houses")
    bodies = head.get("bodies")
    project_heads = head.get("project_heads")
    if not isinstance(meta, dict) or not isinstance(houses, list) or not isinstance(bodies, list) or not isinstance(project_heads, list):
        raise GateError("Estate Head source lacks meta/houses/bodies/project_heads")
    if meta.get("version") != policy.get("estate_head_version"):
        raise GateError("Estate Head version does not match governance policy")
    if "NOT-FULL-CENSUS" not in str(meta.get("status", "")).upper():
        raise GateError("Estate Head full-census boundary was lost")

    expected = policy.get("expected_counts", {})
    if len(bodies) != expected.get("bodies"):
        raise GateError(f"body count changed: {len(bodies)} != {expected.get('bodies')}; update policy deliberately")
    if len(project_heads) != expected.get("project_heads"):
        raise GateError(f"Project Head count changed: {len(project_heads)} != {expected.get('project_heads')}; update policy deliberately")

    house_ids: set[str] = set()
    for house in houses:
        if not isinstance(house, dict):
            raise GateError("house entry is not an object")
        house_id = required_text(house, "id", "house")
        required_text(house, "name", house_id)
        if house_id in house_ids:
            raise GateError(f"duplicate house id: {house_id}")
        house_ids.add(house_id)

    body_ids: set[str] = set()
    body_passports: list[dict] = []
    public_promotions = 0
    for body in bodies:
        if not isinstance(body, dict):
            raise GateError("body entry is not an object")
        body_id = required_text(body, "id", "body")
        label = f"body {body_id}"
        if body_id in body_ids:
            raise GateError(f"duplicate body id: {body_id}")
        body_ids.add(body_id)
        house = required_text(body, "house", label)
        if house not in house_ids:
            raise GateError(f"{label} references unknown house {house}")
        name = required_text(body, "name", label)
        version = required_text(body, "version", label)
        status = required_text(body, "status", label)
        proof = required_text(body, "proof", label)
        route = optional_text(body, "public", label)
        next_action = required_text(body, "next", label)
        connections = text_list(body, "connections", label)
        flags = text_list(body, "flags", label)
        leaks = sensitive_paths(body)
        if leaks:
            raise GateError(f"{label} exposes blocked owner fields: {', '.join(leaks)}")
        validate_public_route(route, label, allowed_hosts)
        if route:
            public_promotions += 1
        stages = make_stages(
            record_id=body_id,
            name=name,
            version=version,
            status=status,
            proof=proof,
            route=route,
            next_action=next_action,
            connections=connections,
            flags=flags,
            record_kind="BODY",
            audit_basis=["proof", "status", "flags", "public boundary"],
        )
        if list(stages) != STAGE_KEYS:
            raise GateError(f"{label} stage order mismatch")
        body_passports.append({
            "id": body_id,
            "house": house,
            "name": name,
            "version": version,
            "promoted_public": bool(route),
            "promotion_gate": "PASS",
            "stages": stages,
        })

    project_ids: set[str] = set()
    project_passports: list[dict] = []
    for head_record in project_heads:
        if not isinstance(head_record, dict):
            raise GateError("Project Head entry is not an object")
        project_id = required_text(head_record, "id", "Project Head")
        label = f"Project Head {project_id}"
        if project_id in project_ids:
            raise GateError(f"duplicate Project Head id: {project_id}")
        project_ids.add(project_id)
        house = required_text(head_record, "house", label)
        if house not in house_ids:
            raise GateError(f"{label} references unknown house {house}")
        name = required_text(head_record, "name", label)
        current = required_text(head_record, "current", label)
        route = optional_text(head_record, "public", label)
        locks = text_list(head_record, "locks", label)
        next_action = required_text(head_record, "next", label)
        leaks = sensitive_paths(head_record)
        if leaks:
            raise GateError(f"{label} exposes blocked owner fields: {', '.join(leaks)}")
        validate_public_route(route, label, allowed_hosts)
        if route:
            public_promotions += 1
        stages = make_stages(
            record_id=project_id,
            name=name,
            version=current,
            status="PROJECT_HEAD_CURRENT",
            proof="; ".join(locks),
            route=route,
            next_action=next_action,
            connections=locks,
            flags=["project-head", "locks-preserved"],
            record_kind="PROJECT_HEAD",
            audit_basis=locks,
        )
        project_passports.append({
            "id": project_id,
            "house": house,
            "name": name,
            "current": current,
            "promoted_public": bool(route),
            "promotion_gate": "PASS",
            "stages": stages,
        })

    systemic_guard = authority.get("systemic_guard")
    authority_bodies = authority.get("bodies")
    if not isinstance(systemic_guard, dict) or not isinstance(authority_bodies, list):
        raise GateError("classification authority lacks bodies/systemic_guard")
    required_chain = str(systemic_guard.get("required_chain", ""))
    if [part.strip() for part in required_chain.split("→") if part.strip()] != CHAIN:
        raise GateError("classification authority six-stage chain has drifted")
    authority_ids = [required_text(item, "id", "classification authority entry") for item in authority_bodies if isinstance(item, dict)]
    if len(authority_ids) != len(set(authority_ids)):
        raise GateError("classification authority contains duplicate ids")

    stringline_projects = stringline.get("seed_project_strings")
    if not isinstance(stringline_projects, list):
        raise GateError("Stringline projects are unreadable")
    project_map = {item.get("id"): item for item in stringline_projects if isinstance(item, dict)}
    governance = project_map.get("registers-governance")
    if not isinstance(governance, dict) or not isinstance(governance.get("bodies"), list):
        raise GateError("Stringline Registers & Governance project is missing")
    governance_ids = [item.get("id") for item in governance["bodies"] if isinstance(item, dict)]
    missing_chain_ids = [item for item in CHAIN_IDS if item not in governance_ids]
    if missing_chain_ids:
        raise GateError("Stringline governance chain incomplete: " + ", ".join(missing_chain_ids))

    record_count = len(body_passports) + len(project_passports)
    stage_count = record_count * len(CHAIN)
    register = {
        "schema": "JM.SourceToLivingGovernanceRegister/1.0",
        "version": "v1.0",
        "effective_date": meta.get("created"),
        "owner_authority": meta.get("authority"),
        "crown": policy.get("crown"),
        "stage_order": CHAIN,
        "scope": {
            "estate_head_version": meta.get("version"),
            "body_count": len(body_passports),
            "project_head_count": len(project_passports),
            "governed_record_count": record_count,
            "stage_receipt_count": stage_count,
            "public_promotions_guarded": public_promotions,
            "not_full_census_crowned": True,
        },
        "source_digests": {
            str(head_path.relative_to(root)): digest(head),
            str(authority_path.relative_to(root)): digest(authority),
            str(stringline_path.relative_to(root)): digest(stringline),
            str(policy_path.relative_to(root)): digest(policy),
        },
        "classification_authority": {
            "status": "PASS",
            "entry_count": len(authority_ids),
            "required_chain": CHAIN,
            "failure_policy": systemic_guard.get("failure_policy"),
        },
        "stringline_governance": {
            "status": "PASS",
            "version": stringline.get("version"),
            "required_ids": CHAIN_IDS,
        },
        "body_passports": body_passports,
        "project_head_passports": project_passports,
        "gate": {
            "status": "PASS_REPOSITORY_WIDE_SIX_STAGE_GOVERNANCE",
            "all_records_have_six_stages": True,
            "public_promotions_require_source_and_proof": True,
            "private_owner_fields_published": False,
            "version_number_coronation": False,
            "law": "Promotion is a governed passage, not a version-number shortcut.",
        },
        "boundary": policy.get("boundary"),
    }
    receipt = {
        "schema": "JM.SourceToLivingGovernanceReceipt/1.0",
        "status": "PASS_REPOSITORY_WIDE_SIX_STAGE_GOVERNANCE",
        "register": "registry/source-to-living-governance-register-v1.0.json",
        "policy": "registry/source-to-living-governance-policy-v1.0.json",
        "estate_head_version": meta.get("version"),
        "governed_records": record_count,
        "body_passports": len(body_passports),
        "project_head_passports": len(project_passports),
        "stage_receipts": stage_count,
        "public_promotions_guarded": public_promotions,
        "source_digest": digest(register["source_digests"]),
        "no_private_owner_fields": True,
        "no_version_number_coronation": True,
        "not_full_census_crowned": True,
        "next_governed_pass": "Estate-Wide Physical Current-Best Census v0.2",
        "boundary": policy.get("boundary"),
    }
    return register, receipt


def write_outputs(root: Path) -> tuple[dict, dict]:
    register, receipt = build_register(root)
    outputs = {
        root / "registry/source-to-living-governance-register-v1.0.json": register,
        root / "registry/source-to-living-governance-receipt-v1.0.json": receipt,
    }
    for path, value in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return register, receipt


def check_outputs(root: Path) -> tuple[dict, dict]:
    expected_register, expected_receipt = build_register(root)
    checks = {
        root / "registry/source-to-living-governance-register-v1.0.json": expected_register,
        root / "registry/source-to-living-governance-receipt-v1.0.json": expected_receipt,
    }
    for path, expected_value in checks.items():
        actual = load_json(path)
        if actual != expected_value:
            raise GateError(f"stale governance output: {path}; run write mode")
    return expected_register, expected_receipt


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["verify", "write", "check"])
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if args.mode == "write":
        register, receipt = write_outputs(root)
    elif args.mode == "check":
        register, receipt = check_outputs(root)
    else:
        register, receipt = build_register(root)
    print(json.dumps({
        "status": receipt["status"],
        "governed_records": receipt["governed_records"],
        "stage_receipts": receipt["stage_receipts"],
        "public_promotions_guarded": receipt["public_promotions_guarded"],
        "register_digest": digest(register),
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except GateError as exc:
        raise SystemExit(f"SOURCE-TO-LIVING GATE ERROR: {exc}")
