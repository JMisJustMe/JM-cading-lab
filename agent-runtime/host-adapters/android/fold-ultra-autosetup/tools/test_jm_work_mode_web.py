"""Portable loopback HTTP, CSRF and actual queue tests. No physical laptop/phone claims."""
import http.client
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlencode
import unittest

import jm_work_mode as work
import jm_work_mode_web as web


class DoorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name) / "JM-cading-lab"
        (self.repo / "scripts").mkdir(parents=True)
        (self.repo / "agent-runtime").mkdir(parents=True)
        (self.repo / "scripts" / "jm_build_execution.py").write_text(
            "import sys\nassert '--self-test' in sys.argv\nprint('FIXTURE_PASS')\n", encoding="utf-8")
        (self.repo / "agent-runtime" / "jm_agent_runtime.py").write_text("x = 2\n", encoding="utf-8")
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        subprocess.run(["git", "-C", str(self.repo), "-c", "user.name=JMFixture",
                        "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "fixture"], check=True)
        self.original_env = os.environ.get("JM_WORK_MODE_STATE")
        self.workdir = Path(self.tmp.name) / "state"
        os.environ["JM_WORK_MODE_STATE"] = str(self.workdir)
        self.addCleanup(self.restore_env)
        # WORK_DIR globals are bound on import; point these temporary paths explicitly.
        self.original_paths = (work.WORK_DIR, work.STATE, work.RUN_LOCK, work.STOP, work.LOG)
        work.WORK_DIR, work.STATE, work.RUN_LOCK, work.STOP, work.LOG = (
            self.workdir, self.workdir / "state.json", self.workdir / "run.lock",
            self.workdir / "stop.request", self.workdir / "runs.jsonl")
        self.addCleanup(self.restore_paths)
        self.server = web.WorkServer(self.repo, ("127.0.0.1", 0))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.close)
        self.port = self.server.server_port
        self.host = f"127.0.0.1:{self.port}"

    def restore_env(self):
        if self.original_env is None:
            os.environ.pop("JM_WORK_MODE_STATE", None)
        else:
            os.environ["JM_WORK_MODE_STATE"] = self.original_env

    def restore_paths(self):
        work.WORK_DIR, work.STATE, work.RUN_LOCK, work.STOP, work.LOG = self.original_paths

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, method="GET", path="/", host=None, origin=None, token=None, ctype=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=4)
        headers = {"Host": host or self.host}
        if origin is not None:
            headers["Origin"] = origin
        if method == "POST":
            headers["Content-Type"] = ctype or "application/x-www-form-urlencoded"
            body = urlencode({"token": token or "bad-token"})
            conn.request(method, path, body=body, headers=headers)
        else:
            conn.request(method, path, headers=headers)
        r = conn.getresponse()
        content = r.read()
        status = r.status
        head = dict(r.getheaders())
        conn.close()
        return status, content, head

    def test_get_page_has_actual_forms(self):
        status, data, headers = self.request()
        self.assertEqual(status, 200)
        self.assertIn(b"ACTIVATE NOW", data)
        self.assertIn(b'action="/activate"', data)
        self.assertIn(b"STOP AFTER CURRENT JOB", data)
        self.assertIn(b"not a timed screen-awake session", data)
        self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])

    def test_host_rebinding_is_blocked(self):
        self.assertEqual(self.request(host="evil.example")[0], 403)
        self.assertEqual(self.request("POST", "/activate", host="evil.example")[0], 403)

    def test_remote_bind_is_forbidden(self):
        with self.assertRaises(ValueError):
            web.WorkServer(self.repo, ("0.0.0.0", 0))

    def test_csrf_and_origins_are_rejected(self):
        origin = f"http://127.0.0.1:{self.port}"
        self.assertEqual(self.request("POST", "/activate", origin="https://evil.example", token=self.server.token)[0], 403)
        self.assertEqual(self.request("POST", "/activate", token=self.server.token)[0], 403)
        self.assertEqual(self.request("POST", "/activate", origin=origin)[0], 403)
        self.assertEqual(self.request("POST", "/activate", origin=origin, token=self.server.token, ctype="text/plain")[0], 415)
        self.assertFalse((self.workdir / "state.json").exists())

    def test_real_activated_queue_and_receipts(self):
        origin = f"http://127.0.0.1:{self.port}"
        status, _, headers = self.request("POST", "/activate", origin=origin, token=self.server.token)
        self.assertEqual((status, headers["Location"]), (303, "/"))
        self.assertEqual(self.request("POST", "/activate", origin=origin, token=self.server.token)[0], 409)
        end = time.monotonic() + 12
        state = {}
        while time.monotonic() < end:
            time.sleep(.2)
            if (self.workdir / "state.json").exists():
                state = json.loads((self.workdir / "state.json").read_text())
                if state.get("status") in ("PASS", "PARTIAL_FAILURE", "HOLD", "STOPPED"):
                    break
        self.assertEqual((state.get("status"), state.get("completed")), ("PASS", 4), state)
        status, data, _ = self.request()
        self.assertEqual(status, 200)
        self.assertIn(b"Previous job receipts", data)
        self.assertIn(b"JM execution contract self-test", data)

    def test_missing_original_checkout_disables_start(self):
        (self.repo / "scripts" / "jm_build_execution.py").unlink()
        status, data, _ = self.request()
        self.assertEqual(status, 200)
        self.assertIn(b"original JM-cading-lab checkout not found", data)
        self.assertIn(b'class="start" disabled', data)
        origin = f"http://127.0.0.1:{self.port}"
        self.assertEqual(self.request("POST", "/activate", origin=origin, token=self.server.token)[0], 409)

    def test_stop_route_is_non_destructive(self):
        origin = f"http://127.0.0.1:{self.port}"
        self.assertEqual(self.request("POST", "/stop", origin=origin, token=self.server.token)[0], 303)
        self.assertFalse((self.workdir / "stop.request").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
