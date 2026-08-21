#!/usr/bin/env python3
"""JM Build Entry Gate v0.1.

High-confidence front-door routing only. This script does not decide that every
code change is a new body, and it never manufactures donor/proof claims.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path, PurePosixPath
from typing import Callable, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_POLICY = ROOT / "registry/build-routes/JM_BUILD_ENTRY_POLICY_v0.1.json"


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def load_policy(path: Path) -> dict:
    return json.loads(path.read_text())


def parse_diff(base: str, head: str) -> list[tuple[str, str]]:
    raw = git("diff", "--name-status", "--find-renames", f"{base}...{head}")
    rows: list[tuple[str, str]] = []
    if not raw:
        return rows
    for line in raw.splitlines():
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R") or status.startswith("C"):
            path = parts[-1]
        else:
            path = parts[1]
        rows.append((status, path))
    return rows


def is_production_signal(path: str, policy: dict) -> bool:
    p = PurePosixPath(path)
    if p.name in set(policy["production_basenames"]):
        return True
    return p.suffix.lower() in set(policy["production_suffixes"])


def first_new_boundary(
    path: str,
    executable_roots: set[str],
    exists_at_base: Callable[[str], bool],
) -> str | None:
    p = PurePosixPath(path)
    parts = p.parts
    if not parts or parts[0] not in executable_roots:
        return None

    # A single-file body directly under an executable root is itself a boundary.
    if len(parts) == 2:
        return path if not exists_at_base(path) else None

    # Walk from the shallowest body/descendant directory toward the file.
    # The first directory absent from base is the new-body boundary.
    for end in range(2, len(parts)):
        candidate = "/".join(parts[:end])
        if not exists_at_base(candidate):
            return candidate
    return None


def classify_added_paths(
    added_paths: Iterable[str],
    policy: dict,
    exists_at_base: Callable[[str], bool],
) -> list[dict[str, str]]:
    roots = set(policy["executable_roots"])
    hits: list[dict[str, str]] = []
    for path in added_paths:
        if not is_production_signal(path, policy):
            continue
        boundary = first_new_boundary(path, roots, exists_at_base)
        if boundary:
            hits.append({"path": path, "new_boundary": boundary})
    return hits


def matching_manifest(pr_number: int, changed_paths: set[str], policy: dict) -> str | None:
    prefix = "registry/build-routes/"
    suffix = "_BUILD_ROUTE_MANIFEST_v0.1.json"
    for path in sorted(changed_paths):
        if not (path.startswith(prefix) and path.endswith(suffix)):
            continue
        full = ROOT / path
        if not full.exists():
            continue
        try:
            data = json.loads(full.read_text())
        except Exception:
            continue
        if data.get("instantiation_mode") != policy["required_manifest_mode"]:
            continue
        work_pr = data.get("authority", {}).get("work_pr")
        try:
            work_pr = int(work_pr)
        except (TypeError, ValueError):
            continue
        if work_pr == pr_number:
            return path
    return None


def write_draft(pr_number: int, hits: list[dict[str, str]]) -> Path:
    out_dir = ROOT / "build-entry-output"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / f"JM_BUILD_ENTRY_DRAFT_PR_{pr_number}.json"
    boundaries = sorted({hit["new_boundary"] for hit in hits})
    payload = {
        "schema": "jm.build-route-manifest/0.1",
        "manifest": "JM Build Route Manifest v0.1 — AUTO ENTRY DRAFT",
        "instantiation_mode": "prospective-live-route",
        "created_for": {
            "body": "UNRESOLVED — recover current Estate authority before implementation",
            "body_type": "UNRESOLVED",
            "intended_destination": "UNRESOLVED",
        },
        "authority": {
            "work_pr": pr_number,
            "detected_new_boundaries": boundaries,
            "entry_draft_only": True,
            "warning": "This draft is not authority and cannot be used to invent donors, proof, gaps or crown state.",
        },
        "foundation": {
            "status": "UNRESOLVED — search current Estate and strongest appropriate donors first"
        },
        "exact_stack": {
            "status": "UNRESOLVED — declare actual JM coding bodies, building bodies/apps/tools, runtime/host and surfaces"
        },
        "true_gaps": {
            "status": "UNRESOLVED — create nothing new until the capability gap survives recovery"
        },
        "proof_lanes": {
            "entry": "OPEN — this auto-draft is routing assistance, not proof"
        },
        "host_and_surfaces": {
            "status": "UNRESOLVED"
        },
        "escalation": {
            "manual_user_contact": "Only if native built-ins/evidence are insufficient or target contact itself must be proven"
        },
        "state": {
            "route": "ENTRY_OPEN",
            "build_authorized_by_manifest": False,
            "crown": "NOT EARNED"
        },
        "next_route": {
            "step": "Recover Estate -> select strongest appropriate donors -> declare exact stack -> identify true gaps -> replace unresolved fields -> commit this route manifest in the same PR"
        },
        "manifest_proof": {
            "result": "AUTO ENTRY DRAFT ONLY — NOT A CONTRACT PASS"
        },
    }
    out.write_text(json.dumps(payload, indent=2) + "\n")
    return out


def self_test(policy: dict) -> None:
    roots = set(policy["executable_roots"])

    def classify_one(path: str, existing: set[str]) -> bool:
        hits = classify_added_paths([path], policy, lambda candidate: candidate in existing)
        return bool(hits)

    assert classify_one(
        "apps/jm-chatgpt-host-adapter-v0.1/src/server.mjs",
        {"apps"},
    ), "PR135-style new app must trigger"

    assert classify_one(
        "apps/jm-estate-live-registry/android-v0.3/app/src/main/java/com/jmisjustme/estateregistry/MainActivity.java",
        {"apps", "apps/jm-estate-live-registry"},
    ), "PR141-style new descendant must trigger"

    assert not classify_one(
        ".github/workflows/audit-estate-gap-governance.yml",
        {".github", ".github/workflows"},
    ), "PR142-style governance repair must not trigger"

    assert not classify_one(
        "apps/existing-body/src/new-helper.mjs",
        {"apps", "apps/existing-body", "apps/existing-body/src"},
    ), "new helper inside an existing body must not be auto-crowned as a new body"

    assert classify_one(
        "games/new-single-file-body.html",
        {"games"},
    ), "single-file-first new body must trigger"

    assert "apps" in roots and "games" in roots
    print("JM Build Entry Gate self-test PASS: new app, descendant and single-file body trigger; governance/repair examples do not.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--base")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--pr-number", type=int)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    policy = load_policy(args.policy)
    if args.self_test:
        self_test(policy)
        if not args.base or args.pr_number is None:
            return 0

    if not args.base or args.pr_number is None:
        parser.error("--base and --pr-number are required for live gate evaluation")

    rows = parse_diff(args.base, args.head)
    added = [path for status, path in rows if status == "A"]
    changed = {path for _, path in rows}

    def exists_at_base(candidate: str) -> bool:
        proc = subprocess.run(
            ["git", "cat-file", "-e", f"{args.base}:{candidate}"],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return proc.returncode == 0

    hits = classify_added_paths(added, policy, exists_at_base)
    cutoff = int(policy["enforcement"]["future_prs_after"])

    print(f"JM Build Entry Gate: PR #{args.pr_number}; high-confidence new-body signals={len(hits)}")
    for hit in hits:
        print(f"  SIGNAL {hit['path']} -> new boundary {hit['new_boundary']}")

    if args.pr_number <= cutoff:
        print(f"PASS (legacy-active): PR #{args.pr_number} <= cutoff #{cutoff}; no retroactive blocking.")
        return 0

    if not hits:
        print("PASS: no high-confidence new/descendant executable-body boundary detected. Existing built-ins still govern the work.")
        return 0

    manifest = matching_manifest(args.pr_number, changed, policy)
    if manifest:
        print(f"PASS: serious build entry has same-PR prospective manifest: {manifest}")
        return 0

    draft = write_draft(args.pr_number, hits)
    print("ERROR: high-confidence new/descendant executable body detected without a same-PR prospective Build Route Manifest.")
    print(f"AUTO-DRAFT: {draft.relative_to(ROOT)}")
    print("Route required: Estate recovery -> strongest appropriate donors -> exact stack -> true gap -> replace unresolved draft fields -> commit manifest in this PR.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
