"""Bounded restore safety checks for the existing JM GameCore v0.2I-A carrier.

Synthetic bytes only: original GameCore source and locked manifest are never edited.
"""
import base64
import gzip
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("rebuild_and_verify.py")
SOURCE = b"JM GameCore\nT-Boys\nCatching Run\nAiming Run\n"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def git_sha(data):
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


class RebuildSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "original"
        self.root.mkdir()
        (self.root / "carrier").mkdir()
        (self.root / "rebuild_and_verify.py").write_bytes(SCRIPT.read_bytes())
        compressed = gzip.compress(SOURCE)
        carrier = base64.b64encode(compressed)
        (self.root / "carrier" / "part001.b64").write_bytes(carrier)
        self.manifest = {
            "source_filename": "gamecore.html",
            "source_bytes": len(SOURCE),
            "source_sha256": sha256(SOURCE),
            "encoding": {
                "base64_chars": len(carrier),
                "gzip_bytes": len(compressed),
                "gzip_sha256": sha256(compressed),
            },
            "canonical_parts": [{
                "name": "carrier/part001.b64",
                "size": len(carrier),
                "sha256": sha256(carrier),
                "git_blob_sha1": git_sha(carrier),
            }],
        }
        self.save_manifest()

    def save_manifest(self):
        (self.root / "transport_manifest_v1.json").write_text(json.dumps(self.manifest))

    def run_restore(self, *args):
        return subprocess.run([sys.executable, str(self.root / "rebuild_and_verify.py"), *args],
                              capture_output=True, text=True, cwd=self.root)

    def test_verify_without_write(self):
        result = self.run_restore()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertFalse((self.root / "gamecore.html").exists())

    def test_valid_write_and_idempotent_readback(self):
        for _ in range(2):
            result = self.run_restore("--write")
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            self.assertEqual((self.root / "gamecore.html").read_bytes(), SOURCE)

    def test_manifest_cannot_escape_output_directory(self):
        self.manifest["source_filename"] = "../outside.html"
        self.save_manifest()
        result = self.run_restore("--write")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unexpected source filename", result.stderr + result.stdout)
        self.assertFalse((self.root.parent / "outside.html").exists())

    def test_different_existing_source_not_overwritten(self):
        target = self.root / "gamecore.html"
        target.write_bytes(b"owner edits remain intact")
        result = self.run_restore("--write")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(target.read_bytes(), b"owner edits remain intact")

    def test_symlink_not_followed(self):
        outside = self.root.parent / "owner-file.html"
        outside.write_bytes(b"keep owner file")
        (self.root / "gamecore.html").symlink_to(outside)
        result = self.run_restore("--write")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(outside.read_bytes(), b"keep owner file")

    def test_tampered_carrier_rejected_before_write(self):
        (self.root / "carrier" / "part001.b64").write_bytes(b"bad")
        result = self.run_restore("--write")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / "gamecore.html").exists())


if __name__ == "__main__":
    unittest.main()
