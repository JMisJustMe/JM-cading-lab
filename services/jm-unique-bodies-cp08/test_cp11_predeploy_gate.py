"""CP11 original JM HTTP bearer state versus cold custody: adversarial tests."""
import json, os, socket, subprocess, sys, tempfile, time, unittest
from pathlib import Path
from unittest import mock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import urllib.request
import sqlite3
import atlas_custody as cold
import cp07_atomic_runtime as cp07
import cp11_predeploy_gate as gate
import server

ROOT=Path(__file__).resolve().parent
BEARER="cp11.private.012345678901234567890123456789"

def port():
    with socket.socket() as s:
        s.bind(("127.0.0.1",0))
        return s.getsockname()[1]

class LiveColdProof(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.db=self.root/"original.sqlite3"
        self.archive=self.root/"custody.zip"
        self.atlas=server.Atlas(str(self.db))
        cp07.init(self.atlas)
        receipt=cp07.execute(self.atlas,"cp11.original.001",apply=True)
        self.assertEqual(receipt["state"],"ATOMIC_NATIVE_TO_ATLAS_PERSISTED")
        self.saved=cold.snapshot(self.db,self.archive)
        self.port=port()
        self.endpoint=f"http://127.0.0.1:{self.port}"
        env=os.environ.copy()
        env.update({"JM_BODIES_TOKEN":BEARER,"CP08_PUBLIC_ORIGIN":self.endpoint})
        self.proc=subprocess.Popen([sys.executable,str(ROOT/"cp08_gateway.py"),"--host",
            "127.0.0.1","--port",str(self.port),"--db",str(self.db)],
            cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        self.addCleanup(self.stop)
        for _ in range(250):
            try:
                with urllib.request.urlopen(self.endpoint+"/health",timeout=.5) as r:
                    if json.load(r)["ok"]:break
            except (OSError,ValueError):
                if self.proc.poll() is not None:self.fail("gateway exited")
                time.sleep(.02)
        else:self.fail("gateway unavailable")
    def stop(self):
        if self.proc.poll() is None:
            self.proc.terminate()
            try:self.proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait()
    def check(self,token=BEARER,sha=None):
        return gate.check(self.endpoint,self.archive,
            sha if sha is not None else self.saved["archive_sha256"],token)
    def test_00_exact_live_archive_match_does_not_authorize_deployment(self):
        before=cp07.history(self.atlas)
        p=self.check()
        self.assertEqual(p["state"],"LIVE_COLD_RECEIPTS_MATCH_OBSERVED")
        self.assertEqual((p["run_count"],p["event_count"],p["body_count"]),(1,2,1))
        self.assertIs(p["deployment_safe"],False)
        self.assertEqual(p["authority"],"READ_ONLY_MATCH_NO_DEPLOY_APPROVAL")
        after=cp07.history(self.atlas)
        self.assertEqual(before["run_count"],after["run_count"])
        self.assertEqual(before["total_atlas_contact_events"],after["total_atlas_contact_events"])
    def test_01_new_write_stales_archive(self):
        cp07.execute(self.atlas,"cp11.original.002",apply=True)
        with self.assertRaisesRegex(gate.GateHold,"ARCHIVE_NOT_EQUAL_TO_LIVE_HISTORY"):
            self.check()
    def test_02_bad_owner_bearer_fails_401(self):
        with self.assertRaisesRegex(gate.GateHold,"REMOTE_HTTP_401"):
            self.check(token="bad012345678901234567890123456789")
    def test_03_bad_archive_never_sends_bearer(self):
        with mock.patch.object(gate,"read_live_history",side_effect=AssertionError("NETWORK_CALLED")) as x:
            with self.assertRaisesRegex(ValueError,"ARCHIVE_OUTER_SHA256_MISMATCH"):
                self.check(sha="0"*64)
            x.assert_not_called()
    def test_04_original_receipt_tamper_holds(self):
        with sqlite3.connect(self.db) as d:
            d.execute("UPDATE atomic_contact_runs SET receipt_hash='TAMPER'")
        with self.assertRaisesRegex(gate.GateHold,"LIVE_RECEIPTS_OR_CHAIN_NOT_VALID"):
            self.check()
    def test_05_https_except_local_loopback(self):
        for url,reason in [("http://example.com","HTTPS_REQUIRED"),
                           ("https://user:password@example.com","INVALID_OR_CREDENTIAL"),
                           ("https://example.com/?token=bad","ROOT_URL_ONLY")]:
            with self.assertRaisesRegex(gate.GateHold,reason):
                gate.validate_endpoint(url)
    def test_06_missing_cold_archive_holds(self):
        with self.assertRaises((FileNotFoundError,ValueError)):
            gate.check(self.endpoint,self.root/"missing.zip","0"*64,BEARER)
    def test_07_missing_token_denied(self):
        with self.assertRaisesRegex(gate.GateHold,"PRIVATE_BEARER_NOT_PRESENT"):
            self.check(token="")
    def test_08_matching_counts_but_fake_receipt_still_denied(self):
        record=cp07.history(self.atlas)
        record["runs"][0]["receipt_hash"]="FORGED"
        with self.assertRaisesRegex(gate.GateHold,"ARCHIVE_NOT_EQUAL_TO_LIVE_HISTORY"):
            gate.assess(record,self.archive,self.saved["archive_sha256"])
    def test_09_redirect_never_follows_bearer(self):
        class Redirect(BaseHTTPRequestHandler):
            def log_message(self,*a):pass
            def do_POST(self):
                self.send_response(307)
                self.send_header("Location","https://untrusted.invalid/mcp")
                self.end_headers()
        http=ThreadingHTTPServer(("127.0.0.1",0),Redirect)
        th=Thread(target=http.serve_forever,daemon=True);th.start()
        try:
            with self.assertRaisesRegex(gate.GateHold,"REDIRECT_NOT_AUTHORIZED"):
                gate.read_live_history(f"http://127.0.0.1:{http.server_address[1]}",BEARER)
        finally:
            http.shutdown();http.server_close()

if __name__=="__main__":unittest.main(verbosity=2)
