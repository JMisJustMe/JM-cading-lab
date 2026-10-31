#!/usr/bin/env python3
"""External-process contact tests for JM scoped memory through the ORIGINAL repo adapter."""
from __future__ import annotations
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
HOST = ROOT / "agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_host.py"
ORIGINAL = ROOT / "agent-runtime/host-adapters/codex-repository-agent/jm_codex_repository_adapter.py"


class RepositoryProcessContact(unittest.TestCase):
    def setUp(self):
        if not (ROOT / "agent-runtime/jm_agent_runtime.py").exists():
            self.fail("Original JM core missing — cannot claim repository process contact")
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.env = os.environ.copy()
        self.env["XDG_STATE_HOME"] = self.tmp.name
        self.workspace = ROOT

    def command(self, action, name=None, *, harness="worker-a", body=None, cwd=None,
                mode=None, expected_digest=None):
        cmd = [sys.executable, str(HOST), action, "--harness", harness]
        if name:
            cmd += ["--name", name]
        if mode:
            cmd += ["--mode", mode]
        if expected_digest is not None:
            cmd += ["--expected-digest", expected_digest]
        proc = subprocess.run(cmd, input=body or "", capture_output=True, text=True,
                              cwd=cwd or self.workspace, env=self.env, check=False)
        if proc.returncode == 0:
            return proc, json.loads(proc.stdout)
        return proc, json.loads(proc.stderr)

    def test_exact_original_adapter_core_digest(self):
        direct = subprocess.run(
            [sys.executable, str(ORIGINAL), "--query", "coding runtime",
             "--target", str(ROOT), "--compact"],
            cwd=ROOT, text=True, capture_output=True, check=True)
        original = json.loads(direct.stdout)
        proc, contact = self.command("write", "route", body="JM original source retained")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(contact["core_sha256"], original["core_sha256"])
        self.assertEqual(contact["adapter_manifest_sha256"],
                         hashlib.sha256(ORIGINAL.read_bytes()).hexdigest())
        self.assertEqual(contact["provider_contact"], False)
        self.assertEqual(contact["authority"], "POSIX_REPOSITORY_PROCESS_NOT_SOVEREIGN_BODY")

    def test_two_independent_processes_share_workspace_state(self):
        proc, saved = self.command("write", "shared", body="Trace survives process restart", harness="worker-a")
        self.assertEqual(proc.returncode, 0, saved)
        proc, returned = self.command("read", "shared", harness="worker-b")
        self.assertEqual(proc.returncode, 0, returned)
        self.assertEqual(returned["consequence"]["body"], "Trace survives process restart")
        self.assertEqual(returned["consequence"]["digest"], saved["consequence"]["digest"])
        self.assertEqual(saved["consequence"]["status"], "COMMITTED_AND_READ_BACK")
        self.assertEqual(returned["proof"], "REAL_LOCAL_REPOSITORY_PROCESS_CONTACT_NOT_LIVE_CODEX_CLAUDE_OR_DEVICE")

    def test_nested_git_directory_resolves_same_workspace(self):
        proc, saved = self.command("write", "nested", body="root scoped")
        self.assertEqual(proc.returncode, 0, saved)
        proc, returned = self.command("read", "nested", cwd=ROOT / "agent-runtime")
        self.assertEqual(proc.returncode, 0, returned)
        self.assertEqual(returned["workspace"], str(ROOT))
        self.assertEqual(returned["consequence"]["body"], "root scoped")

    def test_two_distinct_git_workspaces_isolated(self):
        other = Path(self.tmp.name) / "other-git"
        other.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=other, check=True)
        proc, first = self.command("write", "separate", body="first")
        self.assertEqual(proc.returncode, 0, first)
        proc, second = self.command("list", cwd=other)
        self.assertEqual(proc.returncode, 0, second)
        self.assertEqual(second["consequence"]["note_keys"], [])
        proc, absent = self.command("read", "separate", cwd=other)
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(absent["status"], "HOLD")

    def test_concurrent_independent_processes_do_not_lose_updates(self):
        def write(i):
            return self.command("write", "parallel" + str(i), body="value-" + str(i))
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(write, range(6)))
        for proc, item in results:
            self.assertEqual(proc.returncode, 0, item)
        proc, listed = self.command("list", harness="worker-z")
        self.assertEqual(proc.returncode, 0, listed)
        self.assertEqual(listed["consequence"]["note_keys"],
                         ["parallel" + str(i) for i in range(6)])

    def test_cross_process_create_update_and_conflict(self):
        proc, first = self.command("write", "revision", body="one")
        self.assertEqual(proc.returncode, 0, first)
        proc, conflict = self.command("write", "revision", body="duplicate")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(conflict["error_type"], "MemoryConflict")
        proc, second = self.command("write", "revision", body="two", mode="update", harness="worker-b")
        self.assertEqual(proc.returncode, 0, second)
        self.assertEqual(second["consequence"]["revision"], 2)
        proc, after = self.command("read", "revision")
        self.assertEqual(after["consequence"]["body"], "two")

    def test_cross_process_correction_inherits_exact_digest_and_rejects_stale(self):
        proc, first = self.command("write", "observation", body="Notion unavailable")
        self.assertEqual(proc.returncode, 0, first)
        original_digest = first["consequence"]["digest"]
        proc, corrected = self.command("write", "observation", body="Notion directly contacted",
                                       mode="correct", expected_digest=original_digest,
                                       harness="worker-b")
        self.assertEqual(proc.returncode, 0, corrected)
        self.assertEqual(corrected["consequence"]["revision"], 2)
        proc, third = self.command("read", "observation", harness="worker-c")
        self.assertEqual(proc.returncode, 0, third)
        self.assertEqual(third["consequence"]["previous"], original_digest)
        self.assertEqual(third["consequence"]["body"], "Notion directly contacted")
        proc, stale = self.command("write", "observation", body="stale correction",
                                   mode="correct", expected_digest=original_digest,
                                   harness="worker-d")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(stale["error_type"], "MemoryConflict")
        proc, last = self.command("read", "observation")
        self.assertEqual(last["consequence"]["digest"], corrected["consequence"]["digest"])

    def test_corruption_is_hold_not_auto_repair(self):
        proc, result = self.command("write", "drift", body="original")
        self.assertEqual(proc.returncode, 0, result)
        home = Path(self.tmp.name) / "jm-ecostate" / "scoped-memory"
        corpus = next(home.glob("*.json"))
        obj = json.loads(corpus.read_text())
        obj["notes"]["drift"]["body"] = "tampered"
        corpus.write_text(json.dumps(obj))
        proc, held = self.command("read", "drift", harness="worker-b")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held["error_type"], "MemoryIntegrity")
        proc, held_write = self.command("write", "other", body="not a bypass")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held_write["status"], "HOLD")

    def test_fail_closed_for_missing_workspace_and_bad_note(self):
        plain = Path(self.tmp.name) / "not-a-git-repo"
        plain.mkdir()
        proc, held = self.command("list", cwd=plain)
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held["status"], "HOLD")
        proc, held = self.command("write", "../unsafe", body="reject me")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held["status"], "HOLD")
        proc, held = self.command("write", "empty", body="")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held["status"], "HOLD")


if __name__ == "__main__":
    unittest.main()
