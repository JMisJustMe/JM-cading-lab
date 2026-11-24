#!/usr/bin/env python3
"""RUKQUSS CP10 deterministic review of the original Worker plus six alias doors.

SOURCE/LOCAL-RUNTIME/HEADLESS-BROWSER checks only. This script cannot publish,
bind a Cloudflare domain, change DNS, access private hosts, or merge GitHub PRs.
Pass an exact read-only snapshot of the CURRENT live Worker using --live-worker.
All assembled files are temporary and removed on exit; one original source.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def run(name: str, args: list[str], limit: int = 110) -> dict:
    response = subprocess.run(args, capture_output=True, text=True, timeout=limit)
    if response.returncode != 0:
        raise RuntimeError(
            f"CP10 HOLD: {name} failed ({response.returncode}): "
            + response.stderr[-1100:] + " " + response.stdout[-600:]
        )
    try:
        return json.loads(response.stdout)
    except ValueError as exc:
        raise RuntimeError(f"CP10 HOLD: {name} produced no JSON proof") from exc


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live-worker", required=True, type=Path,
                        help="read-only exact current RUKQUSS Worker snapshot")
    parser.add_argument("--browser", action="store_true", help="run 6 local Edge/Chromium viewports")
    parser.add_argument("--edge", type=Path, help="local browser executable, optional")
    parser.add_argument("--axe-js", type=Path, help="optional local axe-core copy, no CDN request")
    parser.add_argument("--public-contact", action="store_true",
                        help="read-only GET of original six public paths, never candidate hosts")
    args = parser.parse_args()

    if not args.live_worker.is_file():
        raise ValueError("CP10 HOLD: exact live Worker snapshot unavailable")
    with tempfile.TemporaryDirectory(prefix="JM_RUKQUSS_CP10_") as td:
        temp = Path(td)
        parent = temp / "cp07_parent.js"
        parent_receipt = temp / "cp07_receipt.json"
        alias = temp / "cp10_candidate.js"
        alias_receipt = temp / "cp10_receipt.json"
        a = run("original CP07 graft", [
            sys.executable, str(HERE / "graft_worker_cp03.py"),
            "--live", str(args.live_worker),
            "--html", str(ROOT / "index.html"),
            "--out", str(parent),
            "--receipt", str(parent_receipt), "--self-test",
        ])
        if sha256(parent) != a["candidate_worker_sha256"]:
            raise ValueError("CP10 HOLD: CP07 assembled bytes drifted")
        b = run("public six-alias graft", [
            sys.executable, str(HERE / "prepare_public_subdomains_cp08.py"),
            "--reviewed-worker", str(parent),
            "--out", str(alias),
            "--receipt", str(alias_receipt), "--self-test",
        ])
        if sha256(alias) != b["candidate_worker_sha256"]:
            raise ValueError("CP10 HOLD: CP10 assembled bytes drifted")
        base = run("original Worker runtime", [
            "node", str(HERE / "test_worker_graft_cp03.cjs"), str(alias),
        ])
        overlay = run("six-alias Worker runtime", [
            "node", str(HERE / "test_public_subdomains_cp08.cjs"), str(alias),
        ])
        if base.get("fail") != 0 or overlay.get("failed") != 0:
            raise ValueError("CP10 HOLD: runtime failures reported")
        rollback = run("original Worker rollback rehearsal", [
            "node", str(HERE / "test_worker_rollback_cp11.cjs"),
            str(args.live_worker), str(alias),
        ])
        if (rollback.get("checks_failed") != 0
                or rollback.get("local_restored_snapshot_matches_original") is not True):
            raise ValueError("CP11 HOLD: original Worker restore simulation failed")
        report = {
            "schema": "JM.RUKQUSS.PublicSubdomains.Review.CP11/1",
            "scope": "SOURCE_STATIC_AND_ISOLATED_WORKER_VM",
            "original_worker_sha256": sha256(args.live_worker),
            "parent_worker_sha256": sha256(parent),
            "candidate_worker_sha256": sha256(alias),
            "original_worker_tests_passed": base["pass"],
            "public_alias_tests_passed": overlay["passed"],
            "local_rollback_checks_passed": rollback["checks_passed"],
            "rollback_proof_scope": rollback["scope"],
            "negative_source_mutations_rejected": b["negative_mutation_fixtures_passed"],
            "original_parent_negative_mutations_rejected": a["negative_mutation_fixtures_passed"],
            "public_aliases": b["public_candidate_alias_count"],
            "one_original_route_authority": b["original_path_authority"],
            "redirect_hops": b["redirect_hops_from_candidate_to_original"],
            "live_host_activation": "NOT_PERFORMED_OR_CONFIRMED_BY_THIS_SCRIPT",
            "deployment_performed_by_this_script": False,
            "git_merge_performed_by_this_script": False,
        }
        if args.browser:
            command = [
                sys.executable, str(HERE / "verify_ui_cp05.py"),
                "--worker", str(alias),
                "--runtime-test", str(HERE / "test_worker_graft_cp03.cjs"),
            ]
            if args.edge:
                command.extend(["--edge", str(args.edge)])
            if args.axe_js:
                command.extend(["--axe-js", str(args.axe_js)])
            browser = run("original RUKQUSS browser reflow", command)
            report["browser_viewports_passed"] = browser["viewports_passed"]
            report["axe_scanned_viewports"] = browser.get("axe_scanned_viewports", 0)
            report["scope"] += "_AND_HEADLESS_BROWSER"
        if args.public_contact:
            public = run("six owner public destinations", [
                sys.executable, str(HERE / "verify_public_paths_cp09.py"),
                "--online",
            ], 90)
            if public["failed"]:
                raise ValueError("CP10 HOLD: existing public destinations not all reachable")
            report["public_paths_passed"] = public["passed"]
            report["scope"] += "_AND_PUBLIC_GET"
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
