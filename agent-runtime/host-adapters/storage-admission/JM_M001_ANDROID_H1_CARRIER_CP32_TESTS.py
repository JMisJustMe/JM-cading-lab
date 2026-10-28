#!/usr/bin/env python3
"""JM M001 CP32 public synthetic Android H1 frozen-carrier admission tests."""
import hashlib
import importlib.util
import io
import json
import os
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
sp=importlib.util.spec_from_file_location("jm_m001_cp32",HERE/"JM_M001_ANDROID_H1_CARRIER_CP32.py")
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)


class H1AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix="jm-h1-gate-")
        self.p=Path(self.tmp.name)
        rel=self.p/"release"
        rel.mkdir()
        for name in m.SOURCE_MEMBERS:
            path=self.p/name
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(("JM/source/"+name).encode())
        with zipfile.ZipFile(rel/m.SOURCE_ARCHIVE,"w",compression=zipfile.ZIP_DEFLATED) as z:
            for name in m.SOURCE_MEMBERS:
                z.write(self.p/name,name)
            z.writestr("CONTACT_PACK_MANIFEST.json",b'{"proof":"historical"}')
        rec={"schema":"jm.website.android-carrier-receipt/v1.5-h1",
             "package":m.PACKAGE,"versionCode":m.VERSION,
             "signingBoundary":"Temporary proof identity; not owner production/update key.",
             "physicalDeviceDing":"OPEN"}
        for key,name in [("debugApk","DEBUG.apk"),("proofAab","PROOF.aab"),("universalApk","INSTALL.apk")]:
            body=("fake signed carrier fixture "+key).encode()
            (rel/name).write_bytes(body)
            rec[key]={"name":name,"bytes":len(body),"sha256":m.digest(body)}
        (rel/m.RECEIPT).write_text(json.dumps(rec))
    def tearDown(self):
        self.tmp.cleanup()
    def gate(self):
        return m.admission(self.p)
    def assert_hold(self):
        self.assertEqual(self.gate()["status"],"HOLD")
    def test_exact_release_reuse(self):
        r=self.gate()
        self.assertEqual(r["status"],"REUSE_FROZEN_H1")
        self.assertFalse(r["rebuild"])
        self.assertEqual(r["delivery_count"],3)
        self.assertEqual(r["source_members"],len(m.SOURCE_MEMBERS))
    def test_changed_sources_refused(self):
        p=self.p/"app/src/main/AndroidManifest.xml"
        p.write_bytes(p.read_bytes()+b"changed")
        self.assertEqual(self.gate()["status"],"SOURCE_EDITION_HOLD")
    def test_historic_eight_member_source_is_distinct_not_missing(self):
        p=self.p/"release"/m.SOURCE_ARCHIVE
        with zipfile.ZipFile(p,"w",compression=zipfile.ZIP_DEFLATED) as z:
            for name in m.HISTORIC_MEMBERS:
                z.write(self.p/name,name)
        outcome=self.gate()
        self.assertEqual(outcome["status"],"SOURCE_EDITION_HOLD")
        self.assertEqual(outcome["archived_members"],8)
        self.assertFalse(outcome["rebuild"])
        self.assertFalse(outcome["release_authorised"])
    def test_unknown_source_member_not_promoted(self):
        p=self.p/"release"/m.SOURCE_ARCHIVE
        with zipfile.ZipFile(p,"a") as z:
            z.writestr("unexpected-executable.py",b"danger")
        self.assert_hold()
    def test_deleted_source_refused(self):
        (self.p/"app/build.gradle.kts").unlink()
        self.assert_hold()
    def test_corrupt_archive_refused(self):
        p=self.p/"release"/m.SOURCE_ARCHIVE
        p.write_bytes(b"corrupt ZIP")
        self.assert_hold()
    def test_duplicate_member_refused(self):
        p=self.p/"release"/m.SOURCE_ARCHIVE
        with zipfile.ZipFile(p,"a") as z:
            z.writestr("README.md",b"duplicate")
        self.assert_hold()
    def test_missing_delivery_refused(self):
        (self.p/"release/DEBUG.apk").unlink()
        self.assert_hold()
    def test_changed_delivery_refused(self):
        p=self.p/"release/INSTALL.apk"
        p.write_bytes(p.read_bytes()+b"new")
        self.assert_hold()
    def test_wrong_version_refused(self):
        p=self.p/"release"/m.RECEIPT
        j=json.loads(p.read_text());j["versionCode"] += 1
        p.write_text(json.dumps(j))
        self.assert_hold()
    def test_claimed_physical_ding_refused(self):
        p=self.p/"release"/m.RECEIPT
        j=json.loads(p.read_text());j["physicalDeviceDing"]="PASS"
        p.write_text(json.dumps(j))
        self.assert_hold()
    def test_symlinked_product_refused(self):
        p=self.p/"release/DEBUG.apk"
        target=self.p/"release/PROOF.aab"
        p.unlink()
        try:p.symlink_to(target)
        except (NotImplementedError,OSError):self.skipTest("No symlink support")
        self.assert_hold()
    def test_bad_delivery_filename_refused(self):
        p=self.p/"release"/m.RECEIPT
        j=json.loads(p.read_text());j["debugApk"]["name"]="../outside.apk"
        p.write_text(json.dumps(j))
        self.assert_hold()
    def test_bad_receipt_corrupt_refused(self):
        (self.p/"release"/m.RECEIPT).write_text("not json")
        self.assert_hold()
    def test_manual_proof_is_nonrelease(self):
        r=self.gate()
        self.assertFalse(r["release_authorised"])
        self.assertFalse(r["native_retirement_authorised"])
        self.assertEqual(r["native_mutations"],0)
        self.assertEqual(r["quota_savings_claimed_bytes"],0)


if __name__=="__main__":
    unittest.main(verbosity=2)
