#!/usr/bin/env python3
"""Upgrade preflight: bounded synthetic fixtures, NO device or installation."""
import inspect
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import jm_fold_upgrade_gate as g

def info(**kw):
    obj={"package":g.PKG,"version_code":9,
         "certificate_sha256":"a"*64,"permissions":[],
         "apk_sha256":"b"*64}
    obj.update(kw)
    return obj

class UpgradeSafety(unittest.TestCase):
    def test_matching_installed_cert_permits_only_read_only_preflight(self):
        r=g.compare(info(),info(),True)
        self.assertEqual(r["status"],"PASS_PREINSTALL_READ_ONLY")
        self.assertTrue(all(r["checks"].values()))
        self.assertIn("not an installation",r["warning"])

    def test_offline_comparison_cannot_claim_device_pass(self):
        r=g.compare(info(),info(),False)
        self.assertEqual(r["status"],"MATCHES_SUPPLIED_APK_NOT_DEVICE")

    def test_debug_cert_mismatch_hold_even_when_code_equal(self):
        r=g.compare(info(certificate_sha256="b"*64),info(),True)
        self.assertEqual(r["status"],"HOLD")
        self.assertFalse(r["checks"]["certificate_sha256_exact"])

    def test_downgrade_refused(self):
        r=g.compare(info(version_code=8),info(version_code=9),True)
        self.assertEqual(r["status"],"HOLD")

    def test_new_permission_refused(self):
        r=g.compare(info(permissions=["android.permission.CAMERA"]),info(),True)
        self.assertEqual(r["status"],"HOLD")

    def test_other_package_refused(self):
        r=g.compare(info(package="com.other.app"),info(),True)
        self.assertEqual(r["status"],"HOLD")

    def test_inspection_reads_signing_and_package_without_install(self):
        with tempfile.TemporaryDirectory() as d:
            apk=Path(d)/"candidate.apk"
            apk.write_bytes(b"synthetic-do-not-install")
            def output(args,**kwargs):
                if args[1]=="verify":
                    return "Verifies\nSigner #1 certificate SHA-256 digest: "+("ab"*32)+"\n"
                if args[1]=="dump" and args[2]=="badging":
                    return "package: name='com.jmisjustme.foldultra' versionCode='9' versionName='0.9.0'\n"
                if args[1]=="dump" and args[2]=="permissions":
                    return "package: com.jmisjustme.foldultra\n"
                raise AssertionError("Unexpected invocation")
            with mock.patch.object(g,"run",side_effect=output):
                r=g.inspect(apk,"apksigner","aapt")
            self.assertEqual(r["version_code"],9)
            self.assertEqual(r["certificate_sha256"],"ab"*32)
            self.assertEqual(r["permissions"],[])

    def test_multi_signer_requires_manual_authority(self):
        with tempfile.TemporaryDirectory() as d:
            apk=Path(d)/"candidate.apk"
            apk.write_bytes(b"x")
            with mock.patch.object(g,"run",return_value=
                 "Signer #1 certificate SHA-256 digest: "+("ab"*32)+
                 "\nSigner #2 certificate SHA-256 digest: "+("cd"*32)):
                with self.assertRaises(g.Hold):
                    g.inspect(apk,"apksigner","aapt")

    def test_adb_serial_must_be_unambiguous(self):
        with mock.patch.object(g,"run",return_value="List of devices attached\nx1 device\nx2 device\n"):
            with self.assertRaises(g.Hold):g.choose_device("adb",None)
            self.assertEqual(g.choose_device("adb","x2"),"x2")
            with self.assertRaises(g.Hold):g.choose_device("adb","unknown")

    def test_phone_code_never_installs_or_uninstalls(self):
        body=inspect.getsource(g.installed_base)+inspect.getsource(g.choose_device)
        self.assertIn('"pm","path"',body)
        self.assertIn('"pull"',body)
        self.assertNotIn('"install"',body)
        self.assertNotIn('"uninstall"',body)
        self.assertNotIn('"pm","clear"',body)
        self.assertNotIn('"run-as"',body)

if __name__=="__main__":
    unittest.main()
