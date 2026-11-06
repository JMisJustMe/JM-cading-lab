"""Non-destructive launcher checks: no actual phone use, publishing or power modifications."""
import http.server
from pathlib import Path
import socketserver
import subprocess
import tempfile
import threading
import unittest
from unittest import mock

import jm_work_mode as work
import jm_work_mode_launch as launch
import jm_work_mode_web as web


class LaunchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name) / "JM-cading-lab"
        (self.repo / ".git").mkdir(parents=True)
        (self.repo / "scripts").mkdir()
        (self.repo / "agent-runtime").mkdir()
        (self.repo / "scripts" / "jm_build_execution.py").write_text("pass\n", encoding="utf-8")
        (self.repo / "agent-runtime" / "jm_agent_runtime.py").write_text("pass\n", encoding="utf-8")
        self.srv = web.WorkServer(self.repo, ("127.0.0.1", 0))
        self.thread = threading.Thread(target=self.srv.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.port = self.srv.server_port

    def stop_server(self):
        self.srv.shutdown()
        self.srv.server_close()
        self.thread.join(2)

    def test_verified_existing_local_controller_is_reused(self):
        self.assertTrue(launch.verified_page(self.port))
        with mock.patch.object(launch.subprocess, "Popen", side_effect=AssertionError("must not spawn")):
            self.assertEqual(launch.launch(self.repo, port=self.port, open_browser=False), 0)

    def test_unverified_port_is_held(self):
        self.assertFalse(launch.verified_page(self.port + 1))
        with mock.patch.object(launch, "occupied", return_value=True), \
             mock.patch.object(launch.subprocess, "Popen", side_effect=AssertionError("must not spawn")):
            self.assertEqual(launch.launch(self.repo, port=self.port + 1, open_browser=False), 2)

    def test_missing_workspace_is_held(self):
        with self.assertRaises(RuntimeError):
            launch.launch(Path(self.tmp.name) / "other", port=self.port, open_browser=False)


if __name__ == "__main__":
    unittest.main(verbosity=2)
