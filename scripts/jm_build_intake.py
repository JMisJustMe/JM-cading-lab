#!/usr/bin/env python3
"""JM Build Intake v0.1.

Upstream recovery helper for serious JM builds. It searches the current Estate
for relevant existing route manifests and executable bodies, then emits a
prospective Build Route Manifest seed. Recovery hits are candidates, not donor
claims. The seed is fail-closed until stack/gap routing is explicitly resolved.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
ROUTE_ROOT = ROOT / "registry/build-routes"
POLICY_PATH = ROUTE_ROOT / "JM_BUILD_ENTRY_POLICY_v0.1.json"
STOPWORDS = {
    "a", "an", "and", "app", "body", "build", "for", "from", "in", "jm",
    "new", "of", "on", "the", "to", "tool", "v", "version", "with",
}


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def flatten_strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from flatten_strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from flatten_strings(item)


def tokens(*values: str) -> list[str]:
    found: list[str] = []
    for value in values:
        for raw in re.findall(r"[a-z0-9]+", value.lower()):
            if raw in STOPWORDS or len(raw) < 3 or re.fullmatch(r"v?\d+", raw):
                continue
            if raw not in found:
                found.append(raw)
    return found


def token_hits(text: str, query_tokens: list[str]) -> list[str]:
    lower = text.lower()
    return [token for token in query_tokens if token in lower]


def load_policy() -> dict:
    return json.loads(POLICY_PATH.read_text())


def manifest_candidates(query_tokens: list[str], limit: int = 10) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for path in sorted(ROUTE_ROOT.glob("*_BUILD_ROUTE_MANIFEST_v0.1.json")):
        try:
            data = json.loads(path.read_text())
        except Exception:
            continue
        body = str(data.get("created_for", {}).get("body", ""))
        evidence_text = "\n".join(flatten_strings({
            "created_for": data.get("created_for", {}),
            "foundation": data.get("foundation", {}),
            "exact_stack": data.get("exact_stack", {}),
            "host_and_surfaces": data.get("host_and_surfaces", {}),
        }))
        hits = token_hits(evidence_text, query_tokens)
        if not hits:
            continue
        ranked.append({
            "source_type": "build-route-manifest",
            "reference": str(path.relative_to(ROOT)),
            "body": body or "UNNAMED",
            "score": len(hits),
            "matched_terms": hits,
            "status": "RECOVERY_CANDIDATE_ONLY",
        })
    ranked.sort(key=lambda item: (-item["score"], item["reference"]))
    return ranked[:limit]


def tracked_body_candidates(
    query_tokens: list[str], target_path: str, policy: dict, limit: int = 15
) -> list[dict[str, Any]]:
    roots = set(policy["executable_roots"])
    target = PurePosixPath(target_path) if target_path else None
    ranked: list[dict[str, Any]] = []
    for raw in git("ls-files").splitlines():
        if not raw:
            continue
        path = PurePosixPath(raw)
        if not path.parts or path.parts[0] not in roots:
            continue
        if target and (path == target or str(path).startswith(str(target).rstrip("/") + "/")):
            continue
        hits = token_hits(str(path), query_tokens)
        if not hits:
            continue
        ranked.append({
            "source_type": "tracked-estate-path",
            "reference": str(path),
            "score": len(hits),
            "matched_terms": hits,
            "status": "RECOVERY_CANDIDATE_ONLY",
        })
    ranked.sort(key=lambda item: (-item["score"], item["reference"]))
    return ranked[:limit]


def recover_candidates(body: str, body_type: str, body_path: str, keywords: list[str]) -> dict:
    policy = load_policy()
    query_tokens = tokens(body, body_type, body_path, *keywords)
    return {
        "query_terms": query_tokens,
        "route_manifest_candidates": manifest_candidates(query_tokens),
        "tracked_body_candidates": tracked_body_candidates(query_tokens, body_path, policy),
    }


def authorization_errors(args: argparse.Namespace) -> list[str]:
    if not args.authorize:
        return []
    errors = []
    if not args.recovery_decision:
        errors.append("--recovery-decision is required with --authorize")
    if not args.stack:
        errors.append("at least one --stack is required with --authorize")
    if not args.true_gap:
        errors.append("--true-gap is required with --authorize")
    return errors


def make_manifest(args: argparse.Namespace, recovery: dict) -> dict:
    authorized = bool(args.authorize)
    branch = args.branch
    if not branch:
        try:
            branch = git("rev-parse", "--abbrev-ref", "HEAD")
        except Exception:
            branch = "UNRESOLVED"

    foundation = {
        "estate_recovery": {
            "state": "PASS" if recovery["query_terms"] else "OPEN",
            "query_terms": recovery["query_terms"],
            "candidate_count": len(recovery["route_manifest_candidates"]) + len(recovery["tracked_body_candidates"]),
            "route_manifest_candidates": recovery["route_manifest_candidates"],
            "tracked_body_candidates": recovery["tracked_body_candidates"],
            "candidate_rule": "Candidates are evidence for recovery/search only. They are not donor, authority, reuse or crown claims until explicitly resolved.",
        },
        "recovery_decision": args.recovery_decision or "OPEN — strongest appropriate donor/authority selection not yet resolved",
        "selected_donors": args.selected_donor or [],
    }

    exact_stack = {
        "state": "RESOLVED" if authorized else "OPEN",
        "declared_stack": args.stack or [],
        "rule": "Declare actual JM coding bodies, building bodies/apps/tools, runtime/host and relevant surfaces; do not fill for ceremony.",
    }

    true_gaps = {
        "state": "RESOLVED" if authorized else "OPEN",
        "remaining_capability_gap": args.true_gap or "OPEN — create nothing new until the gap survives Estate recovery",
        "new_capability_creation_authorized": authorized,
    }

    surfaces = args.surface or []
    manifest = {
        "schema": "jm.build-route-manifest/0.1",
        "manifest": "JM Build Route Manifest v0.1 — AUTOMATIC INTAKE",
        "instantiation_mode": "prospective-live-route",
        "created_for": {
            "body": args.body,
            "body_type": args.body_type,
            "intended_destination": args.destination,
            "body_path": args.body_path,
        },
        "authority": {
            "repository": args.repository,
            "work_pr": args.work_pr,
            "head_branch": branch,
            "intake_generated": True,
            "authority_rule": "This intake records repository evidence; it does not elevate recovery candidates into source/donor authority.",
        },
        "foundation": foundation,
        "exact_stack": exact_stack,
        "true_gaps": true_gaps,
        "proof_lanes": {
            "estate_recovery_scan": {
                "state": "PASS",
                "meaning": "Current tracked Estate and Build Route Manifests were searched using the recorded query terms."
            },
            "stack_selection": {"state": "PASS" if authorized else "OPEN"},
            "gap_test": {"state": "PASS" if authorized else "OPEN"},
            "runtime_or_contact": {"state": "NOT_CLAIMED"},
        },
        "host_and_surfaces": {
            "requested_surfaces": surfaces,
            "state": "RESOLVED" if surfaces else "OPEN — only add surfaces that actually belong to this body",
        },
        "escalation": {
            "manual_user_contact": "Only when native built-ins/evidence are insufficient or target contact itself must be proven.",
            "failure_route": "FAIL LOCAL -> CONTAIN -> TRACE -> RECOVER -> CORRECT RESPONSIBLE ORGAN FORWARD -> RETEST AFFECTED GATE",
        },
        "state": {
            "route": "AUTHORIZED_TO_BUILD" if authorized else "INTAKE_RECOVERED_AWAITING_ROUTE_RESOLUTION",
            "build_authorized_by_manifest": authorized,
            "runtime": "NOT CLAIMED",
            "contact": "NOT CLAIMED",
            "crown": "NOT EARNED",
        },
        "next_route": {
            "step": (
                "Proceed with the declared stack and gap; native built-ins remain authoritative."
                if authorized
                else "Resolve strongest appropriate donors/authority, declare the exact stack, prove the true gap, then explicitly authorize this manifest before implementation."
            )
        },
        "manifest_proof": {
            "result": (
                "ROUTE AUTHORIZATION PASS — Estate recovery evidence was recorded and the stack/gap route was explicitly resolved. This is not runtime/contact/crown proof."
                if authorized
                else "INTAKE PASS — Estate recovery candidates generated; route remains fail-closed and is NOT authorization to implement or create capability."
            )
        },
    }
    return manifest


def self_test() -> None:
    q = tokens("JM ChatGPT Host Adapter v0.1.1", "host adapter", "apps/jm-chatgpt-host-adapter-v0.1")
    assert "chatgpt" in q and "host" in q and "adapter" in q
    sample = "JM ChatGPT Host Adapter recovery with GameCore runtime"
    assert token_hits(sample, q)[:3] == ["chatgpt", "host", "adapter"]

    ns = argparse.Namespace(authorize=True, recovery_decision="", stack=[], true_gap="")
    errs = authorization_errors(ns)
    assert len(errs) == 3
    ns.recovery_decision = "Reuse recovered host/runtime donors"
    ns.stack = ["JM GameCore"]
    ns.true_gap = "New host adapter only"
    assert authorization_errors(ns) == []
    print("JM Build Intake self-test PASS: token recovery works and authorization fails closed until recovery decision, exact stack and true gap are explicit.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--body")
    parser.add_argument("--body-type")
    parser.add_argument("--destination")
    parser.add_argument("--body-path", default="")
    parser.add_argument("--work-pr", type=int)
    parser.add_argument("--repository", default="JMisJustMe/JM-cading-lab")
    parser.add_argument("--branch", default="")
    parser.add_argument("--keyword", dest="keywords", action="append", default=[])
    parser.add_argument("--surface", action="append", default=[])
    parser.add_argument("--selected-donor", action="append", default=[])
    parser.add_argument("--stack", action="append", default=[])
    parser.add_argument("--recovery-decision", default="")
    parser.add_argument("--true-gap", default="")
    parser.add_argument("--authorize", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        if not args.body:
            return 0

    missing = [name for name in ("body", "body_type", "destination", "work_pr") if getattr(args, name) in (None, "")]
    if missing:
        parser.error("required for intake: " + ", ".join("--" + name.replace("_", "-") for name in missing))

    errors = authorization_errors(args)
    if errors:
        parser.error("; ".join(errors))

    recovery = recover_candidates(args.body, args.body_type, args.body_path, args.keywords)
    manifest = make_manifest(args, recovery)

    output = args.output
    if output is None:
        safe = re.sub(r"[^A-Z0-9]+", "_", args.body.upper()).strip("_")[:90] or "JM_BUILD"
        output = ROOT / "build-intake-output" / f"{safe}_BUILD_ROUTE_MANIFEST_v0.1.json"
    elif not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2) + "\n")

    candidates = manifest["foundation"]["estate_recovery"]["candidate_count"]
    print(f"JM Build Intake: recovered {candidates} candidate reference(s) for {args.body!r}")
    print(f"OUTPUT: {output.relative_to(ROOT)}")
    print(f"AUTHORIZED: {manifest['state']['build_authorized_by_manifest']}")
    if not manifest["state"]["build_authorized_by_manifest"]:
        print("NEXT: resolve recovery decision + exact stack + true gap, then regenerate with --authorize. Do not implement merely because intake exists.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
