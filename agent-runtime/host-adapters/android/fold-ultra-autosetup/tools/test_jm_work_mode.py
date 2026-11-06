"""Portable local fixtures only; not GroundZeroJM physical evidence."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

HERE = Path(__file__).resolve().parent
APP = HERE / "jm_work_mode.py"


class ManualModeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / "JM-cading-lab"
        self.repo.mkdir()
        (self.repo / "scripts").mkdir()
        (self.repo / "agent-runtime").mkdir()
        (self.repo / "scripts" / "jm_build_execution.py").write_text(
            "import sys\nassert '--self-test' in sys.argv\nprint('MOCK_JM_TEST_PASS')\n", encoding="utf-8")
        (self.repo / "agent-runtime" / "jm_agent_runtime.py").write_text("x = 2\n", encoding="utf-8")
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        subprocess.run(["git", "-C", str(self.repo), "-c", "user.name=JMFixture",
                        "-c", "user.email=fixture@invalid.local", "commit", "--allow-empty", "-qm", "fixture"], check=True)
        self.workdir = self.root / "state"
        self.env = {**os.environ, "JM_WORK_MODE_STATE": str(self.workdir)}

    def call(self, action):
        return subprocess.run([sys.executable, str(APP), action, "--repo", str(self.repo)],
                              cwd=HERE, env=self.env, capture_output=True, text=True, timeout=20)

    def test_structural(self):
        result = self.call("self-test")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_full_queue_and_audit(self):
        result = self.call("run")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        state = json.loads((self.workdir / "state.json").read_text())
        self.assertEqual((state["status"], state["completed"], state["total"]), ("PASS", 4, 4))
        receipts = [json.loads(s) for s in (self.workdir / "runs.jsonl").read_text().splitlines()]
        self.assertEqual([r["event"] for r in receipts].count("JOB_RESULT"), 4)
        self.assertTrue(all(len(r["stdout_sha256"]) == 64 for r in receipts if r["event"] == "JOB_RESULT"))
        self.assertFalse((self.workdir / "run.lock").exists())
        self.assertFalse((self.repo / "agent-runtime" / "__pycache__").exists())

    def test_manual_start_detaches_and_completes(self):
        started = self.call("start")
        self.assertEqual(started.returncode, 0, started.stderr + started.stdout)
        deadline = time.monotonic() + 12
        state = {}
        while time.monotonic() < deadline:
            time.sleep(.15)
            if (self.workdir / "state.json").is_file():
                state = json.loads((self.workdir / "state.json").read_text())
                if state.get("status") in ("PASS", "PARTIAL_FAILURE", "HOLD", "STOPPED"):
                    break
        self.assertEqual(state.get("status"), "PASS", state)
        self.assertEqual(state.get("completed"), 4)

    def test_duplicate_guard_is_hold(self):
        self.workdir.mkdir()
        (self.workdir / "run.lock").write_text("fixture")
        result = self.call("run")
        self.assertEqual(result.returncode, 2)
        self.assertIn("HOLD", result.stdout)

    def test_unrecognised_checkout_is_hold(self):
        (self.repo / "scripts" / "jm_build_execution.py").unlink()
        result = self.call("run")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("HOLD", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
