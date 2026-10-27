"""JM CP09 cold custody: source, receipts, adversarial archive and fresh-path proof."""
import hashlib
import json
import os
import shutil
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path

import atlas_custody as cold
import cp07_atomic_runtime as cp07
import server


class ColdCustody(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "active.sqlite3"
        self.archive = self.root / "custody.zip"
        self.recipient = self.root / "recovered.sqlite3"
        self.atlas = server.Atlas(str(self.source))
        cp07.init(self.atlas)

    def seed(self, run_key="cp09.original.001"):
        result = cp07.execute(self.atlas, run_key=run_key, apply=True)
        self.assertEqual(result["state"], "ATOMIC_NATIVE_TO_ATLAS_PERSISTED")

    def export(self):
        return cold.snapshot(self.source, self.archive)

    def test_00_real_donor_receipt_survives_vault_and_replay(self):
        self.seed()
        self.seed("cp09.original.002")
        before = cold.sha_file(self.source)
        saved = self.export()
        self.assertEqual(before, cold.sha_file(self.source), "source must not change")
        self.assertEqual(saved["history"]["run_count"], 2)
        self.assertEqual(saved["history"]["event_count"], 4)
        checked = cold.verify(self.archive, saved["archive_sha256"])
        self.assertEqual(checked["history"], saved["history"])
        restored = cold.restore(self.archive, self.recipient, saved["archive_sha256"], apply=True)
        self.assertEqual(restored["state"], "COLD_ATLAS_RESTORED_NEW_PATH")
        self.assertEqual(restored["history"], saved["history"])
        atlas2 = server.Atlas(str(self.recipient))
        actual = cp07.history(atlas2)
        self.assertTrue(actual["integrity_valid"])
        self.assertEqual(actual["total_atlas_contact_events"], 4)
        replay = cp07.execute(atlas2, "cp09.original.001", apply=True)
        self.assertEqual((replay["state"], replay["writes_now"]), ("ALREADY_PROVEN_REPLAY", 0))
        self.assertEqual(cp07.history(atlas2)["run_count"], 2)

    def test_01_explicit_apply_required(self):
        self.seed()
        saved = self.export()
        with self.assertRaisesRegex(ValueError, "EXPLICIT_APPLY_REQUIRED"):
            cold.restore(self.archive, self.recipient, saved["archive_sha256"])
        self.assertFalse(self.recipient.exists())

    def test_02_refuse_existing_destination_even_with_apply(self):
        self.seed()
        saved = self.export()
        self.recipient.write_bytes(b"OWNED DIFFERENT PURPOSE")
        with self.assertRaisesRegex(ValueError, "DESTINATION_ALREADY_EXISTS"):
            cold.restore(self.archive, self.recipient, saved["archive_sha256"], apply=True)
        self.assertEqual(self.recipient.read_bytes(), b"OWNED DIFFERENT PURPOSE")

    def test_03_archive_external_digest_mismatch_holds(self):
        self.seed()
        saved = self.export()
        with self.assertRaisesRegex(ValueError, "ARCHIVE_OUTER_SHA256_MISMATCH"):
            cold.restore(self.archive, self.recipient, "0" * 64, apply=True)
        self.assertFalse(self.recipient.exists())

    def test_04_tampered_original_receipt_refuses_snapshot(self):
        self.seed()
        with sqlite3.connect(self.source) as c:
            c.execute("UPDATE atomic_contact_runs SET receipt_hash='tampered'")
        original_sha = cold.sha_file(self.source)
        with self.assertRaisesRegex(ValueError, "CP07_HISTORY_INTEGRITY_FAILED"):
            self.export()
        self.assertFalse(self.archive.exists())
        self.assertEqual(cold.sha_file(self.source), original_sha)

    def test_05_repin_malicious_extra_member_refused(self):
        self.seed()
        saved = self.export()
        malicious = self.root / "malicious.zip"
        with zipfile.ZipFile(self.archive) as original, zipfile.ZipFile(malicious, "w") as fake:
            for member in original.namelist():
                fake.writestr(member, original.read(member))
            fake.writestr("../alien.txt", "UNTRUSTED")
        attack_sha = cold.sha_file(malicious)
        with self.assertRaisesRegex(ValueError, "ARCHIVE_MEMBERS_NOT_EXACT"):
            cold.restore(malicious, self.recipient, attack_sha, apply=True)
        self.assertFalse(self.recipient.exists())

    def test_06_archive_digest_requires_independent_pin(self):
        self.seed()
        self.export()
        with self.assertRaisesRegex(ValueError, "EXTERNAL_ARCHIVE_SHA256_REQUIRED"):
            cold.verify(self.archive, "")
        with self.assertRaisesRegex(ValueError, "EXTERNAL_ARCHIVE_SHA256_INVALID"):
            cold.verify(self.archive, "z" * 64)

    def test_07_source_and_output_never_overwritten(self):
        self.seed()
        self.archive.write_text("INDEPENDENT PURPOSE")
        before = cold.sha_file(self.source)
        with self.assertRaisesRegex(ValueError, "ARCHIVE_EXISTS"):
            self.export()
        self.assertEqual(self.archive.read_text(), "INDEPENDENT PURPOSE")
        self.assertEqual(cold.sha_file(self.source), before)

    def test_08_restore_does_not_add_unapproved_external_authority(self):
        self.seed()
        receipt = self.export()
        cold.restore(self.archive, self.recipient, receipt["archive_sha256"], apply=True)
        with sqlite3.connect(self.recipient) as c:
            self.assertEqual(c.execute("SELECT COUNT(*) FROM bodies").fetchone()[0], 1)
            self.assertEqual(c.execute("SELECT COUNT(*) FROM atomic_contact_runs").fetchone()[0], 1)
            self.assertEqual(c.execute("SELECT COUNT(*) FROM contact_events").fetchone()[0], 2)
        self.assertEqual(self.archive.exists(), True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
