#!/usr/bin/env python3
"""JM Build Entry Gate: original PR boundaries, not synthetic merge baggage.

The fixture is isolated from the owner Estate and uses only synthetic files.
No source authority, production branch or held original is modified.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ESTATE = Path(__file__).resolve().parents[2]
SCRIPT = ESTATE / "scripts/jm_build_entry_gate.py"
POLICY = ESTATE / "registry/build-routes/JM_BUILD_ENTRY_POLICY_v0.1.json"
WORKFLOW = ESTATE / ".github/workflows/jm-build-entry-gate.yml"

spec = importlib.util.spec_from_file_location("jm_build_entry_gate_scope", SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class PullRequestHeadScope(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "synthetic-estate"
        self.root.mkdir()
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "proof@example.invalid")
        self.git("config", "user.name", "JM Synthetic Proof")
        for folder in ("lyrics", "tools", "games"):
            (self.root / folder).mkdir()
        (self.root / "lyrics/index.html").write_text("owner lyrics door")
        (self.root / "tools/README.md").write_text("existing tools root")
        (self.root / "games/README.md").write_text("existing games root")
        self.git("add", ".")
        self.git("commit", "-qm", "synthetic base")
        self.base = self.git("rev-parse", "HEAD")

        self.git("checkout", "-qb", "lyrics-fix")
        (self.root / "lyrics/index.html").write_text("owner lyrics door with mobile return")
        self.git("add", ".")
        self.git("commit", "-qm", "real lyrics PR change")
        self.pr_head = self.git("rev-parse", "HEAD")

        self.git("checkout", "-q", "main")
        (self.root / "tools/owner_vault_provider_readiness.py").write_text("print('unrelated app')\n")
        self.git("add", ".")
        self.git("commit", "-qm", "unrelated main addition")
        self.git("checkout", "-q", "lyrics-fix")
        self.git("merge", "--no-ff", "-qm", "synthetic PR merge", "main")
        self.synthetic_merge = self.git("rev-parse", "HEAD")

        self.git("checkout", "-qb", "actual-new-body", self.base)
        (self.root / "games/new-body.html").write_text("<html>real added game</html>")
        self.git("add", ".")
        self.git("commit", "-qm", "actual new executable body")
        self.new_body_head = self.git("rev-parse", "HEAD")

    def git(self, *args):
        return subprocess.check_output(
            ["git", *args], cwd=self.root, text=True, stderr=subprocess.STDOUT
        ).strip()

    def evaluate(self, head):
        output = io.StringIO()
        with patch.object(gate, "ROOT", self.root), patch.object(
            sys, "argv", [str(SCRIPT), "--policy", str(POLICY),
                          "--base", self.base, "--head", head,
                          "--pr-number", "619"]
        ), contextlib.redirect_stdout(output):
            code = gate.main()
        return code, output.getvalue()

    def test_real_lyrics_pr_is_not_mistaken_for_unrelated_main_change(self):
        code, log = self.evaluate(self.pr_head)
        self.assertEqual(code, 0, log)
        self.assertIn("high-confidence new-body signals=0", log)
        self.assertFalse((self.root / "build-entry-output").exists())

    def test_synthetic_merge_reproduces_unrelated_owner_vault_false_positive(self):
        code, log = self.evaluate(self.synthetic_merge)
        self.assertEqual(code, 1, log)
        self.assertIn("tools/owner_vault_provider_readiness.py", log)
        self.assertIn("high-confidence new-body signals=1", log)

    def test_true_new_executable_pr_still_fails_closed(self):
        code, log = self.evaluate(self.new_body_head)
        self.assertEqual(code, 1, log)
        self.assertIn("games/new-body.html", log)
        self.assertIn("without a same-PR prospective Build Route Manifest", log)

    def test_workflow_routes_both_live_checks_to_event_pr_head(self):
        yml = WORKFLOW.read_text()
        self.assertEqual(yml.count('PR_HEAD: ${{ github.event.pull_request.head.sha }}'), 2)
        self.assertIn('jm_build_storage_preflight.py --base "$BASE_SHA" --head "$PR_HEAD"', yml)
        self.assertIn('--head "$PR_HEAD" \\', yml)
        self.assertNotIn("--head HEAD", yml)


if __name__ == "__main__":
    unittest.main()
