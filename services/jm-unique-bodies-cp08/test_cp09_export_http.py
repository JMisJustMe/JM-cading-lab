"""CP09 real HTTP owner archive export: double-secret and browser-denial tests."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

import cp07_atomic_runtime as cp07
import cp09_custody as custody
import server

ROOT=Path(__file__).resolve().parent
BEARER="jm.cp09.test.bearer.very.long.private.token"
CUSTODY="jm.cp09.test.owner.cold.custody.secret.separate"

def port():
    with socket.socket() as s:
        s.bind(("127.0.0.1",0))
        return s.getsockname()[1]

class LiveHTTPExport(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.live=self.root/"ephemeral-host-atlas.sqlite3"
        a=server.Atlas(str(self.live))
        cp07.init(a)
        for i in range(2):
            self.assertEqual(
                cp07.execute(a,f"cp09.export.{i}",apply=True)["state"],
                "ATOMIC_NATIVE_TO_ATLAS_PERSISTED")
        self.port=port()
        self.process=None
        self.start()

    def tearDown(self):
        self.stop()

    def stop(self):
        if self.process is not None:
            self.process.terminate()
            try:self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.process=None

    def start(self,enable="1",secret=CUSTODY):
        env=os.environ.copy()
        env.update({
            "JM_BODIES_TOKEN":BEARER,
            "JM_CP09_EXPORT_ENABLE":enable,
            "JM_CP09_EXPORT_SECRET":secret,
            "CP08_PUBLIC_ORIGIN":f"http://127.0.0.1:{self.port}",
            "CP08_ALLOWED_BROWSER_ORIGINS":"https://gemini.google.com",
            "JM_BODIES_DB":str(self.live)
        })
        self.process=subprocess.Popen(
            [sys.executable,str(ROOT/"cp08_gateway.py"),"--host","127.0.0.1",
             "--port",str(self.port),"--db",str(self.live)],
             env=env,cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(180):
            if self.process.poll() is not None:break
            try:
                with urllib.request.urlopen(
                    f"http://127.0.0.1:{self.port}/health",timeout=.4) as r:
                    if json.load(r).get("ok"):return
            except (OSError,ValueError):
                time.sleep(.03)
        raise RuntimeError("HOLD_CP09_GATEWAY_START")

    def request(self,bearer=BEARER,custody_token=CUSTODY,origin=None,path="/custody/export",range_header=None):
        headers={}
        if bearer is not None:headers["Authorization"]="Bearer "+bearer
        if custody_token is not None:headers["X-JM-Custody-Token"]=custody_token
        if origin is not None:headers["Origin"]=origin
        if range_header is not None:headers["Range"]=range_header
        req=urllib.request.Request(f"http://127.0.0.1:{self.port}"+path,headers=headers)
        try:
            with urllib.request.urlopen(req,timeout=25) as r:
                return r.status,{k.lower():v for k,v in r.headers.items()},r.read()
        except urllib.error.HTTPError as e:
            return e.code,{k.lower():v for k,v in e.headers.items()},e.read()

    def test_01_double_token_live_http_export_cold_restore(self):
        code,h,packed=self.request()
        self.assertEqual(code,200,packed[:500])
        self.assertEqual(h["content-type"],"application/zip")
        self.assertEqual(h["cache-control"],"no-store, private")
        self.assertNotIn("access-control-allow-origin",h)
        self.assertNotIn(BEARER.encode(),packed)
        self.assertNotIn(CUSTODY.encode(),packed)
        capsule=self.root/"owner-external-custody.zip"
        capsule.write_bytes(packed)
        self.assertEqual(custody.capsule_verify(capsule)["total_atlas_contact_events"],4)
        # Represent a wiped ephemeral app directory: source file disappears.
        self.stop()
        self.live.unlink()
        self.assertFalse(self.live.exists())
        restored=self.root/"different-custody-recipient.sqlite3"
        self.assertEqual(
            custody.capsule_restore(capsule,restored)["total_atlas_contact_events"],4)
        a=server.Atlas(str(restored))
        self.assertEqual(cp07.execute(a,"cp09.export.0",apply=True)["writes_now"],0)
        self.assertEqual(cp07.history(a)["total_atlas_contact_events"],4)

    def test_02_missing_or_wrong_auth_never_returns_archive(self):
        for bearer,custody_token in [
            (None,CUSTODY),("wrong",CUSTODY),(BEARER,None),(BEARER,"wrong")
        ]:
            code,h,body=self.request(bearer=bearer,custody_token=custody_token)
            self.assertEqual(code,401)
            self.assertNotEqual(h["content-type"],"application/zip")
            self.assertNotIn("access-control-allow-origin",h)
            self.assertNotIn(b"SQLite format",body)

    def test_03_even_admitted_gemini_origin_denied_raw_custody(self):
        code,h,body=self.request(origin="https://gemini.google.com")
        self.assertEqual(code,403)
        self.assertNotIn("access-control-allow-origin",h)
        self.assertNotIn(b"SQLite format",body)
        self.assertEqual(self.request(origin="null")[0],403)
        self.assertEqual(self.request(range_header="bytes=0-255")[0],400)

    def test_04_default_off_means_no_custody_export_endpoint(self):
        self.stop()
        self.start(enable="0")
        code,headers,body=self.request()
        self.assertEqual(code,404)
        self.assertNotIn("access-control-allow-origin",headers)
        self.assertNotIn(b"SQLite format",body)

    def test_05_corrupted_original_history_held_without_raw_export(self):
        import sqlite3
        with sqlite3.connect(self.live) as db:
            db.execute("UPDATE atomic_contact_runs SET receipt_hash='tampered'")
        code,headers,body=self.request()
        self.assertEqual(code,409)
        self.assertNotEqual(headers["content-type"],"application/zip")
        self.assertNotIn(b"SQLite format",body)

if __name__=="__main__":
    unittest.main(verbosity=2)
