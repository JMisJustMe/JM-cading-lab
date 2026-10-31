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
                mode=None, expected_digest=None, source_url=None):
        cmd = [sys.executable, str(HOST), action, "--harness", harness]
        if name:
            cmd += ["--name", name]
        if mode:
            cmd += ["--mode", mode]
        if expected_digest is not None:
            cmd += ["--expected-digest", expected_digest]
        if source_url is not None:
            cmd += ["--source-url", source_url]
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


    def test_genuine_phone_git_status_receipt_is_bounded_return_not_device_attestation(self):
        # Historical original Samsung issue #12: input fixture comes from its actual private
        # GitHub comment, not a freshly executed handset or a new hardware claim.
        from jm_scoped_memory_host import stable
        source_url = ("https://github.com/JMisJustMe/JM-ai-studio-surface/"
                      "issues/12#issuecomment-6527606601")
        phone_return = {"state": "PASS", "consequence": {
            "result": "PASS",
            "git": {"exit_code": 0, "stdout": "", "stderr": ""},
            "branch": {"exit_code": 0, "stdout": "feat/jm-phone-commander-v0-1-20261028\n",
                       "stderr": ""}}}
        proc, inserted = self.command("ingest-phone-git-status", "phone_receipt",
                                      body=stable(phone_return), source_url=source_url)
        self.assertEqual(proc.returncode, 0, inserted)
        self.assertEqual(inserted["consequence"]["status"], "COMMITTED_AND_READ_BACK")
        self.assertEqual(inserted["consequence"]["source_contact"],
                         "REFERENCE_ONLY_LOCAL_HOST_DID_NOT_FETCH_PHONE")
        proc, read = self.command("read", "phone_receipt", harness="second-process")
        self.assertEqual(proc.returncode, 0, read)
        record = json.loads(read["consequence"]["body"])
        self.assertEqual(record["source_url"], source_url)
        self.assertEqual(record["reported_phone_branch"], "feat/jm-phone-commander-v0-1-20261028")
        self.assertTrue(record["reported_clean_tracked_files"])
        self.assertEqual(record["source_authentication"], "NOT_PERFORMED_BY_LOCAL_HOST")
        self.assertNotIn("stdout", record)
        original_digest = read["consequence"]["digest"]
        # The observation remains source-linked and immutable. Corrections belong
        # in a distinct interpretation note, never in the original receipt.
        proc, created = self.command("write", "phone_interpretation",
                                     body=json.dumps({"source_note": "phone_receipt",
                                                      "source_digest": original_digest,
                                                      "interpretation": "Original phone source branch still present"}),
                                     mode="create")
        self.assertEqual(proc.returncode, 0, created)
        interpreted_digest = created["consequence"]["digest"]
        proc, updated = self.command("write", "phone_interpretation",
                                     body="Updated interpretation: phone source branch is behind current main",
                                     mode="correct", expected_digest=interpreted_digest)
        self.assertEqual(proc.returncode, 0, updated)
        proc, stale = self.command("write", "phone_interpretation",
                                   body="outdated interpretation",
                                   mode="correct", expected_digest=interpreted_digest)
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(stale["error_type"], "MemoryConflict")
        proc, final = self.command("read", "phone_interpretation")
        self.assertEqual(final["consequence"]["revision"], 2)
        self.assertEqual(final["consequence"]["previous"], interpreted_digest)
        proc, preserved = self.command("read", "phone_receipt")
        self.assertEqual(preserved["consequence"]["digest"], original_digest)
        self.assertEqual(json.loads(preserved["consequence"]["body"])["source_url"], source_url)
        proc, held = self.command("ingest-phone-git-status", "phone_receipt",
                                  body=stable(phone_return), source_url=source_url,
                                  mode="correct", expected_digest=original_digest)
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held["status"], "HOLD")


    def test_private_gh_comment_read_using_bounded_cli_fixture(self):
        # Real repo-process execution with fixture gh CLI; no provider/device contact claim.
        import stat
        fake = Path(self.tmp.name) / "gh"
        fake.write_text(
            '#!/bin/sh\n'
            'if [ "$1" != "api" ] || [ "$2" != "--method" ] || [ "$3" != "GET" ] || '
            '[ "$4" != "repos/JMisJustMe/JM-ai-studio-surface/issues/comments/6527606601" ]; then\n'
            '  exit 2\n'
            'fi\n'
            'printf "%s" "$JM_FIXTURE_GH_COMMENT"\n', encoding="utf-8")
        fake.chmod(stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR)
        self.env["PATH"] = self.tmp.name + os.pathsep + self.env["PATH"]
        url = ("https://github.com/JMisJustMe/JM-ai-studio-surface/"
               "issues/12#issuecomment-6527606601")
        raw = {"state": "PASS", "consequence": {
            "result": "PASS",
            "git": {"exit_code": 0, "stdout": "", "stderr": ""},
            "branch": {"exit_code": 0, "stdout": "feat/jm-phone-commander-v0-1-20261028\n", "stderr": ""}}}
        comment = {"id": 6527606601, "html_url": url,
                   "issue_url": "https://api.github.com/repos/JMisJustMe/JM-ai-studio-surface/issues/12",
                   "user": {"login": "JMisJustMe"},
                   "body": "JM PHONE COMMANDER RECEIPT\n" + chr(96)*3 + "json\n" +
                           json.dumps(raw) + "\n" + chr(96)*3}
        self.env["JM_FIXTURE_GH_COMMENT"] = json.dumps(comment)
        proc, result = self.command("fetch-phone-comment", "verified_reference",
                                    source_url=url, harness="one")
        self.assertEqual(proc.returncode, 0, result)
        self.assertEqual(result["consequence"]["status"], "COMMITTED_AND_READ_BACK")
        proc, output = self.command("read", "verified_reference", harness="two")
        self.assertEqual(proc.returncode, 0, output)
        saved = json.loads(output["consequence"]["body"])
        self.assertEqual(saved["source_url"], url)
        self.assertEqual(saved["source_comment_id"], 6527606601)
        self.assertEqual(saved["source_contact"], "GITHUB_COMMENT_READ_NOT_NEW_ANDROID_CONTACT")
        self.assertNotIn("git", saved)
        prior = output["consequence"]["digest"]
        for mutation in (
            {"id": 42},
            {"user": {"login": "NotTheOwner"}},
            {"issue_url": "https://api.github.com/repos/JMisJustMe/JM-ai-studio-surface/issues/13"},
            {"body": "JM PHONE COMMANDER RECEIPT\n" + chr(96)*3 + "json\n" +
                     json.dumps({"state": "HOLD"}) + "\n" + chr(96)*3},
        ):
            self.env["JM_FIXTURE_GH_COMMENT"] = json.dumps({**comment, **mutation})
            proc, failed = self.command("fetch-phone-comment", "untrusted",
                                        source_url=url)
            self.assertEqual(proc.returncode, 2, failed)
            self.assertEqual(failed["status"], "HOLD")
        self.env["JM_FIXTURE_GH_COMMENT"] = json.dumps(comment)
        proc, duplicate = self.command("fetch-phone-comment", "verified_reference",
                                       source_url=url)
        self.assertEqual(proc.returncode, 2, duplicate)
        self.assertEqual(duplicate["error_type"], "MemoryConflict")
        proc, readback = self.command("read", "verified_reference")
        self.assertEqual(readback["consequence"]["digest"], prior)
        proc, invalid = self.command("fetch-phone-comment", "invalid",
                                     source_url="https://evil.example.com/receipt")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(invalid["status"], "HOLD")

    def test_original_workspace_boundary_precedes_external_comment_read(self):
        # A missing JM workspace must HOLD before any external gh command runs.
        import stat
        fake = Path(self.tmp.name) / "gh"
        marker = Path(self.tmp.name) / "gh_called"
        fake.write_text('#!/bin/sh\nprintf touched > "$JM_GH_CALLED_MARKER"\nexit 99\n',
                        encoding="utf-8")
        fake.chmod(stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR)
        self.env["PATH"] = self.tmp.name + os.pathsep + self.env["PATH"]
        self.env["JM_GH_CALLED_MARKER"] = str(marker)
        without_workspace = Path(self.tmp.name) / "not-a-repository"
        without_workspace.mkdir()
        url = ("https://github.com/JMisJustMe/JM-ai-studio-surface/"
               "issues/12#issuecomment-6527606601")
        proc, held = self.command("fetch-phone-comment", "no_contact",
                                  source_url=url, cwd=without_workspace)
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held["status"], "HOLD")
        self.assertFalse(marker.exists(), "External gh contacted before JM workspace gate")

    def test_phone_receipt_intake_refuses_spoofed_or_failed_source(self):
        from jm_scoped_memory_host import stable
        good_url = ("https://github.com/JMisJustMe/JM-ai-studio-surface/"
                    "issues/12#issuecomment-6527606601")
        good = {"state": "PASS", "consequence": {
            "result": "PASS",
            "git": {"exit_code": 0, "stdout": "", "stderr": ""},
            "branch": {"exit_code": 0, "stdout": "feat/jm-phone-commander-v0-1-20261028\n", "stderr": ""}}}
        for changed, url in [
            (good, "https://evil.example.com/receipt"),
            ({"state": "HOLD", "reason": "NOT_RUN"}, good_url),
            ({"state": "PASS", "consequence": {"result": "PASS", "git": {
                "exit_code": 1, "stdout": "", "stderr": ""}, "branch": good["consequence"]["branch"]}}, good_url),
            ({"state": "PASS", "consequence": {"result": "PASS", "git": good["consequence"]["git"],
                "branch": {"exit_code": 0, "stdout": "branch; rm -rf /\n", "stderr": ""}}}, good_url),
        ]:
            proc, held = self.command("ingest-phone-git-status", "bad_receipt",
                                      body=stable(changed), source_url=url)
            self.assertEqual(proc.returncode, 2, held)
            self.assertEqual(held["status"], "HOLD")
        proc, held = self.command("ingest-phone-git-status", "bad_receipt",
                                  body=stable(good), source_url=good_url, mode="update")
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(held["status"], "HOLD")
        proc, keys = self.command("list")
        self.assertEqual(keys["consequence"]["note_keys"], [])

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
