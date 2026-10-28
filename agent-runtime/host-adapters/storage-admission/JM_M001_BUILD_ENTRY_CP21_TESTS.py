#!/usr/bin/env python3
"""Adversarial, non-mutating tests for JM M001 CP21 Git build-entry integration."""
import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "JM_M001_BUILD_ENTRY_CP21_INTEGRATION.py"
spec = importlib.util.spec_from_file_location("jm_m001_cp21_build_entry", SOURCE)
entry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(entry)
cp21, donor = entry.load_cp21(HERE.parents[2])


class BuildEntryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="jm-m001-entry-")
        self.repo = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def inspect(self, *names):
        return entry.inspect_paths(self.repo, list(names), cp21, donor)

    def test_small_ordinary_source_passes(self):
        (self.repo / "source.py").write_text("print('JM original')\n")
        r = self.inspect("source.py")
        self.assertEqual(r["status"], "PASS_NO_NEW_HIGH_BYTE_OR_COLD_CARRIERS")
        self.assertEqual(r["held_count"], 0)
        self.assertEqual(r["quota_savings_claimed_bytes"], 0)

    def test_large_new_source_fails_closed(self):
        (self.repo / "JM_ENGINE_BUILD.html").write_bytes(b"a" * 8_000_000)
        r = self.inspect("JM_ENGINE_BUILD.html")
        self.assertEqual(r["status"], "HOLD")
        self.assertEqual(r["reviews"][0]["bytes"], 8_000_000)
        self.assertEqual(r["reviews"][0]["status"], "HIGH_BYTE_REVIEW")
        self.assertFalse(r["native_retirement_authorised"])

    def test_cold_carrier_is_held_even_when_small(self):
        (self.repo / "JM_TEMP_BACKUP.bin").write_bytes(b"historical candidate")
        r = self.inspect("JM_TEMP_BACKUP.bin")
        self.assertEqual(r["status"], "HOLD")
        self.assertTrue(r["reviews"][0]["cold_only"])
        self.assertEqual(r["reviews"][0]["status"], "COLD_FIRST")

    def test_old_untouched_files_are_not_recharged(self):
        (self.repo / "huge.bin").write_bytes(b"a" * 8_000_000)
        (self.repo / "small.py").write_text("x=2\n")
        r = self.inspect("small.py")
        self.assertEqual(r["held_count"], 0)

    def test_symlink_is_refused_before_resolution(self):
        (self.repo / "old.bin").write_bytes(b"payload")
        try:
            os.symlink(self.repo / "old.bin", self.repo / "JM_COLD_ONLY.bin")
        except (OSError, NotImplementedError):
            self.skipTest("symlinks unavailable")
        with self.assertRaisesRegex(ValueError, "SYMLINK"):
            self.inspect("JM_COLD_ONLY.bin")

    def test_corrupt_high_byte_zip_refused(self):
        (self.repo / "broken.zip").write_bytes(b"z" * 8_000_000)
        with self.assertRaisesRegex(ValueError, "CP21_REJECTED"):
            self.inspect("broken.zip")

    def test_path_traversal_and_missing_files_refused(self):
        (self.repo / "safe.py").write_bytes(b"safe")
        with self.assertRaises(ValueError):
            self.inspect("../missing")
        with self.assertRaises(ValueError):
            self.inspect("missing.zip")

    def test_added_modified_and_renamed_git_paths(self):
        def git(*args):
            return subprocess.check_output(["git", *args], cwd=self.repo, text=True).strip()
        git("init", "-q")
        git("config", "user.email", "jm-tests@invalid.example")
        git("config", "user.name", "JM tests")
        (self.repo / "modified.bin").write_bytes(b"initial")
        (self.repo / "renamed.txt").write_text("retained")
        git("add", ".")
        git("commit", "-qm", "baseline")
        base = git("rev-parse", "HEAD")
        (self.repo / "modified.bin").write_bytes(b"x" * 8_000_000)
        (self.repo / "new.txt").write_text("new")
        (self.repo / "renamed.txt").rename(self.repo / "renamed_new.txt")
        git("add", "-A")
        git("commit", "-qm", "candidate")
        names = entry.changed_paths(self.repo, base)
        self.assertIn("modified.bin", names)
        self.assertIn("new.txt", names)
        self.assertIn("renamed_new.txt", names)
        self.assertEqual(self.inspect(*names)["status"], "HOLD")

    def test_invalid_base_fails(self):
        with self.assertRaisesRegex(ValueError, "BASE_SHA_INVALID"):
            entry.changed_paths(self.repo, "HEAD")

    def test_donor_hash_pin_and_no_implicit_permissions(self):
        self.assertEqual(len(donor.__dict__) > 0, True)
        (self.repo / "JM_DISPOSABLE_WORKING.html").write_text("not a release")
        r = self.inspect("JM_DISPOSABLE_WORKING.html")
        self.assertFalse(r["native_library_write_authorised"])
        self.assertFalse(r["native_retirement_authorised"])
        self.assertEqual(r["native_mutations"], 0)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(BuildEntryTests)
    report = unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({"schema": "JM.M001.BuildEntry.Tests/2",
                      "tests_run": report.testsRun,
                      "passed": report.wasSuccessful(),
                      "failures": len(report.failures),
                      "errors": len(report.errors)}))
    raise SystemExit(0 if report.wasSuccessful() else 2)
