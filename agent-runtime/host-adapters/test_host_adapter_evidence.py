#!/usr/bin/env python3
"""Adversarial local-evidence tests for the existing universal JM plug tester.

No provider login, device or live-host contact is represented by these fixtures.
"""
import importlib.util
from pathlib import Path
import tempfile
import unittest


SOURCE = Path(__file__).with_name("jm_host_adapter_conformance.py")
spec = importlib.util.spec_from_file_location("jm_host_adapter_conformance", SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class RepositoryEvidenceBoundary(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name) / "JM-cading-lab"
        (self.root / ".github" / "workflows").mkdir(parents=True)
        (self.root / "agent-runtime").mkdir()
        (self.root / ".github" / "workflows" / "proof.yml").write_text("proof: local\n")
        (self.root / "agent-runtime" / "core.py").write_text("pass\n")
        self.outside = Path(self.tmp.name) / "outside-proof.txt"
        self.outside.write_text("not repository evidence\n")

    def tearDown(self):
        self.tmp.cleanup()

    def valid(self, reference):
        return m.evidence_is_repository_file(self.root, reference)

    def test_current_layout_file_accepted(self):
        self.assertTrue(self.valid(".github/workflows/proof.yml"))
        self.assertTrue(self.valid("agent-runtime/core.py"))

    def test_absolute_outside_refused_even_when_file_exists(self):
        self.assertFalse(self.valid(str(self.outside)))

    def test_absolute_inside_refused(self):
        self.assertFalse(self.valid(str(self.root / "agent-runtime" / "core.py")))

    def test_parent_traversal_refused(self):
        self.assertFalse(self.valid("../outside-proof.txt"))
        self.assertFalse(self.valid("agent-runtime/../../outside-proof.txt"))

    def test_symlink_to_outside_refused(self):
        (self.root / "agent-runtime" / "external.txt").symlink_to(self.outside)
        self.assertFalse(self.valid("agent-runtime/external.txt"))

    def test_symlink_to_inside_refused(self):
        (self.root / "agent-runtime" / "aliased.py").symlink_to(self.root / "agent-runtime" / "core.py")
        self.assertFalse(self.valid("agent-runtime/aliased.py"))

    def test_symlink_parent_directory_refused(self):
        (self.root / "alias").symlink_to(self.root / "agent-runtime", target_is_directory=True)
        self.assertFalse(self.valid("alias/core.py"))

    def test_nonexistent_or_directory_refused(self):
        self.assertFalse(self.valid("agent-runtime/missing.py"))
        self.assertFalse(self.valid("agent-runtime"))

    def test_empty_null_or_nonstring_refused(self):
        for item in ("", None, [], {}, 42):
            with self.subTest(item=item):
                self.assertFalse(self.valid(item))

    def test_backslash_and_home_alias_refused(self):
        for item in ("agent-runtime\\core.py", "~/.ssh/id_rsa"):
            with self.subTest(item=item):
                self.assertFalse(self.valid(item))

    def test_null_byte_refused(self):
        self.assertFalse(self.valid("agent-runtime/core.py\\x00"))

    def test_missing_root_refused(self):
        self.assertFalse(m.evidence_is_repository_file(self.root / "missing", "agent-runtime/core.py"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
