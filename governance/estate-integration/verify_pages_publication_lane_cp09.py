#!/usr/bin/env python3
"""JM CP09: static contact on the two established Pages publication workflows.

A no-deploy source check. Does NOT guarantee Actions scheduling beyond GitHub's
documented concurrency semantics, or prove a real deployment.
"""
from __future__ import annotations
import argparse
import json
import re
import unittest
from pathlib import Path

PRIMARY = ".github/workflows/deploy-pages.yml"
RECOVERY = ".github/workflows/puka-owner-recovery-pages.yml"
GROUP = "jm-pages-publication"

def top_level_block(source: str, key: str) -> str:
    match = re.search(rf"(?m)^{re.escape(key)}:\s*\n", source)
    if not match:
        return ""
    tail = source[match.end():]
    nxt = re.search(r"(?m)^[A-Za-z][\w-]*:\s*(?:\n|$)", tail)
    return tail[:nxt.start()] if nxt else tail

def key_value(block: str, name: str) -> str | None:
    match = re.search(rf"(?m)^  {re.escape(name)}:\s*([^\n#]+)", block)
    return match.group(1).strip().strip("'\"") if match else None

def audit(main: str, recovery: str) -> dict:
    issues = []
    for label, body in (("canonical", main), ("manual_recovery", recovery)):
        concurrency = top_level_block(body, "concurrency")
        for k, expected in (("group", GROUP), ("queue", "max"), ("cancel-in-progress", "false")):
            if key_value(concurrency, k) != expected:
                issues.append(f"{label}:concurrency_{k}_not_{expected}")
        if "actions/deploy-pages@v4" not in body:
            issues.append(f"{label}:missing_existing_deployment")
        for mandatory in (
            "--exclude='.github/'",
            "--exclude='family-gifts/'",
            "verify_pages_stage_cp07.py --stage _public_site",
        ):
            if mandatory not in body:
                issues.append(f"{label}:missing_{mandatory}")
    main_triggers = top_level_block(main, "on")
    recovery_triggers = top_level_block(recovery, "on")
    if not re.search(r"(?m)^  push:", main_triggers):
        issues.append("canonical:push_main_trigger_missing")
    if not re.search(r"(?m)^  workflow_dispatch:", main_triggers):
        issues.append("canonical:manual_trigger_missing")
    if re.search(r"(?m)^  push:", recovery_triggers):
        issues.append("manual_recovery:must_not_auto_deploy_on_push")
    if not re.search(r"(?m)^  workflow_dispatch:", recovery_triggers):
        issues.append("manual_recovery:manual_trigger_missing")
    if not all(re.search(rf"(?m)^  {j}:\n", main) for j in
               ("prove-theory-factory", "prove-ftr-factory", "prove-agi-runtime-factory")):
        issues.append("canonical:existing_postdeploy_proofs_missing")
    return {
        "schema": "JM.PagesPublicationLane/CP09",
        "status": "STATIC_SOURCE_PASS" if not issues else "HOLD",
        "scope": "Two workflow source files only; no Actions runtime/queue, CI, publication or owner acceptance proven",
        "issues": issues,
    }

class Fixtures(unittest.TestCase):
    MAIN = """name: main
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: jm-pages-publication
  queue: max
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: "rsync --exclude='.github/' --exclude='family-gifts/' . _public_site"
      - run: python3 verify_pages_stage_cp07.py --stage _public_site
      - uses: actions/deploy-pages@v4
  prove-theory-factory:
  prove-ftr-factory:
  prove-agi-runtime-factory:
"""
    RECOVERY = MAIN.replace("  push:\n    branches: [main]\n", "").replace(
        "  prove-theory-factory:\n  prove-ftr-factory:\n  prove-agi-runtime-factory:\n", "")
    def test_both_intact(self):
        self.assertEqual(audit(self.MAIN, self.RECOVERY)["status"], "STATIC_SOURCE_PASS")
    def test_different_concurrency_key(self):
        self.assertEqual(audit(self.MAIN, self.RECOVERY.replace(GROUP, "other"))["status"], "HOLD")
    def test_cancel_running_is_hold(self):
        self.assertEqual(audit(self.MAIN.replace("cancel-in-progress: false", "cancel-in-progress: true"), self.RECOVERY)["status"], "HOLD")
    def test_queue_single_is_hold(self):
        self.assertEqual(audit(self.MAIN, self.RECOVERY.replace("queue: max", "queue: single"))["status"], "HOLD")
    def test_recovery_auto_push_is_hold(self):
        self.assertEqual(audit(self.MAIN, self.MAIN)["status"], "HOLD")
    def test_no_stage_guard_is_hold(self):
        self.assertEqual(audit(self.MAIN.replace("verify_pages_stage_cp07.py --stage _public_site", "echo ignored"), self.RECOVERY)["status"], "HOLD")
    def test_missing_postdeploy_proof_is_hold(self):
        self.assertEqual(audit(self.MAIN.replace("  prove-ftr-factory:\n", ""), self.RECOVERY)["status"], "HOLD")
    def test_no_manual_recovery_is_hold(self):
        self.assertEqual(audit(self.MAIN, self.RECOVERY.replace("  workflow_dispatch:", "  schedule:"))["status"], "HOLD")

def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        return 0 if unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(Fixtures)
        ).wasSuccessful() else 1
    report = audit((args.root / PRIMARY).read_text(encoding="utf-8"),
                   (args.root / RECOVERY).read_text(encoding="utf-8"))
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "STATIC_SOURCE_PASS" else 1

if __name__ == "__main__":
    raise SystemExit(main())
