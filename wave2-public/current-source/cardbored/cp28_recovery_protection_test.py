"""Regression: rebuilding cardBORED must not destroy an owner-edited playable HTML."""
from pathlib import Path
import tempfile
import unittest
from cp28_inspect_and_build import safe_write_candidate

class CandidateProtection(unittest.TestCase):
    def test_new_file_created_with_readback(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root)/'owner.html'
            self.assertEqual(safe_write_candidate(path,'candidate'),'CREATED_VERIFIED')
            self.assertEqual(path.read_bytes(),b'candidate')

    def test_identical_existing_file_is_idempotent(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root)/'owner.html';path.write_text('candidate')
            self.assertEqual(safe_write_candidate(path,'candidate'),'EXISTING_IDENTICAL')
            self.assertEqual(path.read_text(),'candidate')

    def test_owner_modified_file_is_preserved(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root)/'owner.html';path.write_text('my changes')
            with self.assertRaises(FileExistsError):safe_write_candidate(path,'candidate')
            self.assertEqual(path.read_text(),'my changes')

    def test_symlink_target_is_preserved(self):
        with tempfile.TemporaryDirectory() as root:
            target=Path(root)/'original.html';target.write_text('keep')
            path=Path(root)/'owner.html';path.symlink_to(target)
            with self.assertRaises(FileExistsError):safe_write_candidate(path,'candidate')
            self.assertEqual(target.read_text(),'keep')
            self.assertTrue(path.is_symlink())

    def test_directory_is_not_replaced(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root)/'owner.html';path.mkdir()
            with self.assertRaises(FileExistsError):safe_write_candidate(path,'candidate')
            self.assertTrue(path.is_dir())

if __name__=='__main__':unittest.main()
