#!/usr/bin/env python3
"""JM GameCore exact-source reentry protections; no original source mutation."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).with_name("rebuild_and_verify.py")
SPEC = importlib.util.spec_from_file_location("jm_gamecore_recovery", SOURCE)
RECOVERY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RECOVERY)


class OwnerSourceProtection(unittest.TestCase):
    def setUp(self):
        self.sandbox = tempfile.TemporaryDirectory()
        self.addCleanup(self.sandbox.cleanup)
        self.root = Path(self.sandbox.name)
        self.original = b"JM GameCore exact original bytes\\x00\\xff"

    def test_new_recovery_creates_exact_file(self):
        target = self.root / "gamecore.html"
        self.assertEqual(RECOVERY.write_recovered_source(target, self.original), "created")
        self.assertEqual(target.read_bytes(), self.original)

    def test_identical_existing_file_is_not_rewritten(self):
        target = self.root / "gamecore.html"
        target.write_bytes(self.original)
        before = target.stat().st_mtime_ns
        self.assertEqual(RECOVERY.write_recovered_source(target, self.original), "already exact")
        self.assertEqual(target.stat().st_mtime_ns, before)

    def test_owner_edit_is_never_overwritten(self):
        target = self.root / "gamecore.html"
        owner_edit = b"owner edit - keep this"
        target.write_bytes(owner_edit)
        with self.assertRaises(SystemExit):
            RECOVERY.write_recovered_source(target, self.original)
        self.assertEqual(target.read_bytes(), owner_edit)

    def test_alternate_destination_preserves_original(self):
        original = self.root / "gamecore.html"
        original.write_bytes(b"owner edit")
        alternate = self.root / "recovered" / "gamecore.html"
        alternate.parent.mkdir()
        self.assertEqual(RECOVERY.write_recovered_source(alternate, self.original), "created")
        self.assertEqual(original.read_bytes(), b"owner edit")
        self.assertEqual(alternate.read_bytes(), self.original)

    def test_directory_is_never_replaced(self):
        directory = self.root / "gamecore.html"
        directory.mkdir()
        with self.assertRaises(SystemExit):
            RECOVERY.write_recovered_source(directory, self.original)
        self.assertTrue(directory.is_dir())

    def test_symlink_is_never_followed(self):
        original = self.root / "owner.html"
        original.write_bytes(b"owner edit")
        alias = self.root / "gamecore.html"
        try:
            alias.symlink_to(original)
        except (NotImplementedError, OSError):
            self.skipTest("symlink unavailable")
        with self.assertRaises(SystemExit):
            RECOVERY.write_recovered_source(alias, self.original)
        self.assertEqual(original.read_bytes(), b"owner edit")


if __name__ == "__main__":
    unittest.main()
