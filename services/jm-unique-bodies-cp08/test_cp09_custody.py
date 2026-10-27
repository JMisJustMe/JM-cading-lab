"""Actual JM CP09 custody contact, not a simulated Atlas or Render claim."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

import cp09_custody as custody
import cp07_atomic_runtime as cp07
import server

ROOT=Path(__file__).resolve().parent


class ColdCustody(unittest.TestCase):
    def setUp(self):
        self.dir=tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.root=Path(self.dir.name)
        self.live=self.root/"live.sqlite3"
        self.archive=self.root/"owner-custody.zip"
        self.recovered=self.root/"new-independent-atlas.sqlite3"
        self.atlas=server.Atlas(str(self.live))
        cp07.init(self.atlas)
        for i in range(3):
            result=cp07.execute(self.atlas,f"cp09.source.{i:03}",apply=True)
            self.assertEqual(result["state"],"ATOMIC_NATIVE_TO_ATLAS_PERSISTED")
        self.assertEqual(cp07.history(self.atlas)["total_atlas_contact_events"],6)

    def archive_contents(self):
        with zipfile.ZipFile(self.archive) as f:
            return {name:f.read(name) for name in f.namelist()}

    def replaced_archive(self, files):
        other=self.root/"tampered.zip"
        with zipfile.ZipFile(other,"w",compression=zipfile.ZIP_DEFLATED) as p:
            for name,content in files.items():
                p.writestr(name,content)
        return other

    def test_01_real_native_sqlite_backup_loss_restore_and_replay(self):
        saved=custody.capsule_backup(self.live,self.archive)
        self.assertEqual(saved["total_atlas_contact_events"],6)
        self.assertEqual(custody.capsule_verify(self.archive)["state"],"COLD_CUSTODY_VERIFIED")
        # Original database really disappears before a new independent target.
        self.live.unlink()
        self.assertFalse(self.live.exists())
        restored=custody.capsule_restore(self.archive,self.recovered)
        self.assertEqual(restored["state"],"RESTORED_NEW_INDEPENDENT_ATLAS")
        self.assertEqual(restored["total_atlas_contact_events"],6)
        other=server.Atlas(str(self.recovered))
        self.assertTrue(cp07.history(other)["integrity_valid"])
        replay=cp07.execute(other,"cp09.source.000",apply=True)
        self.assertEqual((replay["state"],replay["writes_now"]),("ALREADY_PROVEN_REPLAY",0))
        fresh=cp07.execute(other,"cp09.recovered.001",apply=True)
        self.assertEqual(fresh["state"],"ATOMIC_NATIVE_TO_ATLAS_PERSISTED")
        self.assertEqual(cp07.history(other)["total_atlas_contact_events"],8)
        self.assertFalse(self.live.exists())

    def test_02_archive_is_independent_of_further_source_writes(self):
        custody.capsule_backup(self.live,self.archive)
        cp07.execute(self.atlas,"cp09.live.after.snapshot",apply=True)
        self.assertEqual(cp07.history(self.atlas)["total_atlas_contact_events"],8)
        custody.capsule_restore(self.archive,self.recovered)
        self.assertEqual(cp07.history(server.Atlas(str(self.recovered)))["total_atlas_contact_events"],6)

    def test_03_tampered_database_payload_denied_before_restore(self):
        custody.capsule_backup(self.live,self.archive)
        files=self.archive_contents()
        data=bytearray(files["atlas.sqlite3"])
        data[150]=data[150]^1
        files["atlas.sqlite3"]=bytes(data)
        dirty=self.replaced_archive(files)
        with self.assertRaisesRegex(ValueError,"HOLD_CUSTODY_DIGEST"):
            custody.capsule_restore(dirty,self.recovered)
        self.assertFalse(self.recovered.exists())

    def test_04_forged_counters_denied_before_restore(self):
        custody.capsule_backup(self.live,self.archive)
        files=self.archive_contents()
        manifest=json.loads(files["manifest.json"])
        manifest["total_atlas_contact_events"]+=100
        files["manifest.json"]=json.dumps(manifest).encode()
        dirty=self.replaced_archive(files)
        with self.assertRaisesRegex(ValueError,"HOLD_RESTORED_ATLAS_COUNTERS"):
            custody.capsule_restore(dirty,self.recovered)
        self.assertFalse(self.recovered.exists())

    def test_05_foreign_path_and_extra_zip_entry_rejected(self):
        custody.capsule_backup(self.live,self.archive)
        files=self.archive_contents()
        files["../escape"] = b"NOT_A_JM_PART"
        dirty=self.replaced_archive(files)
        with self.assertRaisesRegex(ValueError,"HOLD_ARCHIVE_LAYOUT"):
            custody.capsule_restore(dirty,self.recovered)
        self.assertFalse((self.root/"escape").exists())

    def test_06_existing_recipient_and_existing_backup_not_overwritten(self):
        original=b"DIFFERENT_SOVEREIGN_PURPOSE"
        self.archive.write_bytes(original)
        with self.assertRaises(FileExistsError):
            custody.capsule_backup(self.live,self.archive)
        self.assertEqual(self.archive.read_bytes(),original)
        self.archive.unlink()
        custody.capsule_backup(self.live,self.archive)
        self.recovered.write_bytes(original)
        with self.assertRaises(FileExistsError):
            custody.capsule_restore(self.archive,self.recovered)
        self.assertEqual(self.recovered.read_bytes(),original)

    def test_07_corrupted_source_history_cannot_be_crowned(self):
        import sqlite3
        with sqlite3.connect(self.live) as db:
            db.execute("UPDATE atomic_contact_runs SET receipt_hash='bad' WHERE run_key='cp09.source.000'")
        with self.assertRaisesRegex(ValueError,"HOLD_ATLAS_HISTORY_INTEGRITY"):
            custody.capsule_backup(self.live,self.archive)
        self.assertFalse(self.archive.exists())

    def test_08_cold_process_cli_backup_verify_restore_and_permissions(self):
        def cli(*args):
            run=subprocess.run([sys.executable,str(ROOT/"cp09_custody.py"),*map(str,args)],
                capture_output=True,text=True,cwd=ROOT,timeout=25)
            self.assertEqual(run.returncode,0,run.stderr)
            return json.loads(run.stdout)
        created=cli("backup",self.live,self.archive)
        self.assertEqual(created["state"],"OFFLINE_CUSTODY_CAPSULE_WRITTEN")
        self.assertEqual(cli("verify",self.archive)["archive_sha256"],
                         hashlib.sha256(self.archive.read_bytes()).hexdigest())
        self.live.unlink()
        recovered=cli("restore",self.archive,self.recovered)
        self.assertEqual(recovered["db_sha256"],created["db_sha256"])
        self.assertEqual(cp07.history(server.Atlas(str(self.recovered)))["run_count"],3)
        self.assertEqual(self.archive.stat().st_mode & 0o777,0o600)
        self.assertEqual(self.recovered.stat().st_mode & 0o777,0o600)

if __name__=="__main__":
    unittest.main(verbosity=2)
