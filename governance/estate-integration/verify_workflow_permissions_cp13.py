#!/usr/bin/env python3
"""JM CP13: original proof-only workflows must retain least-privilege tokens.

Static source gate only. Does not approve publication, change branches or
certify arbitrary third-party actions.
"""
from __future__ import annotations
import argparse
import json
import re
import unittest
from pathlib import Path

FILES = (
    "validate-wave2-gameforge-glyphforge.yml",
    "validate-wave2-ftr-energy-tracebox.yml",
    "validate-wave2-bodymesh-onegame-reconciliation.yml",
    "validate-wave-2-jm3232-navigator-browser-bridge-v0-1.yml",
    "validate-pressurepoint-breakline-v0-3.yml",
    "validate-fourfold-dual-authority.yml",
)
DIRECTORY = Path(".github/workflows")
PERMISSION_BLOCK = "\npermissions:\n  contents: read\n"
BLOCKED_MARKERS = (
    "contents: write", "actions: write", "id-token: write",
    "GH_TOKEN", "GITHUB_TOKEN", "secrets.", "git push",
    "gh release create", "gh pr create", "npm publish",
    "docker push", "wrangler deploy",
)

def inspect(name: str, source: str) -> list[str]:
    issues: list[str] = []
    if source.count(PERMISSION_BLOCK) != 1:
        issues.append("missing_exact_read_only_workflow_scope")
    if not re.search(r"(?m)^jobs:\s*$", source):
        issues.append("jobs_missing")
    if not re.search(r"(?m)^on:\s*$", source):
        issues.append("triggers_missing")
    if "actions/checkout@" not in source:
        issues.append("original_checkout_missing")
    for marker in BLOCKED_MARKERS:
        if marker in source:
            issues.append("unexpected_write_or_privilege_marker:" + marker)
    return issues

def audit(root: Path) -> dict:
    entries = []
    for name in FILES:
        location = root / DIRECTORY / name
        if location.is_file():
            issues = inspect(name, location.read_text(encoding="utf-8"))
        else:
            issues = ["original_workflow_missing"]
        entries.append({"path": str(DIRECTORY / name).replace("\\", "/"), "issues": issues})
    return {
        "schema": "JM.ProofWorkflowLeastPrivilege/CP13",
        "state": "STATIC_SOURCE_PASS" if all(not x["issues"] for x in entries) else "HOLD",
        "checked": len(entries),
        "issues": sum(len(x["issues"]) for x in entries),
        "entries": entries,
        "boundary": "Read-only token marker and known-source workflow structure only; not a full permission/supply-chain audit or runtime proof.",
    }

class Fixtures(unittest.TestCase):
    GOOD = ("name: Synthetic proof\non:\n  pull_request:\n\npermissions:\n  contents: read\n\n"
            "jobs:\n  verify:\n    runs-on: ubuntu-latest\n"
            "    steps:\n      - uses: actions/checkout@v4\n")
    def test_original_fixture_pass(self):
        self.assertEqual(inspect("fixture.yml", self.GOOD), [])
    def test_no_permissions_holds(self):
        self.assertTrue(inspect("fixture.yml", self.GOOD.replace(PERMISSION_BLOCK, "\n")))
    def test_write_scope_holds(self):
        self.assertTrue(inspect("fixture.yml", self.GOOD.replace("contents: read", "contents: write")))
    def test_extra_action_scope_holds(self):
        self.assertTrue(inspect("fixture.yml", self.GOOD + "\nactions: write\n"))
    def test_missing_original_job_holds(self):
        self.assertTrue(inspect("fixture.yml", self.GOOD.replace("jobs:\n", "removed_jobs:\n")))
    def test_unexpected_token_holds(self):
        self.assertTrue(inspect("fixture.yml", self.GOOD + "\nGH_TOKEN: fixture\n"))

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        result = unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(Fixtures)
        )
        raise SystemExit(0 if result.wasSuccessful() else 1)
    report = audit(args.root)
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["state"] == "STATIC_SOURCE_PASS" else 1)
